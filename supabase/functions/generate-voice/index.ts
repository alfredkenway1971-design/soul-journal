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
    const { text, voiceId, language = 'en' } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    // Truncate text to reduce credit usage
    const maxLength = 1000;
    let processedText = text;
    if (text.length > maxLength) {
      console.log(`Text truncated from ${text.length} to ${maxLength} characters to reduce credit usage`);
      processedText = text.substring(0, maxLength) + '...';
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Use provided voiceId or default to "George" stock voice
    const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb';
    
    console.log('Generating voice with ElevenLabs, voice ID:', selectedVoiceId);

    // Select model based on language (monolingual is cheaper for English)
    const modelId = language.startsWith('en') ? 'eleven_monolingual_v1' : 'eleven_multilingual_v2';
    // Use lower quality output format to reduce credit usage
    const outputFormat = 'mp3_22050_32';
    
    console.log(`Using model: ${modelId}, output format: ${outputFormat}, text length: ${processedText.length}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: processedText,
          model_id: modelId,
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
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail?.status === 'quota_exceeded') {
          throw new Error(`ElevenLabs quota exceeded: ${errorJson.detail.message}. Please upgrade your ElevenLabs plan or use a different API key.`);
        }
      } catch (parseError) {
        // If parsing fails, continue with original error
      }
      
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
