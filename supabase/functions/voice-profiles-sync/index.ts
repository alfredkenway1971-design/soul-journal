import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * voice-profiles-sync — upsert/delete/list rows in `voice_profiles` via the
 * service role. The table has no RLS policies (permission denied for table
 * voice_profiles), so the mobile/web apps cannot write directly. This edge
 * function verifies the caller's JWT, then performs the operation scoped to
 * their own user_id (never another user's).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const method = req.method.toUpperCase();

    if (method === "GET") {
      // List this user's clones
      const { data, error } = await admin
        .from("voice_profiles")
        .select("lang, voice_id, updated_at")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ profiles: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      // Upsert one clone (user_id + lang PK)
      const body = await req.json().catch(() => ({}));
      const { lang, voice_id } = body;
      if (!lang || !voice_id) {
        return new Response(JSON.stringify({ error: "lang and voice_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await admin
        .from("voice_profiles")
        .upsert(
          { user_id: user.id, lang, voice_id, updated_at: new Date().toISOString() },
          { onConflict: "user_id,lang" }
        )
        .select("lang, voice_id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ profile: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      // Delete one clone for this user
      const body = await req.json().catch(() => ({}));
      const lang = body?.lang;
      if (!lang) {
        return new Response(JSON.stringify({ error: "lang required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("voice_profiles")
        .delete()
        .eq("user_id", user.id)
        .eq("lang", lang);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("voice-profiles-sync error:", error);
    return new Response(JSON.stringify({ error: "Sync failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
