import postgres from "https://esm.sh/postgres@3.4.4";

// Bootstrap: create the per-user voice_profiles table + RLS policies.
// Runs once (CREATE TABLE IF NOT EXISTS). Uses SUPABASE_DB_URL (auto-injected
// into edge functions) — no PAT/dashboard needed.
// voice_id is TEXT because Fish model ids are 32-char hex without dashes
// (the legacy profiles.voice_clone_id column is UUID-only and rejects them).

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  ssl: "require",
  max: 1,
  connection: { application_name: "soul-journal-bootstrap" },
});

Deno.serve(async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS voice_profiles (
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        lang text NOT NULL,
        voice_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, lang)
      )
    `;
    await sql`ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY`;
    // CRITICAL: RLS policies alone are not enough — the authenticated/anon roles
    // need base table privileges, otherwise every query fails with
    // "permission denied for table voice_profiles" (42501) even with policies.
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE voice_profiles TO authenticated`;
    await sql`GRANT SELECT ON TABLE voice_profiles TO anon`;
    await sql`GRANT ALL ON TABLE voice_profiles TO service_role`;
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'voice_profiles' AND policyname = 'voice_profiles_own'
        ) THEN
          CREATE POLICY voice_profiles_own ON voice_profiles
            FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        END IF;
      END $$
    `;

    const table = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'voice_profiles'
    `;
    const policies = await sql`
      SELECT policyname FROM pg_policies WHERE tablename = 'voice_profiles'
    `;

    return Response.json({ ok: true, table, policies });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
