import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// SOUL JOURNAL PREMIUM — PRICING CONFIG (v5.0)
// $12.99/mo · $99.99/yr (≈36% savings) · $2.99 one-off PDF add-on
// · $0.50 per extra voice replay (or 10 for $4.99)
//
// ⚠️ PENDING: Amer is providing Soul Journal's own Stripe API keys.
// The monthly price on the Soul Journal account is still the OLD $9.99 one
// (LEGACY_PRICE_MONTHLY). The new $12.99 price + voice-credit add-on prices
// must be created once the key is available; until then those IDs contain
// "PENDING" and checkout refuses to run for them (create-checkout guard).
// Existing $9.99 subscribers keep working via the legacy ID mapping in
// check-subscription / stripe-webhook.
// ═══════════════════════════════════════════════════════════════════════════
export const STRIPE_IDS = {
  // PENDING: create $12.99/month price on the Soul Journal Stripe account
  monthly: "price_PENDING_V5_MONTHLY_1299",
  yearly: "price_1U6YKECkL5ed5EgTp2TqeKlb",
  extraExport: "price_1U6YJkCkL5ed5EgTMDxQXbLr",
  // PENDING: voice replay add-on prices ($0.50 each / 10 for $4.99)
  voiceCredit: "price_PENDING_V5_VOICE_050",
  voiceBundle: "price_PENDING_V5_VOICE10_499",
} as const;

/** Old $9.99/mo price — existing subscribers must stay mapped to monthly. */
export const LEGACY_PRICE_MONTHLY = "price_1U6YJjCkL5ed5EgTWBH04tDj";

export const SUBSCRIPTION_TIERS = {
  monthly: {
    price_id: STRIPE_IDS.monthly,
    product_id: "prod_Uh3mopbVJz4PRp",
    price: 12.99,
    interval: "month" as const,
    label: "Monthly",
    effectiveMonthly: 12.99,
  },
  yearly: {
    price_id: STRIPE_IDS.yearly,
    product_id: "prod_V6lro9eotpzrNy",
    price: 99.99,
    interval: "year" as const,
    label: "Yearly",
    effectiveMonthly: 8.33,
  },
} as const;

export const EXTRA_EXPORT_PRICE = 2.99;
export const VOICE_REPLAY_PRICE = 0.5;
export const VOICE_REPLAY_BUNDLE_PRICE = 4.99;
export const VOICE_REPLAY_BUNDLE_SIZE = 10;

// Free tier fair-usage limits (soft caps — UI says "included", never "unlimited")
export const FREE_LIMITS = {
  textEntriesPerDay: Infinity,
  audioEntriesPerWeek: Infinity,
  aiCoachingCallsPerMonth: 5,
  photosPerEntry: 3,
  bookExportsPerMonth: 1,
  voiceReplaysPerMonth: 0,
  voiceCloning: false,
  detailedInsights: false,
  premiumThemes: false,
  storageMB: 500,
} as const;

// Premium entitlements (fair-use caps — "included" language)
export const PREMIUM_ENTITLEMENTS = {
  textEntriesPerDay: Infinity,
  audioEntriesPerWeek: Infinity,
  aiCoachingCallsPerMonth: Infinity,
  photosPerEntry: 50,
  bookExportsPerMonth: 3,
  voiceReplaysPerMonth: 20,
  voiceCloning: true,
  detailedInsights: true,
  premiumThemes: true,
  storageMB: 10240, // 10 GB
} as const;

// Owner email — the app owner always has premium access and sees no paywalls
export const OWNER_EMAIL = "amer.niyonzima@gmail.com";

interface SubscriptionState {
  subscribed: boolean;
  planType: string | null;
  subscriptionEnd: string | null;
  isManualGrant: boolean;
  voiceCredits: number;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  isPremium: boolean;
  isAdmin: boolean;
  limits: typeof FREE_LIMITS | typeof PREMIUM_ENTITLEMENTS;
  canUseFeature: (feature: keyof typeof FREE_LIMITS) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    planType: null,
    subscriptionEnd: null,
    isManualGrant: false,
    voiceCredits: 0,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, subscribed: false, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setState({
        subscribed: data?.subscribed || false,
        planType: data?.plan_type || null,
        subscriptionEnd: data?.subscription_end || null,
        isManualGrant: data?.is_manual_grant || false,
        voiceCredits: data?.voice_credits || 0,
        loading: false,
      });
    } catch (e) {
      console.error('Failed to check subscription:', e);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  // Check on mount and auth change
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({ subscribed: false, planType: null, subscriptionEnd: null, isManualGrant: false, voiceCredits: 0, loading: false });
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const isAdmin = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isPremium = state.subscribed || isAdmin;
  const limits = isPremium ? PREMIUM_ENTITLEMENTS : FREE_LIMITS;

  const canUseFeature = (feature: keyof typeof FREE_LIMITS): boolean => {
    if (isPremium) return true;
    const limit = FREE_LIMITS[feature];
    return typeof limit === 'boolean' ? limit : true; // numeric limits checked elsewhere
  };

  return (
    <SubscriptionContext.Provider value={{ ...state, checkSubscription, isPremium, isAdmin, limits, canUseFeature }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
