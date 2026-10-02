import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { PaywallBanner } from '@/components';
import { useUser } from '@/hooks/useUser';
import { useScan } from '@/hooks/useScan';
import { useSubscription } from '@/hooks/useSubscription';

const { width: W } = Dimensions.get('window');

// ── Scan type card data ────────────────────────────────────────────────────
const SCAN_CARDS = [
  {
    id: 'color',
    title: 'Color Analysis',
    subtitle: 'Find your color season and perfect colors',
    icon: 'color-palette' as const,
    gradient: ['rgba(168,85,200,0.82)', 'rgba(120,50,160,0.92)'] as [string, string],
    accentColor: '#A855C8',
    route: '/color-scan',
    badge: 'Season',
    image: require('@/assets/scan-color-analysis.jpg'),
  },
  {
    id: 'glow',
    title: 'Glow Up Guide',
    subtitle: 'See yourself glowed up and get a personalized guide',
    icon: 'sparkles' as const,
    gradient: ['rgba(240,85,122,0.80)', 'rgba(200,50,90,0.92)'] as [string, string],
    accentColor: '#F0557A',
    route: '/glow-scan',
    badge: 'AI Guide',
    image: require('@/assets/scan-glow-up.jpg'),
  },
  {
    id: 'facial',
    title: 'Facial Analysis',
    subtitle: 'Facial analysis & makeup recommendations',
    icon: 'scan' as const,
    gradient: ['rgba(33,150,243,0.80)', 'rgba(20,100,200,0.92)'] as [string, string],
    accentColor: '#2196F3',
    route: '/skin-quiz',
    badge: 'AI Powered',
    image: require('@/assets/scan-facial-analysis.jpg'),
  },
];

