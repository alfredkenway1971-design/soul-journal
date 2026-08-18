import { createClient } from "@supabase/supabase-js";

// Vercel serverless — AI text enhancement (replaces the Lovable-managed Supabase
// edge fn enhance-text, whose OPENAI_API_KEY is unreliable). Same contract:
// POST { text, tone, customPrompt, language, styleSamples } -> { enhancedText }.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
// Provider config (OpenAI-compatible). Defaults to OpenAI gpt-4o-mini (same as
// the original edge function); can point at DeepSeek etc. via Vercel env.
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
    const { text, tone = "natural", customPrompt, language = "English", styleSamples = [] } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    const styleBlock = styleSamples.length > 0
      ? `\n\nThe writer's natural voice samples (mirror their rhythm, vocabulary, sentence length, and tone — do NOT copy phrases verbatim):\n---\n${styleSamples.slice(0, 3).map((s: string, i: number) => `Sample ${i + 1}: ${String(s).substring(0, 400)}`).join("\n\n")}\n---`
      : "";

    let systemPrompt: string;
    let userMessage: string;

    if (customPrompt) {
      systemPrompt = "You are a helpful assistant that follows instructions precisely.";
      userMessage = `${customPrompt}\n\n${text}`;
    } else if (tone === "structured") {
      // 5-section journal restructure (Amer's spec) — keeps the writer's voice,
      // never fabricates, never invents emotions, leaves blank what isn't there.
      systemPrompt = `You are helping someone turn a raw, unstructured journal entry into a clear, well-organized personal journal entry. Do not change their meaning, invent details, or add emotions they didn't express.

Given the user's raw entry below, restructure it into these 5 sections:

1. What Happened - Extract the key events, stated as facts, no judgment added.
2. How I Felt - Pull out the emotions the user mentioned or implied, and when they happened.
3. Why - Identify the cause or trigger behind those feelings, only if it's present in their entry.
4. What I Noticed - Surface any pattern, realization, or self-observation they made.
5. Tomorrow - Extract any intention, plan, or hope they mentioned for the next day. If none was mentioned, leave this section blank rather than inventing one.

Rules:
- Keep their original voice and tone - don't make it sound clinical or robotic.
- If a section has no content in the raw entry, leave it empty or write "Not mentioned" - never fabricate.
- Keep the output concise; don't pad or over-explain.
- Return the result in clean formatted sections with headers.
Output language: ${language}.${styleBlock}`;
      userMessage = `Raw entry:\n"${text}"`;
    } else if (tone === "expand") {
      systemPrompt = `You are a journaling companion who expands short notes or bullet points into a flowing, first-person journal paragraph in ${language}.
Rules:
1. Keep the writer's voice — do not invent facts or feelings beyond what's hinted at.
2. Turn bullets/fragments into 2–4 connected sentences per bullet, naturally.
3. Maintain authenticity; never sound generic or coachy.
4. Output plain prose only (no bullets, no headings).${styleBlock}`;
      userMessage = `Expand these notes into a journal paragraph:\n\n${text}`;
    } else {
      systemPrompt = `You are a skilled editor that enhances journal entries while mirroring the writer's authentic voice.
Your task:
1. Fix grammar and spelling errors
2. Improve clarity and flow
3. Preserve the writer's personal voice, cadence, and word choices
4. Keep tone ${tone} (options: formal, casual, natural, humorous)
5. Add paragraph breaks for readability
6. Do NOT add content that wasn't in the original
Output language: ${language}.${styleBlock}`;
      userMessage = `Please enhance this journal entry:\n\n${text}`;
    }

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
        max_tokens: customPrompt ? 50 : 2000,
        temperature: customPrompt ? 0.8 : 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Enhancement service temporarily unavailable" });
    }

    const data = await response.json();
    const enhancedText = data.choices?.[0]?.message?.content;
    if (!enhancedText) {
      return res.status(502).json({ error: "Enhancement service returned empty response" });
    }

    return res.status(200).json({ enhancedText });
  } catch (error) {
    console.error("Error in enhance-text function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
