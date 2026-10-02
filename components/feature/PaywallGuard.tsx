/**
 * PaywallGuard — reusable paywall gate for BeautyHer.
 *
 * Usage:
 *   const { gate, PaywallModal } = usePaywallGuard();
 *   gate(() => router.push('/some-screen'));   // intercepts if not subscribed
 *   ...
 *   <PaywallModal />
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useAlert, useAuth } from '@/template';
import type { IAPPlanType } from '@/services/iapService';
import * as Haptics from 'expo-haptics';

const { height: H } = Dimensions.get('window');

type PlanType = IAPPlanType;

// ── Plan definitions ───────────────────────────────────────────────────────
const PLANS: {
  type: PlanType;
  label: string;
  price: string;
  period: string;
  sub: string;
  badge?: string;
  perPeriod?: string;
  highlight: boolean;
}[] = [
  {
    type: 'yearly',
    label: 'Yearly Plan',
    price: '$39.99',
    period: '/ year',
    sub: 'after 3-day free trial',
    badge: 'Best Value — Save 75%',
    perPeriod: '$3.33 / month',
    highlight: true,
  },
  {
    type: 'weekly',
    label: 'Weekly Plan',
    price: '$4.99',
    period: '/ week',
    sub: 'after 3-day free trial',
    highlight: false,
  },
];

// ── Teaser metrics shown in Step 1 ────────────────────────────────────────
const TEASER_METRICS = [
  { label: 'Face Shape', value: 'Oval', icon: 'scan-outline' as const, color: '#C88F74' },
  { label: 'Glow Score', value: '82 / 100', icon: 'sparkles' as const, color: '#F48FB1' },
  { label: 'Skin Tone', value: 'Light Warm', icon: 'sunny-outline' as const, color: '#FFCC80' },
  { label: 'Undertone', value: 'Warm', icon: 'color-palette-outline' as const, color: '#80CBC4' },
];

// ── Locked feature rows ────────────────────────────────────────────────────
const LOCKED_FEATURES = [
  { icon: 'color-palette' as const, label: 'Seasonal Color Palette', color: '#CE93D8' },
  { icon: 'cut' as const, label: 'Hair & Makeup Match', color: '#80CBC4' },
  { icon: 'analytics' as const, label: 'Detailed Skin Health Metrics', color: '#64B5F6' },
];

// ── Mini plan card ─────────────────────────────────────────────────────────
function MiniPlanCard({
  plan,
  isSelected,
  onPress,
}: {
  plan: typeof PLANS[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        ps.planWrap,
        isSelected && ps.planWrapActive,
        plan.highlight && ps.planHighlight,
      ]}
    >
      {plan.highlight ? (
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          start={[0, 0]}
          end={[1, 0]}
          style={ps.planTopBar}
        />
      ) : null}
      <View style={ps.planRow}>
        <View style={[ps.planRadio, isSelected && ps.planRadioActive]}>
          {isSelected ? <View style={ps.planRadioDot} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <View style={ps.planNameRow}>
            <Text style={[ps.planLabel, isSelected && ps.planLabelActive]}>{plan.label}</Text>
            {plan.badge ? (
              <View style={[ps.planBadge, plan.highlight && ps.planBadgeHighlight]}>
                <Text style={ps.planBadgeText}>{plan.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={ps.planSub}>{plan.sub}</Text>
          {plan.perPeriod ? (
            <Text style={ps.planPerPeriod}>{plan.perPeriod}</Text>
          ) : null}
        </View>
        <View style={ps.planPriceBlock}>
          <Text style={[ps.planPrice, isSelected && ps.planPriceActive]}>{plan.price}</Text>
          <Text style={ps.planPeriod}>{plan.period}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── The actual paywall modal ───────────────────────────────────────────────
function PaywallModalView({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { purchasePlan, restoreSubscription, loading: subLoading } = useSubscription();
  const { showAlert } = useAlert();

  const { user: authUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Animations
  const backdropFade = useRef(new Animated.Value(0)).current;
  const sheetSlide = useRef(new Animated.Value(H)).current;
  const step2Fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      Animated.parallel([
        Animated.timing(backdropFade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetSlide, { toValue: 0, damping: 22, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropFade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetSlide, { toValue: H, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const goToStep2 = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setStep(2);
    Animated.timing(step2Fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  };

  const handleSubscribe = async () => {
    if (checkoutLoading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // Guest user — must sign in before subscribing
    if (!authUser) {
      onClose();
      showAlert(
        'Sign In Required',
        'Please sign in or create a free account to start your 3-day free trial.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => router.push('/login'),
          },
        ]
      );
      return;
    }

    setCheckoutLoading(true);
    const result = await purchasePlan(selectedPlan);
    setCheckoutLoading(false);

    if (result.cancelled) return; // user dismissed the native sheet — stay on paywall

    if (result.error) {
      showAlert('Purchase Failed', result.error);
      return;
    }

    // On successful subscription / trial start — close modal and go to dashboard
    if (result.subscribed) {
      onClose();
      router.replace('/(tabs)');
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const { restored, error } = await restoreSubscription();
    setRestoring(false);
    if (error) {
      showAlert('Restore Failed', error);
    } else if (restored) {
      showAlert('Restored', 'Your subscription has been restored.', [
        { text: 'Continue', onPress: () => { onClose(); router.replace('/(tabs)'); } },
      ]);
    } else {
      showAlert('No Purchases Found', 'No active subscription was found for this Apple ID.');
    }
  };

  const isBusy = checkoutLoading || subLoading || restoring;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[ms.backdrop, { opacity: backdropFade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          ms.sheet,
          { transform: [{ translateY: sheetSlide }], paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Handle + close */}
        <View style={ms.handleRow}>
          <View style={ms.handle} />
          <Pressable
            style={({ pressed }) => [ms.closeBtn, pressed && { opacity: 0.6 }]}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Top badge */}
        <View style={ms.badgeRow}>
          <View style={ms.badge}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={[0, 0]}
              end={[1, 0]}
              style={ms.badgeGrad}
            >
              <Ionicons name="gift" size={13} color="#fff" />
              <Text style={ms.badgeText}>$0.00 Today</Text>
            </LinearGradient>
          </View>
          <View style={ms.trialBadge}>
            <Ionicons name="timer-outline" size={12} color={Colors.primary} />
            <Text style={ms.trialBadgeText}>3-Day Free Trial</Text>
          </View>
        </View>

        {step === 1 ? (
          /* ── STEP 1: Teaser preview ─────────────────────────────── */
          <>
            <Text style={ms.title}>Your Analysis Preview</Text>
            <Text style={ms.sub}>Unlock the full scan report with Premium</Text>

            {/* Teaser grid */}
            <View style={ms.teaserGrid}>
              {TEASER_METRICS.map((m, i) => (
                <View key={i} style={ms.teaserCard}>
                  <View style={[ms.teaserIcon, { backgroundColor: m.color + '18' }]}>
                    <Ionicons name={m.icon} size={16} color={m.color} />
                  </View>
                  <Text style={ms.teaserLabel}>{m.label}</Text>
                  <Text style={ms.teaserValue}>{m.value}</Text>
                </View>
              ))}
            </View>

            {/* Locked features */}
            <View style={ms.lockedSection}>
              {LOCKED_FEATURES.map((f, i) => (
                <View key={i} style={ms.lockedRow}>
                  {Platform.OS === 'ios' ? (
                    <BlurView intensity={14} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: Radius.md }]} />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, ms.lockedAndroidBlur]} />
                  )}
                  <View style={[ms.lockedIcon, { backgroundColor: f.color + '18' }]}>
                    <Ionicons name={f.icon} size={14} color={f.color} />
                  </View>
                  <Text style={ms.lockedLabel}>{f.label}</Text>
                  <View style={ms.lockPill}>
                    <Ionicons name="lock-closed" size={10} color={Colors.primary} />
                    <Text style={ms.lockPillText}>Premium</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* CTA Step 1 */}
            <Pressable
              style={({ pressed }) => [ms.ctaBtn, pressed && { opacity: 0.9 }]}
              onPress={goToStep2}
            >
              <LinearGradient
                colors={['#D4A090', Colors.primary, Colors.primaryDark]}
                start={[0, 0]}
                end={[1, 0]}
                style={ms.ctaInner}
              >
                <Ionicons name="gift" size={16} color="#fff" />
                <Text style={ms.ctaText}>Start My 3-Day Free Trial</Text>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.75)" />
              </LinearGradient>
            </Pressable>

            <Pressable style={ms.skipLink} onPress={onClose}>
              <Text style={ms.skipLinkText}>Continue with Free Plan</Text>
            </Pressable>
          </>
        ) : (
          /* ── STEP 2: Plan selector ──────────────────────────────── */
          <Animated.View style={{ opacity: step2Fade }}>
            <Text style={ms.title}>Choose Your Plan</Text>
            <Text style={ms.sub}>Start free. Cancel anytime. No payment today.</Text>

            <View style={ms.plansWrap}>
              {PLANS.map(plan => (
                <MiniPlanCard
                  key={plan.type}
                  plan={plan}
                  isSelected={selectedPlan === plan.type}
                  onPress={() => setSelectedPlan(plan.type)}
                />
              ))}
            </View>

            {/* Disclosure */}
            <View style={ms.disclosure}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.success} />
              <Text style={ms.disclosureText}>
                Charged $0.00 today. Cancel anytime in App Store / Play Store settings.
              </Text>
            </View>

            {/* Subscribe CTA */}
            <Pressable
              style={({ pressed }) => [ms.ctaBtn, pressed && { opacity: 0.9 }, isBusy && { opacity: 0.7 }]}
              onPress={handleSubscribe}
              disabled={isBusy}
            >
              {isBusy ? (
                <View style={[ms.ctaInner, { backgroundColor: Colors.primary }]}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={ms.ctaText}>Processing…</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={['#D4A090', Colors.primary, Colors.primaryDark]}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={ms.ctaInner}
                >
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={ms.ctaText}>Subscribe & Unlock Full Analysis</Text>
                </LinearGradient>
              )}
            </Pressable>

            {/* Footer links */}
            <View style={ms.footerRow}>
              <Pressable onPress={handleRestore} disabled={restoring}>
                <Text style={ms.footerLink}>{restoring ? 'Restoring...' : 'Restore'}</Text>
              </Pressable>
              <Text style={ms.footerDot}>·</Text>
              <Pressable onPress={() => Linking.openURL('https://beautyher.app/privacy').catch(() => {})}>
                <Text style={ms.footerLink}>Privacy</Text>
              </Pressable>
              <Text style={ms.footerDot}>·</Text>
              <Pressable onPress={() => Linking.openURL('https://beautyher.app/terms').catch(() => {})}>
                <Text style={ms.footerLink}>Terms</Text>
              </Pressable>
              <Text style={ms.footerDot}>·</Text>
              <Pressable onPress={() => setStep(1)}>
                <Text style={ms.footerLink}>Back</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Hook that components consume ───────────────────────────────────────────
