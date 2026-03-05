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
    const { audio, name } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cartesiaApiKey = Deno.env.get('CARTESIA_API_KEY');
    if (!cartesiaApiKey) {
      return new Response(
        JSON.stringify({ error: 'Cartesia API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to blob
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    // Create form data for Cartesia Voice Clone API
    const formData = new FormData();
    formData.append('clip', audioBlob, 'voice_sample.webm');

    console.log('Creating voice clone with Cartesia...');

    // Call Cartesia Voice Clone API
    const response = await fetch('https://api.cartesia.ai/voices/clone', {
      method: 'POST',
      headers: {
        'X-API-Key': cartesiaApiKey,
        'Cartesia-Version': '2025-04-16',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Voice cloning failed: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Voice clone created:', result.id);

    return new Response(
      JSON.stringify({ 
        voiceId: result.id,
        message: 'Voice clone created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-voice-clone function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
