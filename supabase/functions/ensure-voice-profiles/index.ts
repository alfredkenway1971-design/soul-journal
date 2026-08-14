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
