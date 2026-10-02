
/**
 * iapService.ts — Native Apple In-App Purchase (StoreKit) service for BeautyHer.
 *
 * Uses react-native-iap via dynamic require so the module loads gracefully
 * in environments where the native module is not available
 * (e.g. Expo Go, OnSpace preview runtime).
 *
 * Product IDs must be configured in App Store Connect matching these identifiers.
 */
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

// ── Product IDs (must match App Store Connect exactly) ───────────────────
export const IAP_PRODUCT_IDS = {
  weekly: 'com.beautyher.premium.weekly',
  yearly: 'com.beautyher.premium.yearly',
} as const;

export type IAPPlanType = keyof typeof IAP_PRODUCT_IDS;

export interface IAPProduct {
  productId: string;
  planType: IAPPlanType;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
}

export interface IAPPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
}

// ── Safely load react-native-iap (native-only module) ────────────────────
function getIAP() {
  try {
    // The ESLint rule `@typescript-eslint/no-require-imports` was not found.
    // This comment is kept to preserve original intent, but the rule itself
    // is a linting rule, not a syntax error that prevents compilation.
    // If a different linter or TS configuration is used, this might need
    // adjustment or removal.
    return require('react-native-iap') as typeof import('react-native-iap');
  } catch {
    return null;
  }
}

let connectionInitialized = false;

// ── Initialize IAP connection ─────────────────────────────────────────────
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const iap = getIAP();
  if (!iap) return false;
  try {
    await iap.initConnection();
    connectionInitialized = true;
    return true;
  } catch (err) {
    console.error('[IAP] initConnection failed:', err);
    return false;
  }
}

// ── Teardown IAP connection ───────────────────────────────────────────────
export async function teardownIAP(): Promise<void> {
  const iap = getIAP();
  if (!iap) return;
  if (connectionInitialized) {
    try {
      await iap.endConnection();
    } catch {}
    connectionInitialized = false;
  }
}

// ── Fetch available subscription products from App Store ─────────────────
export async function fetchSubscriptions(): Promise<IAPProduct[]> {
  if (Platform.OS !== 'ios') return [];
  const iap = getIAP();
  if (!iap) return [];
  try {
    if (!connectionInitialized) await initIAP();
    const productIds = Object.values(IAP_PRODUCT_IDS);
    const subs = await iap.getSubscriptions({ skus: productIds });
    return subs.map((sub) => {
      const planType = (
        Object.entries(IAP_PRODUCT_IDS).find(([, id]) => id === sub.productId)?.[0] ?? 'weekly'
      ) as IAPPlanType;
      return {
        productId: sub.productId,
        planType,
        title: sub.title ?? sub.productId,
        description: sub.description ?? '',
        localizedPrice: sub.localizedPrice ?? '',
        currency: sub.currency ?? 'USD',
      };
    });
  } catch (err) {
    console.error('[IAP] fetchSubscriptions error:', err);
    return [];
  }
}

