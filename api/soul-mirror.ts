import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Soul Mirror monthly portrait (Feature 9, flagship).
// POST { month, entries: [{ text, mood, created_at }], goals: string[], language }
// -> structured monthly portrait: emotional summary, hidden patterns, goal
// progress, sources of joy, one growth area, life chapter label.
// Warm, human, literary tone. NEVER clinical. Client caches 1x/month.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AI_KEY = process.env.OPENAI_API_KEY || "";
const AI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const config = { maxDuration: 90 };

const MOOD_LABELS: Record<string, string> = {
  happy: "joy", good: "wellbeing", fine: "calm", sad: "sadness", unhappy: "distress",
};

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
    const { month = "", entries = [], goals = [], language = "French" } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(200).json({ empty: true, portrait: null });
    }

    const entriesBlock = entries
      .slice(0, 60)
      .map((e: any, i: number) => {
        const d = e?.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : "";
        const mood = MOOD_LABELS[e?.mood] || e?.mood || "?";
        return `Day ${d} (${mood}): ${String(e?.text || "").substring(0, 200)}`;
      })
      .join("\n");

    const goalsBlock = goals.length > 0 ? goals.join(", ") : "none stated";

    const systemPrompt = `You are a warm, literary companion creating a monthly portrait — the "Soul Mirror" — of a person's inner life, based ONLY on their journal entries from ${month}.

Their entries that month (with mood labels):
${entriesBlock}

Their stated goals: ${goalsBlock}

Write in ${language}. The tone is warm, human, poetic but grounded — like a thoughtful friend who read their journal, NEVER clinical, never diagnostic.

Return ONLY valid JSON with exactly this shape:
{
  "emotionalSummary": {
    "dominantMoods": [{"mood": "<emotion word in ${language}>", "days": <int>}, ...up to 3],
    "trajectory": "improving" | "declining" | "stable",
    "text": "<1-2 sentences describing the month's emotional arc>"
  },
  "hiddenPatterns": "<ONE observation they likely didn't notice themselves — e.g. writing more at night, more self-criticism than praise, energy tied to certain days>",
  "goalProgress": [{"goal": "<goal title>", "status": "advanced" | "stalled", "note": "<short observation>"}],
  "sourcesOfJoy": ["<short phrase>", ...3-5 items they returned to or smiled about],
  "growthArea": "<ONE gentle area for reflection, 1 sentence, never harsh>",
  "lifeChapter": "<a poetic label for this month in ${language}, e.g. 'Le Mois de l'Affirmation'>"
}
No markdown, no other text. If there is too little material for a section, still provide something gentle and honest.`;

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
          { role: "user", content: "Create the portrait now." },
        ],
        max_tokens: 1100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Soul Mirror service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Soul Mirror returned empty response" });
    }

    let portrait: any = null;
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      portrait = JSON.parse(cleaned);
    } catch {
      portrait = null;
    }

    if (!portrait || typeof portrait !== "object") {
      return res.status(502).json({ error: "Could not parse the portrait" });
    }

    return res.status(200).json({ empty: false, portrait });
  } catch (error) {
    console.error("Error in soul-mirror function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
