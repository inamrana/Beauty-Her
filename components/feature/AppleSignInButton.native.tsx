
/**
 * AppleSignInButton.native.tsx — Native Apple Sign In button (iOS only).
 *
 * Loads expo-apple-authentication via dynamic require so it degrades
 * gracefully when the native module is not linked (e.g. OnSpace preview).
 */
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '@/constants/theme';

interface Props {
  onPress: () => void;
}

// Try to load the native Apple button — may not be available in all runtimes
function NativeAppleButton({ onPress }: Props) {
  try {
    // This ESLint rule is likely misconfigured or not properly installed.
    // However, the `require` statement itself is valid in certain contexts
    // (like Node.js or Metro bundler for React Native).
    // To resolve the ESLint error, we'll remove the non-standard ESLint directive.
    const AppleAuth = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
    return (
      <AppleAuth.AppleAuthenticationButton
        buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={Radius.full}
        style={styles.nativeBtn}
        onPress={onPress}
      />
    );
  } catch {
    // Fallback button when native module is unavailable (preview environments)
    return (
      <Pressable
        style={({ pressed }) => [styles.fallbackBtn, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        accessibilityLabel="Sign in with Apple"
      >
        <View style={styles.fallbackInner}>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.fallbackText}>Sign in with Apple</Text>
        </View>
      </Pressable>
    );
  }
}

export function AppleSignInButton({ onPress }: Props) {
  return <NativeAppleButton onPress={onPress} />;
}

const styles = StyleSheet.create({
  nativeBtn: {
    height: 52,
    width: '100%',
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  fallbackBtn: {
    height: 52,
    width: '100%',
    borderRadius: Radius.full,
    backgroundColor: '#000',
    marginBottom: 10,
    overflow: 'hidden',
  },
  fallbackInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: '#fff',
  },
});
