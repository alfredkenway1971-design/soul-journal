# Soul Journal — Store & Billing Setup Checklist (v5.0)

New pricing (2026-08-21 spec): **Free $0** / **Premium Monthly $12.99** / **Premium Yearly $99.99** (~36% savings), plus **$2.99** per extra Soul Book PDF export and **$0.50** per extra voice replay (**10 for $4.99**).

---

## 1. Stripe (web checkout)

### 1a. Products & prices to create (or run `supabase/functions/stripe-setup`)
| Product | Price | Type | Interval |
|---|---|---|---|
| Soul Journal Premium | $12.99 | Recurring | Monthly |
| Soul Journal Premium | $99.99 | Recurring | Yearly |
| Soul Journal Extra Export | $2.99 | One-time | — |
| Soul Journal Voice Credit | $0.50 | One-time | — |
| Soul Journal Voice Bundle | $4.99 (10 replays) | One-time | — |

- Put both Premium prices on the **same product** (switching monthly↔yearly keeps one subscription).
- Copy the `price_...` IDs → `src/contexts/SubscriptionContext.tsx` → `STRIPE_IDS` (currently `price_PENDING_V5_*` placeholders).
- Same IDs are referenced by `supabase/functions/create-checkout/index.ts` (whitelist + metadata) and `check-subscription/index.ts` (tier mapping).
- **`stripe-setup` edge fn is idempotent**: creates products/prices/webhook once `STRIPE_SECRET_KEY` is set. DELETE it after use.

### 1b. Webhook
- Endpoint: `https://patudphotrjybhwayigs.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`
- `STRIPE_WEBHOOK_SECRET` ✅ already set (2026-08-20).

### 1c. Supabase env secrets (web project patudphotrjybhwayigs)
- ❌ **`STRIPE_SECRET_KEY` MISSING** — checkout is currently disabled until set.
- ✅ `STRIPE_WEBHOOK_SECRET` set.

---

## 2. Google Play Console
- App: Soul Journal → Monetize → Products → Subscriptions.
- Product IDs (already hardcoded in `soul-journal-mobile/src/lib/billing.ts`):
  - `souljournal_premium_monthly` — **$12.99**/month (v5)
  - `souljournal_premium_yearly` — **$99.99**/year (v5)
- **Both in the SAME subscription group** → users can switch plans.
- Do NOT change IDs after release; base plan pricing changes only.

## 3. Apple App Store Connect
- App → Subscriptions:
  - `souljournal_premium_monthly` — **$12.99**/month
  - `souljournal_premium_yearly` — **$99.99**/year
- Same subscription group on iOS. Add the paid app agreement + banking/tax (first submission).
- Localized display names FR/EN (UI strings in `translations.ts`).

## 4. RevenueCat (optional, recommended once mobile goes live)
- Create app → add both store products/entitlements: entitlement `premium`.
- SDK: `react-native-purchases` (not yet installed; `billing.ts` currently uses Expo IAP directly so Expo Go/dev builds work).
- Webhook: `https://patudphotrjybhwayigs.supabase.co/functions/v1/revenuecat-webhook` + shared secret → set `REVENUECAT_WEBHOOK_SECRET` in the web project's env.
- `check-subscription` already reads `revenuecat_original_transaction_id` rows from the `subscriptions` table.

## 5. Fair-usage limits (enforced in app, web + mobile)
| | Free | Premium |
|---|---|---|
| AI coach replies | 5/month | Unlimited |
| Photos per entry | 3 | 50 |
| Soul Book PDF exports | 1/month | 3/month (+$2.99 each) |
| Voice replays (cloned voice) | 0 | 20/month (+$0.50 each / 10 for $4.99) |
| Voice entry (native STT) | Free, unlimited | Free, unlimited |
| Themes | Basic (2) | All + custom backgrounds |
| Storage | 500 MB | 10 GB |

Admin (amer.niyonzima@gmail.com) bypasses all gates — never sees paywalls, sees Admin Dashboard tab.

## 6. Schema (applied to LIVE project patudphotrjybhwayigs ✅)
- `subscriptions` (+ revenuecat cols, tier, platform, cancel_at_period_end) ✅
- `export_credits` ✅ (webhook grants +1 per $2.99 purchase)
- `voice_credits` ✅ (webhook grants +1 / +10 per purchase)

---

## ⚠️ Credential status (2026-08-21)
- **Stripe**: Soul Journal account key (acct_1QvXQoCkL5ed5EgT) NOT accessible from this machine (only the PlumberCore key is present — different account). Two-minute unblock, either:
  1. Paste the Soul Journal `sk_live_...` secret key → I set `STRIPE_SECRET_KEY`, run `stripe-setup`, fill the 3 PENDING IDs, redeploy. **or**
  2. Create the 3 missing prices in Stripe Dashboard (monthly $12.99, voice $0.50, voice bundle $4.99) and paste the 3 `price_...` IDs.
- Legacy `$9.99/mo` subscribers: `LEGACY_PRICE_MONTHLY` keeps them mapped to monthly — no action needed.
- Supabase CLI: token works for project patudphotrjybhwayigs (functions + management API SQL) ✅
