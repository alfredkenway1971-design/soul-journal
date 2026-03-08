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
    const { userId, language = 'English' } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile with goals and interests
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goals, interests, display_name')
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

    const systemPrompt = `You are a supportive AI life coach analyzing journal entries. Your role is to:
1. Identify patterns and themes in the user's reflections
2. Connect observations to the user's stated goals
3. Provide actionable, encouraging insights
4. Detect potential wellness concerns (stress, burnout, low mood patterns)
5. Suggest specific challenges to help achieve goals

Be warm, supportive, and specific. Reference actual content from entries when possible.
Keep insights concise (1-2 sentences each) but meaningful.`;

    const userPrompt = `Analyze these recent journal entries for ${displayName}:

${goalsContext}
${interestsContext}

Recent mood distribution: ${JSON.stringify(moodCounts)}

JOURNAL ENTRIES:
${entriesContext}

Based on this analysis, generate exactly 4 insights in this JSON format:
{
  "insights": [
    {
      "type": "daily_tip",
      "title": "Brief insight title",
      "content": "1-2 sentence actionable tip based on their entries",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "challenge",
      "title": "Challenge title",
      "content": "A specific, achievable challenge for the next few days that aligns with their goals",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "goal_progress",
      "title": "Progress observation",
      "content": "Observation about progress or patterns related to their goals",
      "related_goal": "Goal title if relevant, or null"
    },
    {
      "type": "wellness_alert" or "daily_tip",
      "title": "Wellness insight or positive observation",
      "content": "If concerning patterns detected, gentle alert. Otherwise, positive observation.",
      "related_goal": null
    }
  ]
}

Return ONLY valid JSON, no markdown or explanations.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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
