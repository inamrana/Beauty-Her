import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user?.email) throw new Error('Authentication failed');
    logStep('User authenticated', { userId: user.id });

    const body = await req.json();
    const { planType } = body;
    if (!planType) throw new Error('planType is required');

    // Get price ID from DB
    const { data: priceData, error: priceErr } = await supabase
      .from('stripe_prices')
      .select('price_id')
      .eq('plan_type', planType)
      .single();

    if (priceErr || !priceData) {
      throw new Error(`Plan "${planType}" not found. Stripe products may not be set up yet — try again in a moment.`);
    }
    logStep('Price resolved', { planType, priceId: priceData.price_id });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceData.price_id, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 3 },
      success_url: 'onspaceapp://subscription/success',
      cancel_url: 'onspaceapp://subscription/cancel',
    });

    logStep('Checkout session created', { sessionId: session.id });
    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CREATE-CHECKOUT] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
