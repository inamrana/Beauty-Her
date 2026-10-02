// check-email edge function
// Uses admin privileges to verify whether an email is already registered in auth.users.
// This bypasses RLS — it is intentionally public (no auth token required) since
// we need to check email existence before the user is authenticated.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email: string = (body?.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ exists: false, error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client — bypasses RLS entirely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query user_profiles with service-role key — this is the most reliable method:
    // no pagination, no in-memory filtering, always accurate.
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('check-email query error:', error.message);
      // Return exists:true on error to be safe — prevents OTP from being sent
      // when we cannot confirm the email is new.
      return new Response(JSON.stringify({ exists: true, error: 'lookup_failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exists = data !== null;
    console.log(`check-email: ${email} exists=${exists}`);

    return new Response(JSON.stringify({ exists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('check-email exception:', err);
    return new Response(JSON.stringify({ exists: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
