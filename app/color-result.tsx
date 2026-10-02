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
import type { ColorAnalysisResult } from '@/services/colorAnalysisService';

const { width: W } = Dimensions.get('window');

const C = {
  purple: '#9B59B6',
  purpleLight: '#C39BD3',
  purplePale: '#F5EEF8',
  purpleChip: '#EAD9F7',
  purpleBorder: '#D7BDE2',
  gold: '#C8A870',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
};

// ── Season gradient map ────────────────────────────────────────────────────
const SEASON_GRADIENTS: Record<string, [string, string]> = {
  spring: ['#E8A87C', '#D4784A'],
  summer: ['#A8C0D8', '#7898C0'],
  autumn: ['#6C3483', '#9B59B6'],
  winter: ['#2C3E70', '#1A237E'],
};

// ── Animated section ───────────────────────────────────────────────────────
function ResultSection({ children, delay }: { children: React.ReactNode; delay: number }) {
  const slide = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY: slide }], opacity: op }}>
      {children}
    </Animated.View>
  );
}

// ── Confidence bar ─────────────────────────────────────────────────────────
function ConfBar({ pct, color }: { pct: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct / 100, duration: 900, delay: 400, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{
        height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)',
        width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
}

// ── Error / retake screen ─────────────────────────────────────────────────
function RetakePrompt({ error, onRetake }: { error: string; onRetake: () => void }) {
  const isAuthError = error.includes('Unauthorized') || error.includes('401');
  const isImageError = error === 'no_image' || error.includes('read');
  const isPhotoQuality = error.includes('parse_error') || error.includes('invalid');

  const title = isAuthError ? 'Sign In Required'
    : isImageError ? 'No Photo Detected'
    : isPhotoQuality ? 'Photo Too Unclear'
    : 'Analysis Failed';

  const message = isAuthError
    ? 'Sign in to use AI color analysis. Your personalized season report requires an account.'
    : isImageError
    ? 'No image was provided. Please take or select a clear face photo.'
    : isPhotoQuality
    ? 'The photo could not be analyzed. Please ensure your face is clearly visible with good lighting.'
    : 'Something went wrong with the analysis. Please try again with a clearer, well-lit photo.';

  return (
    <View style={err.root}>
      <LinearGradient colors={['#F5EEF8', '#FFF']} style={StyleSheet.absoluteFill} />
      <View style={err.card}>
        <View style={err.iconWrap}>
          <Ionicons name={isAuthError ? 'lock-closed-outline' : 'camera-outline'} size={40} color={C.purple} />
        </View>
        <Text style={err.title}>{title}</Text>
        <Text style={err.message}>{message}</Text>
        <Pressable style={({ pressed }) => [err.btn, pressed && { opacity: 0.85 }]} onPress={onRetake}>
          <LinearGradient colors={[C.purpleLight, C.purple]} start={[0, 0]} end={[1, 0]} style={err.btnGrad}>
            <Ionicons name={isAuthError ? 'person-outline' : 'camera'} size={18} color="#fff" />
            <Text style={err.btnText}>{isAuthError ? 'Sign In' : 'Retake Photo'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const err = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  card: {
    backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: C.purpleBorder, ...Shadow.md, width: '100%',
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.purplePale,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: C.purpleBorder,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: Fonts.sizes.sm, color: C.textSub, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  btn: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', ...Shadow.sm },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  btnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function ColorResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri?: string;
    aiResult?: string;
    aiError?: string;
  }>();

  const aiData = useMemo<ColorAnalysisResult | null>(() => {
    if (!params.aiResult) return null;
    try {
      return JSON.parse(params.aiResult) as ColorAnalysisResult;
    } catch {
      return null;
    }
  }, [params.aiResult]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: `Just discovered I am a ${aiData?.seasonVariant ?? aiData?.season ?? 'seasonal'} type on BeautyHer! Find your color season — try it free: https://beautyher.app`,
      });
    } catch { /* ignore */ }
  };

  // Show retake prompt if there's an error or no AI data
  if (!aiData || params.aiError) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[C.purplePale, '#FFF']} style={styles.headerGrad}>
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={20} color={C.purple} />
              </Pressable>
              <Text style={styles.headerTitle}>Your Color Season</Text>
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

  const seasonGrad = SEASON_GRADIENTS[aiData.season] ?? SEASON_GRADIENTS.autumn;
  const confPct = aiData.confidence === 'high' ? 92 : aiData.confidence === 'medium' ? 72 : 52;

  const makeupList = aiData.makeup ? [
    {
      category: 'Foundation',
      iconName: 'brush-outline' as const,
      iconColor: C.gold,
      shade: aiData.makeup.foundation?.shade ?? '',
      desc: aiData.makeup.foundation?.desc ?? '',
      brands: aiData.makeup.foundation?.brands ?? [],
    },
    {
      category: 'Blush',
      iconName: 'flower-outline' as const,
      iconColor: '#E05C7A',
      shade: aiData.makeup.blush?.shade ?? '',
      desc: aiData.makeup.blush?.desc ?? '',
      brands: aiData.makeup.blush?.brands ?? [],
    },
    {
      category: 'Lip Color',
      iconName: 'happy-outline' as const,
      iconColor: '#E04040',
      shade: aiData.makeup.lips?.shade ?? '',
      desc: aiData.makeup.lips?.desc ?? '',
      brands: aiData.makeup.lips?.brands ?? [],
    },
    {
      category: 'Eye Shadow',
      iconName: 'eye-outline' as const,
      iconColor: C.purple,
      shade: aiData.makeup.eyeshadow?.shade ?? '',
      desc: aiData.makeup.eyeshadow?.desc ?? '',
      brands: aiData.makeup.eyeshadow?.brands ?? [],
    },
  ] : [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.purplePale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={C.purple} />
            </Pressable>
            <Text style={styles.headerTitle}>Your Color Season</Text>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={C.purple} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero season card ─────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim }]}>
          <LinearGradient colors={seasonGrad} start={[0, 0]} end={[1, 1]} style={styles.heroGrad}>
            {params.imageUri ? (
              <Image source={{ uri: params.imageUri }} style={styles.heroPhoto} contentFit="cover" transition={300} />
            ) : null}
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>YOUR COLOR SEASON</Text>
              <Text style={styles.heroSeason}>
                {(aiData.season.charAt(0).toUpperCase() + aiData.season.slice(1))}
              </Text>
              <Text style={styles.heroVariant}>{aiData.seasonVariant}</Text>
              <Text style={styles.heroTagline}>{aiData.tagline}</Text>
              <View style={styles.heroConfRow}>
                <ConfBar pct={confPct} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroConf}>{confPct}%</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Color traits ─────────────────────────────────────── */}
        <ResultSection delay={80}>
          <View style={styles.traitsRow}>
            {[
              { label: 'Undertone', value: aiData.undertone, iconName: 'water-outline' as const },
              { label: 'Depth', value: aiData.depth, iconName: 'layers-outline' as const },
              { label: 'Contrast', value: aiData.contrast, iconName: 'contrast-outline' as const },
            ].map(trait => (
              <View key={trait.label} style={styles.traitChip}>
                <Ionicons name={trait.iconName} size={16} color={C.purple} />
                <Text style={styles.traitValue}>{trait.value}</Text>
                <Text style={styles.traitLabel}>{trait.label}</Text>
              </View>
            ))}
          </View>
        </ResultSection>

        {/* ── AI reasoning ─────────────────────────────────────── */}
        {aiData.reasoning ? (
          <ResultSection delay={120}>
            <View style={styles.reasoningCard}>
              <View style={styles.reasoningHeader}>
                <Ionicons name="sparkles" size={14} color={C.purple} />
                <Text style={styles.reasoningTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.reasoningText}>{aiData.reasoning}</Text>
              {aiData.keyFeatures?.length > 0 ? (
                <View style={styles.keyFeaturesRow}>
                  {aiData.keyFeatures.map((f, i) => (
                    <View key={i} style={styles.keyFeatureChip}>
                      <Text style={styles.keyFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </ResultSection>
        ) : null}

        {/* ── Seasonal palette ─────────────────────────────────── */}
        {aiData.palette?.length > 0 ? (
          <ResultSection delay={160}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR PALETTE</Text>
              <Text style={styles.sectionTitle}>Seasonal Color Palette</Text>
              <View style={styles.paletteGrid}>
                {aiData.palette.map(color => (
                  <View key={color.name} style={styles.paletteItem}>
                    <View style={[styles.paletteSwatch, { backgroundColor: color.hex }]} />
                    <Text style={styles.paletteName} numberOfLines={1}>{color.name}</Text>
                    <Text style={styles.paletteHex}>{color.hex.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ResultSection>
        ) : null}

        {/* ── Makeup shades ────────────────────────────────────── */}
        {makeupList.length > 0 ? (
          <ResultSection delay={240}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MAKEUP</Text>
              <Text style={styles.sectionTitle}>Recommended Shades</Text>
              {makeupList.map(item => (
                <View key={item.category} style={styles.makeupCard}>
                  <View style={[styles.makeupLeft, { backgroundColor: item.iconColor + '22' }]}>
                    <Ionicons name={item.iconName} size={22} color={item.iconColor} />
                  </View>
                  <View style={styles.makeupBody}>
                    <View style={styles.makeupTopRow}>
                      <Text style={styles.makeupCat}>{item.category}</Text>
                      <Text style={[styles.makeupShade, { color: C.purple }]}>{item.shade}</Text>
                    </View>
                    <Text style={styles.makeupDesc}>{item.desc}</Text>
                    {item.brands?.length > 0 ? (
                      <View style={styles.makeupBrands}>
                        {item.brands.map(b => (
                          <View key={b} style={styles.makeupBrand}>
                            <Text style={styles.makeupBrandText}>{b}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </ResultSection>
        ) : null}

        {/* ── Best clothing colors ─────────────────────────────── */}
        {aiData.bestColors?.length > 0 ? (
          <ResultSection delay={320}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>WARDROBE</Text>
              <Text style={styles.sectionTitle}>Best Clothing Colors</Text>
              <View style={styles.colorGrid}>
                {aiData.bestColors.map(c => (
                  <View key={c.name} style={styles.colorItem}>
                    <View style={[styles.colorSwatch, { backgroundColor: c.hex, borderColor: 'rgba(76,175,134,0.5)' }]}>
                      <View style={styles.colorCheckBadge}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.colorName} numberOfLines={1}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ResultSection>
        ) : null}

        {/* ── Worst colors ─────────────────────────────────────── */}
        {aiData.worstColors?.length > 0 ? (
          <ResultSection delay={400}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#E05C5C' }]}>Colors to Avoid</Text>
              <View style={styles.colorGrid}>
                {aiData.worstColors.map(c => (
                  <View key={c.name} style={styles.colorItem}>
                    <View style={[styles.colorSwatch, { backgroundColor: c.hex, borderColor: 'rgba(224,92,92,0.5)' }]}>
                      <View style={[styles.colorCheckBadge, { backgroundColor: '#E05C5C' }]}>
                        <Ionicons name="close" size={10} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.colorName} numberOfLines={1}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ResultSection>
        ) : null}

        {/* ── Styling tips ─────────────────────────────────────── */}
        {aiData.styling ? (
          <ResultSection delay={440}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>STYLING</Text>
              <Text style={styles.sectionTitle}>Metals & Patterns</Text>
              <View style={styles.stylingCard}>
                {[
                  { iconName: 'star-outline' as const, label: 'Best Metals', value: aiData.styling.metals },
                  { iconName: 'close-circle-outline' as const, label: 'Avoid Metals', value: aiData.styling.avoidMetals },
                  { iconName: 'apps-outline' as const, label: 'Best Patterns', value: aiData.styling.patterns },
                ].map(s => (
                  <View key={s.label} style={styles.stylingRow}>
                    <View style={styles.stylingIcon}>
                      <Ionicons name={s.iconName} size={14} color={C.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stylingLabel}>{s.label}</Text>
                      <Text style={styles.stylingValue}>{s.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ResultSection>
        ) : null}

        {/* ── CTA ─────────────────────────────────────────────── */}
        <ResultSection delay={500}>
          <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
            <Pressable
              style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push('/subscription')}
            >
              <LinearGradient
                colors={[C.purpleLight, C.purple]}
                start={[0, 0]} end={[1, 0]}
                style={styles.ctaBtnGrad}
              >
                <Ionicons name="diamond" size={16} color="#fff" />
                <Text style={styles.ctaBtnText}>Unlock Full Color Report</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="camera-outline" size={16} color={C.purple} />
              <Text style={styles.retakeBtnText}>Retake Photo</Text>
            </Pressable>
          </View>
        </ResultSection>
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
    backgroundColor: C.purpleChip, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: C.text },
  shareBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.purpleChip, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 48 },

  heroCard: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.md },
  heroGrad: { minHeight: 220, position: 'relative' },
  heroPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', opacity: 0.35 },
  heroContent: { padding: Spacing.lg },
  heroLabel: {
    fontSize: 9, fontWeight: Fonts.weights.bold, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: 6,
  },
  heroSeason: { fontSize: Fonts.sizes.xxxl, fontWeight: Fonts.weights.bold, color: '#fff', marginBottom: 2 },
  heroVariant: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold,
    color: 'rgba(255,255,255,0.8)', marginBottom: 10,
  },
  heroTagline: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: 16 },
  heroConfRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroConf: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#fff', minWidth: 36 },

  traitsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  traitChip: {
    flex: 1, backgroundColor: C.purplePale, borderRadius: Radius.lg,
    padding: 12, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: C.purpleBorder,
  },
  traitValue: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: C.text, textAlign: 'center' },
  traitLabel: { fontSize: 9, color: C.textLight, textAlign: 'center', letterSpacing: 0.3 },

  reasoningCard: {
    backgroundColor: C.purplePale, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, borderColor: C.purpleBorder, marginBottom: Spacing.md,
  },
  reasoningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reasoningTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: C.purple },
  reasoningText: { fontSize: Fonts.sizes.sm, color: C.textSub, lineHeight: 20, marginBottom: 10 },
  keyFeaturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyFeatureChip: {
    backgroundColor: 'rgba(155,89,182,0.12)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.purpleBorder,
  },
  keyFeatureText: { fontSize: 10, color: C.purple, fontWeight: '600' },

  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 9, fontWeight: Fonts.weights.bold, color: C.purple, letterSpacing: 2, marginBottom: 4,
  },
  sectionTitle: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: C.text, marginBottom: Spacing.sm },

  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  paletteItem: { width: (W - Spacing.md * 2 - Spacing.sm * 3) / 4, alignItems: 'center' },
  paletteSwatch: {
    width: '100%', aspectRatio: 1, borderRadius: Radius.md,
    marginBottom: 5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  paletteName: { fontSize: 9, fontWeight: Fonts.weights.semibold, color: C.text, textAlign: 'center' },
  paletteHex: { fontSize: 8, color: C.textLight, textAlign: 'center' },

  makeupCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#FFF', borderRadius: Radius.lg,
    padding: Spacing.sm + 4, marginBottom: 8,
    borderWidth: 2, borderColor: C.purpleBorder, ...Shadow.sm,
  },
  makeupLeft: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  makeupBody: { flex: 1 },
  makeupTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  makeupCat: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: C.text },
  makeupShade: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  makeupDesc: { fontSize: Fonts.sizes.xs, color: C.textSub, lineHeight: 17, marginBottom: 6 },
  makeupBrands: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  makeupBrand: {
    backgroundColor: C.purpleChip, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1.5, borderColor: C.purpleBorder,
  },
  makeupBrandText: { fontSize: 9, color: C.purple, fontWeight: Fonts.weights.semibold },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorItem: { alignItems: 'center', width: (W - Spacing.md * 2 - Spacing.sm * 5) / 6 },
  colorSwatch: {
    width: '100%', aspectRatio: 1, borderRadius: 10,
    alignItems: 'flex-end', justifyContent: 'flex-end',
    marginBottom: 4, padding: 2, borderWidth: 2.5,
  },
  colorCheckBadge: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#4CAF86',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  colorName: { fontSize: 8, color: C.textSub, textAlign: 'center', fontWeight: '500' },

  stylingCard: {
    backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 2, borderColor: C.purpleBorder, ...Shadow.sm, gap: 12,
  },
  stylingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stylingIcon: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: C.purplePale,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stylingLabel: { fontSize: 10, color: C.textLight, letterSpacing: 0.5, marginBottom: 2 },
  stylingValue: { fontSize: Fonts.sizes.sm, color: C.text, fontWeight: '600' },

  ctaBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadow.md },
  ctaBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  ctaBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13, borderRadius: Radius.full,
    borderWidth: 2, borderColor: C.purpleBorder, backgroundColor: C.purplePale,
  },
  retakeBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: C.purple },
});
