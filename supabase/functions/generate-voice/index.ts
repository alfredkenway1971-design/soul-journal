import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  return data.user;
}

// Fish Audio: 'default' uses the model's built-in multilingual voice;
// a user's cloned voice (Fish model id) is passed through as-is.
function pickDefaultVoiceId(_language: string, _gender: string): string {
  return 'default';
}

async function generateWithFish(text: string, voiceId: string): Promise<Uint8Array> {
  const fishApiKey = Deno.env.get('FISH_AUDIO_API_KEY');
  if (!fishApiKey) throw new Error('Fish Audio API key not configured');

  console.log('Generating voice with Fish Audio, voice ID:', voiceId);

  // ElevenLabs-compatible endpoint; the free model (s2.1-pro-free) costs $0
  const response = await fetch(
    `https://api.fish.audio/compat/elevenlabs/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': fishApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'fish-audio/s2.1-pro-free',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Fish Audio API error:', response.status, errorText);
    throw new Error('UPSTREAM_TTS_ERROR');
  }

  const audioBuffer = await response.arrayBuffer();
  console.log('Fish Audio voice generation successful');
  return new Uint8Array(audioBuffer);
}

async function generateWithCartesia(text: string, language: string): Promise<Uint8Array> {
  const cartesiaApiKey = Deno.env.get('CARTESIA_API_KEY');
  if (!cartesiaApiKey) throw new Error('Cartesia API key not configured');

  console.log('Falling back to Cartesia for voice generation...');

  const isFrench = language?.startsWith('fr');

  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': cartesiaApiKey,
      'Cartesia-Version': '2024-06-10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: text,
      model_id: 'sonic-2',
      voice: {
        mode: 'id',
        id: isFrench
          ? 'a0e99841-438c-4a64-b679-ae501e7d6091'  // French voice
          : '79a125e8-cd45-4c13-8a67-188112f4dd22',  // Canadian English voice
      },
      language: isFrench ? 'fr' : 'en',
      output_format: {
        container: 'mp3',
        bit_rate: 128000,
        sample_rate: 44100,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cartesia API error:', response.status, errorText);
    throw new Error('UPSTREAM_TTS_ERROR');
  }

  const audioBuffer = await response.arrayBuffer();
  console.log('Cartesia voice generation successful');
  return new Uint8Array(audioBuffer);
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
    const { text, voiceId, entryId, textType, language, gender } = await req.json();
    if (!text) throw new Error('No text provided');

    // Determine the voice to use:
    // 1. User's cloned voice (voiceId) takes priority
    // 2. Otherwise pick gender+language default
    const effectiveVoiceId = voiceId || pickDefaultVoiceId(language || 'en', gender || 'male');

    // Generate audio bytes (Fish Audio primary, default-voice retry, Cartesia fallback)
    let audioBytes: Uint8Array;
    try {
      audioBytes = await generateWithFish(text, effectiveVoiceId);
    } catch (fishError) {
      console.warn('Fish Audio failed, retrying with default voice:', fishError);
      try {
        audioBytes = await generateWithFish(text, 'default');
      } catch (retryError) {
        console.warn('Fish Audio retry failed, switching to Cartesia fallback:', retryError);
        audioBytes = await generateWithCartesia(text, language || 'en');
      }
    }

    // If entryId provided, cache to storage and update DB (verify ownership first)
    if (entryId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Ownership check
        const { data: entryRow, error: ownErr } = await supabase
          .from('journal_entries')
          .select('id,user_id')
          .eq('id', entryId)
          .maybeSingle();

        if (ownErr || !entryRow || entryRow.user_id !== user.id) {
          console.warn('Skipping cache: entry not owned by caller');
        } else {

        const suffix = textType === 'reflection' ? '_reflection' : '';
        const storagePath = `voice-cache/${entryId}${suffix}.mp3`;

        const { error: uploadError } = await supabase.storage
          .from('journal-audio')
          .upload(storagePath, audioBytes, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
        } else {
          const updateField = textType === 'reflection' 
            ? { reflection_audio_url: storagePath }
            : { audio_url: storagePath };
          
          await supabase
            .from('journal_entries')
            .update(updateField)
            .eq('id', entryId);
          console.log('Audio cached to storage:', storagePath);
        }
        }
      } catch (cacheError) {
        console.error('Caching error (non-fatal):', cacheError);
      }
    }

    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    const base64Audio = base64Encode(audioBytes);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-voice function:', error);
    return new Response(
      JSON.stringify({ error: 'Voice generation temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
