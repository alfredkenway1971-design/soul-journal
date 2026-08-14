import { createClient } from "@supabase/supabase-js";

// Vercel serverless — personalized journaling prompts.
// POST { recentEntries: string[], goals: string[], language, styleSamples } -> { prompts: string[] }
// Same provider config as enhance-text (DeepSeek via Vercel env OPENAI_BASE_URL/MODEL/KEY).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AI_KEY = process.env.OPENAI_API_KEY || "";
const AI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const config = { maxDuration: 60 };

async function requireUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { recentEntries = [], goals = [], language = "English", styleSamples = [] } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    const styleBlock = styleSamples.length > 0
      ? `\n\nThe writer's natural voice samples (mirror their rhythm, vocabulary and tone — do NOT copy phrases verbatim):\n---\n${styleSamples.slice(0, 3).map((s: string, i: number) => `Sample ${i + 1}: ${String(s).substring(0, 300)}`).join("\n\n")}\n---`
      : "";

    const entriesBlock = recentEntries.length > 0
      ? recentEntries.slice(0, 5).map((e: string, i: number) => `Entry ${i + 1}: ${String(e).substring(0, 500)}`).join("\n\n")
      : "No recent entries yet.";

    const goalsBlock = goals.length > 0 ? goals.join(", ") : "None set yet.";

    const systemPrompt = `You are a deeply empathetic journaling companion. The user is about to write a journal entry and needs personalized prompts.
Generate EXACTLY 3 journaling prompts in ${language}.${styleBlock}

Rules:
1. Each prompt must be specific and grounded in the user's own recent writing or goals — NEVER generic ("How was your day?" is forbidden).
2. Mix the three types: (a) a follow-up on something they wrote recently, (b) a progress check-in on one of their goals, (c) a topic gap or a high-emotion moment worth unpacking.
3. Write in the user's language (${language}), in a warm, natural first-person-address tone ("vous" if French).
4. Keep each prompt to 1-2 sentences, conversational, never clinical, never diagnostic.
5. If there is no material for a type, substitute another grounded prompt instead of being generic.
Return ONLY a valid JSON array of exactly 3 strings, no markdown, no numbering.`;

    const userMessage = `Recent journal entries:\n${entriesBlock}\n\nUser's goals: ${goalsBlock}\n\nGenerate 3 personalized journaling prompts now.`;

    const response = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + AI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Prompts service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Prompts service returned empty response" });
    }

    // Parse: try JSON array, fall back to line splitting
    let prompts: string[] = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        prompts = parsed.filter((p: any) => typeof p === "string" && p.trim().length > 0).map((p: string) => p.trim());
      }
    } catch {
      prompts = content.split("\n").map((l: string) => l.replace(/^\d+[.)\s-]+/, "").replace(/^[-*]\s*/, "").trim()).filter(Boolean);
    }

    if (prompts.length === 0) {
      return res.status(502).json({ error: "Could not parse generated prompts" });
    }

    return res.status(200).json({ prompts: prompts.slice(0, 3) });
  } catch (error) {
    console.error("Error in journaling-prompts function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
