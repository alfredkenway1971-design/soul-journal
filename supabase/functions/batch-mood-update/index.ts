import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Require authenticated admin caller
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // Get all entries with mood='fine' or null
    const { data: entries, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id, enhanced_text, original_transcription, mood')
      .or('mood.eq.fine,mood.is.null');

    if (fetchError) throw fetchError;
    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No entries to update', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${entries.length} entries to analyze`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');
    const aiBase = Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    const aiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    const results: { id: string; oldMood: string | null; newMood: string }[] = [];

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < entries.length; i += 5) {
      const batch = entries.slice(i, i + 5);
      const promises = batch.map(async (entry) => {
        const text = entry.enhanced_text || entry.original_transcription || '';
        if (!text.trim()) return;

        try {
          const response = await fetch(`${aiBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + openaiApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                {
                  role: 'user',
                  content: `Analyze the sentiment of this journal entry and respond with EXACTLY one word from this list: happy, good, fine, sad, unhappy. Choose the mood that best matches the overall emotional tone. Only respond "fine" if the text is truly neutral. Here is the entry:\n\n${text.substring(0, 500)}`,
                },
              ],
              temperature: 0.1,
              max_tokens: 10,
            }),
          });

          if (!response.ok) {
            console.error(`AI error for entry ${entry.id}:`, await response.text());
            return;
          }

          const aiData = await response.json();
          const mood = aiData.choices?.[0]?.message?.content?.trim().toLowerCase() || 'fine';
          const validMoods = ['happy', 'good', 'fine', 'sad', 'unhappy'];
          const finalMood = validMoods.includes(mood) ? mood : 'fine';

          // Only update if mood actually changed
          if (finalMood !== entry.mood) {
            const { error: updateError } = await supabase
              .from('journal_entries')
              .update({ mood: finalMood })
              .eq('id', entry.id);

            if (updateError) {
              console.error(`Update error for ${entry.id}:`, updateError);
            } else {
              results.push({ id: entry.id, oldMood: entry.mood, newMood: finalMood });
              console.log(`Updated ${entry.id}: ${entry.mood} → ${finalMood}`);
            }
          }
        } catch (err) {
          console.error(`Error processing entry ${entry.id}:`, err);
        }
      });

      await Promise.all(promises);
      // Small delay between batches
      if (i + 5 < entries.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(
      JSON.stringify({ message: `Updated ${results.length} entries`, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Batch mood update error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
