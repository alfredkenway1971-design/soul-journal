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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { audio, name } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fishApiKey = Deno.env.get('FISH_AUDIO_API_KEY');
    if (!fishApiKey) {
      return new Response(
        JSON.stringify({ error: 'Fish Audio API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to blob (browser MediaRecorder produces webm/opus — Fish accepts it)
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    // Fish Audio: create a reusable voice model from the sample (fast training)
    const formData = new FormData();
    formData.append('type', 'tts');
    formData.append('title', name || 'My Voice Clone');
    formData.append('description', 'Voice clone created from journal app');
    formData.append('visibility', 'private');
    formData.append('train_mode', 'fast');
    formData.append('voices', audioBlob, 'voice_sample.webm');

    console.log('Creating voice clone with Fish Audio...');

    const authHeaderValue = "Bearer" + " " + fishApiKey;

    const response = await fetch('https://api.fish.audio/model', {
      method: 'POST',
      headers: {
        Authorization: authHeaderValue,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Voice cloning service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const voiceId = result._id;
    console.log('Voice clone created:', voiceId, 'state:', result.state);

    // train_mode=fast usually returns 'trained'; poll briefly if still training
    if (voiceId && result.state && result.state !== 'trained' && result.state !== 'failed') {
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollResponse = await fetch(`https://api.fish.audio/model/${voiceId}`, {
          headers: { Authorization: authHeaderValue },
        });
        if (pollResponse.ok) {
          const pollResult = await pollResponse.json();
          console.log('Voice clone state poll:', pollResult.state);
          if (pollResult.state === 'trained' || pollResult.state === 'failed') break;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        voiceId,
        message: 'Voice clone created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-voice-clone function:', error);
    return new Response(
      JSON.stringify({ error: 'Voice cloning failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
