# Fix Transcription Failure + Language-Faithful Entries

## What's actually broken

The edge function logs from your failed recording show both transcription providers rejecting the request:

- OpenAI Whisper: `429 – You have no credits remaining` (the OpenAI account behind the app key is out of credits)
- ElevenLabs Scribe fallback: `401 – detected_unusual_activity, Free Tier access has been disabled`

So the "Transcription Failed / non-2xx status code" toast is a billing/provider issue, not a bug in the app code.

## Fix 1: Move transcription to built-in AI (no external key needed)

Rewrite the transcription backend to call the built-in Lovable AI speech-to-text endpoint (`openai/gpt-4o-mini-transcribe`), which uses the project's own key and needs no OpenAI or ElevenLabs account.

- Primary: built-in AI transcription
- Fallback: ElevenLabs Scribe kept only for Swahili, and only if it responds
- Clear, specific error messages surfaced to the UI (out of credits, audio too short, unsupported format) instead of a generic "non-2xx".

## Fix 2: Transcribe in the language actually spoken

Today the app sends the UI language (e.g. `en`) as a hard language hint, so Arabic speech gets forced toward English.

Changes:
- Stop sending the UI language as a forced hint. Let the model auto-detect the spoken language, so Arabic audio produces Arabic text.
- Return the detected language code along with the transcript.
- Store the entry in the spoken language and record its detected language on the entry, so the text renders with correct direction (RTL for Arabic/Hebrew).
- Keep the existing per-entry translation flow available: after transcription you can translate the entry into any supported language on demand, while the original stays untouched.
- Optional per-recording override: a small "language" control on the record screen defaulting to "Auto-detect", in case you want to force a language for noisy audio.

## Technical notes

- `supabase/functions/transcribe-audio/index.ts`: replace the OpenAI direct call with a multipart POST to `https://ai.gateway.lovable.dev/v1/audio/transcriptions` using `LOVABLE_API_KEY`; omit `language` unless an explicit override is passed; return `{ text, language }`; relay upstream status codes (402/429) with readable messages.
- `src/hooks/useJournalAPI.ts`: `transcribeAudio` returns `{ text, detectedLanguage }`; only pass a language when the user explicitly overrides.
- `src/pages/RecordPage.tsx`: use the returned text as-is, set `dir="rtl"` when the detected language is RTL, keep the existing translate step for converting the entry afterwards.
- Add a `detected_language` column on `journal_entries` (nullable text) so entry views can set text direction correctly.
