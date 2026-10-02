/**
 * check-subscription — checks if the authenticated user has an active subscription.
 *
 * Priority:
 *  1. Apple IAP metadata (iOS native purchases) — checked first, no Stripe dependency
 *  2. Stripe subscriptions (web / Android purchases) — only attempted if no IAP found
 *
 * This ordering is critical: iOS users who purchased via Apple IAP will never have
 * a Stripe customer, so checking Stripe first would always return "free".
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

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
    logStep('Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Authentication failed');
    logStep('User authenticated', { userId: user.id });

    // ── 1. Check Apple IAP metadata (iOS native StoreKit purchases) ────────
    const { data: userRecord } = await supabase.auth.admin.getUserById(user.id);
    const iapMeta = userRecord?.user?.user_metadata;

    if (iapMeta?.iap_tier && iapMeta?.iap_purchased_at) {
      const tier = iapMeta.iap_tier as string;

      // Prefer Apple-reported expiry (set by verify-apple-iap via App Store Server API)
      // Fall back to duration-based estimate if not yet available
      let expiresAt: Date;
      if (iapMeta.iap_expires_at) {
        expiresAt = new Date(iapMeta.iap_expires_at as string);
      } else {
        const purchasedAt = new Date(iapMeta.iap_purchased_at as string);
        const daysValid = tier === 'yearly' ? 365 : 7;
        expiresAt = new Date(purchasedAt.getTime() + daysValid * 24 * 60 * 60 * 1000);
      }
      const isExpired = new Date() > expiresAt;

      if (!isExpired) {
        logStep('Apple IAP subscription active', { tier, expiresAt: expiresAt.toISOString() });
        return new Response(
          JSON.stringify({
            subscribed: true,
            tier,
            subscription_end: expiresAt.toISOString(),
            is_trial: iapMeta.iap_is_trial ?? false,
            source: 'apple_iap',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      logStep('Apple IAP subscription expired', { tier, expiresAt: expiresAt.toISOString() });
    }

    // ── 2. Fall through to Stripe (web / Android users) ───────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      // No Stripe key and no valid IAP → free tier
      logStep('No Stripe key configured and no valid IAP — returning free');
      return new Response(
        JSON.stringify({ subscribed: false, tier: 'free', subscription_end: null, is_trial: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.email) {
      logStep('No email on user record — returning free');
      return new Response(
        JSON.stringify({ subscribed: false, tier: 'free', subscription_end: null, is_trial: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { default: Stripe } = await import('https://esm.sh/stripe@14.21.0');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (!customers.data.length) {
      logStep('No Stripe customer found');
      return new Response(
        JSON.stringify({ subscribed: false, tier: 'free', subscription_end: null, is_trial: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = customers.data[0].id;
    logStep('Stripe customer found', { customerId });

    const activeSubs = await stripe.subscriptions.list({
      customer: customerId, status: 'active', limit: 1,
    });
    const trialSubs = await stripe.subscriptions.list({
      customer: customerId, status: 'trialing', limit: 1,
    });

    const sub = activeSubs.data[0] ?? trialSubs.data[0];
    const isTrial = !activeSubs.data.length && !!trialSubs.data.length;

    if (!sub) {
      logStep('No active Stripe subscription');
      return new Response(
        JSON.stringify({ subscribed: false, tier: 'free', subscription_end: null, is_trial: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceId = sub.items.data[0]?.price?.id;
    const subscriptionEnd = isTrial && sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : new Date(sub.current_period_end * 1000).toISOString();

    const { data: priceRecord } = await supabase
      .from('stripe_prices')
      .select('plan_type')
      .eq('price_id', priceId)
      .single();

    const tier = priceRecord?.plan_type ?? 'monthly';
    logStep('Stripe subscription resolved', { tier, isTrial, subscriptionEnd });

    return new Response(
      JSON.stringify({
        subscribed: true,
        tier,
        subscription_end: subscriptionEnd,
        is_trial: isTrial,
        source: 'stripe',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep('Error', { msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
