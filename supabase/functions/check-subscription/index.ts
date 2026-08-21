import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// SOUL JOURNAL STRIPE PRICE IDS — keep in sync with src/contexts/SubscriptionContext.tsx
// ⚠️ PENDING: v5 $12.99 monthly price not yet created on the Soul Journal
// Stripe account (awaiting Amer's keys). LEGACY_PRICE_MONTHLY keeps existing
// $9.99 subscribers mapped to the monthly tier until then.
// ═══════════════════════════════════════════════════════════════════════════
const PRICE_MONTHLY_V5 = "price_PENDING_V5_MONTHLY_1299";
const PRICE_MONTHLY_LEGACY = "price_1U6YJjCkL5ed5EgTWBH04tDj";
const PRICE_YEARLY = "price_1U6YKECkL5ed5EgTp2TqeKlb";

const tierFromPrice = (priceId: string): string | null => {
  if (priceId === PRICE_MONTHLY_V5 || priceId === PRICE_MONTHLY_LEGACY) return "monthly";
  if (priceId === PRICE_YEARLY) return "yearly";
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Auth failed, returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Owner/admin always gets premium access
    const OWNER_EMAIL = "amer.niyonzima@gmail.com";
    const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (isOwner) {
      logStep("Owner detected, granting premium", { email: user.email });
      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: "manual",
        tier: "yearly",
        is_manual_grant: true,
        subscription_end: null,
        export_credits: 0,
        voice_credits: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Any user with an admin role also gets premium access
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRole) {
      logStep("Admin role detected, granting premium", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: "manual",
        tier: "yearly",
        is_manual_grant: true,
        subscription_end: null,
        export_credits: 0,
        voice_credits: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Manual grant in subscriptions table
    const { data: manualGrant } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_manual_grant", true)
      .eq("status", "active")
      .maybeSingle();

    if (manualGrant) {
      logStep("Manual grant found", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: "manual",
        tier: "yearly",
        is_manual_grant: true,
        subscription_end: null,
        export_credits: 0,
        voice_credits: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Export credits (paid $2.99 add-ons) — read BEFORE returning
    const { data: creditsRow } = await supabaseClient
      .from("export_credits")
      .select("credits")
      .eq("user_id", user.id)
      .maybeSingle();
    const exportCredits = creditsRow?.credits ?? 0;

    // Voice replay credits (v5 paid add-ons: $0.50 each / 10 for $4.99)
    const { data: voiceRow } = await supabaseClient
      .from("voice_credits")
      .select("credits")
      .eq("user_id", user.id)
      .maybeSingle();
    const voiceCredits = voiceRow?.credits ?? 0;

    // 1) Check DB row first — it is the source of truth written by webhooks
    const { data: dbSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "canceled", "past_due", "incomplete"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbSub) {
      const periodEnd = dbSub.current_period_end ? new Date(dbSub.current_period_end) : null;
      const isActive = dbSub.status === "active" && (!periodEnd || periodEnd > new Date());
      // canceled but period not ended → premium until period ends (spec)
      const isGrace = dbSub.status === "canceled" && periodEnd && periodEnd > new Date();
      if (isActive || isGrace) {
        logStep("DB subscription active", { tier: dbSub.tier, status: dbSub.status, periodEnd });
        return new Response(JSON.stringify({
          subscribed: true,
          plan_type: dbSub.tier || dbSub.plan_type || "monthly",
          tier: dbSub.tier || "monthly",
          is_manual_grant: false,
          subscription_end: dbSub.current_period_end,
          cancel_at_period_end: dbSub.cancel_at_period_end ?? false,
          export_credits: exportCredits,
          voice_credits: voiceCredits,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 2) RevenueCat (mobile) rows
    const { data: rcSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", ["ios", "android"])
      .eq("status", "active")
      .maybeSingle();

    if (rcSub) {
      const periodEnd = rcSub.current_period_end ? new Date(rcSub.current_period_end) : null;
      if (!periodEnd || periodEnd > new Date()) {
        logStep("RevenueCat subscription active", { tier: rcSub.tier, platform: rcSub.platform });
        return new Response(JSON.stringify({
          subscribed: true,
          plan_type: rcSub.tier || "monthly",
          tier: rcSub.tier || "monthly",
          is_manual_grant: false,
          subscription_end: rcSub.current_period_end,
          export_credits: exportCredits,
          voice_credits: voiceCredits,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 3) Live Stripe check (web) — catches subs created before webhooks were wired
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
        });

        const now = Math.floor(Date.now() / 1000);
        const activeSub = subscriptions.data.find((s) => {
          const inActiveWindow = s.status === "active" && s.current_period_end > now;
          const inGraceWindow = s.status === "canceled" && s.current_period_end > now;
          return inActiveWindow || inGraceWindow;
        });

        if (activeSub) {
          const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
          const priceId = activeSub.items.data[0]?.price.id ?? "";
          const tier = tierFromPrice(priceId) || (activeSub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly");
          logStep("Stripe subscription active", { tier, status: activeSub.status });

          // Sync to DB
          const { data: existing } = await supabaseClient
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          const subData = {
            user_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: activeSub.id,
            plan_type: tier,
            tier,
            status: activeSub.status,
            platform: "web",
            current_period_start: new Date(activeSub.current_period_start * 1000).toISOString(),
            current_period_end: subscriptionEnd,
            cancel_at_period_end: activeSub.cancel_at_period_end ?? false,
            is_manual_grant: false,
          };

          if (existing) {
            await supabaseClient.from("subscriptions").update(subData).eq("id", existing.id);
          } else {
            await supabaseClient.from("subscriptions").insert(subData);
          }

          return new Response(JSON.stringify({
            subscribed: true,
            plan_type: tier,
            tier,
            is_manual_grant: false,
            subscription_end: subscriptionEnd,
            cancel_at_period_end: activeSub.cancel_at_period_end ?? false,
            export_credits: exportCredits,
          voice_credits: voiceCredits,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    logStep("No active subscription found");
    return new Response(JSON.stringify({
      subscribed: false,
      plan_type: null,
      tier: "free",
      is_manual_grant: false,
      subscription_end: null,
      export_credits: exportCredits,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Unable to check subscription" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
