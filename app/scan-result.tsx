import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { BeautyScoreRing } from '@/components';
import { useScan } from '@/hooks/useScan';

export default function ScanResultScreen() {
  const router = useRouter();
  const { latestScan } = useScan();
  const [activeTab, setActiveTab] = useState<'face' | 'skin' | 'tips'>('face');

  if (!latestScan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No scan results yet</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const skinEntries = Object.entries(latestScan.skinAnalysis) as [string, { score: number; label: string }][];

  // Human-readable key labels
  const FACE_LABELS: Record<string, string> = {
    faceShape: 'Face Shape',
    skinTone: 'Skin Tone',
    undertone: 'Undertone',
    eyeShape: 'Eye Shape',
    eyebrows: 'Eyebrows',
    lipShape: 'Lip Shape',
    jawline: 'Jawline',
    facialSymmetry: 'Facial Symmetry',
  };

  const SKIN_LABELS: Record<string, string> = {
    texture: 'Texture',
    clarity: 'Clarity',
    hydration: 'Hydration',
    pores: 'Pores',
    darkCircles: 'Dark Circles',
    redness: 'Redness',
    hyperpigmentation: 'Hyperpigmentation',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Nav */}
        <View style={styles.topNav}>
          <Pressable
            style={({ pressed }) => [styles.backCircle, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>Beauty Report</Text>
          {/* AI badge */}
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={11} color={Colors.primary} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        {/* Hero Score */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.heroGradient}
        >
          <BeautyScoreRing score={latestScan.overallScore} size={130} strokeWidth={10} light />
          <View style={styles.heroInfo}>
            <Text style={styles.heroLabel}>Overall Beauty Score</Text>
            <View style={styles.confidenceRow}>
              <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.confidenceText}>{latestScan.confidenceScore}% confidence</Text>
            </View>
            {/* Gemini credit */}
            <View style={styles.geminiRow}>
              <Ionicons name="flash-outline" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={styles.geminiText}>Gemini 3 Flash</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['face', 'skin', 'tips'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'face' ? 'Face' : tab === 'skin' ? 'Skin' : 'Tips'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Face Analysis Tab ──────────────────────────────────────────── */}
        {activeTab === 'face' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Face Analysis</Text>
            <View style={styles.faceGrid}>
              {Object.entries(latestScan.faceAnalysis).map(([key, val]) => {
                const label = FACE_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim();
                const display = typeof val === 'number' ? `${val}%` : String(val);
                return (
                  <View key={key} style={styles.faceCard}>
                    <Text style={styles.faceCardLabel}>{label}</Text>
                    <Text style={styles.faceCardValue}>{display}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Skin Analysis Tab ──────────────────────────────────────────── */}
        {activeTab === 'skin' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skin Health</Text>
            {skinEntries.map(([key, metric]) => {
              const label = SKIN_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim();
              const color = metric.score >= 75 ? Colors.success : metric.score >= 55 ? Colors.warning : Colors.error;
              return (
                <View key={key} style={styles.skinRow}>
                  <View style={styles.skinLabelRow}>
                    <Text style={styles.skinLabel}>{label}</Text>
                    <View style={[styles.skinBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.skinBadgeText, { color }]}>{metric.label}</Text>
                    </View>
                    <Text style={[styles.skinScore, { color }]}>{metric.score}</Text>
                  </View>
                  <View style={styles.skinBarBg}>
                    <View style={[styles.skinBarFill, { width: `${metric.score}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── Tips Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'tips' ? (
          <View style={styles.section}>
            {/* AI personalization note */}
            <View style={styles.aiNote}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.aiNoteText}>
                Personalized by Gemini based on your facial features and skin analysis
              </Text>
            </View>

            {[
              {
                title: 'Skincare Recommendations',
                icon: 'water-outline',
                items: latestScan.recommendations.skincare,
                color: Colors.primary,
              },
              {
                title: 'Makeup Suggestions',
                icon: 'color-palette-outline',
                items: latestScan.recommendations.makeup,
                color: '#E88080',
              },
              {
                title: 'Lifestyle Tips',
                icon: 'leaf-outline',
                items: latestScan.recommendations.lifestyle,
                color: Colors.success,
              },
            ].map(group => (
              <View key={group.title} style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <Ionicons name={group.icon as any} size={18} color={group.color} />
                  <Text style={[styles.tipsTitle, { color: group.color }]}>{group.title}</Text>
                </View>
                {group.items.map((item, i) => (
                  <View key={i} style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: group.color }]} />
                    <Text style={styles.tipText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* CTA */}
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/glow-up')}
          >
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.ctaGradient}>
              <Text style={styles.ctaBtnText}>Start My Glow-Up Plan ✨</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  navTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.text },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  aiBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: Fonts.weights.bold },

  heroGradient: {
    marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.xl, flexDirection: 'row',
    alignItems: 'center', gap: Spacing.xl,
    ...Shadow.lg, marginBottom: Spacing.md,
  },
  heroInfo: { flex: 1 },
  heroLabel: {
    fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.semibold,
    color: Colors.textInverse, marginBottom: 8,
  },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  confidenceText: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)' },
  geminiRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  geminiText: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: Fonts.weights.medium },

  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.md,
    backgroundColor: Colors.border, borderRadius: Radius.full,
    padding: 3, marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse, fontWeight: Fonts.weights.semibold },

  section: { paddingHorizontal: Spacing.md },
  sectionTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold,
    color: Colors.text, marginBottom: Spacing.sm,
  },

  faceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  faceCard: {
    width: '47%', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: 12, ...Shadow.sm,
  },
  faceCardLabel: {
    fontSize: Fonts.sizes.xs, color: Colors.textSecondary,
    marginBottom: 4,
  },
  faceCardValue: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.primary,
  },

  skinRow: { marginBottom: Spacing.md },
  skinLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  skinLabel: {
    flex: 1, fontSize: Fonts.sizes.sm, color: Colors.text,
    fontWeight: Fonts.weights.medium,
  },
  skinBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  skinBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  skinScore: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, minWidth: 24, textAlign: 'right' },
  skinBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  skinBarFill: { height: '100%', borderRadius: 4 },

  aiNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: Colors.secondary, borderRadius: Radius.md,
    padding: 10, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiNoteText: {
    flex: 1, fontSize: Fonts.sizes.xs, color: Colors.primary, lineHeight: 17,
    fontWeight: Fonts.weights.medium,
  },

  tipsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm, marginBottom: Spacing.md,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  tipText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  ctaRow: { paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  ctaBtn: { borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  ctaGradient: { paddingVertical: 16, alignItems: 'center' },
  ctaBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.textInverse },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { fontSize: Fonts.sizes.lg, color: Colors.textSecondary, marginBottom: Spacing.lg },
  backBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: Colors.textInverse, fontWeight: Fonts.weights.semibold },
});
