// Per-language voice profiles stored client-side (localStorage cache) AND
// synced per-user to the backend `voice_profiles` table so clones survive
// device/browser changes (WhatsApp WebView clears localStorage often).

import { supabase } from "@/integrations/supabase/client";

const KEY = "sj-voice-profiles";

export interface VoiceProfiles {
  defaultLang: string | null;
  voices: Record<string, string>; // language code (en, fr, ...) -> Fish voice id (dashed UUID)
}

export const normalizeLang = (lang?: string | null): string | null => {
  if (!lang) return null;
  const n = lang.toLowerCase().slice(0, 2);
  return /^[a-z]{2}$/.test(n) ? n : null;
};

export const getVoiceProfiles = (): VoiceProfiles => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.voices) {
        return { defaultLang: parsed.defaultLang || null, voices: parsed.voices };
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return { defaultLang: null, voices: {} };
};

export const saveVoiceProfile = (lang: string, voiceId: string, makeDefault = false): VoiceProfiles => {
  const cur = getVoiceProfiles();
  cur.voices[lang] = voiceId;
  if (makeDefault || !cur.defaultLang) cur.defaultLang = lang;
  localStorage.setItem(KEY, JSON.stringify(cur));
  return cur;
};

export const removeVoiceProfile = (lang: string): VoiceProfiles => {
  const cur = getVoiceProfiles();
  delete cur.voices[lang];
  if (cur.defaultLang === lang) {
    cur.defaultLang = Object.keys(cur.voices)[0] || null;
  }
  localStorage.setItem(KEY, JSON.stringify(cur));
  return cur;
};

/** Voice for a specific entry language, or null. */
export const getVoiceForLanguage = (lang?: string | null): string | null => {
  const n = normalizeLang(lang);
  if (!n) return null;
  const p = getVoiceProfiles();
  return p.voices[n] || null;
};

/** Primary voice: explicit default -> DB value (legacy) -> first profile. */
export const getDefaultVoiceId = (dbVoiceId?: string | null): string | null => {
  const p = getVoiceProfiles();
  if (p.defaultLang && p.voices[p.defaultLang]) return p.voices[p.defaultLang];
  if (dbVoiceId) return dbVoiceId;
  const first = Object.keys(p.voices)[0];
  return first ? p.voices[first] : null;
};

export const hasVoiceForLanguage = (lang?: string | null): boolean => !!getVoiceForLanguage(lang);

// ── Backend persistence (voice_profiles table, RLS: own rows only) ──

/** All clones stored on the backend for this user: { lang -> voiceId }. */
export const fetchDbVoiceProfiles = async (userId: string): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from("voice_profiles")
    .select("lang, voice_id")
    .eq("user_id", userId);
  if (error) {
    console.warn("fetchDbVoiceProfiles:", error);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data || []) {
    if (row?.lang && row?.voice_id) out[row.lang] = row.voice_id;
  }
  return out;
};

/** Upsert one clone row (user_id + lang is the primary key). */
export const saveVoiceProfileToDb = async (userId: string, lang: string, voiceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("voice_profiles")
    .upsert(
      { user_id: userId, lang, voice_id: voiceId, updated_at: new Date().toISOString() },
      { onConflict: "user_id,lang" }
    );
  if (error) console.warn("saveVoiceProfileToDb:", error);
  return !error;
};

/** Delete one clone row for the user. */
export const removeVoiceProfileFromDb = async (userId: string, lang: string): Promise<boolean> => {
  const { error } = await supabase
    .from("voice_profiles")
    .delete()
    .eq("user_id", userId)
    .eq("lang", lang);
  if (error) console.warn("removeVoiceProfileFromDb:", error);
  return !error;
};
