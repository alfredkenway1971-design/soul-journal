import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Goal {
  id: string;
  title: string;
  category: string;
}

interface JournalEntry {
  id: string;
  enhanced_text: string;
  mood: string;
  created_at: string;
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language = 'English' } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const aiBase = Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    const aiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    // Verify caller's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile with goals, interests, and soul profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goals, interests, display_name, soul_profile_summary, strengths, fears, worldview')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const goals: Goal[] = (profile?.goals as Goal[]) || [];
    const interests: string[] = profile?.interests || [];
    const displayName = profile?.display_name || 'User';
    const soulProfile = profile?.soul_profile_summary as Record<string, any> | null;
    const strengths: string[] = profile?.strengths || soulProfile?.strengths || [];
    const fears: string[] = profile?.fears || soulProfile?.fears || [];
    const worldview: string = profile?.worldview || '';
    const growthAreas: string[] = soulProfile?.growth_areas || [];
    const personalityType: string = soulProfile?.personality_type || '';
    const coachingFocus: string[] = soulProfile?.coaching_focus || [];

    // Fetch recent journal entries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, enhanced_text, mood, created_at, title')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (entriesError) {
      console.error('Entries fetch error:', entriesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recent entries to analyze', insightsCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context for AI
    const goalsContext = goals.length > 0 
      ? `User's goals: ${goals.map(g => g.title).join(', ')}`
      : 'User has not set specific goals yet.';
    
    const interestsContext = interests.length > 0
      ? `User's interests: ${interests.join(', ')}`
      : '';

    // Soul profile context
    const soulProfileContext = [
      strengths.length > 0 ? `Core strengths: ${strengths.join(', ')}` : '',
      fears.length > 0 ? `Deep fears: ${fears.join(', ')}` : '',
      growthAreas.length > 0 ? `Growth areas: ${growthAreas.join(', ')}` : '',
      personalityType ? `Personality: ${personalityType}` : '',
      coachingFocus.length > 0 ? `Coaching focus: ${coachingFocus.join(', ')}` : '',
      worldview ? `Worldview/belief system: ${worldview}` : '',
      soulProfile?.summary ? `Profile summary: ${soulProfile.summary}` : '',
    ].filter(Boolean).join('\n');

    const entriesContext = entries.map((e: JournalEntry) => 
      `[${new Date(e.created_at).toLocaleDateString()}] Mood: ${e.mood || 'unknown'}\n${e.enhanced_text || ''}`
    ).join('\n\n---\n\n');

    // Analyze mood patterns
    const moodCounts: Record<string, number> = {};
    entries.forEach((e: JournalEntry) => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });

    const systemPrompt = `You are a deeply perceptive AI life coach analyzing journal entries. You do NOT just encourage — you coach with honesty and nuance.

## USER'S SOUL PROFILE
${soulProfileContext || 'No soul profile available yet.'}

## STEP 1 — CONTEXTUAL ANALYSIS (internal, do not output)
Before generating insights, silently analyze ALL entries for:
• Emotional patterns (persistent low mood, avoidance, stagnation vs. growth, breakthroughs)
• Cognitive distortions (all-or-nothing thinking, catastrophizing, self-blame, minimizing success, externalizing blame)
• Self-sabotaging patterns (procrastination excuses, comfort-zone clinging, deflecting responsibility)
• Goal alignment — is the user actively working toward their goals or drifting?
• Whether their stated Strengths are being used or neglected
• Whether their Fears are being confronted or avoided
• How their Growth Areas and Coaching Focus relate to recent entries

## STEP 2 — BALANCED RESPONSE FORMULA
For each insight, choose the appropriate coaching mode:

**NURTURE** (for vulnerability, genuine effort, self-doubt despite action, real progress):
→ Validate, affirm, connect progress to strengths. Be warm and specific.

**CHALLENGE** (for avoidance, repeated excuses, cognitive distortions, stagnation, self-sabotage):
→ Name the pattern. Question assumptions. Offer an alternative perspective. Be compassionate but firm.
→ Do NOT sugarcoat. Real coaches say hard truths when needed.

**BLEND** (most cases): Brief empathy, then a growth-oriented reframe or provocative question.

## STEP 3 — RULES
- Reference ACTUAL content from entries. Never be generic.
- Keep each insight to 1-2 sentences but make every word count.
- Challenges should be specific and achievable, not vague motivational fluff.
- If you spot a pattern the user can't see, name it directly.
- Wellness alerts should be honest — if someone is spiraling, say so gently but clearly.
- When the user's Soul Profile is available, tailor insights to their specific strengths, fears, growth areas, and personality. Reference these directly.
- If the user has a worldview/belief system, incorporate culturally sensitive wisdom from that tradition when appropriate.

IMPORTANT: Respond entirely in ${language}. All titles and content must be in ${language}.`;

    const userPrompt = `Analyze these recent journal entries for ${displayName}:

${goalsContext}
${interestsContext}

Recent mood distribution: ${JSON.stringify(moodCounts)}

JOURNAL ENTRIES:
${entriesContext}

Based on your contextual analysis, generate exactly 4 insights in this JSON format:
{
  "insights": [
    {
      "type": "daily_tip",
      "title": "Brief insight title",
      "content": "1-2 sentence tip — nurture if they're genuinely trying, challenge if they're stuck in a pattern",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "challenge",
      "title": "Challenge title",
      "content": "A specific, achievable challenge that directly addresses a pattern or blocker you identified. If they're avoiding something, the challenge should push them toward it.",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "goal_progress",
      "title": "Progress or drift observation",
      "content": "Honest assessment — affirm real progress OR name the gap between stated goals and actual behavior. Don't pretend things are fine if they're not.",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "wellness_alert" or "daily_tip",
      "title": "Wellness insight",
      "content": "If concerning patterns detected (persistent negativity, avoidance, burnout signs), name them clearly and compassionately. If positive, affirm specifically.",
      "related_goal": null
    }
  ]
}

Return ONLY valid JSON, no markdown or explanations.`;

    // Call OpenAI-compatible endpoint (DeepSeek by default)
    const aiResponse = await fetch(`${aiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openaiApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No AI content received');
      return new Response(
        JSON.stringify({ error: 'No insights generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let parsedInsights;
    try {
      // Clean potential markdown formatting
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      parsedInsights = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert insights into database
    const insightsToInsert = parsedInsights.insights.map((insight: any) => ({
      user_id: userId,
      insight_type: insight.type,
      title: insight.title,
      content: insight.content,
      related_goal: insight.related_goal,
      expires_at: insight.type === 'challenge' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days for challenges
        : null,
    }));

    const { error: insertError } = await supabase
      .from('coaching_insights')
      .insert(insightsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${insightsToInsert.length} insights for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        message: 'Insights generated successfully',
        insightsCount: insightsToInsert.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-coaching-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
