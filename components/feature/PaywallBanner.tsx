import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

interface PaywallBannerProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

export function PaywallBanner({ feature, description, compact = false }: PaywallBannerProps) {
  const router = useRouter();

  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [styles.compactWrap, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/subscription')}
      >
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.compactGradient}
        >
          <Ionicons name="lock-closed" size={14} color={Colors.textInverse} />
          <Text style={styles.compactText}>Upgrade to unlock {feature}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textInverse} />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(200,143,116,0.08)', 'rgba(200,143,116,0.02)']}
        style={styles.bg}
      >
        <View style={styles.lockCircle}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={styles.lockGradient}
          >
            <Ionicons name="lock-closed" size={22} color={Colors.textInverse} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.featureName}>{feature}</Text>
        {description ? (
          <Text style={styles.desc}>{description}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
          onPress={() => router.push('/subscription')}
        >
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Unlock with Premium</Text>
            <Ionicons name="sparkles" size={14} color={Colors.textInverse} />
          </LinearGradient>
        </Pressable>
        <Text style={styles.trialHint}>7-day free trial · No credit card required today</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full banner
  wrap: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  bg: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  lockCircle: {
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  lockGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  desc: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  ctaBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    width: '100%',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
  },
  trialHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },

  // Compact banner
  compactWrap: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  compactText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textInverse,
    textAlign: 'center',
  },
});
