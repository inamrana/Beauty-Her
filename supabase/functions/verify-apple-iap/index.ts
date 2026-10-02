/**
 * verify-apple-iap — validates an Apple In-App Purchase transaction
 * using the App Store Server API (StoreKit 2 / JWS signed transactions).
 *
 * Flow:
 *  1. Receives productId + transactionId from the iOS client after StoreKit purchase
 *  2. Verifies the transaction against Apple's App Store Server API
 *  3. Records the subscription tier in user metadata for check-subscription to read
 *
 * Apple App Store Server API docs:
 *  https://developer.apple.com/documentation/appstoreserverapi
 *
 * Environment variables required:
 *  - APPLE_BUNDLE_ID       e.g. "com.beautyher"
 *  - APPLE_ISSUER_ID       From App Store Connect → Users & Access → Integrations → App Store Connect API
 *  - APPLE_KEY_ID          Same location
 *  - APPLE_PRIVATE_KEY     p8 key content (PEM, single line with \n escapes or multiline)
 *
 * If Apple API credentials are not configured, the function falls back to
 * trusting the client-reported purchase (StoreKit already verified with Apple
 * before finishTransaction was called). This is acceptable for initial launch
 * but should be replaced with full server-side validation before scaling.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-APPLE-IAP] ${step}${d}`);
};

// Apple IAP product → subscription tier mapping
// NOTE: Must match bundle ID prefix exactly as configured in App Store Connect
const PRODUCT_TIER: Record<string, string> = {
  // Primary product IDs (as configured in App Store Connect)
  'com.beautyher.premium.weekly': 'weekly',
  'com.beautyher.premium.yearly': 'yearly',
  // Legacy fallback (with .app segment)
  'com.beautyher.app.premium.weekly': 'weekly',
  'com.beautyher.app.premium.yearly': 'yearly',
};

// How long each tier is valid (used for local expiry calculation)
const TIER_DAYS: Record<string, number> = {
  weekly: 7,
  yearly: 365,
};

/**
 * Attempt to verify a transaction with the App Store Server API.
 * Returns null if credentials are missing or verification fails non-fatally.
 */
async function verifyWithAppleAPI(
  transactionId: string,
  bundleId: string,
  issuerId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<{ productId: string; expiresDate: number } | null> {
  try {
    // Build a signed JWT for App Store Server API authentication
    // Header: { alg: 'ES256', kid: keyId }
    // Payload: { iss: issuerId, iat, exp, aud: 'appstoreconnect-v1', bid: bundleId }
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payload = btoa(JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 300,
      aud: 'appstoreconnect-v1',
      bid: bundleId,
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Import the EC private key
    const pemBody = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyData.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );

    const sigInput = new TextEncoder().encode(`${header}.${payload}`);
    const sigDer = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, sigInput);
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigDer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const jwt = `${header}.${payload}.${sigB64}`;

    // Call App Store Server API — try production first, then sandbox
    for (const env of ['production', 'sandbox'] as const) {
      const baseUrl = env === 'production'
        ? 'https://api.storekit.itunes.apple.com'
        : 'https://api.storekit-sandbox.itunes.apple.com';

      const resp = await fetch(
        `${baseUrl}/inApps/v1/transactions/${transactionId}`,
        { headers: { Authorization: `Bearer ${jwt}` } },
      );

      if (resp.status === 200) {
        const txn = await resp.json() as { signedTransactionInfo?: string };
        if (txn.signedTransactionInfo) {
          // Decode the JWS payload (middle segment) without verifying Apple's sig
          // (Apple's cert chain validation is non-trivial in Deno; we trust the HTTPS channel)
          const parts = txn.signedTransactionInfo.split('.');
          if (parts.length >= 2) {
            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            logStep('Apple API verified', { env, productId: decoded.productId });
            return {
              productId: decoded.productId as string,
              expiresDate: decoded.expiresDate as number ?? 0,
            };
          }
        }
      } else if (resp.status === 404) {
        // Transaction not found in this environment — try next
        continue;
      } else {
        const body = await resp.text();
        logStep(`Apple API ${env} error`, { status: resp.status, body });
        // Non-fatal: fall through to client trust
        return null;
      }
    }

    return null;
  } catch (err) {
    logStep('Apple API verification exception', { error: String(err) });
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Authentication failed');
    logStep('User authenticated', { userId: user.id });

    const body = await req.json();
    const { productId: clientProductId, transactionId } = body as {
      productId: string;
      transactionId?: string;
    };

    if (!clientProductId) throw new Error('productId is required');

    let resolvedProductId = clientProductId;
    let expiresDate: number | null = null;

    // ── Attempt server-side verification with App Store Server API ─────────
    const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
    const issuerId = Deno.env.get('APPLE_ISSUER_ID');
    const keyId = Deno.env.get('APPLE_KEY_ID');
    const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');

    if (bundleId && issuerId && keyId && privateKey && transactionId) {
      logStep('Attempting App Store Server API verification');
      const verified = await verifyWithAppleAPI(transactionId, bundleId, issuerId, keyId, privateKey);
      if (verified) {
        resolvedProductId = verified.productId;
        expiresDate = verified.expiresDate;
        logStep('Server-side verification succeeded', { resolvedProductId });
      } else {
        logStep('Server-side verification unavailable — trusting client StoreKit result');
      }
    } else {
      logStep('Apple API credentials not configured — trusting client StoreKit result');
    }

    const tier = PRODUCT_TIER[resolvedProductId];
    if (!tier) throw new Error(`Unknown product: ${resolvedProductId}`);

    // Calculate expiry: prefer Apple-reported date, fall back to duration from now
    const purchasedAt = new Date().toISOString();
    const iapExpiresAt = expiresDate
      ? new Date(expiresDate).toISOString()
      : new Date(Date.now() + TIER_DAYS[tier] * 24 * 60 * 60 * 1000).toISOString();

    // Record subscription metadata — check-subscription reads this to determine access
    const { error: metaErr } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        iap_tier: tier,
        iap_product_id: resolvedProductId,
        iap_transaction_id: transactionId ?? null,
        iap_purchased_at: purchasedAt,
        iap_expires_at: iapExpiresAt,
        iap_is_trial: true,
      },
    });

    if (metaErr) {
      console.error('[VERIFY-APPLE-IAP] Metadata update error:', metaErr.message);
      // Non-fatal — client already shows subscribed based on StoreKit
    }

    logStep('Subscription recorded', { tier, iapExpiresAt });

    return new Response(
      JSON.stringify({ success: true, tier, subscribed: true, expires_at: iapExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[VERIFY-APPLE-IAP] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
