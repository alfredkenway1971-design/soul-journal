import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryText, goals, fears, strengths, worldview, language = 'English' } = await req.json();

    if (!entryText) {
      throw new Error('No entry text provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const goalsStr = goals?.length ? goals.map((g: any) => g.title || g).join(', ') : 'None specified';
    const fearsStr = fears?.length ? fears.join(', ') : 'None specified';
    const strengthsStr = strengths?.length ? strengths.join(', ') : 'None specified';
    const worldviewStr = worldview || 'Not specified';

    const systemPrompt = `You are a "Soul Mirror" — a deeply perceptive, wise inner coach that reflects back what the user truly NEEDS to hear, not just what they want to hear.

SOUL PROFILE:
- Goals: ${goalsStr}
- Fears: ${fearsStr}
- Strengths: ${strengthsStr}
- Worldview/Faith: ${worldviewStr}

## STEP 1 — CONTEXTUAL ANALYSIS (internal, do not output this)
Before responding, silently analyze the entry for:
• Emotional tone (vulnerable, hopeful, frustrated, avoidant, celebratory, etc.)
• Cognitive distortions (all-or-nothing thinking, catastrophizing, mind-reading, self-blame, minimizing success)
• Self-sabotaging patterns (procrastination excuses, deflecting responsibility, comfort-zone clinging)
• Alignment with stated Goals — is the user moving toward them or drifting?
• Presence of Fears — are they being faced or avoided?
• Use of Strengths — are they being leveraged or ignored?

## STEP 2 — BALANCED RESPONSE FORMULA
Choose your coaching style based on the analysis:

**NURTURE mode** (when the entry shows vulnerability, genuine effort, self-doubt despite action, or real progress):
→ Validate their feelings, affirm their courage, connect their progress to their Strengths.
→ Use their Worldview tradition for comfort (e.g., Quranic mercy verses, Biblical encouragement, Buddhist compassion teachings).

**CHALLENGE mode** (when the entry reveals avoidance, repeated excuses, cognitive distortions, comfort-zone stagnation, or self-sabotage):
→ Gently but firmly question their assumptions. Name the pattern you see.
→ Offer an alternative perspective they haven't considered.
→ Connect the challenge directly to a specific Fear or Goal from their profile.
→ Use their Worldview tradition for accountability (e.g., Quranic calls to action, Stoic discipline, Biblical perseverance).

**BLEND mode** (most entries): Lead with brief empathy, then pivot to a growth-oriented question or reframe.

## STEP 3 — RESPONSE RULES
- Be specific to THIS person and THIS entry. Reference actual words or situations from the entry.
- Maximum 3 sentences. Every word must earn its place.
- Speak in second person ("you"), with warmth but also honesty.
- Do NOT be generic, saccharine, or purely motivational. Real coaches sometimes say hard truths.
- If you spot a pattern the user might not see (e.g., they always blame external factors), name it compassionately.
- When referencing their Worldview, use authentic language, quotes, or concepts from that tradition.
- IMPORTANT: Detect the language of the journal entry and respond entirely in THAT SAME language. Always match the entry's language.
- Return your response as JSON: {"mode": "nurture" | "challenge" | "blend", "reflection": "your reflection text"}
- Return ONLY the JSON, no markdown or extra text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: entryText },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error('No reflection generated');
    }

    // Parse JSON response to extract mode and reflection
    let reflection: string;
    let mode: string = 'blend';
    try {
      const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      reflection = parsed.reflection || rawContent;
      mode = parsed.mode || 'blend';
    } catch {
      // Fallback: treat entire response as reflection
      reflection = rawContent;
    }

    console.log('Soul reflection generated successfully');

    return new Response(
      JSON.stringify({ reflection }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-soul-reflection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
