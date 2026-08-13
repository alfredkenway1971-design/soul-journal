// Per-language voice profiles stored client-side.
// The proper home for this is a voice_profiles table, but the Supabase project is
// Lovable-managed (no DB access), so we persist the language->voiceId map here.
// The default profile also syncs to profiles.voice_clone_id for backward compat.

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
