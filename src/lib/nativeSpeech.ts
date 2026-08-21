// Native device speech-to-text (Web Speech API) — $0, no API calls.
// The browser uses the OS-level speech recognizer (iOS/Android/Chrome/Edge/Safari).
// Falls back is handled by callers (server transcription).

export interface NativeSpeechHandle {
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
}

const getCtor = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return typeof Ctor === "function" ? (Ctor as never) : null;
};

export const isNativeSpeechSupported = (): boolean => getCtor() !== null;

/** Map the app's language code (en/fr/es/...) to a BCP-47 tag the speech engine understands. */
export const speechCodeFor = (lang?: string | null): string => {
  const base = (lang || "").toLowerCase().split("-")[0];
  const map: Record<string, string> = {
    en: "en-US",
    fr: "fr-CA",
    es: "es-ES",
    ar: "ar-SA",
    zh: "zh-CN",
    ja: "ja-JP",
    sw: "sw-KE",
  };
  return map[base] || "en-US";
};

export interface NativeSpeechOptions {
  lang?: string | null;
  /** Live transcript (final text so far + interim tail). isFinal=false while still speaking. */
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

/** Start native dictation. Returns null when the browser has no Speech API. */
export const createNativeSpeech = (opts: NativeSpeechOptions): NativeSpeechHandle | null => {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = speechCodeFor(opts.lang);
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let finalText = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i]?.[0];
      const transcript = (alt?.transcript ?? "").trim();
      if (e.results[i].isFinal) {
        finalText += (finalText ? " " : "") + transcript;
      } else if (transcript) {
        interim += (interim ? " " : "") + transcript;
      }
    }
    const combined = finalText + (interim ? " " + interim : "");
    opts.onResult(combined.trim(), !interim);
  };

  rec.onerror = (e) => {
    // "no-speech" fires when the mic heard nothing — treat as end, not failure
    if (e?.error === "no-speech" || e?.error === "aborted") {
      opts.onEnd();
      return;
    }
    opts.onError(e?.error || "speech-error");
  };

  rec.onend = () => opts.onEnd();

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
};
