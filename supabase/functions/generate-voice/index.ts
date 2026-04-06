import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateWithElevenLabs(text: string, voiceId: string): Promise<Uint8Array> {
  const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenLabsApiKey) throw new Error('ElevenLabs API key not configured');

  const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb';
  console.log('Generating voice with ElevenLabs, voice ID:', selectedVoiceId);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', response.status, errorText);
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  console.log('ElevenLabs voice generation successful');
  return new Uint8Array(audioBuffer);
}

async function generateWithCartesia(text: string): Promise<Uint8Array> {
  const cartesiaApiKey = Deno.env.get('CARTESIA_API_KEY');
  if (!cartesiaApiKey) throw new Error('Cartesia API key not configured');

  console.log('Falling back to Cartesia for voice generation...');

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
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
      },
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
    throw new Error(`Cartesia API error (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  console.log('Cartesia voice generation successful');
  return new Uint8Array(audioBuffer);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, entryId, textType } = await req.json();
    if (!text) throw new Error('No text provided');

    // Generate audio bytes
    let audioBytes: Uint8Array;
    try {
      audioBytes = await generateWithElevenLabs(text, voiceId);
    } catch (elevenLabsError) {
      console.warn('ElevenLabs failed, switching to Cartesia fallback:', elevenLabsError);
      audioBytes = await generateWithCartesia(text);
    }

    // If entryId provided, cache to storage and update DB
    if (entryId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const suffix = textType === 'reflection' ? '_reflection' : '';
        const storagePath = `voice-cache/${entryId}${suffix}.mp3`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('journal-audio')
          .upload(storagePath, audioBytes, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
        } else {
          // Update journal_entries with the cached path
          if (textType === 'reflection') {
            // Store reflection audio path in audio_url with a prefix
            // We'll use a convention: reflection audio stored separately
            await supabase
              .from('journal_entries')
              .update({ audio_url: `cached:${storagePath}` })
              .eq('id', entryId)
              .is('audio_url', null); // Only set if not already cached for main
          } else {
            await supabase
              .from('journal_entries')
              .update({ audio_url: `cached:${storagePath}` })
              .eq('id', entryId);
          }
          console.log('Audio cached to storage:', storagePath);
        }
      } catch (cacheError) {
        console.error('Caching error (non-fatal):', cacheError);
      }
    }

    // Return base64 for immediate playback
    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    const base64Audio = base64Encode(audioBytes);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-voice function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
