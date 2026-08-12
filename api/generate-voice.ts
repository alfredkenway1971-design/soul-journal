import { createClient } from "@supabase/supabase-js";

// Vercel serverless function — Fish Audio TTS (replaces Supabase edge fn generate-voice)
// Same contract as the old edge function: { audioContent: base64 }.
// No storage caching here (needs a Supabase service-role key we don't have);
// generation is free (s2.1-pro-free) so caching isn't needed for cost.

const FISH_KEY = process.env.FISH_AUDIO_API_KEY || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const config = { maxDuration: 10 };

async function requireUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

async function generateWithFish(text: string, voiceId: string): Promise<Uint8Array> {
  if (!FISH_KEY) throw new Error("Fish Audio API key not configured");

  // ElevenLabs-compatible endpoint; free model (s2.1-pro-free) costs $0
  const response = await fetch(
    `https://api.fish.audio/compat/elevenlabs/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": FISH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "fish-audio/s2.1-pro-free",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fish Audio API error:", response.status, errorText);
    throw new Error("UPSTREAM_TTS_ERROR");
  }

  const audioBuffer = await response.arrayBuffer();
  return new Uint8Array(audioBuffer);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { text, voiceId, language } = req.body || {};
    if (!text) throw new Error("No text provided");

    // User's cloned voice (stored as dashed UUID -> strip dashes for Fish) or the built-in default
    const effectiveVoiceId = voiceId || "default";
    const fishVoiceId = effectiveVoiceId === "default" ? "default" : effectiveVoiceId.replace(/-/g, "");

    let audioBytes: Uint8Array;
    try {
      audioBytes = await generateWithFish(text, fishVoiceId);
    } catch (fishError) {
      console.warn("Fish Audio failed, retrying with default voice:", fishError);
      try {
        audioBytes = await generateWithFish(text, "default");
      } catch (retryError) {
        console.warn("Fish Audio retry failed:", retryError);
        return res.status(502).json({ error: "Voice generation temporarily unavailable" });
      }
    }

    const base64Audio = Buffer.from(audioBytes).toString("base64");
    return res.status(200).json({ audioContent: base64Audio });
  } catch (error) {
    console.error("Error in generate-voice function:", error);
    return res.status(500).json({ error: "Voice generation temporarily unavailable" });
  }
}
