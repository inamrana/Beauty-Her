import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SETUP] ${step}${d}`);
};

// Target plans that match the UI pricing
const TARGET_PLANS = [
  {
    plan_type: 'weekly',
    name: 'BeautyHer Weekly',
    description: 'Full AI beauty analysis and unlimited scans, billed weekly.',
    unit_amount: 499,      // $4.99
    currency: 'usd',
    interval: 'week' as const,
  },
  {
    plan_type: 'yearly',
    name: 'BeautyHer Annual',
    description: 'Everything in Premium billed annually — Save 75% vs weekly.',
    unit_amount: 3999,     // $39.99
    currency: 'usd',
    interval: 'year' as const,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Fetch existing plans from DB
    const { data: existing } = await supabase.from('stripe_prices').select('*');
    const existingTypes = new Set((existing ?? []).map((p: { plan_type: string }) => p.plan_type));

    // Check if both target plans already exist
    const allPresent = TARGET_PLANS.every(p => existingTypes.has(p.plan_type));
    if (allPresent) {
      logStep('Already configured', { count: existing?.length });
      return new Response(
        JSON.stringify({ success: true, prices: existing, alreadySetup: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const toInsert: Record<string, unknown>[] = [];

    for (const plan of TARGET_PLANS) {
      if (existingTypes.has(plan.plan_type)) {
        logStep(`Skipping existing plan: ${plan.plan_type}`);
        continue;
      }

      logStep(`Creating plan: ${plan.plan_type}`);
      const prod = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { plan_type: plan.plan_type },
      });

      const price = await stripe.prices.create({
        product: prod.id,
        unit_amount: plan.unit_amount,
        currency: plan.currency,
        recurring: { interval: plan.interval },
      });

      toInsert.push({
        plan_type: plan.plan_type,
        product_id: prod.id,
        price_id: price.id,
        name: plan.name,
        amount: plan.unit_amount,
        currency: plan.currency,
        interval: plan.interval,
      });

      logStep(`Created ${plan.plan_type}`, { priceId: price.id, amount: plan.unit_amount });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('stripe_prices').insert(toInsert);
      if (error) throw new Error(`DB insert failed: ${error.message}`);
    }

    const { data: allPrices } = await supabase.from('stripe_prices').select('*');
    logStep('Setup complete', { total: allPrices?.length });

    return new Response(
      JSON.stringify({ success: true, prices: allPrices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[STRIPE-SETUP] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
