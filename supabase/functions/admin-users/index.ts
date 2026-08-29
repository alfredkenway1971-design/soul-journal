import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Verify the caller is admin using their JWT
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

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "list-users") {
      // Get all users from auth + profiles + subscriptions
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: subscriptions } = await adminClient.from("subscriptions").select("*");

      const users = (authUsers?.users || []).map((u: any) => {
        const profile = profiles?.find((p: any) => p.id === u.id);
        const sub = subscriptions?.find((s: any) => s.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          subscription: sub || null,
        };
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "grant-access") {
      const { email } = await req.json();
      const normalizedEmail = email.trim().toLowerCase();
      // Find user by email (case-insensitive — Supabase stores emails lowercase)
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = authUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      );
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert subscription with manual grant
      const { data: existing } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", targetUser.id)
        .single();

      if (existing) {
        await adminClient
          .from("subscriptions")
          .update({ status: "active", is_manual_grant: true, plan_type: "manual" })
          .eq("id", existing.id);
      } else {
        await adminClient.from("subscriptions").insert({
          user_id: targetUser.id,
          status: "active",
          is_manual_grant: true,
          plan_type: "manual",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "revoke-access") {
      const { userId } = await req.json();
      await adminClient
        .from("subscriptions")
        .update({ status: "inactive", is_manual_grant: false })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
