import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

// ── Design tokens ──────────────────────────────────────────────────────────
const P = {
  pink: '#F0557A',
  pinkLight: '#F8A0B8',
  pinkPale: '#FFF0F4',
  pinkChip: '#FCE4EC',
  pinkBorder: '#FBCDD9',
  gold: '#C8A870',
  goldLight: '#E8CFA7',
  goldPale: '#FDF9F0',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
};

// ── Mock analysis result (replace with real AI result from navigation params) ──
const MOCK_RESULT = {
  undertone: {
    value: 'Warm',
    detail: 'Golden undertones with peachy hues',
    emoji: '🌅',
    color: '#C8A070',
    bg: 'rgba(200,160,112,0.12)',
    confidence: 91,
    palette: ['#E8C09A', '#D4956A', '#C8784A', '#B86038'],
  },
  faceShape: {
    value: 'Oval',
    detail: 'Balanced proportions with softly curved jaw',
    emoji: '💆',
    color: '#9C88D4',
    bg: 'rgba(156,136,212,0.12)',
    confidence: 87,
  },
  skinTone: {
    value: 'Light Medium',
    detail: 'NC25–NC30 range with golden warmth',
    emoji: '✨',
    color: '#D4A070',
    bg: 'rgba(212,160,112,0.12)',
    confidence: 94,
    swatches: ['#F5D5B0', '#EBCAA0', '#D4A870', '#C89060'],
  },
  contrast: {
    value: 'Medium',
    detail: 'Moderate contrast between features and skin',
    emoji: '🎭',
    color: '#64B5C8',
    bg: 'rgba(100,181,200,0.12)',
    confidence: 83,
  },
};

// ── Locked features (require invites) ──────────────────────────────────────
const LOCKED_FEATURES = [
  { label: 'Makeup Shades', desc: 'Foundation, blush, and contour matches', icon: '💄', invitesNeeded: 1 },
  { label: 'Hair Color Guide', desc: 'Best hair colors for your season', icon: '💇', invitesNeeded: 2 },
  { label: 'Skincare Routine', desc: 'Personalized AM/PM routine steps', icon: '🌿', invitesNeeded: 2 },
  { label: 'Color Palette', desc: 'Your full wardrobe color guide', icon: '🎨', invitesNeeded: 3 },
  { label: 'Style Matches', desc: 'Outfit styles that complement your features', icon: '👗', invitesNeeded: 3 },
];

// ── Invites state (mock: 0 invites completed) ──────────────────────────────
const USER_INVITES = 0;
const INVITES_TO_UNLOCK_ALL = 3;

// ── Sparkle component ─────────────────────────────────────────────────────
function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(op, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.Text style={{ position: 'absolute', left: x, top: y, fontSize: 10, opacity: op, transform: [{ scale: sc }], color: P.gold }}>✦</Animated.Text>
  );
}

// ── Confidence bar ─────────────────────────────────────────────────────────
function ConfidenceBar({ pct, color }: { pct: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct / 100, duration: 900, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={conf.track}>
      <Animated.View style={[conf.fill, {
        width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
}
const conf = StyleSheet.create({
  track: { height: 5, backgroundColor: '#F0EDF5', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
});

// ── Revealed result card ───────────────────────────────────────────────────
function ResultCard({
  label,
  value,
  detail,
  emoji,
  color,
  bg,
  confidence,
  extra,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  emoji: string;
  color: string;
  bg: string;
  confidence: number;
  extra?: React.ReactNode;
  delay: number;
}) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(opAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[card.wrap, { transform: [{ translateY: slideAnim }], opacity: opAnim }]}>
      <View style={[card.iconCol, { backgroundColor: bg }]}>
        <Text style={card.emoji}>{emoji}</Text>
      </View>
      <View style={card.body}>
        <Text style={card.label}>{label}</Text>
        <Text style={[card.value, { color }]}>{value}</Text>
        <Text style={card.detail}>{detail}</Text>
        <View style={card.confRow}>
          <ConfidenceBar pct={confidence} color={color} />
          <Text style={[card.confPct, { color }]}>{confidence}%</Text>
        </View>
        {extra ? <View style={{ marginTop: 10 }}>{extra}</View> : null}
      </View>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F5EEF0',
    ...Shadow.sm,
  },
  iconCol: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 26 },
  body: { flex: 1 },
  label: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: P.textLight,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    marginBottom: 3,
  },
  detail: {
    fontSize: Fonts.sizes.xs,
    color: P.textSub,
    lineHeight: 17,
    marginBottom: 8,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confPct: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    minWidth: 30,
    textAlign: 'right',
  },
});

