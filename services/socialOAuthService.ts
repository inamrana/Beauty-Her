import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getSupabaseClient } from '@/template';

export const OAUTH_REDIRECT_URL = 'onspaceapp://auth';
export type OAuthProvider = 'google' | 'apple';

export interface OAuthResult {
  ok: boolean;
  code?: string;
  message?: string;
}

function getQueryParam(url: string, name: string): string | null {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  for (const part of query.split('&')) {
    const pieces = part.split('=');
    const key = decodeURIComponent((pieces.shift() ?? '').replace(/\+/g, ' '));
    if (key === name) return decodeURIComponent(pieces.join('=').replace(/\+/g, ' '));
  }
  return null;
}

const exchangeByCode = new Map<string, Promise<OAuthResult>>();

export function handleOAuthCallback(url: string): Promise<OAuthResult> {
  const callbackError = getQueryParam(url, 'error') || getQueryParam(url, 'error_code');
  if (callbackError) {
    return Promise.resolve({ ok: false, code: 'callback_error', message: 'Third-party login failed. Please try again.' });
  }

  const code = getQueryParam(url, 'code');
  if (!code) {
    return Promise.resolve({ ok: false, code: 'missing_code', message: 'The login callback is missing an authorization code. Please try again.' });
  }

  const existing = exchangeByCode.get(code);
  if (existing) return existing;

  const exchange = getSupabaseClient().auth.exchangeCodeForSession(code).then(({ error }) =>
    error
      ? { ok: false as const, code: 'exchange_failed', message: 'Login verification failed. Please try again.' }
      : { ok: true as const },
  );
  exchangeByCode.set(code, exchange);
  return exchange;
}

export async function signInWithSocial(provider: OAuthProvider): Promise<OAuthResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { ok: false, code: 'authorization_url_failed', message: 'Unable to start third-party login. Please check the login configuration and try again.' };
  }

  // preferEphemeralSession: true fixes iPad/iPadOS OAuth viewport issues
  // by using an ephemeral session that does not share cookies with Safari,
  // preventing the shared-cookie credential picker from blocking the flow.
  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL, {
    preferEphemeralSession: true,
    createTask: false,
  });
  if (result.type === 'success' && result.url) return handleOAuthCallback(result.url);
  return { ok: false, code: 'cancelled', message: 'Login was cancelled.' };
}

export const signInWithGoogle = () => signInWithSocial('google');
