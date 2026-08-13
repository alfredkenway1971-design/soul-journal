import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  return data.user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { answers, worldview, language } = await req.json();

    if (!answers || !Array.isArray(answers) || answers.length < 6) {
      throw new Error('At least 6 answers are required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const aiBase = Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    const aiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const questionLabels = [
      "Identity (Tell me about yourself)",
      "Growth (What are you trying to improve)",
      "Pride (What are you proud of)",
      "Blockers (What holds you back)",
      "Fears (What are you afraid of)",
      "Motivation (When do you feel most alive)",
      "Worldview/Belief System",
    ];

    const answersFormatted = answers.map((a: string, i: number) => 
      `${questionLabels[i] || `Question ${i+1}`}: ${a}`
    ).join('\n\n');

    const worldviewContext = worldview ? `\nUser's belief system/worldview: ${worldview}` : '';

    const systemPrompt = `You are an expert psychologist and life coach AI. Analyze the user's onboarding answers to create a comprehensive soul profile. Be empathetic, insightful, and constructive.

Return a JSON object with exactly this structure:
{
  "strengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "fears": ["fear1", "fear2", "fear3"],
  "personality_type": "A brief 1-2 sentence personality summary",
  "coaching_focus": ["focus_area1", "focus_area2", "focus_area3"],
  "motivational_triggers": ["trigger1", "trigger2"],
  "growth_areas": ["area1", "area2", "area3"],
  "summary": "A warm, empathetic 3-4 sentence psychological profile summary that makes the user feel understood and motivated. Address them directly with 'you'."
}

Guidelines:
- Strengths: Identify 5 core character strengths from their answers
- Weaknesses: Frame as growth opportunities, not flaws (3 items)
- Fears: Extract deep fears, not surface-level ones (3 items)
- Coaching focus: What the AI coach should prioritize
- Be culturally sensitive based on their worldview
- ${language === 'fr' ? 'Respond in French' : language === 'es' ? 'Respond in Spanish' : language === 'ar' ? 'Respond in Arabic' : language === 'sw' ? 'Respond in Swahili' : language === 'zh' ? 'Respond in Chinese' : language === 'ja' ? 'Respond in Japanese' : language === 'de' ? 'Respond in German' : 'Respond in English'}`;

    const response = await fetch(`${aiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here are my onboarding answers:\n\n${answersFormatted}${worldviewContext}` },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const profileData = JSON.parse(result.choices[0].message.content);

    console.log('Soul profile analysis complete');

    return new Response(
      JSON.stringify({ profile: profileData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-soul-profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
