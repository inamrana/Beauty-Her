import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaywallGuard } from '@/components';
import { useAIConsent } from '@/hooks/useAIConsent';
import { AIConsentModal } from '@/components/feature/AIConsentModal';

const { width: W } = Dimensions.get('window');

// ── Scan workflow definitions ──────────────────────────────────────────────
const SCAN_WORKFLOWS = [
  {
    id: 'color',
    title: 'Color Analysis',
    subtitle: 'Discover your color season & perfect palette',
    description: 'Get your seasonal color type, ideal makeup shades, and best wardrobe colors.',
    image: require('@/assets/scan-color-analysis.jpg'),
    gradient: ['rgba(120,50,140,0.88)', 'rgba(80,20,100,0.96)'] as [string, string],
    accentColor: '#A855C8',
    accentBg: 'rgba(168,85,200,0.12)',
    icon: 'color-palette' as const,
    badge: 'Season',
    route: '/color-scan',
    tags: ['Color Season', 'Makeup Shades', 'Wardrobe Colors'],
    duration: '~30 sec',
    steps: 2,
  },
  {
    id: 'glow',
    title: 'Glow Up & Aesthetic',
    subtitle: 'Transform into your dream aesthetic',
    description: 'Choose a target look and get a personalized step-by-step glow-up guide.',
    image: require('@/assets/scan-glow-up.jpg'),
    gradient: ['rgba(220,70,100,0.88)', 'rgba(180,30,70,0.96)'] as [string, string],
    accentColor: '#F0557A',
    accentBg: 'rgba(240,85,122,0.12)',
    icon: 'sparkles' as const,
    badge: 'AI Guide',
    route: '/glow-scan',
    tags: ['Hair Tips', 'Makeup Look', 'Style Guide'],
    duration: '~45 sec',
    steps: 2,
  },
  {
    id: 'facial',
    title: 'Facial & Skin Analysis',
    subtitle: 'Deep-dive into your facial features',
    description: 'Full breakdown of face shape, skin tone, undertone, contrast, and skin health metrics.',
    image: require('@/assets/scan-facial-analysis.jpg'),
    gradient: ['rgba(20,100,200,0.88)', 'rgba(10,60,150,0.96)'] as [string, string],
    accentColor: '#2196F3',
    accentBg: 'rgba(33,150,243,0.12)',
    icon: 'scan' as const,
    badge: 'AI Powered',
    route: '/skin-quiz',
    tags: ['Face Shape', 'Skin Tone', 'Health Metrics'],
    duration: '~1 min',
    steps: 3,
  },
];

