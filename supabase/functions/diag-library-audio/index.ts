import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Diagnostic: does the journal-audio bucket exist? are saved audio files
// present? how many entries are text-less (render as empty cards)?

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const out: Record<string, unknown> = {};

  // 1. Buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  out.buckets = { error: bErr?.message ?? null, list: (buckets ?? []).map((b) => b.name) };

  // 2. Entries stats (text-less entries = empty cards in the Library)
  const { count: total, error: tErr } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true });
  out.entriesTotal = { error: tErr?.message ?? null, count: total };

  const { data: textless, error: tlErr } = await supabase
    .from("journal_entries")
    .select("user_id, title, mood, created_at")
    .or("enhanced_text.is.null,original_transcription.is.null");
  out.textlessEntries = { error: tlErr?.message ?? null, count: (textless ?? []).length, sample: (textless ?? []).slice(0, 3) };

  // 3. Saved audio in the journal-audio bucket (voice-cache/<userId>)
  const { data: folders, error: fErr } = await supabase.storage
    .from("journal-audio")
    .list("voice-cache", { limit: 100 });
  out.voiceCacheFolders = { error: fErr?.message ?? null, count: (folders ?? []).length, sample: (folders ?? []).slice(0, 3).map((f) => f.name) };

  return Response.json(out);
});
