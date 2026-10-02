import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { useScan } from '@/hooks/useScan';
import { useAlert } from '@/template';
import { COLOR_SEASONS } from '@/services/mockData';
import { analyzeColorSeason, ColorAnalysisResult } from '@/services/colorAnalysisService';

const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'] as const;
type SeasonKey = typeof SEASON_KEYS[number];

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Estimated',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: Colors.success,
  medium: Colors.primary,
  low: Colors.textSecondary,
};

export default function ColorAnalysisScreen() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const { latestScan } = useScan();
  const { showAlert } = useAlert();

  const [selected, setSelected] = useState<SeasonKey>(user.colorSeason);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<ColorAnalysisResult | null>(null);

  const season = COLOR_SEASONS[selected];
  const hasImage = !!latestScan?.imageUri;

  const runAIAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAiResult(null);

    const { data, error } = await analyzeColorSeason({
      imageUri: latestScan?.imageUri ?? null,
      skinTone: latestScan?.faceAnalysis?.skinTone,
      undertone: latestScan?.faceAnalysis?.undertone,
      skinType: user.skinType,
    });

    setIsAnalyzing(false);

    if (error || !data) {
      showAlert('Analysis Failed', 'Could not complete color analysis. Please try again.');
      return;
    }

    setAiResult(data);
    // Instantly preview the AI-detected season in the selector
    setSelected(data.season as SeasonKey);
  }, [latestScan, user.skinType, showAlert]);

  const applyAIResult = useCallback(async () => {
    if (!aiResult) return;
    await updateUser({ colorSeason: aiResult.season as SeasonKey });
    showAlert('Saved', `${COLOR_SEASONS[aiResult.season as SeasonKey].name} has been set as your color season.`);
  }, [aiResult, updateUser, showAlert]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Color Analysis</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── AI Analysis Card ───────────────────────────────────────────── */}
        <View style={styles.aiCard}>
          <LinearGradient
            colors={['#2D1B69', '#7B3FA0', '#C88F74']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCardGradient}
          >
            {/* Header row */}
            <View style={styles.aiCardHeader}>
              <View style={styles.aiIconWrap}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiCardTitle}>AI Season Detection</Text>
                <Text style={styles.aiCardSub}>
                  {hasImage
                    ? 'Using your latest scan photo'
                    : 'Using your profile & scan data'}
                </Text>
              </View>
              <View style={styles.geminiBadge}>
                <Text style={styles.geminiBadgeText}>Gemini</Text>
              </View>
            </View>

            {/* Content: idle / loading / result */}
            {!isAnalyzing && !aiResult ? (
              /* Idle state */
              <View>
                <Text style={styles.aiCardDesc}>
                  {hasImage
                    ? 'BeautyHer AI will analyze your selfie for skin tone, undertone, and natural coloring to pinpoint your exact season.'
                    : 'Gemini will analyze your detected skin tone and undertone to determine your personal color season.'}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  onPress={runAIAnalysis}
                >
                  <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
                  <Text style={styles.analyzeBtnText}>
                    {hasImage ? 'Analyze My Photo' : 'Analyze My Profile'}
                  </Text>
                </Pressable>
              </View>
            ) : isAnalyzing ? (
              /* Loading state */
              <View style={styles.aiLoadingWrap}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.aiLoadingText}>Analyzing your natural coloring…</Text>
              </View>
            ) : aiResult ? (
              /* Result state */
              <View style={styles.aiResultWrap}>
                {/* Detected season */}
                <View style={styles.aiResultSeasonRow}>
                  <Text style={styles.aiResultEmoji}>
                    {COLOR_SEASONS[aiResult.season as SeasonKey]?.emoji ?? '🌸'}
                  </Text>
                  <View>
                    <Text style={styles.aiResultSeasonName}>
                      {COLOR_SEASONS[aiResult.season as SeasonKey]?.name ?? aiResult.season}
                    </Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: `${CONFIDENCE_COLORS[aiResult.confidence]}22` }]}>
                      <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLORS[aiResult.confidence] }]} />
                      <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[aiResult.confidence] }]}>
                        {CONFIDENCE_LABELS[aiResult.confidence] ?? aiResult.confidence}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Reasoning */}
                <Text style={styles.aiReasoningText}>{aiResult.reasoning}</Text>

                {/* Key features */}
                {aiResult.keyFeatures.length > 0 ? (
                  <View style={styles.featuresRow}>
                    {aiResult.keyFeatures.map((f, i) => (
                      <View key={i} style={styles.featureChip}>
                        <Text style={styles.featureChipText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Action buttons */}
                <View style={styles.aiResultBtns}>
                  <Pressable
                    style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
                    onPress={applyAIResult}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={styles.applyBtnText}>Save to Profile</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.reanalyzeBtn, pressed && { opacity: 0.75 }]}
                    onPress={runAIAnalysis}
                  >
                    <Ionicons name="refresh-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.reanalyzeBtnText}>Re-analyze</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </LinearGradient>
        </View>

        {/* ── Manual Season Selector ─────────────────────────────────────── */}
        <Text style={styles.manualLabel}>Manual Override</Text>
        <View style={styles.seasonRow}>
          {SEASON_KEYS.map(key => {
            const s = COLOR_SEASONS[key];
            const isActive = selected === key;
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.seasonBtn,
                  isActive && styles.seasonBtnActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  setSelected(key);
                  updateUser({ colorSeason: key });
                }}
              >
                <Text style={styles.seasonBtnEmoji}>{s.emoji}</Text>
                <Text style={[styles.seasonBtnLabel, isActive && styles.seasonBtnLabelActive]}>
                  {s.name.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Season Hero Card ───────────────────────────────────────────── */}
        <LinearGradient colors={season.gradient} style={styles.heroCard}>
          <Text style={styles.heroEmoji}>{season.emoji}</Text>
          <Text style={styles.heroName}>{season.name}</Text>
          <Text style={styles.heroSubtitle}>{season.subtitle}</Text>
          <Text style={styles.heroDesc}>{season.description}</Text>
          <View style={styles.metalsRow}>
            <Ionicons name="diamond-outline" size={16} color={Colors.primary} />
            <Text style={styles.metalsText}>Best metals: {season.metals}</Text>
          </View>
        </LinearGradient>

        {/* ── Signature Palette ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Signature Palette</Text>
          <View style={styles.swatchGrid}>
            {season.swatches.map((color, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: color }]}>
                <Text style={styles.swatchHex}>{color}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Best & Avoid ───────────────────────────────────────────────── */}
        <View style={styles.twoCol}>
          <View style={[styles.halfCard, { backgroundColor: 'rgba(123,198,122,0.12)' }]}>
            <Text style={styles.halfCardTitle}>✅ Best Colors</Text>
            {season.best.map(c => (
              <Text key={c} style={styles.halfCardItem}>• {c}</Text>
            ))}
          </View>
          <View style={[styles.halfCard, { backgroundColor: 'rgba(224,92,92,0.12)' }]}>
            <Text style={styles.halfCardTitle}>❌ Avoid</Text>
            {season.avoid.map(c => (
              <Text key={c} style={styles.halfCardItem}>• {c}</Text>
            ))}
          </View>
        </View>

        {/* ── Lipstick Palette ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Lipstick Palette</Text>
          <View style={styles.lipRow}>
            {season.lipstick.map((color, i) => (
              <View key={i} style={styles.lipSwatch}>
                <View style={[styles.lipCircle, { backgroundColor: color }]} />
                <Text style={styles.lipHex}>{color}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── All Seasons ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Color Seasons</Text>
          {SEASON_KEYS.map(key => {
            const s = COLOR_SEASONS[key];
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.seasonListItem,
                  selected === key && styles.seasonListItemActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelected(key)}
              >
                <Text style={styles.seasonListEmoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seasonListName}>{s.name}</Text>
                  <Text style={styles.seasonListSub}>{s.subtitle}</Text>
                </View>
                {selected === key ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.text },

  /* AI Analysis Card */
  aiCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg,
  },
  aiCardGradient: { padding: Spacing.lg },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  aiIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff',
  },
  aiCardSub: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  geminiBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  geminiBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: Fonts.weights.semibold },

  aiCardDesc: {
    fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)',
    lineHeight: 20, marginBottom: Spacing.md,
  },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#fff',
    borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: Spacing.lg,
    ...Shadow.sm,
  },
  analyzeBtnText: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.primary,
  },

  /* Loading */
  aiLoadingWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: Spacing.sm,
  },
  aiLoadingText: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.85)', flex: 1 },

  /* Result */
  aiResultWrap: { gap: Spacing.sm },
  aiResultSeasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  aiResultEmoji: { fontSize: 40 },
  aiResultSeasonName: {
    fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: '#fff', marginBottom: 4,
  },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  confidenceDot: { width: 6, height: 6, borderRadius: 3 },
  confidenceText: { fontSize: 11, fontWeight: Fonts.weights.semibold },
  aiReasoningText: {
    fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 20,
  },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featureChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  featureChipText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: Fonts.weights.medium },
  aiResultBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  applyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff',
    borderRadius: Radius.full, paddingVertical: 10,
  },
  applyBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: Colors.primary },
  reanalyzeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  reanalyzeBtnText: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.7)' },

  /* Manual selector */
  manualLabel: {
    fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold,
    color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, marginBottom: 4,
  },
  seasonRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  seasonBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: Radius.md, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  seasonBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.secondary },
  seasonBtnEmoji: { fontSize: 20, marginBottom: 4 },
  seasonBtnLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },
  seasonBtnLabelActive: { color: Colors.primary, fontWeight: Fonts.weights.semibold },

  /* Season Hero */
  heroCard: {
    marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.xl, marginBottom: Spacing.md,
    alignItems: 'center', ...Shadow.md,
  },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  heroName: { fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, color: Colors.text, marginBottom: 4 },
  heroSubtitle: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: Fonts.weights.semibold, marginBottom: Spacing.sm },
  heroDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.md },
  metalsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metalsText: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: Fonts.weights.medium },

  /* Sections */
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.text, marginBottom: Spacing.sm },
  swatchGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  swatch: {
    width: 52, height: 52, borderRadius: 12,
    justifyContent: 'flex-end', paddingBottom: 3, alignItems: 'center',
    ...Shadow.sm,
  },
  swatchHex: { fontSize: 7, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  twoCol: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  halfCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md },
  halfCardTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: Colors.text, marginBottom: 8 },
  halfCardItem: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: 4, lineHeight: 19 },
  lipRow: { flexDirection: 'row', gap: Spacing.md },
  lipSwatch: { alignItems: 'center', gap: 6 },
  lipCircle: { width: 52, height: 52, borderRadius: 26, ...Shadow.sm },
  lipHex: { fontSize: 8, color: Colors.textSecondary },

  /* All seasons list */
  seasonListItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  seasonListItemActive: { borderColor: Colors.primary },
  seasonListEmoji: { fontSize: 24 },
  seasonListName: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.text },
  seasonListSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
});