// ── Animated scan card ─────────────────────────────────────────────────────
function WorkflowCard({
  item,
  index,
  onPress,
}: {
  item: typeof SCAN_WORKFLOWS[0];
  index: number;
  onPress: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 420,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.workflowCard,
          pressed && { opacity: 0.94, transform: [{ scale: 0.982 }] },
        ]}
        onPress={onPress}
      >
        {/* Background photo */}
        <Image
          source={item.image}
          style={styles.cardBgImg}
          contentFit="cover"
          transition={200}
        />

        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Color tint overlay */}
        <LinearGradient
          colors={['transparent', item.gradient[1]]}
          start={[0.2, 0]}
          end={[1, 0]}
          style={StyleSheet.absoluteFill}
        />

        {/* Card content */}
        <View style={styles.cardContent}>
          {/* Top row */}
          <View style={styles.cardTop}>
            <View style={styles.cardIconWrap}>
              <Ionicons name={item.icon} size={20} color="#fff" />
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{item.badge}</Text>
            </View>
          </View>

          {/* Middle info */}
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

            {/* Feature tags */}
            <View style={styles.cardTags}>
              {item.tags.map(tag => (
                <View key={tag} style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom row */}
          <View style={styles.cardBottom}>
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.cardMetaText}>{item.duration}</Text>
              <View style={styles.cardMetaDot} />
              <Ionicons name="layers-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.cardMetaText}>{item.steps} screens</Text>
            </View>
            <View style={styles.cardCTA}>
              <Text style={styles.cardCTAText}>Start</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main scan hub ──────────────────────────────────────────────────────────
export default function ScanHubScreen() {
  const router = useRouter();
  const { scansToday, subscribed } = useSubscription();
  const { gate, PaywallModal } = usePaywallGuard();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const aiConsent = useAIConsent();

  // Pending route to navigate to after consent is granted
  const pendingRoute = useRef<string | null>(null);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Gate scans behind AI consent check (shown once) then paywall
  const startScan = useCallback((route: string) => {
    gate(() => {
      if (aiConsent.consented) {
        router.push(route as any);
      } else {
        pendingRoute.current = route;
        aiConsent.openModal();
      }
    });
  }, [gate, aiConsent.consented, aiConsent.openModal]);

  const handleConsentAgree = useCallback(async () => {
    await aiConsent.grantConsent();
    if (pendingRoute.current) {
      router.push(pendingRoute.current as any);
      pendingRoute.current = null;
    }
  }, [aiConsent.grantConsent]);

  const handleConsentDecline = useCallback(() => {
    pendingRoute.current = null;
    aiConsent.closeModal();
  }, [aiConsent.closeModal]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <Text style={styles.headerLabel}>AI BEAUTY SCANS</Text>
          <Text style={styles.headerTitle}>Choose Your Scan</Text>
          <Text style={styles.headerSub}>
            Each scan gives you personalized AI insights tailored to your beauty
          </Text>

          {/* AI badge */}
          <View style={styles.aiBadge}>
            <LinearGradient
              colors={['#2D1B69', '#7B3FA0']}
              start={[0, 0]} end={[1, 0]}
              style={styles.aiBadgeGrad}
            >
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.aiBadgeText}>Powered by Gemini 3 Flash · Real AI Vision</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ── Scan quota indicator ────────────────────────────────── */}
        {!subscribed ? (
          <View style={styles.quotaBar}>
            <View style={styles.quotaLeft}>
              <Ionicons name="flash-outline" size={15} color={Colors.primary} />
              <Text style={styles.quotaText}>
                Free Scans Today: <Text style={styles.quotaCount}>{Math.max(0, 1 - scansToday)} remaining</Text>
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.upgradeChip, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.upgradeChipText}>Upgrade</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.quotaBar, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="infinite-outline" size={15} color={Colors.success} />
            <Text style={[styles.quotaText, { color: Colors.success }]}>Premium · Unlimited scans</Text>
          </View>
        )}

        {/* ── Workflow cards ──────────────────────────────────────── */}
        <View style={styles.cardsWrap}>
          {SCAN_WORKFLOWS.map((workflow, index) => (
            <WorkflowCard
              key={workflow.id}
              item={workflow}
              index={index}
              onPress={() => startScan(workflow.route)}
            />
          ))}
        </View>

        {/* ── Tips strip ──────────────────────────────────────────── */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={16} color={Colors.accentDark} />
            <Text style={styles.tipsTitle}>Tips for best results</Text>
          </View>
          {[
            { icon: 'sunny-outline', text: 'Use natural daylight or bright even lighting' },
            { icon: 'person-outline', text: 'Face the camera directly with a neutral expression' },
            { icon: 'glasses-outline', text: 'Remove glasses, hats, and heavy accessories' },
          ].map(tip => (
            <View key={tip.text} style={styles.tipRow}>
              <Ionicons name={tip.icon as any} size={14} color={Colors.primary} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Privacy note ────────────────────────────────────────── */}
        <PaywallModal />
        <AIConsentModal
          visible={aiConsent.showModal}
          onAgree={handleConsentAgree}
          onDecline={handleConsentDecline}
        />
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textLight} />
          <Text style={styles.privacyText}>
            Photos are processed securely by AI and never stored on our servers
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  aiBadge: { borderRadius: Radius.full, overflow: 'hidden', ...Shadow.sm },
  aiBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  aiBadgeText: {
    fontSize: Fonts.sizes.xs,
    color: '#fff',
    fontWeight: Fonts.weights.semibold,
    letterSpacing: 0.3,
  },

  // Quota bar
  quotaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quotaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quotaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
  },
  quotaCount: {
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },
  upgradeChip: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  upgradeChipText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },

  // Workflow cards
  cardsWrap: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  workflowCard: {
    height: 200,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardBgImg: { ...StyleSheet.absoluteFillObject },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardMid: { gap: 4 },
  cardTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 16,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cardTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardTagText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: Fonts.weights.semibold,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cardCTAText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },

  // Tips card
  tipsCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tipText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // Privacy
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  privacyText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    lineHeight: 17,
    flex: 1,
    textAlign: 'center',
  },
});
