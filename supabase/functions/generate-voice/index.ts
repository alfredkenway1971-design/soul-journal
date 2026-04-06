import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateWithElevenLabs(text: string, voiceId: string): Promise<{ audioContent: string }> {
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
  const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
  const base64Audio = base64Encode(audioBuffer);
  console.log('ElevenLabs voice generation successful');
  return { audioContent: base64Audio };
}

async function generateWithCartesia(text: string): Promise<{ audioContent: string }> {
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
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091', // Default English voice
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
  const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
  const base64Audio = base64Encode(audioBuffer);
  console.log('Cartesia voice generation successful');
  return { audioContent: base64Audio };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    if (!text) throw new Error('No text provided');

    let result: { audioContent: string };

    try {
      result = await generateWithElevenLabs(text, voiceId);
    } catch (elevenLabsError) {
      console.warn('ElevenLabs failed, switching to Cartesia fallback:', elevenLabsError);
      result = await generateWithCartesia(text);
    }

    return new Response(
      JSON.stringify(result),
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
