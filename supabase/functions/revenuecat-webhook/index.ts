import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVENUECAT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Optional shared-secret check (RevenueCat "Authorization" header)
    const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (secret) {
      const auth = req.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${secret}`) {
        logStep("Unauthorized webhook call");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    logStep("Event received", { type: payload.type, app_user_id: payload.app_user_id });

    const userId = payload.app_user_id as string | undefined;
    if (!userId) {
      logStep("No app_user_id — skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const type = (payload.type as string) ?? "";
    const productId = (payload.product_id as string) ?? "";
    const tier = productId.includes("yearly") ? "yearly" : "monthly";
    const platform = payload.store?.toLowerCase() === "app_store" ? "ios"
      : payload.store?.toLowerCase() === "play_store" ? "android"
      : (productId.includes("android") ? "android" : "ios");

    let status: string;
    if (type === "CANCELLATION") status = "canceled";
    else if (type === "EXPIRATION") status = "canceled";
    else status = "active"; // INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / PRODUCT_CHANGE / TRANSFER

    const periodEnd = payload.expiration_at_ms
      ? new Date(payload.expiration_at_ms).toISOString()
      : new Date(Date.now() + 30 * 86400_000).toISOString();

    const subData = {
      user_id: userId,
      revenuecat_app_user_id: payload.app_user_id,
      revenuecat_original_transaction_id: payload.original_transaction_id ?? null,
      plan_type: tier,
      tier,
      status,
      platform,
      current_period_start: payload.purchase_date_ms ? new Date(payload.purchase_date_ms).toISOString() : new Date().toISOString(),
      current_period_end: periodEnd,
      cancel_at_period_end: type === "CANCELLATION",
      is_manual_grant: false,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("revenuecat_original_transaction_id", payload.original_transaction_id ?? "__none__")
      .maybeSingle();

    if (existing) {
      await supabase.from("subscriptions").update(subData).eq("id", existing.id);
    } else {
      const { data: byUser } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (byUser) {
        await supabase.from("subscriptions").update(subData).eq("id", byUser.id);
      } else {
        await supabase.from("subscriptions").insert(subData);
      }
    }
    logStep("Subscription synced", { userId, tier, status, platform });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
