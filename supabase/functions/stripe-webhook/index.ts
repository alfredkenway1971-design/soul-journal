import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// SOUL JOURNAL STRIPE PRICE IDS — keep in sync with src/contexts/SubscriptionContext.tsx
// ═══════════════════════════════════════════════════════════════════════════
const PRICE_MONTHLY = "price_1U6YJjCkL5ed5EgTWBH04tDj";
const PRICE_YEARLY = "price_1U6YKECkL5ed5EgTp2TqeKlb";

const tierFromPrice = (priceId: string): string | null => {
  if (priceId === PRICE_MONTHLY) return "monthly";
  if (priceId === PRICE_YEARLY) return "yearly";
  return null;
};

const upsertSubscription = async (
  supabase: any,
  user_id: string,
  subscription: any,
  customerId: string
) => {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  const tier = tierFromPrice(priceId) || (interval === "year" ? "yearly" : "monthly");

  const subData = {
    user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_type: tier,
    tier,
    status: subscription.status,
    platform: "web",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    is_manual_grant: false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("subscriptions").update(subData).eq("id", existing.id);
  } else {
    const { data: byUser } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();
    if (byUser) {
      await supabase.from("subscriptions").update(subData).eq("id", byUser.id);
    } else {
      await supabase.from("subscriptions").insert(subData);
    }
  }
  logStep("Subscription upserted", { user_id, tier, status: subscription.status });
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) throw new Error("STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const payload = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
    } catch (e) {
      logStep("Signature verification failed", { error: (e as Error).message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (session.metadata?.type === "export_credit" && session.metadata?.user_id) {
          const userId = session.metadata.user_id;
          const { data: row } = await supabase
            .from("export_credits")
            .select("credits")
            .eq("user_id", userId)
            .maybeSingle();
          if (row) {
            await supabase.from("export_credits").update({ credits: (row.credits ?? 0) + 1 }).eq("user_id", userId);
          } else {
            await supabase.from("export_credits").insert({ user_id: userId, credits: 1 });
          }
          logStep("Export credit granted", { user_id: userId });
        }
        // v5: paid voice-replay add-ons ($0.50 each, or 10 for $4.99)
        if (session.metadata?.type === "voice_credit" && session.metadata?.user_id) {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || "1", 10) || 1;
          const { data: row } = await supabase
            .from("voice_credits")
            .select("credits")
            .eq("user_id", userId)
            .maybeSingle();
          if (row) {
            await supabase.from("voice_credits").update({ credits: (row.credits ?? 0) + credits, updated_at: new Date().toISOString() }).eq("user_id", userId);
          } else {
            await supabase.from("voice_credits").insert({ user_id: userId, credits });
          }
          logStep("Voice credit granted", { user_id: userId, credits });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const metadataUserId = subscription.metadata?.user_id;
        let userId = metadataUserId;

        if (!userId && customerId) {
          const { data: existing } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (existing) userId = existing.user_id;
        }
        if (!userId && customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as any).email;
          if (email) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            if (profile) userId = profile.id;
          }
        }
        if (!userId) {
          logStep("Could not resolve user_id — skipping", { customerId, subscriptionId: subscription.id });
          break;
        }
        await upsertSubscription(supabase, userId, subscription, customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
          logStep("Marked past_due", { subscriptionId });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

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
