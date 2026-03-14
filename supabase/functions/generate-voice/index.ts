import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Languages supported by eleven_multilingual_v2. Anything outside this list
  // requires eleven_turbo_v2_5 (which has broader language coverage incl. Swahili).
  const MULTILINGUAL_V2_SUPPORTED = new Set([
    'en','de','pl','es','it','fr','pt','hi','ar','zh','ja','ko','nl','tr',
    'sv','id','fil','ms','ro','uk','el','cs','da','fi','bg','hr','sk','ta','ru',
  ]);

  try {
    const { text, voiceId, language } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Use provided voiceId or default to "George" stock voice
    const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb';

    // eleven_multilingual_v2 doesn't support Swahili; use eleven_turbo_v2_5 for it
    const langCode = language || 'en';
    const modelId = MULTILINGUAL_V2_SUPPORTED.has(langCode)
      ? 'eleven_multilingual_v2'
      : 'eleven_turbo_v2_5';

    console.log(`Generating voice – model: ${modelId}, language: ${langCode}, voice ID: ${selectedVoiceId}`);

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
          model_id: modelId,
          language_code: langCode,
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
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Encode as base64
    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    const base64Audio = base64Encode(audioBuffer);

    console.log('Voice generation successful');

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-voice function:', error);
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