// ── Swatch strip ───────────────────────────────────────────────────────────
function SwatchStrip({ colors }: { colors: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {colors.map((c, i) => (
        <View key={i} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }} />
      ))}
    </View>
  );
}

// ── Locked feature row ─────────────────────────────────────────────────────
function LockedRow({
  item,
  userInvites,
  onInvite,
}: {
  item: typeof LOCKED_FEATURES[0];
  userInvites: number;
  onInvite: () => void;
}) {
  const unlocked = userInvites >= item.invitesNeeded;
  return (
    <View style={[lck.row, unlocked && lck.rowUnlocked]}>
      {/* Blur overlay on locked content */}
      <View style={lck.left}>
        <View style={[lck.iconWrap, { backgroundColor: unlocked ? 'rgba(76,175,134,0.12)' : 'rgba(200,200,220,0.15)' }]}>
          <Text style={lck.icon}>{item.icon}</Text>
          {!unlocked ? (
            <View style={lck.lockOverlay}>
              <Ionicons name="lock-closed" size={12} color="#fff" />
            </View>
          ) : null}
        </View>
      </View>
      <View style={lck.mid}>
        <Text style={[lck.label, !unlocked && lck.labelLocked]}>{item.label}</Text>
        <Text style={lck.desc} numberOfLines={1}>{item.desc}</Text>
        {!unlocked ? (
          <View style={lck.inviteNeeded}>
            <Ionicons name="people-outline" size={11} color={P.pink} />
            <Text style={lck.inviteNeededText}>{item.invitesNeeded} invite{item.invitesNeeded > 1 ? 's' : ''} to unlock</Text>
          </View>
        ) : (
          <View style={lck.unlockedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#4CAF86" />
            <Text style={[lck.inviteNeededText, { color: '#4CAF86' }]}>Unlocked!</Text>
          </View>
        )}
      </View>
      {!unlocked ? (
        <Pressable
          style={({ pressed }) => [lck.inviteBtn, pressed && { opacity: 0.75 }]}
          onPress={onInvite}
        >
          <Text style={lck.inviteBtnText}>Invite</Text>
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#4CAF86" />
      )}
    </View>
  );
}

const lck = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0ECF5',
    ...Shadow.sm,
  },
  rowUnlocked: {
    borderColor: 'rgba(76,175,134,0.25)',
    backgroundColor: 'rgba(76,175,134,0.03)',
  },
  left: {},
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: P.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  icon: { fontSize: 22 },
  mid: { flex: 1 },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: P.text,
    marginBottom: 2,
  },
  labelLocked: { color: P.textSub },
  desc: {
    fontSize: Fonts.sizes.xs,
    color: P.textLight,
    marginBottom: 3,
  },
  inviteNeeded: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unlockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inviteNeededText: {
    fontSize: 10,
    fontWeight: Fonts.weights.semibold,
    color: P.pink,
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: P.pinkChip,
    borderWidth: 1,
    borderColor: P.pinkBorder,
  },
  inviteBtnText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: P.pink,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function FeatureAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; type?: string }>();
  const [userInvites, setUserInvites] = useState(USER_INVITES);
  const headerFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const inviteProgress = userInvites / INVITES_TO_UNLOCK_ALL;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: inviteProgress, duration: 800, delay: 400, useNativeDriver: false }).start();
  }, []);

  const handleInvite = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      await Share.share({
        message: `I just got my beauty analysis on BeautyHer! 🌟 Find your color season, face shape, skin tone and more — try it free: https://beautyher.app`,
        title: 'Join me on BeautyHer!',
      });
      // In production, track invite completion via deep link or backend
    } catch { /* ignore */ }
  };

  const photoUri = params.imageUri;

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={[P.pinkPale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={P.pink} />
            </Pressable>
            <Text style={styles.headerTitle}>Your Results</Text>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              onPress={handleInvite}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-outline" size={20} color={P.pink} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── AI Score hero ───────────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: headerFade }]}>
          <LinearGradient colors={['#FDF5F0', '#FDE8E0']} style={styles.heroGrad}>
            <Sparkle x={20} y={14} delay={0} />
            <Sparkle x={W - 80} y={10} delay={400} />
            <Sparkle x={W - 50} y={60} delay={800} />

            <View style={styles.heroRow}>
              {/* Photo thumbnail */}
              <View style={styles.photoThumb}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" transition={300} />
                ) : (
                  <Image source={require('@/assets/beauty-analysis-bg.jpg')} style={styles.photoImg} contentFit="cover" />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(200,143,116,0.35)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.aiStamp}>
                  <Ionicons name="flash" size={10} color="#fff" />
                  <Text style={styles.aiStampText}>AI</Text>
                </View>
              </View>

              {/* Score ring */}
              <View style={styles.scoreBlock}>
                <View style={styles.scoreRingOuter}>
                  <View style={styles.scoreRingInner}>
                    <Text style={styles.scoreNumber}>87</Text>
                    <Text style={styles.scoreLabel}>Beauty</Text>
                  </View>
                </View>
                <Text style={styles.scoreCaption}>Excellent ✨</Text>
              </View>

              {/* Quick stats */}
              <View style={styles.quickStats}>
                {[
                  { label: 'Undertone', val: 'Warm' },
                  { label: 'Face', val: 'Oval' },
                  { label: 'Contrast', val: 'Medium' },
                ].map(s => (
                  <View key={s.label} style={styles.quickStat}>
                    <Text style={styles.quickStatVal}>{s.val}</Text>
                    <Text style={styles.quickStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* AI badge */}
            <View style={styles.aiBadgeRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={Colors.primary} />
                <Text style={styles.aiBadgeText}>Analyzed by BeautyHer AI</Text>
              </View>
              <Text style={styles.aiDate}>Just now</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Revealed results ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR FEATURES</Text>
          <Text style={styles.sectionTitle}>Analysis Results</Text>

          {/* Undertone */}
          <ResultCard
            label="Undertone"
            value={MOCK_RESULT.undertone.value}
            detail={MOCK_RESULT.undertone.detail}
            emoji={MOCK_RESULT.undertone.emoji}
            color={MOCK_RESULT.undertone.color}
            bg={MOCK_RESULT.undertone.bg}
            confidence={MOCK_RESULT.undertone.confidence}
            delay={100}
            extra={<SwatchStrip colors={MOCK_RESULT.undertone.palette} />}
          />

          {/* Face Shape */}
          <ResultCard
            label="Face Shape"
            value={MOCK_RESULT.faceShape.value}
            detail={MOCK_RESULT.faceShape.detail}
            emoji={MOCK_RESULT.faceShape.emoji}
            color={MOCK_RESULT.faceShape.color}
            bg={MOCK_RESULT.faceShape.bg}
            confidence={MOCK_RESULT.faceShape.confidence}
            delay={220}
          />

          {/* Skin Tone */}
          <ResultCard
            label="Skin Tone"
            value={MOCK_RESULT.skinTone.value}
            detail={MOCK_RESULT.skinTone.detail}
            emoji={MOCK_RESULT.skinTone.emoji}
            color={MOCK_RESULT.skinTone.color}
            bg={MOCK_RESULT.skinTone.bg}
            confidence={MOCK_RESULT.skinTone.confidence}
            delay={340}
            extra={<SwatchStrip colors={MOCK_RESULT.skinTone.swatches} />}
          />

          {/* Contrast */}
          <ResultCard
            label="Contrast Level"
            value={MOCK_RESULT.contrast.value}
            detail={MOCK_RESULT.contrast.detail}
            emoji={MOCK_RESULT.contrast.emoji}
            color={MOCK_RESULT.contrast.color}
            bg={MOCK_RESULT.contrast.bg}
            confidence={MOCK_RESULT.contrast.confidence}
            delay={460}
          />
        </View>

        {/* ── Unlock banner ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <LinearGradient colors={['#FDF9F0', '#FBF0E0']} style={styles.unlockCard}>
            {/* Progress header */}
            <View style={styles.unlockHeader}>
              <View style={styles.unlockIconWrap}>
                <Text style={{ fontSize: 26 }}>🎁</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.unlockTitle}>Unlock Full Details</Text>
                <Text style={styles.unlockSub}>Invite friends to reveal all hidden insights</Text>
              </View>
            </View>

            {/* Invite progress bar */}
            <View style={styles.inviteProgressWrap}>
              <View style={styles.inviteProgressRow}>
                <Text style={styles.inviteProgressLabel}>
                  <Text style={styles.inviteProgressCount}>{userInvites}</Text>
                  /{INVITES_TO_UNLOCK_ALL} invites
                </Text>
                <Text style={styles.inviteProgressPct}>
                  {Math.round(inviteProgress * 100)}% complete
                </Text>
              </View>
              <View style={styles.inviteBar}>
                <Animated.View
                  style={[styles.inviteBarFill, {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  }]}
                />
                {/* Milestone dots */}
                {[1, 2, 3].map(n => (
                  <View
                    key={n}
                    style={[styles.milestoneDot, {
                      left: `${(n / INVITES_TO_UNLOCK_ALL) * 100}%` as any,
                      backgroundColor: userInvites >= n ? P.gold : '#E8E0D0',
                    }]}
                  />
                ))}
              </View>
              <View style={styles.milestoneLabels}>
                {INVITES_TO_UNLOCK_ALL > 0 ? Array.from({ length: INVITES_TO_UNLOCK_ALL }, (_, i) => (
                  <Text key={i} style={styles.milestoneLabel}>{i + 1}</Text>
                )) : null}
              </View>
            </View>

            {/* Invite CTA */}
            <Pressable
              style={({ pressed }) => [styles.inviteMainBtn, pressed && { opacity: 0.88 }]}
              onPress={handleInvite}
            >
              <LinearGradient
                colors={[P.pinkLight, P.pink]}
                start={[0, 0]} end={[1, 0]}
                style={styles.inviteMainBtnGrad}
              >
                <Ionicons name="people" size={18} color="#fff" />
                <Text style={styles.inviteMainBtnText}>Invite a Friend</Text>
                <View style={styles.inviteBonusBadge}>
                  <Text style={styles.inviteBonusText}>+1</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Text style={styles.inviteOr}>or</Text>

            {/* Upgrade alternative */}
            <Pressable
              style={({ pressed }) => [styles.upgradeAlt, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/subscription')}
            >
              <Ionicons name="diamond-outline" size={14} color={P.gold} />
              <Text style={styles.upgradeAltText}>Unlock instantly with Premium</Text>
              <Ionicons name="chevron-forward" size={13} color={P.gold} />
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── Locked features list ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOCKED INSIGHTS</Text>
          <Text style={styles.sectionTitle}>More About You</Text>
          <Text style={styles.sectionDesc}>Invite friends to reveal each section</Text>

          {LOCKED_FEATURES.map(item => (
            <LockedRow
              key={item.label}
              item={item}
              userInvites={userInvites}
              onInvite={handleInvite}
            />
          ))}
        </View>

        {/* ── How it works ──────────────────────────────────────────── */}
        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <LinearGradient colors={['#F9F9FC', '#F3F0FA']} style={styles.howCard}>
            <Text style={styles.howTitle}>How Referrals Work</Text>
            {[
              { n: '1', text: 'Tap "Invite a Friend" above to share your link' },
              { n: '2', text: 'Your friend downloads BeautyHer and completes their scan' },
              { n: '3', text: 'Each completed invite unlocks more of your results' },
            ].map(step => (
              <View key={step.n} style={styles.howRow}>
                <View style={styles.howNum}>
                  <Text style={styles.howNumText}>{step.n}</Text>
                </View>
                <Text style={styles.howText}>{step.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },

  headerGrad: { paddingBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: P.pinkChip,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: P.text,
  },
  shareBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: P.pinkChip,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 48,
  },

  // Hero card
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: '#F5EEE8',
  },
  heroGrad: { padding: Spacing.md, paddingBottom: Spacing.sm },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  photoThumb: {
    width: 76,
    height: 92,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    ...Shadow.sm,
  },
  photoImg: { width: '100%', height: '100%' },
  aiStamp: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  aiStampText: { fontSize: 8, fontWeight: '700', color: '#fff' },

  scoreBlock: { alignItems: 'center', flex: 1 },
  scoreRingOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(200,143,116,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  scoreRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 26,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: P.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreCaption: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: P.textSub,
    marginTop: 4,
  },
  quickStats: { gap: 8, alignItems: 'center' },
  quickStat: { alignItems: 'center' },
  quickStatVal: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: P.text,
  },
  quickStatLabel: {
    fontSize: 9,
    color: P.textLight,
    letterSpacing: 0.3,
  },

  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,143,116,0.12)',
    paddingTop: Spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200,143,116,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
  },
  aiDate: {
    fontSize: 10,
    color: P.textLight,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: P.pink,
    letterSpacing: 1.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: P.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: Fonts.sizes.xs,
    color: P.textSub,
    marginBottom: Spacing.sm,
  },

  // Unlock card
  unlockCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F0E0C8',
    ...Shadow.sm,
  },
  unlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  unlockIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(200,168,112,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unlockTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: P.text,
    marginBottom: 2,
  },
  unlockSub: {
    fontSize: Fonts.sizes.xs,
    color: P.textSub,
    lineHeight: 17,
  },

  // Invite progress bar
  inviteProgressWrap: { marginBottom: Spacing.md },
  inviteProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inviteProgressLabel: {
    fontSize: Fonts.sizes.xs,
    color: P.textSub,
    fontWeight: '500',
  },
  inviteProgressCount: {
    fontWeight: '800',
    color: P.gold,
    fontSize: Fonts.sizes.sm,
  },
  inviteProgressPct: {
    fontSize: Fonts.sizes.xs,
    color: P.textLight,
  },
  inviteBar: {
    height: 8,
    backgroundColor: '#EDE0CC',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  inviteBarFill: {
    height: '100%',
    backgroundColor: P.gold,
    borderRadius: 4,
  },
  milestoneDot: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
    marginLeft: -7,
  },
  milestoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  milestoneLabel: {
    fontSize: 9,
    color: P.textLight,
    fontWeight: '600',
  },

  // Invite CTA
  inviteMainBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  inviteMainBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  inviteMainBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
  inviteBonusBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inviteBonusText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
  inviteOr: {
    textAlign: 'center',
    color: P.textLight,
    fontSize: Fonts.sizes.xs,
    marginBottom: Spacing.sm,
  },
  upgradeAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(200,168,112,0.1)',
    borderWidth: 1,
    borderColor: P.goldLight,
  },
  upgradeAltText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: P.gold,
  },

  // How it works
  howCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#EDE8F5',
  },
  howTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: P.text,
    marginBottom: Spacing.sm,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  howNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: P.pinkChip,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howNumText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: P.pink,
  },
  howText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: P.textSub,
    lineHeight: 19,
    paddingTop: 3,
  },
});
