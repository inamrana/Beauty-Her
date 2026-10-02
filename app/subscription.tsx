import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  Linking,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useAlert, useAuth } from '@/template';
import type { IAPPlanType } from '@/services/iapService';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');

type PlanType = IAPPlanType;

// ── Teaser scan data (non-sensitive, shown before paywall) ────────────────
const TEASER_METRICS = [
  { label: 'Face Shape', value: 'Oval', icon: 'scan-outline' as const, color: '#C88F74' },
  { label: 'Glow Score', value: '82 / 100', icon: 'sparkles' as const, color: '#F48FB1' },
  { label: 'Skin Tone', value: 'Light Warm', icon: 'sunny-outline' as const, color: '#FFCC80' },
  { label: 'Undertone', value: 'Warm', icon: 'color-palette-outline' as const, color: '#80CBC4' },
];

// ── Locked premium cards ──────────────────────────────────────────────────
const LOCKED_CARDS = [
  {
    icon: 'color-palette' as const,
    title: 'Seasonal Color Palette',
    desc: 'Discover your exact color season and get a personalized palette of 60+ colors.',
    color: '#CE93D8',
    bg: 'rgba(206,147,216,0.1)',
  },
  {
    icon: 'cut' as const,
    title: 'Hair & Makeup Match',
    desc: 'AI-matched hair colors, styles, and makeup looks tailored to your features.',
    color: '#80CBC4',
    bg: 'rgba(128,203,196,0.1)',
  },
  {
    icon: 'analytics' as const,
    title: 'Detailed Skin Health Metrics',
    desc: 'Deep-dive scores for hydration, texture, clarity, pores, and 4 more metrics.',
    color: '#64B5F6',
    bg: 'rgba(100,181,246,0.1)',
  },
];

