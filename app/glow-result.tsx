import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import type { GlowAnalysisResult } from '@/services/glowAnalysisService';

const { width: W } = Dimensions.get('window');

const G = {
  pink: '#F0557A',
  pinkLight: '#F8A0B8',
  pinkPale: '#FFF0F4',
  pinkChip: '#FCE4EC',
  pinkBorder: '#FBCDD9',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
};

// ── Aesthetic accent colors ────────────────────────────────────────────────
const AESTHETIC_COLORS: Record<string, [string, string]> = {
  'soft-girl':     ['#F8A0B8', '#E8709A'],
  'natural-glam':  ['#C8A96E', '#A87840'],
  'soft-grunge':   ['#8B7FA8', '#6B5F88'],
  'latina-baddie': ['#E05C5C', '#C03030'],
  'full-glam':     ['#D4A830', '#B8860B'],
};

// ── Animated section ───────────────────────────────────────────────────────
function FadeIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const slide = useRef(new Animated.Value(18)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 460, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY: slide }], opacity: op }}>
      {children}
    </Animated.View>
  );
}

// ── Error / retake screen ─────────────────────────────────────────────────
function RetakePrompt({ error, onRetake }: { error: string; onRetake: () => void }) {
  const isAuthError = error.includes('Unauthorized') || error.includes('401');
  const isPhotoQuality = error.includes('parse_error') || error.includes('unclear');

  const title = isAuthError ? 'Sign In Required'
    : isPhotoQuality ? 'Photo Too Unclear'
    : 'Analysis Failed';

  const message = isAuthError
    ? 'Sign in to get your personalized AI glow-up guide.'
    : isPhotoQuality
    ? 'The photo was too unclear to analyze. Please take a well-lit, front-facing photo.'
    : 'Something went wrong. Please try again with a clearer, well-lit face photo.';

  return (
    <View style={errS.root}>
      <LinearGradient colors={[G.pinkPale, '#FFF']} style={StyleSheet.absoluteFill} />
      <View style={errS.card}>
        <View style={errS.iconWrap}>
          <Ionicons name={isAuthError ? 'lock-closed-outline' : 'camera-outline'} size={40} color={G.pink} />
        </View>
        <Text style={errS.title}>{title}</Text>
        <Text style={errS.message}>{message}</Text>
        <Pressable style={({ pressed }) => [errS.btn, pressed && { opacity: 0.85 }]} onPress={onRetake}>
          <LinearGradient colors={[G.pinkLight, G.pink]} start={[0, 0]} end={[1, 0]} style={errS.btnGrad}>
            <Ionicons name={isAuthError ? 'person-outline' : 'camera'} size={18} color="#fff" />
            <Text style={errS.btnText}>{isAuthError ? 'Sign In' : 'Retake Photo'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const errS = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  card: {
    backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: G.pinkBorder, ...Shadow.md, width: '100%',
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: G.pinkPale,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: G.pinkBorder,
  },
  title: { fontSize: 20, fontWeight: '800', color: G.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: Fonts.sizes.sm, color: G.textSub, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  btn: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', ...Shadow.sm },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  btnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function GlowResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri?: string;
    aesthetic?: string;
    aiResult?: string;
    aiError?: string;
  }>();

  const aestheticId = params.aesthetic ?? 'natural-glam';
  const gradColors = AESTHETIC_COLORS[aestheticId] ?? AESTHETIC_COLORS['natural-glam'];
  const accentColor = gradColors[0];

  const aiData = useMemo<GlowAnalysisResult | null>(() => {
    if (!params.aiResult) return null;
    try {
      return JSON.parse(params.aiResult) as GlowAnalysisResult;
    } catch {
      return null;
    }
  }, [params.aiResult]);

  const heroFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: `Just got my ${aiData?.label ?? 'Glow Up'} guide on BeautyHer! ✨ Try it free: https://beautyher.app`,
      });
    } catch { /* ignore */ }
  };

  // Show retake prompt if there's an error or no AI data
  if (!aiData || params.aiError) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[G.pinkPale, '#FFF']} style={styles.headerGrad}>
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={20} color={G.pink} />
              </Pressable>
              <Text style={styles.headerTitle}>Your Glow-Up Guide</Text>
              <View style={{ width: 38 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <RetakePrompt
          error={params.aiError ?? 'unknown'}
          onRetake={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[G.pinkPale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={G.pink} />
            </Pressable>
            <Text style={styles.headerTitle}>Your Glow-Up Guide</Text>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={G.pink} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: heroFade }]}>
          <LinearGradient colors={gradColors} start={[0, 0]} end={[1, 1]} style={styles.heroGrad}>
            {params.imageUri ? (
              <Image source={{ uri: params.imageUri }} style={styles.heroPhoto} contentFit="cover" transition={300} />
            ) : null}
            <View style={styles.heroContent}>
              <View style={styles.heroAesBadge}>
                <Text style={styles.heroAesBadgeText}>YOUR AESTHETIC</Text>
              </View>
              <Text style={styles.heroAes}>{aiData.label}</Text>
              <Text style={styles.heroTagline}>{aiData.tagline}</Text>
              <View style={styles.heroSteps}>
                <Ionicons name="list-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroStepsText}>{aiData.steps?.length ?? 6} personalized steps</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── AI face summary ───────────────────────────────────── */}
        {aiData.faceSummary ? (
          <FadeIn delay={60}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="scan-outline" size={14} color={accentColor} />
                <Text style={[styles.summaryTitle, { color: accentColor }]}>Your Feature Analysis</Text>
              </View>
              <Text style={styles.summaryText}>{aiData.faceSummary}</Text>
            </View>
          </FadeIn>
        ) : null}

        {/* ── Skin prep ─────────────────────────────────────────── */}
        {aiData.skinPrep ? (
          <FadeIn delay={80}>
            <View style={[styles.skinPrepCard, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
              <Ionicons name="water-outline" size={18} color={accentColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.skinPrepTitle, { color: accentColor }]}>Skin Prep First</Text>
                <Text style={styles.skinPrepText}>{aiData.skinPrep}</Text>
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* ── Step-by-step guide ────────────────────────────────── */}
        {aiData.steps?.length > 0 ? (
          <FadeIn delay={120}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR TRANSFORM PLAN</Text>
              <Text style={styles.sectionTitle}>Step-by-Step Guide</Text>
              {aiData.steps.map((step, i) => (
                <View key={step.n ?? i} style={styles.stepCard}>
                  <View style={[styles.stepNum, { borderColor: accentColor }]}>
                    <Text style={[styles.stepNumText, { color: accentColor }]}>{step.n ?? i + 1}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <View style={styles.stepTop}>
                      <View style={[styles.stepIconWrap, { backgroundColor: accentColor + '20' }]}>
                        <Ionicons name={(step.iconName as any) ?? 'sparkles'} size={16} color={accentColor} />
                      </View>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    </View>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                    {step.product ? (
                      <View style={styles.stepProduct}>
                        <Ionicons name="bag-outline" size={12} color={accentColor} />
                        <Text style={[styles.stepProductText, { color: accentColor }]}>{step.product}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </FadeIn>
        ) : null}

        {/* ── Color palette ─────────────────────────────────────── */}
        {aiData.colorPalette?.length > 0 ? (
          <FadeIn delay={160}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>COLOR PALETTE</Text>
              <Text style={styles.sectionTitle}>Your Look Colors</Text>
              <View style={styles.paletteRow}>
                {aiData.colorPalette.map((c, i) => (
                  <View key={i} style={styles.paletteItem}>
                    <View style={[styles.paletteSwatch, { backgroundColor: c.hex }]} />
                    <Text style={styles.paletteName} numberOfLines={1}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* ── Hair tips ─────────────────────────────────────────── */}
        {aiData.hairTips?.length > 0 ? (
          <FadeIn delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HAIR</Text>
              <Text style={styles.sectionTitle}>Hair Recommendations</Text>
              <View style={styles.tipsGrid}>
                {aiData.hairTips.map((tip, i) => (
                  <View key={i} style={[styles.tipChip, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
                    <Ionicons name="checkmark-circle" size={13} color={accentColor} />
                    <Text style={[styles.tipChipText, { color: accentColor }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* ── What to avoid ────────────────────────────────────── */}
        {aiData.avoidTips?.length > 0 ? (
          <FadeIn delay={240}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#E05C5C' }]}>What to Avoid</Text>
              <View style={styles.tipsGrid}>
                {aiData.avoidTips.map((tip, i) => (
                  <View key={i} style={[styles.tipChip, { backgroundColor: 'rgba(224,92,92,0.08)', borderColor: 'rgba(224,92,92,0.3)' }]}>
                    <Ionicons name="close-circle" size={13} color="#E05C5C" />
                    <Text style={[styles.tipChipText, { color: '#E05C5C' }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* ── Premium CTA ──────────────────────────────────────── */}
        <FadeIn delay={320}>
          <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
            <LinearGradient colors={[G.pinkPale, '#FCE4EC']} style={styles.premiumCard}>
              <Text style={styles.premiumTitle}>Want Your Full Glow-Up Routine? 💄</Text>
              <Text style={styles.premiumDesc}>
                Upgrade to Premium for a complete daily/nightly skincare + makeup routine tailored specifically to your features and aesthetic.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.premiumBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push('/subscription')}
              >
                <LinearGradient
                  colors={[G.pinkLight, G.pink]}
                  start={[0, 0]} end={[1, 0]}
                  style={styles.premiumBtnGrad}
                >
                  <Ionicons name="diamond" size={16} color="#fff" />
                  <Text style={styles.premiumBtnText}>Unlock Full Routine</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.back()}
              >
                <Text style={styles.retryBtnText}>Try a Different Aesthetic</Text>
              </Pressable>
            </LinearGradient>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  headerGrad: { paddingBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: G.pinkChip, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: G.text },
  shareBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: G.pinkChip, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 48 },

  heroCard: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.md },
  heroGrad: { minHeight: 200, position: 'relative' },
  heroPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', opacity: 0.3 },
  heroContent: { padding: Spacing.lg },
  heroAesBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8,
  },
  heroAesBadgeText: { fontSize: 9, fontWeight: Fonts.weights.bold, color: '#fff', letterSpacing: 1.5 },
  heroAes: { fontSize: Fonts.sizes.xxxl, fontWeight: Fonts.weights.bold, color: '#fff', marginBottom: 6 },
  heroTagline: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 12 },
  heroSteps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStepsText: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.75)' },

  summaryCard: {
    backgroundColor: '#FAFAFA', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, borderColor: '#F0EBF4', marginBottom: Spacing.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold },
  summaryText: { fontSize: Fonts.sizes.sm, color: G.textSub, lineHeight: 20 },

  skinPrepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, marginBottom: Spacing.md,
  },
  skinPrepTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, marginBottom: 3 },
  skinPrepText: { fontSize: Fonts.sizes.xs, color: G.textSub, lineHeight: 18 },

  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 9, fontWeight: Fonts.weights.bold, color: G.pink, letterSpacing: 2, marginBottom: 4,
  },
  sectionTitle: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: G.text, marginBottom: Spacing.sm },

  paletteRow: { flexDirection: 'row', gap: Spacing.sm },
  paletteItem: { flex: 1, alignItems: 'center' },
  paletteSwatch: {
    width: '100%', aspectRatio: 1, borderRadius: Radius.md,
    marginBottom: 5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  paletteName: { fontSize: 9, color: G.textSub, textAlign: 'center', fontWeight: '600' },

  stepCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#FFF', borderRadius: Radius.lg,
    padding: Spacing.sm + 4, marginBottom: 8,
    borderWidth: 2, borderColor: '#F0EBF4', ...Shadow.sm,
  },
  stepNum: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold },
  stepBody: { flex: 1 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepIconWrap: {
    width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: G.text },
  stepDesc: { fontSize: Fonts.sizes.sm, color: G.textSub, lineHeight: 19, marginBottom: 8 },
  stepProduct: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepProductText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, flex: 1 },

  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tipChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1,
  },
  tipChipText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },

  premiumCard: {
    borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: G.pinkBorder, ...Shadow.sm,
  },
  premiumTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold,
    color: G.text, marginBottom: 6, textAlign: 'center',
  },
  premiumDesc: {
    fontSize: Fonts.sizes.sm, color: G.textSub, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.md,
  },
  premiumBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadow.md },
  premiumBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15,
  },
  premiumBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
  retryBtn: { alignItems: 'center', paddingVertical: 10 },
  retryBtnText: { fontSize: Fonts.sizes.sm, color: G.pink, fontWeight: Fonts.weights.semibold },
});
