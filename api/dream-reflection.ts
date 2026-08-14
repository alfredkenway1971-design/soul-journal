import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Dream Reflection (Feature 8).
// POST { dreamText, recentEntries: string[], language } -> { reflection }
// Poetic, open-ended symbolic reflection that connects the dream to the
// user's REAL waking-life entries — never generic dream-dictionary content.

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
    const { dreamText = "", recentEntries = [], language = "English" } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }
    if (!dreamText.trim()) {
      return res.status(400).json({ error: "Dream text is required" });
    }

    const lifeBlock =
      recentEntries.length > 0
        ? recentEntries.slice(0, 5).map((e: string, i: number) => `Life entry ${i + 1}: ${String(e).substring(0, 350)}`).join("\n\n")
        : "No other entries yet.";

    const systemPrompt = `You are a gentle, poetic companion for someone who just recorded a dream in their journal.

Their dream:
${dreamText.slice(0, 1200)}

Their recent real-life entries (waking life):
${lifeBlock}

Write a short reflection in ${language} that:
1. Is POETIC and open-ended — a soft mirror, never a verdict. Use a metaphor or two.
2. Draws GENTLE CONNECTIONS between the dream's images and themes present in their real entries — reference the actual life content you see (work, family, rest, decisions…). If there is no clear connection, say so honestly and leave the dream open.
3. NEVER uses generic dream-dictionary meanings (no "water = emotions" tables). Everything must tie back to THEIR entries.
4. Ends with one open-ended question, inviting them to sit with it.
5. Keep it 3-5 sentences. Never diagnose, never alarm.`;
    const userMessage = "Write the dream reflection now.";

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
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Dream reflection service temporarily unavailable" });
    }

    const data = await response.json();
    const reflection = data.choices?.[0]?.message?.content;
    if (!reflection) {
      return res.status(502).json({ error: "Dream reflection returned empty response" });
    }

    return res.status(200).json({ reflection: reflection.trim().slice(0, 1200) });
  } catch (error) {
    console.error("Error in dream-reflection function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
