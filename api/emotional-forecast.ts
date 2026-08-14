import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Emotional Forecasting (Feature 6).
// POST { entries: [{ mood, text }], language } -> { declining, forecast, suggestion }
// Analyzes the last 14 days for declining emotional trends and produces ONE
// forecast sentence (observation framing) + ONE preventive suggestion.
// Never framed as diagnosis. Client caches per ISO week (1 call/week).

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
    const { entries = [], language = "English" } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(200).json({ declining: false, forecast: "", suggestion: "" });
    }

    const entriesBlock = entries
      .slice(0, 30)
      .map((e: any, i: number) => `Day ${i + 1}: Mood ${e?.mood || "?"} — ${String(e?.text || "").substring(0, 250)}`)
      .join("\n\n");

    const systemPrompt = `You are a supportive journaling companion. The person below kept a journal over the last 14 days (ordered oldest to newest, with mood scores).

Their entries:
${entriesBlock}

Task:
1. Look for a DECLINING trend in the second week vs the first (mood dropping, more negative language, less rest/sleep, more stress). If there is NO meaningful declining trend, return declining=false and empty strings.
2. If there IS one, write in ${language}:
   - forecast: ONE sentence, observation framing ("Vos entrées montrent…", "Your entries suggest…"), describing the direction the person's energy/mood is heading. Never diagnose, never label a condition.
   - suggestion: ONE concrete preventive action (short, gentle, actionable).
Return ONLY valid JSON:
{"declining": true/false, "forecast": "…", "suggestion": "…"}
No markdown, no other text.`;

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
          { role: "user", content: "Analyze now." },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Forecast service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Forecast returned empty response" });
    }

    let result = { declining: false, forecast: "", suggestion: "" };
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      result = {
        declining: parsed.declining === true,
        forecast: typeof parsed.forecast === "string" ? parsed.forecast.trim().slice(0, 400) : "",
        suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion.trim().slice(0, 400) : "",
      };
    } catch {
      result = { declining: false, forecast: "", suggestion: "" };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in emotional-forecast function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
