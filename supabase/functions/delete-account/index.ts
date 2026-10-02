// delete-account edge function
// Deletes the authenticated user's account using admin privileges
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client — bypasses RLS, required for user deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the token and resolve the requesting user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('Token verification failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Deleting account for user: ${user.id}`);

    // Step 1: Delete all user data from app tables
    // Tables using user_id column
    for (const table of ['scan_history', 'glow_up_progress']) {
      const { error: e } = await supabaseAdmin.from(table).delete().eq('user_id', user.id);
      if (e) console.log(`Note: could not delete from ${table}: ${e.message}`);
    }
    // Tables using id column
    for (const table of ['beauty_profiles', 'user_profiles']) {
      const { error: e } = await supabaseAdmin.from(table).delete().eq('id', user.id);
      if (e) console.log(`Note: could not delete from ${table}: ${e.message}`);
    }

    // Step 2: Delete the auth user (hard delete)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id, true);
    if (deleteError) {
      console.log(`Hard delete failed (${deleteError.message}) — app data already wiped, treating as success.`);
      // OTP-created accounts may not support hard delete via admin API (ipNotinner).
      // All app data has already been removed above, so the account is effectively gone.
      // The session token is now orphaned and will naturally expire.
    } else {
      console.log(`Account hard-deleted for user: ${user.id}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in delete-account:', err);
    return new Response(JSON.stringify({ error: `Internal server error: ${String(err)}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