// ── Request a subscription purchase ──────────────────────────────────────
export async function purchaseSubscription(planType: IAPPlanType): Promise<IAPPurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'In-App Purchases are only available on iOS.' };
  }
  const iap = getIAP();
  if (!iap) {
    return { success: false, error: 'In-App Purchase module is not available in this environment.' };
  }
  if (!connectionInitialized) {
    const ok = await initIAP();
    if (!ok) return { success: false, error: 'Could not connect to App Store.' };
  }

  const productId = IAP_PRODUCT_IDS[planType];

  return new Promise((resolve) => {
    let purchaseUpdateSub: { remove: () => void } | null = null;
    let purchaseErrorSub: { remove: () => void } | null = null;
    let resolved = false;

    const cleanup = () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      purchaseUpdateSub = null;
      purchaseErrorSub = null;
    };

    const safeResolve = (result: IAPPurchaseResult) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    purchaseUpdateSub = iap.purchaseUpdatedListener(async (purchase) => {
      const { transactionId, productId: pid } = purchase;
      // Ignore purchases for other products (e.g. pending from previous session)
      if (pid !== productId) return;
      try {
        // finishTransaction signature varies by react-native-iap version — handle both
        if (typeof iap.finishTransaction === 'function') {
          await iap.finishTransaction({ purchase, isConsumable: false });
        }
        safeResolve({ success: true, productId: pid, transactionId: transactionId ?? undefined });
      } catch (err) {
        console.error('[IAP] finishTransaction error:', err);
        // Still resolve as success — StoreKit already confirmed the purchase
        safeResolve({ success: true, productId: pid, transactionId: transactionId ?? undefined });
      }
    });

    purchaseErrorSub = iap.purchaseErrorListener((error) => {
      const errCode = (error as { code?: string }).code ?? '';
      const errMsg = (error as { message?: string }).message ?? '';
      // Handle all known cancellation codes across iOS versions
      const isCancelled =
        errCode === 'E_USER_CANCELLED' ||
        errCode === 'SKErrorDomain_2' ||
        errCode === '2' ||
        errMsg.toLowerCase().includes('cancel') ||
        errMsg.toLowerCase().includes('dismiss') ||
        errMsg.toLowerCase().includes('user cancel');
      if (isCancelled) {
        safeResolve({ success: false, cancelled: true });
      } else {
        console.error('[IAP] purchaseError:', error);
        safeResolve({ success: false, error: errMsg || 'Purchase failed. Please try again.' });
      }
    });

    // requestSubscription API: newer react-native-iap versions accept both { sku } and
    // { sku, andDangerouslyFinishTransactionAutomaticallyIOS }. We set auto-finish to
    // false so we control the finishTransaction call ourselves.
    const subRequest: Record<string, unknown> = {
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    };
    iap.requestSubscription(subRequest as Parameters<typeof iap.requestSubscription>[0]).catch((err: unknown) => {
      const errCode = (err as { code?: string }).code ?? '';
      const errMsg = err instanceof Error ? err.message : 'Could not start purchase.';
      const isCancelled =
        errCode === 'E_USER_CANCELLED' ||
        errCode === 'SKErrorDomain_2' ||
        errMsg.toLowerCase().includes('cancel');
      if (isCancelled) {
        safeResolve({ success: false, cancelled: true });
      } else {
        safeResolve({ success: false, error: errMsg });
      }
    });
  });
}

// ── Restore prior purchases (required by App Store guidelines) ────────────
export async function restorePurchases(): Promise<{ restored: boolean; productIds: string[] }> {
  if (Platform.OS !== 'ios') return { restored: false, productIds: [] };
  const iap = getIAP();
  if (!iap) return { restored: false, productIds: [] };
  try {
    if (!connectionInitialized) await initIAP();
    const purchases = await iap.getAvailablePurchases();
    const subProductIds = Object.values(IAP_PRODUCT_IDS) as string[];
    const validPurchases = purchases
      .filter(p => subProductIds.includes(p.productId))
      .map(p => p.productId);
    return { restored: validPurchases.length > 0, productIds: validPurchases };
  } catch (err) {
    console.error('[IAP] restorePurchases error:', err);
    return { restored: false, productIds: [] };
  }
}

// ── Verify Apple IAP purchase with backend ────────────────────────────────
export async function verifyAppleIAPWithBackend(
  productId: string,
  transactionId?: string,
): Promise<{ success: boolean; tier?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.functions.invoke('verify-apple-iap', {
      body: { productId, transactionId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      console.error('[IAP] verify-apple-iap error:', error);
      return { success: false, error: error.message };
    }
    return { success: data?.success ?? false, tier: data?.tier };
  } catch (err) {
    console.error('[IAP] verifyAppleIAPWithBackend error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Verification failed' };
  }
}

// ── Resolve plan type from product ID ────────────────────────────────────
export function planTypeFromProductId(productId: string): IAPPlanType | null {
  const entry = Object.entries(IAP_PRODUCT_IDS).find(([, id]) => id === productId);
  return entry ? (entry[0] as IAPPlanType) : null;
}

// ── Human-readable fallback prices (shown before StoreKit loads) ─────────
export const FALLBACK_PRICES: Record<IAPPlanType, { display: string; period: string; badge?: string; perPeriod?: string }> = {
  weekly: {
    display: '$4.99',
    period: '/ week',
  },
  yearly: {
    display: '$39.99',
    period: '/ year',
    badge: 'Best Value — Save 75%',
    perPeriod: '$3.33 / month',
  },
};
