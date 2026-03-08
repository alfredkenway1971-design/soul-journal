import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Transcribe using ElevenLabs Scribe (better for Swahili)
async function transcribeWithElevenLabs(binaryAudio: Uint8Array): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model_id', 'scribe_v2');
  formData.append('language_code', 'swa'); // ISO 639-3 for Swahili
  formData.append('tag_audio_events', 'false');
  formData.append('diarize', 'false');

  console.log('Sending to ElevenLabs Scribe API for Swahili transcription...');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', errorText);
    throw new Error(`ElevenLabs API error: ${errorText}`);
  }

  const result = await response.json();
  console.log('ElevenLabs transcription successful');
  return result.text;
}

// Transcribe using OpenAI Whisper (default for most languages)
async function transcribeWithWhisper(binaryAudio: Uint8Array, languageHint?: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');
  
  // Pass language hint if provided (ISO 639-1 codes)
  if (languageHint && languageHint !== 'auto') {
    formData.append('language', languageHint);
  }

  console.log('Sending to OpenAI Whisper API...', languageHint ? `Language hint: ${languageHint}` : 'Auto-detect');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const result = await response.json();
  console.log('Whisper transcription successful');
  return result.text;
}

// Map app language codes to Whisper ISO 639-1 codes
const whisperLanguageMap: Record<string, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  ar: 'ar',
  zh: 'zh',
  ja: 'ja',
  sw: 'sw', // Whisper supports Swahili but ElevenLabs is better for it
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, language } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Received audio data, processing... App language:', language || 'not specified');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    let text: string;

    // Route Swahili to ElevenLabs for better transcription quality
    if (language === 'sw') {
      console.log('Using ElevenLabs Scribe for Swahili');
      text = await transcribeWithElevenLabs(binaryAudio);
    } else {
      // Use Whisper for all other languages with language hint
      const whisperLang = language ? whisperLanguageMap[language] : undefined;
      text = await transcribeWithWhisper(binaryAudio, whisperLang);
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
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
