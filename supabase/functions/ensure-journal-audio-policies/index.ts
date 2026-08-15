import postgres from "https://esm.sh/postgres@3.4.4";

// Bootstrap: storage RLS policies for the journal-audio bucket.
// Without these, the app's durable voice save (supabase.storage.upload by the
// USER's JWT) silently fails — every replay re-synthesizes via Fish (15-60s).
// Policy: authenticated users can read/write only their own voice-cache folder.
// DO-block + dollar-quoted policy bodies (PG14: no CREATE POLICY IF NOT EXISTS).

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  ssl: "require",
  max: 1,
  connection: { application_name: "soul-journal-bootstrap" },
});

const OWN_WHERE =
  "bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = 'voice-cache' AND (storage.foldername(name))[2] = auth.uid()::text";

const POLICY = (name: string, action: string, withCheck: boolean) => `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='${name}') THEN
    EXECUTE $pol$CREATE POLICY ${name} ON storage.objects ${action} TO authenticated ${
  withCheck ? `WITH CHECK (${OWN_WHERE})` : `USING (${OWN_WHERE})`
}$pol$;
  END IF;
END $$;
`;

Deno.serve(async () => {
  try {
    await sql.unsafe(POLICY("journal_audio_read_own", "FOR SELECT", false));
    await sql.unsafe(POLICY("journal_audio_write_own", "FOR INSERT", true));
    await sql.unsafe(POLICY("journal_audio_update_own", "FOR UPDATE", false));
    await sql.unsafe(POLICY("journal_audio_delete_own", "FOR DELETE", false));

    const policies = await sql`
      SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'journal_audio%'
    `;
    return Response.json({ ok: true, policies });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
