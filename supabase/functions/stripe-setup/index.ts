import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

/**
 * TEMPORARY provisioning helper — creates the Soul Journal pricing products in
 * the Stripe account that this Supabase project's STRIPE_SECRET_KEY points to.
 * Idempotent (looks up products by name first). Returns the new price IDs and
 * creates the stripe-webhook endpoint (signing secret returned once).
 * DELETE THIS FUNCTION after use.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// v5.0 pricing (2026-08-21 spec): Premium $12.99/mo · $99.99/yr (~36% savings)
// Add-ons: extra PDF export $2.99 · voice replay $0.50 each · 10 replays $4.99
const PRODUCTS: Array<{
  name: string;
  prices: Array<{ label: string; amount: number; interval?: "month" | "year"; type: "recurring" | "one_time" }>;
}> = [
  {
    name: "Soul Journal Premium",
    prices: [
      { label: "monthly", amount: 1299, interval: "month", type: "recurring" },
      { label: "yearly", amount: 9999, interval: "year", type: "recurring" },
    ],
  },
  {
    name: "Soul Journal Extra Export",
    prices: [{ label: "extra-export", amount: 299, type: "one_time" }],
  },
  {
    name: "Soul Journal Voice Credit",
    prices: [{ label: "voice-single", amount: 50, type: "one_time" }],
  },
  {
    name: "Soul Journal Voice Bundle",
    prices: [{ label: "voice-bundle-10", amount: 499, type: "one_time" }],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set in this project's env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });
    const account = await stripe.accounts.retrieve();
    const out: any = { account: { id: account.id, name: account.settings?.dashboard?.display_name ?? null, country: account.country } };

    const existing = await stripe.products.list({ limit: 100 });

    out.products = [];
    for (const prod of PRODUCTS) {
      const existingProd = existing.data.find((p) => p.name === prod.name);
      const product = existingProd ?? (await stripe.products.create({ name: prod.name }));
      const existingPrices = await stripe.prices.list({ product: product.id, limit: 10 });
      const prices: any[] = [];
      for (const spec of prod.prices) {
        const match = existingPrices.data.find((pr) =>
          pr.type === spec.type && pr.unit_amount === spec.amount &&
          (spec.type === "one_time" ? true : pr.recurring?.interval === spec.interval)
        );
        const price = match ?? (await stripe.prices.create({
          product: product.id,
          currency: "usd",
          unit_amount: spec.amount,
          ...(spec.type === "recurring"
            ? { recurring: { interval: spec.interval!, interval_count: 1 } }
            : {}),
        }));
        prices.push({ label: spec.label, price_id: price.id, amount: price.unit_amount, type: price.type });
      }
      out.products.push({ product_id: product.id, name: product.name, prices });
    }

    // Webhook endpoint (idempotent by URL)
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    let wh = endpoints.data.find((e) => e.url === url);
    let signingSecret: string | null = null;
    if (!wh) {
      const created = await stripe.webhookEndpoints.create({
        url,
        enabled_events: [
          "checkout.session.completed",
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.payment_failed",
          "invoice.paid",
        ],
        description: "Soul Journal — Supabase stripe-webhook edge fn",
      });
      wh = created;
      signingSecret = created.secret ?? null;
    }
    out.webhook = { id: wh.id, url: wh.url, signing_secret: signingSecret };

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
