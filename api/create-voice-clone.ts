import { createClient } from "@supabase/supabase-js";

// Vercel serverless function — Fish Audio voice cloning (replaces Supabase edge fn create-voice-clone)
// Same contract as the old edge function: { voiceId, message }.

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { audio, name } = req.body || {};
    if (!audio) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    // Decode base64 → blob (browser MediaRecorder produces webm/opus — Fish accepts it)
    const audioBytes = Buffer.from(audio, "base64");
    const audioBlob = new Blob([audioBytes], { type: "audio/webm" });

    // Fish Audio: create a reusable voice model from the sample (fast training)
    const formData = new FormData();
    formData.append("type", "tts");
    formData.append("title", name || "My Voice Clone");
    formData.append("description", "Voice clone created from journal app");
    formData.append("visibility", "private");
    formData.append("train_mode", "fast");
    formData.append("voices", audioBlob, "voice_sample.webm");

    const response = await fetch("https://api.fish.audio/model", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + FISH_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fish Audio API error:", response.status, errorText);
      return res.status(502).json({ error: "Voice cloning service unavailable" });
    }

    const result = await response.json();
    const voiceId = result._id;
    console.log("Voice clone created:", voiceId, "state:", result.state);

    return res.status(200).json({
      voiceId,
      message: "Voice clone created successfully",
    });
  } catch (error) {
    console.error("Error in create-voice-clone function:", error);
    return res.status(500).json({ error: "Voice cloning failed" });
  }
}
