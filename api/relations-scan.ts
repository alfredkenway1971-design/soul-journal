import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Relationship Emotional Tracker scan (Feature 7).
// POST { entries: [{ id, text, mood }], language } -> { relations: [...] }
// Extracts people mentioned 3+ times (DeepSeek does the name extraction —
// no separate NER service needed), rates mention sentiment, computes the
// trend across the timeline (first half vs second half) and writes ONE
// gentle, observation-framed insight per relation. PRIVACY: results are
// only ever shown inside the app's private Relations section — never push.
// Client caches 1x/day.

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
      return res.status(200).json({ relations: [] });
    }

    // Chronological order (oldest first) so the model can compare halves.
    const entriesBlock = entries
      .slice(0, 200)
      .map((e: any, i: number) => `Entry ${i + 1}: Mood ${e?.mood || "?"} — ${String(e?.text || "").substring(0, 250)}`)
      .join("\n\n");

    const systemPrompt = `You analyze a person's private journal to track their relationships. The entries are labeled "Entry N:" in CHRONOLOGICAL order (oldest first), each with the mood at the time.

Their entries:
${entriesBlock}

Task — find the people who matter most in their life:
1. Extract people mentioned in the entries (named people: Marc, Sarah, my mom, mon frère, le patron, etc. — NOT the author, NOT generic groups).
2. Keep ONLY people mentioned 3 or more times total.
3. For each kept person: count mentions, rate each mention's sentiment (+1 positive, -1 negative, 0 neutral/mixed), then compare the FIRST half of their mentions vs the SECOND half: if the average sentiment clearly dropped → trend "declining"; clearly rose → "improving"; otherwise "stable".
4. Write ONE gentle insight sentence in ${language} per relation: observation framing only ("Vos entrées sur Marc étaient positives, mais sont devenues plus tendues…"), NEVER a diagnosis, never dramatic. For stable relations a short warm observation is fine. Include a soft, open question ONLY for declining relations ("Voulez-vous explorer ce qui a changé ?").
5. Reference the entry numbers (1-based) where each person appears, for the 5 most relevant mentions.
Return ONLY a valid JSON array, no markdown, no other text:
[{"name": "<person>", "count": <mentions>, "trend": "improving|declining|stable", "insight": "<1 gentle sentence>", "entryIndexes": [<1-based entry numbers>]}]
Max 15 relations, ordered by count descending.`;

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
        max_tokens: 900,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Relations scan service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Relations scan returned empty response" });
    }

    let relations: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        relations = parsed
          .filter((r: any) => r && typeof r.name === "string")
          .map((r: any) => ({
            name: r.name.trim().slice(0, 60),
            count: Math.max(0, Math.min(50, Number(r.count) || 0)),
            trend: ["improving", "declining", "stable"].includes(r.trend) ? r.trend : "stable",
            insight: typeof r.insight === "string" ? r.insight.trim().slice(0, 300) : "",
            entryIndexes: Array.isArray(r.entryIndexes)
              ? r.entryIndexes.map((n: any) => Number(n)).filter((n: number) => n >= 1 && n <= entries.length)
              : [],
          }))
          .filter((r: any) => r.count >= 3)
          .slice(0, 15);
      }
    } catch {
      relations = [];
    }

    return res.status(200).json({ relations });
  } catch (error) {
    console.error("Error in relations-scan function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
