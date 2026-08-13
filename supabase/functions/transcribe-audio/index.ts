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

class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Primary: self-hosted Whisper server on the VPS (free, offline-capable)
async function transcribeWithWhisper(binaryAudio: Uint8Array, languageOverride?: string): Promise<{ text: string }> {
  const WHISPER_API_KEY = Deno.env.get('WHISPER_API_KEY');
  if (!WHISPER_API_KEY) throw new Error('WHISPER_API_KEY is not configured');

  const form = new FormData();
  form.append('file', new Blob([binaryAudio], { type: 'audio/wav' }), 'recording.wav');
  form.append('temperature', '0.0');
  form.append('response_format', 'json');
  if (languageOverride && languageOverride !== 'auto') {
    form.append('language', languageOverride);
  }

  const response = await fetch('http://144.91.106.188:8082/inference', {
    method: 'POST',
    headers: { 'x-api-key': WHISPER_API_KEY },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Whisper server error:', response.status, errorText);
    if (response.status === 429) throw new UpstreamError('Too many requests right now. Please try again in a moment.', 429);
    if (response.status === 400) throw new UpstreamError('That recording could not be read. Please record again (a bit longer).', 400);
    throw new UpstreamError('Transcription service temporarily unavailable.', 502);
  }

  const result = await response.json();
  return { text: result.text ?? '' };
}

// Language detection for Latin-script languages (the script check can't tell
// French/English/Spanish apart) — one tiny, cheap LLM call.
async function detectLanguageWithAI(text: string): Promise<string | null> {
  const aiBase = Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
  const aiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
  const aiKey = Deno.env.get('OPENAI_API_KEY');
  if (!aiKey || !text.trim()) return null;
  try {
    const response = await fetch(`${aiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + aiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: `Identify the language of this text and reply with ONLY the 2-letter ISO code (fr, en, es, de, ar, zh, ja, sw, ...). Text: "${text.substring(0, 500)}"` }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const code = (data.choices?.[0]?.message?.content || '').trim().toLowerCase().slice(0, 2);
    return /^[a-z]{2}$/.test(code) ? code : null;
  } catch (e) {
    console.warn('AI language detection failed:', e);
    return null;
  }
}

// Swahili-only fallback: ElevenLabs Scribe
async function transcribeWithElevenLabs(binaryAudio: Uint8Array): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured');

  const formData = new FormData();
  formData.append('file', new Blob([binaryAudio], { type: 'audio/webm' }), 'audio.webm');
  formData.append('model_id', 'scribe_v2');
  formData.append('language_code', 'swa');
  formData.append('tag_audio_events', 'false');
  formData.append('diarize', 'false');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('ElevenLabs API error:', response.status, errorText);
    throw new Error('UPSTREAM_STT_ERROR');
  }

  const result = await response.json();
  return result.text;
}

// Lightweight script-based language detection so entries can render with the
// correct text direction without an extra model call.
function detectLanguage(text: string): string | null {
  const t = text || '';
  if (/[\u0600-\u06FF]/.test(t)) return 'ar';
  if (/[\u0590-\u05FF]/.test(t)) return 'he';
  if (/[\u4E00-\u9FFF]/.test(t)) return 'zh';
  if (/[\u3040-\u30FF]/.test(t)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(t)) return 'ko';
  if (/[\u0400-\u04FF]/.test(t)) return 'ru';
  if (/[\u0900-\u097F]/.test(t)) return 'hi';
  return null;
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
    const body = await req.json();
    const audio = body?.audio;
    // `languageOverride` forces a language; plain `language` (the UI language) is
    // intentionally ignored so the spoken language is preserved.
    const languageOverride: string | undefined = body?.languageOverride;
    if (!audio) throw new UpstreamError('No audio data provided', 400);

    console.log('Received audio. Override:', languageOverride || 'auto-detect');
    const binaryAudio = processBase64Chunks(audio);

    let text: string;
    const r = await transcribeWithWhisper(binaryAudio, languageOverride);
    text = r.text;

    let detected = languageOverride && languageOverride !== 'auto'
      ? languageOverride
      : detectLanguage(text);
    if (!detected && text.trim().length > 10) {
      detected = await detectLanguageWithAI(text);
    }

    return new Response(
      JSON.stringify({ text, language: detected }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    const status = error instanceof UpstreamError ? error.status : 500;
    const message = error instanceof UpstreamError
      ? error.message
      : 'Transcription service temporarily unavailable';
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