// ── Aesthetic carousel data ────────────────────────────────────────────────
const AESTHETICS = [
  {
    id: 'soft-girl',
    label: 'Soft Girl',
    desc: 'A delicate, dreamy look with gentle colors and sweetness',
    image: require('@/assets/aesthetic-soft-girl.jpg'),
    color: '#F8A0B8',
    gradient: ['rgba(248,160,184,0.85)', 'rgba(248,160,184,0.2)'] as [string, string],
  },
  {
    id: 'natural-glam',
    label: 'Natural Glam',
    desc: 'A glowing, effortless look that highlights your natural beauty',
    image: require('@/assets/aesthetic-natural-glam.jpg'),
    color: '#C8A96E',
    gradient: ['rgba(200,169,110,0.85)', 'rgba(200,169,110,0.2)'] as [string, string],
  },
  {
    id: 'soft-grunge',
    label: 'Soft Grunge',
    desc: 'An edgy, rebellious look with a soft touch',
    image: require('@/assets/aesthetic-soft-grunge.jpg'),
    color: '#8B7FA8',
    gradient: ['rgba(139,127,168,0.85)', 'rgba(139,127,168,0.2)'] as [string, string],
  },
  {
    id: 'latina-baddie',
    label: 'Latina Baddie',
    desc: 'A bold look that screams spicy, fierce, and confidence',
    image: require('@/assets/aesthetic-latina-baddie.jpg'),
    color: '#E05C5C',
    gradient: ['rgba(224,92,92,0.85)', 'rgba(224,92,92,0.2)'] as [string, string],
  },
  {
    id: 'full-glam',
    label: 'Full Glam',
    desc: 'A dramatic, all-out look with bold attention-grabbing makeup',
    image: require('@/assets/aesthetic-full-glam.jpg'),
    color: '#B8860B',
    gradient: ['rgba(184,134,11,0.85)', 'rgba(184,134,11,0.2)'] as [string, string],
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── Aesthetic Card ─────────────────────────────────────────────────────────
function AestheticCard({
  item,
  isSelected,
  onSelect,
}: {
  item: typeof AESTHETICS[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <View style={[aes.card, isSelected && { borderColor: item.color, borderWidth: 2.5 }]}>
      <Image
        source={item.image}
        style={aes.cardImg}
        contentFit="cover"
        transition={200}
      />
      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={aes.cardOverlay}
      />
      {/* Top badge */}
      {isSelected ? (
        <View style={[aes.selectedBadge, { backgroundColor: item.color }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
          <Text style={aes.selectedBadgeText}>Selected</Text>
        </View>
      ) : null}
      {/* Bottom info */}
      <View style={aes.cardBottom}>
        <Text style={aes.cardLabel}>{item.label}</Text>
        <Text style={aes.cardDesc} numberOfLines={2}>{item.desc}</Text>
        <Pressable
          style={({ pressed }) => [aes.selectBtn, { backgroundColor: isSelected ? item.color : 'rgba(255,255,255,0.18)' }, pressed && { opacity: 0.8 }]}
          onPress={onSelect}
        >
          <Text style={[aes.selectBtnText, isSelected && { fontWeight: '700' }]}>
            {isSelected ? '✓ Selected' : 'Select'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main HomeScreen ────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { latestScan } = useScan();
  const { subscribed, scansToday } = useSubscription();
  const [selectedAesthetic, setSelectedAesthetic] = useState<string | null>(null);
  const [aestheticDotIdx, setAestheticDotIdx] = useState(0);

  const CARD_W = W - Spacing.md * 2 - Spacing.sm;
  const AES_CARD_W = W * 0.58;

  const onAestheticViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setAestheticDotIdx(viewableItems[0].index ?? 0);
    }
  }).current;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── HEADER ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/logo-512.png')}
              style={styles.logoImg}
              contentFit="contain"
            />
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user.name} ✨</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{user.name.charAt(0)}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarOnline} />
          </Pressable>
        </View>

        {/* ── UPGRADE BANNER ───────────────────────────────── */}
        {!subscribed ? (
          <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
            <PaywallBanner
              feature="Unlimited AI Scans & Beauty Coaching"
              description={scansToday >= 1
                ? 'You have used your free scan for today. Upgrade for unlimited access.'
                : 'Upgrade to Premium for unlimited scans and full AI beauty coaching.'}
              compact
            />
          </View>
        ) : null}

        {/* ── STATS ROW ────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{latestScan?.overallScore ?? user.beautyScore}</Text>
            <Text style={styles.statLabel}>Beauty Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{user.streak} 🔥</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.accentDark }]}>{user.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
        </View>

        {/* ── CHOOSE A SCAN ────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR SCAN</Text>
          <Text style={styles.sectionTitle}>Ready to Glow Up?</Text>
          <Text style={styles.sectionSub}>Choose a scan to start your personalized journey</Text>
        </View>

        {/* Scan Cards */}
        <View style={styles.scanCardsWrap}>
          {SCAN_CARDS.map((card) => (
            <Pressable
              key={card.id}
              style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.93, transform: [{ scale: 0.984 }] }]}
              onPress={() => router.push(card.route as any)}
            >
              {/* Background photo */}
              <Image
                source={card.image}
                style={styles.scanCardBgImg}
                contentFit="cover"
                transition={200}
              />
              {/* Gradient overlay for readability */}
              <LinearGradient
                colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.55)']}
                start={[0, 0]}
                end={[0, 1]}
                style={StyleSheet.absoluteFill}
              />
              {/* Colored tint on right side */}
              <LinearGradient
                colors={['transparent', card.gradient[1]]}
                start={[0.3, 0]}
                end={[1, 0]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.scanCardGrad}>
                {/* Top row */}
                <View style={styles.scanCardTop}>
                  <View style={[styles.scanCardIconWrap, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                    <Ionicons name={card.icon} size={22} color="#fff" />
                  </View>
                  <View style={[styles.scanCardBadge, { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }]}>
                    <Text style={styles.scanCardBadgeText}>{card.badge}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.scanCardInfo}>
                  <Text style={styles.scanCardTitle}>{card.title}</Text>
                  <Text style={styles.scanCardSubtitle}>{card.subtitle}</Text>
                </View>

                {/* CTA */}
                <View style={[styles.scanCardCTA, { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }]}>
                  <Text style={styles.scanCardCTAText}>Start Scan</Text>
                  <Ionicons name="arrow-forward" size={13} color="#fff" />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── AESTHETIC SELECTION ────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={styles.sectionLabel}>PERSONALIZE YOUR LOOK</Text>
          <Text style={styles.sectionTitle}>Choose Your Aesthetic</Text>
          <Text style={styles.sectionSub}>Select your desired look for your glow up</Text>
        </View>

        <FlatList
          data={AESTHETICS}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={AES_CARD_W + Spacing.sm}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: 4 }}
          onViewableItemsChanged={onAestheticViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={{ width: AES_CARD_W }}>
              <AestheticCard
                item={item}
                isSelected={selectedAesthetic === item.id}
                onSelect={() => setSelectedAesthetic(prev => prev === item.id ? null : item.id)}
              />
            </View>
          )}
        />

        {/* Dot indicators */}
        <View style={styles.aesDotsRow}>
          {AESTHETICS.map((_, i) => (
            <View key={i} style={[styles.aesDot, i === aestheticDotIdx && styles.aesDotActive]} />
          ))}
        </View>

        {/* Selected aesthetic CTA */}
        {selectedAesthetic ? (
          <View style={styles.aesCtaWrap}>
            <Pressable
              style={({ pressed }) => [styles.aesCta, pressed && { opacity: 0.88 }]}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={[0, 0]} end={[1, 0]}
                style={styles.aesCtaGrad}
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.aesCtaText}>
                  Scan for{' '}
                  {AESTHETICS.find(a => a.id === selectedAesthetic)?.label ?? 'My Aesthetic'}
                </Text>
                <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {/* ── QUICK ACTIONS ROW ────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={styles.sectionLabel}>TOOLS</Text>
          <Text style={styles.sectionTitle}>Quick Access</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {[
            { icon: 'chatbubble-ellipses', label: 'AI Coach', color: '#7BC67A', bg: 'rgba(123,198,122,0.15)', route: '/ai-chat' },
            { icon: 'color-palette', label: 'My Colors', color: Colors.accentDark, bg: 'rgba(232,207,167,0.3)', route: '/color-analysis' },
            { icon: 'bar-chart', label: 'Progress', color: Colors.primary, bg: Colors.secondary, route: '/(tabs)/progress' },
            { icon: 'person', label: 'Profile', color: '#9C88D4', bg: 'rgba(156,136,212,0.15)', route: '/(tabs)/profile' },
          ].map(action => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.8 }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.quickChipIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickChipLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Aesthetic card styles ──────────────────────────────────────────────────
const aes = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 280,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadow.md,
  },
  cardImg: {
    ...StyleSheet.absoluteFillObject,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  cardLabel: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardDesc: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 16,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  selectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  selectBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: '#fff',
  },
});

// ── Main styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoImg: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  greeting: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginTop: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
  },
  avatarOnline: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Scan cards
  scanCardsWrap: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  scanCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 150,
    ...Shadow.md,
  },
  scanCardBgImg: {
    ...StyleSheet.absoluteFillObject,
  },
  scanCardGrad: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  scanCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scanCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  scanCardBadgeText: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  scanCardInfo: {
    gap: 2,
  },
  scanCardTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanCardSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanCardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  scanCardCTAText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },

  // Aesthetic dots
  aesDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  aesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  aesDotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },

  // Aesthetic CTA
  aesCtaWrap: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  aesCta: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.md,
  },
  aesCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  aesCtaText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },

  // Quick actions row
  quickRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  quickChip: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: 72,
  },
  quickChipIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  quickChipLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
