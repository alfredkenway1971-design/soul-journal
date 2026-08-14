import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Goal Accountability scan.
// POST { goals: string[], entries: string[] } -> { results: [{ goal, count, sample }] }
// Scans the user's recent entries for mentions of each stated goal (works in
// any language — the model understands matching across languages). Same
// DeepSeek config as enhance-text. Client throttles this to 1x/day.

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
    const { goals = [], entries = [] } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }
    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const goalsBlock = goals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n");
    const entriesBlock = entries.length > 0
      ? entries.slice(0, 15).map((e: string, i: number) => `Entry ${i + 1}: ${String(e).substring(0, 600)}`).join("\n\n")
      : "No entries in this window.";

    const systemPrompt = `You scan a person's journal entries to see which of their goals they are actively engaging with.
The person's goals:
${goalsBlock}

Their recent journal entries (last ~7 days):
${entriesBlock}

For EACH goal decide whether the entries show engagement with it (writing about doing it, planning it, feeling about it, mentioning it — synonyms and related activities count, e.g. goal "exercise" matches "went to the gym", "walked", "ran"). Be generous: casual mention counts.
Return ONLY a valid JSON array, one object per goal, exactly this shape:
[{"goal": "<exact goal title>", "count": <number of mentions, 0-10>, "sample": "<short quote of one mention, or empty string>"}]
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
          { role: "user", content: "Scan now." },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Goal scan service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Goal scan returned empty response" });
    }

    let results: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        results = parsed
          .filter((r: any) => r && typeof r.goal === "string")
          .map((r: any) => ({
            goal: r.goal.trim(),
            count: Math.max(0, Math.min(10, Number(r.count) || 0)),
            sample: typeof r.sample === "string" ? r.sample.slice(0, 120) : "",
          }));
      }
    } catch {
      results = [];
    }

    if (results.length === 0) {
      // Fallback: mark every goal unmentioned so the client stays safe
      results = goals.map((g: string) => ({ goal: g, count: 0, sample: "" }));
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Error in goal-scan function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
