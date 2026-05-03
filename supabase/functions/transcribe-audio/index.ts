import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  return data.user;
}

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

// ElevenLabs Scribe (best for Swahili)
async function transcribeWithElevenLabs(binaryAudio: Uint8Array): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured');

  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model_id', 'scribe_v2');
  formData.append('language_code', 'swa');
  formData.append('tag_audio_events', 'false');
  formData.append('diarize', 'false');

  console.log('Sending to ElevenLabs Scribe for Swahili transcription...');
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', response.status, errorText);
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log('ElevenLabs transcription successful');
  return result.text;
}

// OpenAI Whisper (default)
async function transcribeWithWhisper(binaryAudio: Uint8Array, languageHint?: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');
  if (languageHint && languageHint !== 'auto') {
    formData.append('language', languageHint);
  }

  console.log('Sending to OpenAI Whisper...', languageHint ? `Language: ${languageHint}` : 'Auto-detect');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log('Whisper transcription successful');
  return result.text;
}

// Cartesia fallback for transcription (uses Whisper-compatible endpoint or basic STT)
async function transcribeWithCartesiaFallback(binaryAudio: Uint8Array, languageHint?: string): Promise<string> {
  // Cartesia doesn't have a direct STT API, so we fall back to a simpler approach
  // If both ElevenLabs and Whisper fail, we throw a clear error
  throw new Error('All transcription engines failed. Please try again later.');
}

const whisperLanguageMap: Record<string, string> = {
  en: 'en', fr: 'fr', es: 'es', ar: 'ar', zh: 'zh', ja: 'ja', sw: 'sw',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { audio, language } = await req.json();
    if (!audio) throw new Error('No audio data provided');

    console.log('Received audio data. App language:', language || 'not specified');
    const binaryAudio = processBase64Chunks(audio);
    
    let text: string;

    if (language === 'sw') {
      // Try ElevenLabs first for Swahili, fallback to Whisper
      try {
        text = await transcribeWithElevenLabs(binaryAudio);
      } catch (elevenLabsError) {
        console.warn('ElevenLabs Swahili failed, falling back to Whisper:', elevenLabsError);
        text = await transcribeWithWhisper(binaryAudio, 'sw');
      }
    } else {
      // Try Whisper first, fallback to ElevenLabs
      try {
        const whisperLang = language ? whisperLanguageMap[language] : undefined;
        text = await transcribeWithWhisper(binaryAudio, whisperLang);
      } catch (whisperError) {
        console.warn('Whisper failed, falling back to ElevenLabs:', whisperError);
        try {
          text = await transcribeWithElevenLabs(binaryAudio);
        } catch (elevenLabsError) {
          console.error('Both transcription engines failed');
          throw new Error('All transcription engines are unavailable. Please try again later.');
        }
      }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
