/**
 * appleAuthService.ts — Native "Sign in with Apple" service.
 *
 * Uses expo-apple-authentication via dynamic require so the module loads
 * gracefully in environments where the native module is not available
 * (e.g. Expo Go, OnSpace preview runtime).
 *
 * App Store Guideline 4.8: Sign in with Apple is required whenever any
 * third-party social login (e.g. Google) is offered.
 */
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';
import * as Crypto from 'expo-crypto';

export interface AppleSignInResult {
  ok: boolean;
  code?: string;
  message?: string;
}

// ── Safely load expo-apple-authentication (native-only module) ────────────
function getAppleAuth() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  } catch {
    return null;
  }
}

// ── Check if Apple Authentication is available on this device ────────────
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const AppleAuthentication = getAppleAuth();
  if (!AppleAuthentication) return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// ── Sign in with Apple → exchange with Supabase ──────────────────────────
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, code: 'platform_unsupported', message: 'Sign in with Apple is only available on iOS.' };
  }

  const AppleAuthentication = getAppleAuth();
  if (!AppleAuthentication) {
    return { ok: false, code: 'unavailable', message: 'Apple authentication module is not available in this environment.' };
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        code: 'unavailable',
        message: 'Sign in with Apple is not available on this device.',
      };
    }

    // Generate a cryptographically-secure nonce BEFORE calling Apple.
    // The raw nonce is sent to Supabase; the SHA-256 hash goes to Apple.
    // Apple embeds the hash in the identity token — Supabase verifies they match.
    // getRandomBytesAsync is the correct expo-crypto API for secure random bytes
    let rawNonce: string;
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      rawNonce = Array.from(new Uint8Array(randomBytes), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback: generate nonce using Math.random if native module errors
      rawNonce = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('');
    }
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    // Request credential from Apple — shows native sheet
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return {
        ok: false,
        code: 'no_token',
        message: 'Apple did not return an identity token. Please try again.',
      };
    }

    // Exchange the Apple identity token with Supabase using the RAW nonce
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      console.error('[AppleAuth] signInWithIdToken error:', error);
      return {
        ok: false,
        code: 'exchange_failed',
        message: 'Apple sign-in verification failed. Please try again.',
      };
    }

    // Persist the user's real name on first sign-in (Apple only sends it once)
    if (credential.fullName && data.user) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (fullName) {
        const { error: updateErr } = await supabase
          .from('user_profiles')
          .update({ username: fullName })
          .eq('id', data.user.id);
        if (updateErr) {
          console.warn('[AppleAuth] Could not persist display name:', updateErr.message);
        }
      }
    }

    return { ok: true };
  } catch (err: unknown) {
    // User cancelled — Apple throws specific error codes (varies by iOS version)
    if (err && typeof err === 'object') {
      const errCode = (err as { code?: string }).code ?? '';
      const errMessage = (err as { message?: string }).message ?? '';
      if (
        errCode === 'ERR_REQUEST_CANCELED' ||
        errCode === '1001' ||
        errMessage.toLowerCase().includes('cancel') ||
        errMessage.toLowerCase().includes('dismiss')
      ) {
        return { ok: false, code: 'cancelled', message: 'Sign in was cancelled.' };
      }
    }
    console.error('[AppleAuth] Unexpected error:', err);
    return {
      ok: false,
      code: 'unknown',
      message: 'Sign in with Apple failed. Please try again.',
    };
  }
}
