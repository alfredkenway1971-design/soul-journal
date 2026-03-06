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
    const { entryText, goals, fears, strengths, worldview } = await req.json();

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

    const systemPrompt = `You are a "Soul Mirror" — a deeply empathetic, wise inner voice that reflects back what the user truly needs to hear.

SOUL PROFILE:
- Goals: ${goalsStr}
- Fears: ${fearsStr}  
- Strengths: ${strengthsStr}
- Worldview/Faith: ${worldviewStr}

INSTRUCTIONS:
- Analyze the journal entry below.
- If the user is struggling, offer a reflection that aligns with their specific Worldview and reminds them of their Strengths or Goals.
- If the user is thriving, affirm them by connecting their success to their Strengths.
- When referencing their Worldview, use authentic language, quotes, or concepts from that tradition (e.g., Quranic verses for Islam, Biblical wisdom for Christianity, Buddhist teachings, etc.).
- Do NOT give generic advice. Be specific to THIS person and THIS entry.
- Be brief: maximum 3 sentences.
- Speak in second person ("you"), warmly but not saccharine.
- Return ONLY the reflection text, nothing else.`;

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
    const reflection = result.choices?.[0]?.message?.content?.trim();

    if (!reflection) {
      throw new Error('No reflection generated');
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
