import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    const cartesiaApiKey = Deno.env.get('CARTESIA_API_KEY');
    if (!cartesiaApiKey) {
      throw new Error('Cartesia API key not configured');
    }

    // Use provided voiceId or default to a Cartesia stock voice
    const selectedVoiceId = voiceId || '694f9389-aac1-45b6-b726-9d9369183238'; // Default Cartesia voice
    
    console.log('Generating voice with Cartesia, voice ID:', selectedVoiceId);

    const response = await fetch(
      'https://api.cartesia.ai/tts/bytes',
      {
        method: 'POST',
        headers: {
          'X-API-Key': cartesiaApiKey,
          'Cartesia-Version': '2025-04-16',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-2',
          transcript: text,
          voice: {
            mode: 'id',
            id: selectedVoiceId,
          },
          language: 'en',
          output_format: {
            container: 'mp3',
            bit_rate: 128000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', errorText);
      throw new Error(`Cartesia API error: ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Encode as base64 using Deno standard library
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
