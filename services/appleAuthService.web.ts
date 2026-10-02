/**
 * appleAuthService.web.ts — Web stub for expo-apple-authentication.
 * Sign in with Apple is iOS-only; this stub keeps the web bundle clean.
 */

export interface AppleSignInResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return false;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  return { ok: false, code: 'platform_unsupported', message: 'Sign in with Apple is only available on iOS.' };
}