export function usePaywallGuard() {
  const { subscribed } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  /**
   * gate(action) — if user is subscribed, runs action immediately.
   * If not subscribed, shows the paywall modal instead.
   */
  const gate = useCallback(
    (action?: () => void) => {
      if (subscribed) {
        action?.();
      } else {
        setPaywallVisible(true);
      }
    },
    [subscribed]
  );

  const PaywallModal = useCallback(
    () => (
      <PaywallModalView
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    ),
    [paywallVisible]
  );

  return { gate, PaywallModal, paywallVisible, setPaywallVisible };
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,34,34,0.56)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.md,
    maxHeight: H * 0.92,
    ...Shadow.lg,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginBottom: 4,
    position: 'relative',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  badge: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  badgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trialBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
  },

  // Header
  title: {
    fontSize: 22,
    fontWeight: Fonts.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  // Teaser grid
  teaserGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  teaserCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  teaserIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teaserLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
    marginBottom: 2,
  },
  teaserValue: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },

  // Locked features
  lockedSection: {
    gap: 7,
    marginBottom: Spacing.md,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.sm,
  },
  lockedAndroidBlur: {
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: Radius.md,
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockedLabel: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '50',
  },
  lockPillText: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },

  // Plans
  plansWrap: {
    gap: 8,
    marginBottom: Spacing.sm,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  disclosureText: {
    flex: 1,
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  // CTA
  ctaBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadow.md,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
    minHeight: 52,
  },
  ctaText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.2,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  footerLink: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },
});

// ── Mini plan card styles ──────────────────────────────────────────────────
const ps = StyleSheet.create({
  planWrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.sm,
  },
  planWrapActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(200,143,116,0.04)',
  },
  planHighlight: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  planTopBar: {
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 4,
    paddingBottom: Spacing.sm,
    gap: 10,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planRadioActive: { borderColor: Colors.primary },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  planLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textSecondary,
  },
  planLabelActive: { color: Colors.text },
  planBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  planBadgeHighlight: { backgroundColor: Colors.accent },
  planBadgeText: {
    fontSize: 9,
    fontWeight: Fonts.weights.bold,
    color: Colors.primaryDark,
  },
  planSub: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },
  planPerPeriod: {
    fontSize: Fonts.sizes.xs,
    color: Colors.success,
    fontWeight: Fonts.weights.semibold,
    marginTop: 1,
  },
  planPriceBlock: { alignItems: 'flex-end' },
  planPrice: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.textSecondary,
  },
  planPriceActive: { color: Colors.primary },
  planPeriod: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
});
