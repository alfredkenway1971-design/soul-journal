import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, tone = 'natural', customPrompt, language = 'English', styleSamples = [] } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Enhancing text with tone:', tone, 'styleSamples:', styleSamples.length);

    let systemPrompt: string;
    let userMessage: string;

    // Style fingerprint from user's recent entries (mirror voice without copying)
    const styleBlock = styleSamples.length > 0
      ? `\n\nThe writer's natural voice samples (mirror their rhythm, vocabulary, sentence length, and tone — do NOT copy phrases verbatim):\n---\n${styleSamples.slice(0, 3).map((s: string, i: number) => `Sample ${i + 1}: ${String(s).substring(0, 400)}`).join('\n\n')}\n---`
      : '';

    if (customPrompt) {
      systemPrompt = 'You are a helpful assistant that follows instructions precisely.';
      userMessage = `${customPrompt}\n\n${text}`;
    } else if (tone === 'expand') {
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: customPrompt ? 50 : 2000,
        temperature: customPrompt ? 0.8 : 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const enhancedText = data.choices[0].message.content;

    console.log('Text enhancement successful');

    return new Response(
      JSON.stringify({ enhancedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-text function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