// ── Plans ─────────────────────────────────────────────────────────────────
const PLANS: {
  type: PlanType;
  label: string;
  price: string;
  period: string;
  sub: string;
  badge?: string;
  perPeriod?: string;
  savingsPct?: number;
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
    savingsPct: 75,
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

// ── Locked card with blur overlay ─────────────────────────────────────────
function LockedCard({ item }: { item: typeof LOCKED_CARDS[0] }) {
  return (
    <View style={lc.wrap}>
      {/* Blurred content preview */}
      <View style={lc.inner}>
        <View style={[lc.iconWrap, { backgroundColor: item.bg }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lc.title}>{item.title}</Text>
          <Text style={lc.desc} numberOfLines={2}>{item.desc}</Text>
          {/* Blurred text lines (visual shimmer) */}
          <View style={lc.blurLine} />
          <View style={[lc.blurLine, { width: '65%' }]} />
        </View>
      </View>

      {/* Blur overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={18}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, lc.androidBlur]} />
      )}

      {/* Lock badge */}
      <View style={lc.lockBadge}>
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          style={lc.lockGrad}
          start={[0, 0]}
          end={[1, 0]}
        >
          <Ionicons name="lock-closed" size={12} color="#fff" />
          <Text style={lc.lockText}>Unlock with Premium</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

// ── Plan Selector Card ────────────────────────────────────────────────────
function PlanCard({
  plan,
  isSelected,
  onPress,
}: {
  plan: typeof PLANS[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={{ marginBottom: 10 }}>
      <Animated.View
        style={[
          pc.wrap,
          isSelected && pc.wrapActive,
          plan.highlight && pc.wrapHighlight,
          { transform: [{ scale }] },
        ]}
      >
        {plan.highlight ? (
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            start={[0, 0]}
            end={[1, 0]}
            style={pc.topBar}
          />
        ) : null}

        <View style={pc.row}>
          {/* Radio */}
          <View style={[pc.radio, isSelected && pc.radioActive]}>
            {isSelected ? <View style={pc.radioDot} /> : null}
          </View>

          {/* Labels */}
          <View style={{ flex: 1 }}>
            <View style={pc.nameRow}>
              <Text style={[pc.label, isSelected && pc.labelActive]}>{plan.label}</Text>
              {plan.badge ? (
                <View style={[pc.badge, plan.highlight && pc.badgeHighlight]}>
                  <Text style={[pc.badgeText, plan.highlight && pc.badgeTextHighlight]}>
                    {plan.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={pc.sub}>{plan.sub}</Text>
            {plan.perPeriod ? (
              <Text style={pc.perPeriod}>{plan.perPeriod}</Text>
            ) : null}
          </View>

          {/* Price */}
          <View style={pc.priceBlock}>
            <Text style={[pc.price, isSelected && pc.priceActive]}>{plan.price}</Text>
            <Text style={pc.period}>{plan.period}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Plan Selector Modal / Bottom Sheet ───────────────────────────────────
function PlanModal({
  visible,
  onClose,
  onSubscribe,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: PlanType) => void;
  loading: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlanType>('yearly');
  const slideAnim = useRef(new Animated.Value(H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: H, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSubscribe = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    Animated.sequence([
      Animated.timing(ctaScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(ctaScale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    onSubscribe(selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[pm.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          pm.sheet,
          { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Handle */}
        <View style={pm.handle} />

        {/* Header */}
        <View style={pm.header}>
          <View style={pm.trialBadge}>
            <Ionicons name="gift" size={14} color={Colors.primary} />
            <Text style={pm.trialBadgeText}>3-Day Free Trial · $0.00 Today</Text>
          </View>
          <Text style={pm.headerTitle}>Choose Your Plan</Text>
          <Text style={pm.headerSub}>
            Start free. Cancel anytime. No payment today.
          </Text>
        </View>

        {/* Plans */}
        <View style={pm.plansWrap}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.type}
              plan={plan}
              isSelected={selected === plan.type}
              onPress={() => setSelected(plan.type)}
            />
          ))}
        </View>

        {/* Disclosure */}
        <View style={pm.disclosure}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
          <Text style={pm.disclosureText}>
            Charged $0.00 today. Renews after 3-day trial.{'\n'}
            Cancel anytime in App Store / Play Store settings.
          </Text>
        </View>

        {/* Subscribe CTA */}
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <Pressable
            style={({ pressed }) => [pm.cta, pressed && { opacity: 0.9 }]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <View style={pm.ctaInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={pm.ctaText}>Processing…</Text>
              </View>
            ) : (
              <LinearGradient
                colors={['#D4A090', Colors.primary, Colors.primaryDark]}
                start={[0, 0]}
                end={[1, 0]}
                style={pm.ctaInner}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={pm.ctaText}>Subscribe & Unlock Full Analysis</Text>
              </LinearGradient>
            )}
          </Pressable>
        </Animated.View>

        {/* Footer links */}
        <View style={pm.footerLinks}>
          <Pressable onPress={() => router.push('/privacy')}>
            <Text style={pm.footerLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={pm.footerDot}>·</Text>
          <Pressable onPress={() => router.push('/terms')}>
            <Text style={pm.footerLink}>Terms of Use</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Main Subscription Screen ──────────────────────────────────────────────
export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { purchasePlan, restoreSubscription, loading: initLoading } = useSubscription();
  const { showAlert } = useAlert();
  const { user: authUser } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Entry animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const ctaBounce = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headerSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(ctaBounce, { toValue: 1, damping: 14, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSubscribe = async (planType: PlanType) => {
    if (checkoutLoading) return;

    // Guest user — must sign in before subscribing
    if (!authUser) {
      setModalVisible(false);
      showAlert(
        'Sign In Required',
        'Please sign in or create a free account to start your 3-day free trial.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/login') },
        ]
      );
      return;
    }

    setCheckoutLoading(true);
    const result = await purchasePlan(planType);
    setCheckoutLoading(false);

    if (result.cancelled) return; // user dismissed native sheet — keep modal open

    if (result.error) {
      setModalVisible(false);
      showAlert('Purchase Failed', result.error);
      return;
    }

    // Navigate to dashboard on successful subscription / trial start
    if (result.subscribed) {
      setModalVisible(false);
      router.replace('/(tabs)');
    }
  };

  const handleRestorePurchases = async () => {
    if (restoring) return;
    setRestoring(true);
    const { restored, error } = await restoreSubscription();
    setRestoring(false);
    if (error) {
      showAlert('Restore Failed', error);
    } else if (restored) {
      showAlert('Restored', 'Your subscription has been restored.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]);
    } else {
      showAlert('No Purchases Found', 'No active subscription was found for this Apple ID.');
    }
  };

  // Also gate the Step 1 CTA ("Start My 3-Day Free Trial") for guests
  const handleStartTrial = () => {
    if (!authUser) {
      showAlert(
        'Sign In Required',
        'Please sign in or create a free account to start your 3-day free trial.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/login') },
        ]
      );
      return;
    }
    setModalVisible(true);
  };

  const isBusy = checkoutLoading || initLoading || restoring;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Close button */}
      <SafeAreaView style={styles.closeArea} edges={['top']} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* ── HEADER BADGE ─────────────────────────────────────── */}
        <LinearGradient
          colors={['#FDF0EC', '#F8E2DC', '#EDD6CE']}
          style={styles.hero}
        >
          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
                paddingTop: insets.top + 44,
              },
            ]}
          >
            {/* $0.00 Today badge */}
            <View style={styles.priceBadgeRow}>
              <View style={styles.priceBadge}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={styles.priceBadgeGrad}
                >
                  <Ionicons name="gift" size={14} color="#fff" />
                  <Text style={styles.priceBadgeText}>$0.00 Today</Text>
                </LinearGradient>
              </View>
              <View style={styles.trialBadgeSmall}>
                <Ionicons name="timer-outline" size={13} color={Colors.primary} />
                <Text style={styles.trialBadgeSmallText}>3-Day Free Trial</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{'Your Personalized\nBeauty Analysis'}</Text>
            <Text style={styles.heroSub}>
              See what the AI discovered about your unique features
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── STEP 1: TEASER SCAN METRICS ──────────────────────── */}
        <Animated.View style={[styles.section, { opacity: contentFade }]}>
          <View style={styles.stepLabel}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Your Scan Results (Preview)</Text>
          </View>

          <View style={styles.teaserGrid}>
            {TEASER_METRICS.map((m, i) => (
              <View key={i} style={styles.teaserCard}>
                <View style={[styles.teaserIconWrap, { backgroundColor: m.color + '18' }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <Text style={styles.teaserLabel}>{m.label}</Text>
                <Text style={styles.teaserValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── LOCKED PREMIUM CARDS ─────────────────────────────── */}
        <Animated.View style={[styles.section, { opacity: contentFade, paddingTop: 0 }]}>
          <View style={styles.stepLabel}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Full Analysis (Premium Only)</Text>
          </View>

          <View style={styles.lockedStack}>
            {LOCKED_CARDS.map((item, i) => (
              <LockedCard key={i} item={item} />
            ))}
          </View>

          {/* Unlock nudge */}
          <View style={styles.unlockNudge}>
            <Ionicons name="lock-closed" size={14} color={Colors.primary} />
            <Text style={styles.unlockNudgeText}>
              Unlock all 3 analyses + unlimited scans with Premium
            </Text>
          </View>
        </Animated.View>

        {/* ── WHAT'S INCLUDED STRIP ────────────────────────────── */}
        <Animated.View style={[styles.includesStrip, { opacity: contentFade }]}>
          <LinearGradient
            colors={['#FFF8F5', '#FFF0EC']}
            style={styles.includesGrad}
          >
            <Text style={styles.includesTitle}>Everything in Premium</Text>
            <View style={styles.includesGrid}>
              {[
                { icon: 'camera', label: 'Unlimited Scans' },
                { icon: 'sparkles', label: 'AI Beauty Coach' },
                { icon: 'color-palette', label: 'Color Analysis' },
                { icon: 'analytics', label: 'Skin Metrics' },
                { icon: 'cut', label: 'Hair Matches' },
                { icon: 'trending-up', label: 'Progress Tracker' },
              ].map((f, i) => (
                <View key={i} style={styles.includesItem}>
                  <View style={styles.includesCheckCircle}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                  <Text style={styles.includesLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── TRUST BADGES ─────────────────────────────────────── */}
        <Animated.View style={[styles.trustRow, { opacity: contentFade }]}>
          {[
            { icon: 'ban-outline' as const, label: 'No payment today' },
            { icon: 'close-circle-outline' as const, label: 'Cancel anytime' },
            { icon: 'shield-checkmark-outline' as const, label: 'Secure checkout' },
          ].map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name={t.icon} size={15} color={Colors.primary} />
              <Text style={styles.trustLabel}>{t.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── FOOTER LINKS ─────────────────────────────────────── */}
        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestorePurchases} disabled={restoring}>
            <Text style={styles.footerLink}>{restoring ? 'Restoring...' : 'Restore Purchases'}</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
        </View>

        <Text style={styles.renewalNote}>
          Subscriptions automatically renew unless canceled{'\n'}at least 24 hours before the renewal date.
        </Text>
      </ScrollView>

      {/* ── FIXED BOTTOM CTA ─────────────────────────────────────── */}
      <View style={styles.ctaContainer} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(255,250,249,0)', 'rgba(255,250,249,0.97)', Colors.background]}
          style={styles.ctaFade}
          pointerEvents="none"
        />
        <SafeAreaView edges={['bottom']} style={styles.ctaSafe}>
          <Animated.View style={{ transform: [{ scale: ctaBounce }] }}>
            <Pressable
              style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
              onPress={() => handleStartTrial()}
              disabled={isBusy}
            >
              <LinearGradient
                colors={['#D4A090', Colors.primary, Colors.primaryDark]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.ctaBtnInner}
              >
                <Ionicons name="gift" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>Start My 3-Day Free Trial</Text>
                <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.75)" />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.skipBtnText}>Continue with Free Plan</Text>
          </Pressable>
        </SafeAreaView>
      </View>

      {/* ── PLAN SELECTOR MODAL (Step 2) ─────────────────────── */}
      <PlanModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubscribe={handleSubscribe}
        loading={isBusy}
      />
    </View>
  );
}

// ── LockedCard styles ──────────────────────────────────────────────────────
const lc = StyleSheet.create({
  wrap: {
    position: 'relative',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 90,
    ...Shadow.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    marginBottom: 3,
  },
  desc: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  blurLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    width: '85%',
    marginBottom: 4,
  },
  androidBlur: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: Radius.lg,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  lockGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  lockText: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

// ── PlanCard styles ────────────────────────────────────────────────────────
const pc = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.sm,
  },
  wrapActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(200,143,116,0.04)',
  },
  wrapHighlight: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  topBar: {
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 4,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  label: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textSecondary,
  },
  labelActive: { color: Colors.text },
  badge: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeHighlight: {
    backgroundColor: Colors.accent,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Fonts.weights.bold,
    color: Colors.primaryDark,
  },
  badgeTextHighlight: {
    color: Colors.primaryDark,
  },
  sub: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },
  perPeriod: {
    fontSize: Fonts.sizes.xs,
    color: Colors.success,
    fontWeight: Fonts.weights.semibold,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.textSecondary,
  },
  priceActive: { color: Colors.primary },
  period: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
});

// ── PlanModal styles ───────────────────────────────────────────────────────
const pm = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,34,34,0.52)',
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
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  trialBadgeText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: Fonts.weights.heavy,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  plansWrap: {
    marginBottom: Spacing.sm,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  disclosureText: {
    flex: 1,
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cta: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadow.lg,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    minHeight: 56,
  },
  ctaText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.2,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 4,
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

// ── Main screen styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  closeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 20,
  },
  closeBtn: {
    margin: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },

  // Hero
  hero: {
    overflow: 'hidden',
  },
  heroContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  priceBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  priceBadge: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  priceBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  priceBadgeText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  trialBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trialBadgeSmallText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: Fonts.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: Spacing.xs,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Step label
  stepLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
  stepTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },

  // Teaser grid
  teaserGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teaserCard: {
    width: (W - Spacing.md * 2 - 10) / 2,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  teaserIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teaserLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
    marginBottom: 3,
  },
  teaserValue: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },

  // Locked stack
  lockedStack: {},
  unlockNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '50',
    marginTop: 4,
  },
  unlockNudgeText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
    flex: 1,
    lineHeight: 17,
  },

  // Includes strip
  includesStrip: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  includesGrad: {
    padding: Spacing.md,
  },
  includesTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  includesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  includesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: (W - Spacing.md * 2 - Spacing.md * 2 - 10) / 2,
  },
  includesCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  includesLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
  },

  // Trust row
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  trustLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
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
  renewalNote: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  // Fixed CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  ctaFade: {
    height: 36,
  },
  ctaSafe: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  ctaBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  ctaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    minHeight: 54,
  },
  ctaBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
  },
});
