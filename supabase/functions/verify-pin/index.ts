import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const pin = typeof body?.pin === "string" ? body.pin : "";
    if (!/^\d{4,12}$/.test(pin)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid PIN format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("pin_hash")
      .eq("id", userId)
      .single();

    if (profileErr || !profile?.pin_hash) {
      // No PIN set — treat as success so the app can unlock
      return new Response(JSON.stringify({ ok: true, hasPin: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = profile.pin_hash as string;
    const candidate = await sha256Hex(pin + userId);

    // constant-time-ish comparison
    let mismatch = candidate.length === expected.length ? 0 : 1;
    for (let i = 0; i < Math.min(candidate.length, expected.length); i++) {
      mismatch |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    const ok = mismatch === 0;

    return new Response(JSON.stringify({ ok, hasPin: true }), {
      status: ok ? 200 : 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-pin error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
