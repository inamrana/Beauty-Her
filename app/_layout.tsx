import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { OAuthCallbackHandler } from '@/components/auth/OAuthCallbackHandler';
import { UserProvider } from '@/contexts/UserContext';
import { ScanProvider } from '@/contexts/ScanContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <OAuthCallbackHandler />
          <UserProvider>
            <ScanProvider>
            <SubscriptionProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="scan-result"
                options={{ animation: 'slide_from_bottom', presentation: 'card' }}
              />
              <Stack.Screen
                name="ai-chat"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="color-analysis"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="glow-up"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="photo-tips"
                options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
              />
              <Stack.Screen
                name="feature-analysis"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="color-scan"
                options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
              />
              <Stack.Screen
                name="color-result"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="glow-scan"
                options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
              />
              <Stack.Screen
                name="glow-result"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="camera-guidelines"
                options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
              />
              <Stack.Screen
                name="skin-quiz"
                options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
              />
              <Stack.Screen
                name="facial-scan"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="analyzing"
                options={{ animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen
                name="facial-result"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="glow-analysis"
                options={{ animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen
                name="setup-profile"
                options={{ animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen
                name="subscription"
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <Stack.Screen
                name="terms"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="privacy"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
            </SubscriptionProvider>
            </ScanProvider>
          </UserProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
