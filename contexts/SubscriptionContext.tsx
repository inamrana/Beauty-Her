import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/template';
import {
  initIAP,
  teardownIAP,
  fetchSubscriptions,
  purchaseSubscription,
  restorePurchases,
  verifyAppleIAPWithBackend,
  IAP_PRODUCT_IDS,
  type IAPPlanType,
  type IAPProduct,
  FALLBACK_PRICES,
} from '@/services/iapService';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'weekly' | 'yearly' | 'monthly' | 'annual' | 'founding';

export interface StripePlan {
  plan_type: string;
  product_id: string;
  price_id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
}

// Unified plan shape exposed to UI (works with both IAP products and fallback data)
export interface BeautyPlan {
  planType: IAPPlanType;
  productId: string;
  title: string;
  localizedPrice: string;
  period: string;
  sub: string;
  badge?: string;
  perPeriod?: string;
  highlight: boolean;
}

interface SubscriptionContextType {
  subscribed: boolean;
  tier: SubscriptionTier;
  expiresAt: string | null;
  isTrial: boolean;
  loading: boolean;
  checkLoading: boolean;
  plans: BeautyPlan[];
  iapProducts: IAPProduct[];
  scansToday: number;
  canScan: boolean;
  setupReady: boolean;
  purchasePlan: (planType: IAPPlanType) => Promise<{ error?: string; subscribed?: boolean; cancelled?: boolean }>;
  restoreSubscription: () => Promise<{ error?: string; restored?: boolean }>;
  checkSubscription: () => Promise<void>;
  /** @deprecated Use purchasePlan — kept for backward compatibility */
  openCheckout: (planType: string) => Promise<{ error?: string; subscribed?: boolean }>;
  openPortal: () => Promise<{ error?: string }>;
  refreshScansToday: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const FREE_SCANS_PER_DAY = 1;

// ── Test accounts with permanent premium access (no payment required) ─────
const PREMIUM_TEST_EMAILS = new Set([
  'iaminamrana@gmail.com',
  'apple-test@beautyher.com',
  'demo@beautyher.app',
]);

async function getEdgeError(error: unknown): Promise<string> {
  let msg = error instanceof Error ? error.message : String(error);
  if (error instanceof FunctionsHttpError) {
    try {
      const text = await error.context?.text();
      if (text) msg = text;
    } catch { /* ignore */ }
  }
  return msg;
}

// ── Build the UI plan list (prefer live IAP products, fall back to hardcoded) ──
function buildPlans(iapProducts: IAPProduct[]): BeautyPlan[] {
  const iapMap = new Map(iapProducts.map(p => [p.planType, p]));

  return ([
    { planType: 'yearly' as IAPPlanType, highlight: true },
    { planType: 'weekly' as IAPPlanType, highlight: false },
  ] as const).map(({ planType, highlight }) => {
    const live = iapMap.get(planType);
    const fb = FALLBACK_PRICES[planType];
    return {
      planType,
      productId: IAP_PRODUCT_IDS[planType],
      title: planType === 'yearly' ? 'Yearly Plan' : 'Weekly Plan',
      localizedPrice: live?.localizedPrice ?? fb.display,
      period: fb.period,
      sub: 'after 3-day free trial',
      badge: fb.badge,
      perPeriod: fb.perPeriod,
      highlight,
    };
  });
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const supabase = getSupabaseClient();

  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [iapProducts, setIapProducts] = useState<IAPProduct[]>([]);
  const [plans, setPlans] = useState<BeautyPlan[]>(buildPlans([]));
  const [scansToday, setScansToday] = useState(0);
  const [setupReady, setSetupReady] = useState(false);
  const iapInitialized = useRef(false);

  const isTestAccount = useCallback(
    () => PREMIUM_TEST_EMAILS.has(authUser?.email?.toLowerCase().trim() ?? ''),
    [authUser?.email],
  );

  // ── Count scans done today ───────────────────────────────────────────────
  const refreshScansToday = useCallback(async () => {
    if (!authUser?.id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('scan_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .gte('scan_date', today.toISOString());
    setScansToday(count ?? 0);
  }, [authUser?.id]);

  // ── Check subscription via backend (Stripe receipt or Apple StoreKit) ───
  const checkSubscription = useCallback(async () => {
    if (!authUser) return;
    if (isTestAccount()) {
      setSubscribed(true);
      setTier('yearly');
      setIsTrial(false);
      return;
    }
    setCheckLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        console.error('[SubscriptionCtx] Check error:', await getEdgeError(error));
        return;
      }

      if (data) {
        setSubscribed(data.subscribed ?? false);
        setTier(data.tier ?? 'free');
        setExpiresAt(data.subscription_end ?? null);
        setIsTrial(data.is_trial ?? false);
      }
    } catch (err) {
      console.error('[SubscriptionCtx] checkSubscription:', err);
    } finally {
      setCheckLoading(false);
    }
  }, [authUser, isTestAccount]);

  // ── Initialize IAP + fetch products (iOS only) ───────────────────────────
  const initIAPAndProducts = useCallback(async () => {
    if (Platform.OS !== 'ios' || iapInitialized.current) return;
    iapInitialized.current = true;
    setLoading(true);
    try {
      await initIAP();
      const products = await fetchSubscriptions();
      setIapProducts(products);
      setPlans(buildPlans(products));
    } catch (err) {
      console.error('[SubscriptionCtx] IAP init error:', err);
      // Fall back to hardcoded prices — UI still works
      setPlans(buildPlans([]));
    } finally {
      setLoading(false);
      setSetupReady(true);
    }
  }, []);

  // ── Native IAP purchase ───────────────────────────────────────────────────
  const purchasePlan = useCallback(async (
    planType: IAPPlanType,
  ): Promise<{ error?: string; subscribed?: boolean; cancelled?: boolean }> => {
    if (Platform.OS !== 'ios') {
      return { error: 'In-App Purchases are only available on iOS.' };
    }
    try {
      const result = await purchaseSubscription(planType);
      if (result.cancelled) return { cancelled: true };
      if (!result.success) return { error: result.error ?? 'Purchase failed.' };

      // Purchase succeeded — mark subscribed locally immediately
      setSubscribed(true);
      setTier(planType === 'yearly' ? 'yearly' : 'weekly');
      setIsTrial(true);

      // Verify with backend asynchronously (non-blocking for UX)
      void verifyAppleIAPWithBackend(result.productId ?? '', result.transactionId)
        .then(() => checkSubscription())
        .catch(err => console.warn('[SubscriptionCtx] Async verify error:', err));

      return { subscribed: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Purchase failed.' };
    }
  }, [checkSubscription]);

  // ── Restore prior purchases ───────────────────────────────────────────────
  const restoreSubscription = useCallback(async (): Promise<{ error?: string; restored?: boolean }> => {
    if (Platform.OS !== 'ios') {
      return { error: 'Restore Purchases is only available on iOS.' };
    }
    try {
      const { restored, productIds } = await restorePurchases();
      if (restored) {
        setSubscribed(true);
        // Determine tier from first restored product
        const firstId = productIds[0];
        setTier(firstId === IAP_PRODUCT_IDS.yearly ? 'yearly' : 'weekly');
        void checkSubscription();
      }
      return { restored };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Restore failed.' };
    }
  }, [checkSubscription]);

  // ── Backward-compat shim: openCheckout → purchasePlan ───────────────────
  const openCheckout = useCallback(async (
    planType: string,
  ): Promise<{ error?: string; subscribed?: boolean }> => {
    const safe = (planType === 'yearly' || planType === 'weekly') ? planType : 'yearly';
    return purchasePlan(safe as IAPPlanType);
  }, [purchasePlan]);

  // ── Open Stripe customer portal (web — for users who subscribed via Stripe) ─
  const openPortal = useCallback(async (): Promise<{ error?: string }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return { error: 'Not authenticated' };

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) return { error: await getEdgeError(error) };

      if (data?.url) {
        const { default: WebBrowser } = await import('expo-web-browser');
        await WebBrowser.openBrowserAsync(data.url);
        await checkSubscription();
      }
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Portal failed' };
    }
  }, [checkSubscription]);

  // ── Grant instant premium for test accounts ──────────────────────────────
  useEffect(() => {
    if (!authUser?.email) return;
    if (isTestAccount()) {
      setSubscribed(true);
      setTier('yearly');
      setIsTrial(false);
      setSetupReady(true);
    }
  }, [authUser?.email, isTestAccount]);

  // ── Init on auth ready ────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !authUser) return;
    if (isTestAccount()) {
      setSetupReady(true);
      return;
    }
    void initIAPAndProducts();
    void checkSubscription();
    void refreshScansToday();
  }, [authUser?.id, authLoading]);

  // ── Teardown IAP on unmount (iOS only) ─────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    return () => {
      if (iapInitialized.current) {
        iapInitialized.current = false;
        teardownIAP().catch(() => {});
      }
    };
  }, []);

  const canScan = subscribed || scansToday < FREE_SCANS_PER_DAY;

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        tier,
        expiresAt,
        isTrial,
        loading,
        checkLoading,
        plans,
        iapProducts,
        scansToday,
        canScan,
        setupReady,
        purchasePlan,
        restoreSubscription,
        checkSubscription,
        openCheckout,
        openPortal,
        refreshScansToday,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
