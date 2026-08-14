import { createClient } from "@supabase/supabase-js";

// Vercel serverless — Gratitude Auto-Detection scan.
// POST { entries: [{ id, text }] } -> { items: [{ gratitude, category, entryIndexes }] }
// Scans journal entries for gratitude language (any language), extracts the
// object of gratitude, categorizes it, and references back to source entries
// by their 1-based label index. Client throttles to 1x/day.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AI_KEY = process.env.OPENAI_API_KEY || "";
const AI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const config = { maxDuration: 60 };

const CATEGORIES = ["people", "experiences", "small-moments", "achievements", "other"];

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
    const { entries = [] } = req.body || {};
    if (!AI_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(200).json({ items: [] });
    }

    // Label each entry 1..N; the model references indexes back to them.
    const entriesBlock = entries
      .slice(0, 200)
      .map((e: any, i: number) => `Entry ${i + 1}: ${String(e?.text || "").substring(0, 250)}`)
      .join("\n\n");

    const systemPrompt = `You scan a person's journal entries for gratitude — moments they were thankful, appreciative, grateful, lucky, or happy about something (in any language: "merci", "grateful for", "j'ai apprécié", "heureux de", "reconnaissant", "thankful", etc.).

Their entries (each labeled "Entry N:"):
${entriesBlock}

Extract the distinct things they were grateful for. Rules:
1. Group the SAME recurring thing into one item (e.g. "coffee with Sarah" appearing 4 times = one item with the 4 entry indexes).
2. Each item needs at least one source entry.
3. Category must be one of: ${CATEGORIES.join(", ")} — "people" (person/relationship), "experiences" (events, trips, activities), "small-moments" (little daily joys), "achievements" (wins, progress, milestones), "other".
4. Keep the gratitude phrase short and concrete, in the same language as the entry.
5. Return at most 30 items, ordered by frequency (most mentioned first).
Return ONLY a valid JSON array, no markdown, no other text:
[{"gratitude": "<short phrase>", "category": "<category>", "entryIndexes": [<1-based entry numbers>]}]`;

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
        max_tokens: 900,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText.slice(0, 200));
      return res.status(502).json({ error: "Gratitude scan service temporarily unavailable" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Gratitude scan returned empty response" });
    }

    let items: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        items = parsed
          .filter((r: any) => r && typeof r.gratitude === "string")
          .map((r: any) => ({
            gratitude: r.gratitude.trim().slice(0, 160),
            category: CATEGORIES.includes(r.category) ? r.category : "other",
            entryIndexes: Array.isArray(r.entryIndexes)
              ? r.entryIndexes.map((n: any) => Number(n)).filter((n: number) => n >= 1 && n <= entries.length)
              : [],
          }))
          .filter((r: any) => r.entryIndexes.length > 0)
          .slice(0, 30);
      }
    } catch {
      items = [];
    }

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Error in gratitude-scan function:", error);
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }
}
