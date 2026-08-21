import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// SOUL JOURNAL STRIPE PRICE IDS — keep in sync with src/contexts/SubscriptionContext.tsx
// All v5 IDs are LIVE on the SJ account (acct_1QvXQoCkL5ed5EgT), created 2026-08-21.
// ═══════════════════════════════════════════════════════════════════════════
const PRICE_MONTHLY = "price_1U6yNgCkL5ed5EgTME3JAdp1"; // v5 $12.99/mo
const PRICE_YEARLY = "price_1U6YKECkL5ed5EgTp2TqeKlb"; // $99.99/yr
const PRICE_EXTRA_EXPORT = "price_1U6YJkCkL5ed5EgTMDxQXbLr"; // $2.99 one-off PDF
const PRICE_VOICE_CREDIT = "price_1U6yNgCkL5ed5EgTdiJHb06Z"; // $0.50/replay
const PRICE_VOICE_BUNDLE = "price_1U6yNhCkL5ed5EgTHmIyavf5"; // $4.99/10 replays

const VALID_SUBSCRIPTION_PRICES = new Set([PRICE_MONTHLY, PRICE_YEARLY]);
const VALID_ADDON_PRICES = new Set([PRICE_EXTRA_EXPORT, PRICE_VOICE_CREDIT, PRICE_VOICE_BUNDLE]);

// ── Checkout language support ──────────────────────────────────────────────
// Stripe localizes the hosted Checkout page itself (buttons, labels, errors).
// We map the app's 8 languages to Stripe's supported Checkout locales.
// Arabic & Swahili aren't in Stripe's list, so they fall back to "auto",
// which makes Stripe use the customer's browser language automatically.
const STRIPE_LOCALES: Record<string, string> = {
  en: "en",
  fr: "fr-CA", // Quebec French
  es: "es",
  de: "de",
  ja: "ja",
  zh: "zh",
};
const CHECKOUT_TEXT: Record<string, { subscribe: string; pay: string; afterSubmit: string }> = {
  en: { subscribe: "Subscribe to Premium", pay: "Pay now", afterSubmit: "You will be redirected back to Soul Journal after payment." },
  fr: { subscribe: "S'abonner à Premium", pay: "Payer maintenant", afterSubmit: "Vous serez redirigé vers Soul Journal après le paiement." },
  es: { subscribe: "Suscribirse a Premium", pay: "Pagar ahora", afterSubmit: "Serás redirigido a Soul Journal después del pago." },
  de: { subscribe: "Premium abonnieren", pay: "Jetzt bezahlen", afterSubmit: "Nach der Zahlung werden Sie zu Soul Journal zurückgeleitet." },
  ja: { subscribe: "プレミアムに登録", pay: "今すぐ支払う", afterSubmit: "お支払い後、Soul Journal に戻ります。" },
  zh: { subscribe: "订阅高级版", pay: "立即支付", afterSubmit: "付款后将返回 Soul Journal。" },
  ar: { subscribe: "الاشتراك في بريميوم", pay: "ادفع الآن", afterSubmit: "سيتم توجيهك إلى Soul Journal بعد الدفع." },
  sw: { subscribe: "Jiandikishe kwa Premium", pay: "Lipa sasa", afterSubmit: "Utaelekezwa kwenye Soul Journal baada ya malipo." },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { priceId, mode = "subscription", lang = "en" } = body;
    if (!priceId) throw new Error("priceId is required");

    const locale = STRIPE_LOCALES[lang] ?? "auto";
    const text = CHECKOUT_TEXT[lang] ?? CHECKOUT_TEXT.en;

    // ⚠️ KEY-TYPE GUARD — checkout is DISABLED until the full sk_live key is
    // installed in Supabase secrets. The account's restricted key (rk_live)
    // is only for provisioning prices/webhooks — it cannot create Checkout
    // Sessions, so we refuse with a friendly message instead of a raw error.
    // Amer enables live checkout by swapping STRIPE_SECRET_KEY to sk_live.
    if (stripeKey.startsWith("rk_")) {
      logStep("Refusing checkout: restricted key installed (not live yet)", { priceId });
      return new Response(
        JSON.stringify({ error: "Paiement bientôt disponible — réessayez plus tard." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Legacy placeholder guard — never charge while price IDs are placeholders
    if (priceId.includes("PENDING")) {
      logStep("Refusing checkout: price ID not configured", { priceId });
      return new Response(JSON.stringify({ error: "Paiement bientôt disponible — réessayez plus tard." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const isPaymentMode = mode === "payment";
    const isValid = isPaymentMode
      ? VALID_ADDON_PRICES.has(priceId)
      : VALID_SUBSCRIPTION_PRICES.has(priceId);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid price ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Price ID accepted", { priceId, mode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new" });

    const origin = req.headers.get("origin") ?? "https://soul-journal-seven.vercel.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isPaymentMode ? "payment" : "subscription",
      locale,
      custom_text: {
        submit: isPaymentMode ? text.pay : text.subscribe,
        after_submit: text.afterSubmit,
      },
      metadata: {
        user_id: user.id,
        ...(isPaymentMode
          ? {
              type: priceId === PRICE_VOICE_CREDIT || priceId === PRICE_VOICE_BUNDLE
                ? "voice_credit"
                : "export_credit",
              price_id: priceId,
              // The $4.99 bundle grants 10 replays; the $0.50 single grants 1
              ...(priceId === PRICE_VOICE_BUNDLE ? { credits: "10" } : {}),
            }
          : {}),
      },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, mode });
    return new Response(JSON.stringify({ url: session.url }), {
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
