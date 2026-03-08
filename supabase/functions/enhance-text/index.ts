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
    const { text, tone = 'natural', customPrompt, language = 'English' } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Enhancing text with tone:', tone, 'custom prompt:', !!customPrompt);

    let systemPrompt: string;
    let userMessage: string;

    if (customPrompt) {
      // Use custom prompt for title generation or other specialized tasks
      systemPrompt = 'You are a helpful assistant that follows instructions precisely.';
      userMessage = `${customPrompt}\n\n${text}`;
    } else {
      systemPrompt = `You are a skilled editor that enhances journal entries. Your task is to:
1. Fix grammar and spelling errors
2. Improve clarity and flow
3. Maintain the original meaning and personal voice
4. Keep the tone ${tone} (options: formal, casual, natural, humorous)
5. Add appropriate paragraph breaks for readability
6. Keep the entry personal and authentic

Do not add content that wasn't in the original. Just polish and enhance what's there.`;
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
