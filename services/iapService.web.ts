/**
 * iapService.web.ts — Web stub for react-native-iap.
 * react-native-iap only works on iOS/Android native builds.
 * All functions return safe no-ops so the web bundle compiles cleanly.
 */

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
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: string;
}

export interface IAPPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
}

export const FALLBACK_PRICES: Record<IAPPlanType, { display: string; period: string; badge?: string; perPeriod?: string }> = {
  weekly: { display: '$4.99', period: '/ week' },
  yearly: { display: '$39.99', period: '/ year', badge: 'Best Value — Save 75%', perPeriod: '$3.33 / month' },
};

export async function initIAP(): Promise<boolean> { return false; }
export async function teardownIAP(): Promise<void> { return; }
export async function fetchSubscriptions(): Promise<IAPProduct[]> { return []; }
export async function purchaseSubscription(_planType: IAPPlanType): Promise<IAPPurchaseResult> {
  return { success: false, error: 'In-App Purchases are not available on web.' };
}
export async function restorePurchases(): Promise<{ restored: boolean; productIds: string[] }> {
  return { restored: false, productIds: [] };
}
export async function verifyAppleIAPWithBackend(
  _productId: string,
  _transactionId?: string,
): Promise<{ success: boolean; tier?: string; error?: string }> {
  return { success: false, error: 'Not available on web.' };
}
export function planTypeFromProductId(_productId: string): IAPPlanType | null { return null; }
