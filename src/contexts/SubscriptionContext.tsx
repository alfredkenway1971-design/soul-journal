import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Stripe product/price mapping
export const SUBSCRIPTION_TIERS = {
  monthly: {
    price_id: "price_1T8kWjCkL5ed5EgT3vQutx72",
    product_id: "prod_U6yTqYIPK14mFM",
    price: 5.99,
    interval: "month" as const,
    label: "Monthly",
  },
  yearly: {
    price_id: "price_1T8kXACkL5ed5EgTzKtnTnEz",
    product_id: "prod_U6yUoD1t35lQkz",
    price: 49.99,
    interval: "year" as const,
    label: "Yearly",
    effectiveMonthly: 4.17,
  },
} as const;

// Free tier limits
export const FREE_LIMITS = {
  textEntriesPerDay: 2,
  audioEntriesPerWeek: 1,
  aiCoachingCallsPerMonth: 10,
  voiceCloning: false,
  detailedInsights: false,
  bookExport: false,
  premiumThemes: false,
} as const;

// Premium entitlements
export const PREMIUM_ENTITLEMENTS = {
  textEntriesPerDay: Infinity,
  audioEntriesPerWeek: Infinity,
  aiCoachingCallsPerMonth: Infinity,
  voiceCloning: true,
  detailedInsights: true,
  bookExport: true,
  premiumThemes: true,
} as const;

// Owner email — the app owner always has premium access
export const OWNER_EMAIL = "amer.niyonzima@gmail.com";

interface SubscriptionState {
  subscribed: boolean;
  planType: string | null;
  subscriptionEnd: string | null;
  isManualGrant: boolean;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  isPremium: boolean;
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
      setState({ subscribed: false, planType: null, subscriptionEnd: null, isManualGrant: false, loading: false });
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isPremium = state.subscribed || isOwner;
  const limits = isPremium ? PREMIUM_ENTITLEMENTS : FREE_LIMITS;

  const canUseFeature = (feature: keyof typeof FREE_LIMITS): boolean => {
    if (isPremium) return true;
    const limit = FREE_LIMITS[feature];
    return typeof limit === 'boolean' ? limit : true; // numeric limits checked elsewhere
  };

  return (
    <SubscriptionContext.Provider value={{ ...state, checkSubscription, isPremium, limits, canUseFeature }}>
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
