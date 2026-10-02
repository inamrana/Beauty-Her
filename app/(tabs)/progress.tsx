import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path, Circle, Defs,
  LinearGradient as SvgGradient, Stop,
  Line, Text as SvgText, G,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useScan } from '@/hooks/useScan';
import { useUser } from '@/hooks/useUser';
import { MOCK_ACHIEVEMENTS } from '@/services/mockData';
import { Image } from 'expo-image';
import type { ScanResult } from '@/contexts/ScanContext';

// ── Chart geometry ─────────────────────────────────────────────────────────
const CHART_TOTAL_H = 190;
const PAD_TOP = 36;   // room for score labels above dots
const PAD_BTM = 52;   // room for date labels + axis line
const PAD_LEFT = 44;  // room for Y-axis labels
const PAD_RIGHT = 20;

// ── Timeline thumbnail dimensions ──────────────────────────────────────────
const THUMB_W = 80;
const THUMB_H = 104;

// ── Helpers ────────────────────────────────────────────────────────────────
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getBezierPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cpx} ${pts[i - 1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

interface ChartPoint { x: number; y: number; score: number; label: string }

// ── BeautyScoreChart ───────────────────────────────────────────────────────
function BeautyScoreChart({
  data,
  totalWidth,
}: {
  data: { score: number; label: string }[];
  totalWidth: number;
}) {
  if (!data.length || totalWidth < 20) return null;

  const plotW = Math.max(1, totalWidth - PAD_LEFT - PAD_RIGHT);
  const plotH = Math.max(1, CHART_TOTAL_H - PAD_TOP - PAD_BTM);
  const bottomY = PAD_TOP + plotH;

  const scores = data.map(d => d.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  // Add padding around the data range for visual breathing room
  const minVal = Math.max(0, rawMin - 14);
  const maxVal = Math.min(100, rawMax + 8);
  const range = Math.max(maxVal - minVal, 1);

  const pts: ChartPoint[] = data.map((d, i) => ({
    x: PAD_LEFT + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: PAD_TOP + (1 - (d.score - minVal) / range) * plotH,
    score: d.score,
    label: d.label,
  }));

  const linePath = getBezierPath(pts);
  const areaPath =
    pts.length >= 2
      ? `${linePath} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`
      : '';

  // Y-axis grid reference lines — only those visible in the data range
  const gridValues = [0, 25, 50, 75, 100].filter(
    v => v >= minVal - 5 && v <= maxVal + 5
  );

  // Show date label every 2nd point when dense, always show first & last
  const showDateLabel = (i: number) =>
    data.length <= 5 || i % 2 === 0 || i === data.length - 1;

  return (
    <Svg width={totalWidth} height={CHART_TOTAL_H}>
      <Defs>
        {/* Area gradient */}
        <SvgGradient id="beautyAreaFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.28" />
          <Stop offset="60%" stopColor={Colors.primary} stopOpacity="0.07" />
          <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
        </SvgGradient>
        {/* Latest dot outer glow */}
        <SvgGradient id="latestGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={Colors.primaryLight} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
        </SvgGradient>
      </Defs>

      {/* ── Y-axis grid lines ───────────────────────────────────── */}
      {gridValues.map(v => {
        const gy = PAD_TOP + (1 - (v - minVal) / range) * plotH;
        return (
          <G key={`grid-${v}`}>
            <Line
              x1={PAD_LEFT}
              y1={gy}
              x2={PAD_LEFT + plotW}
              y2={gy}
              stroke={Colors.border}
              strokeWidth={1}
              strokeDasharray="4 6"
              opacity={0.9}
            />
            <SvgText
              x={PAD_LEFT - 8}
              y={gy + 4}
              fontSize={9}
              fill={Colors.textLight}
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}

      {/* ── Area fill ────────────────────────────────────────────── */}
      {areaPath ? <Path d={areaPath} fill="url(#beautyAreaFill)" /> : null}

      {/* ── Trend line ───────────────────────────────────────────── */}
      {linePath ? (
        <Path
          d={linePath}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* ── Data points ──────────────────────────────────────────── */}
      {pts.map((p, i) => {
        const isLatest = i === pts.length - 1;
        return (
          <G key={`pt-${i}`}>
            {isLatest ? (
              /* Highlighted latest point — triple ring */
              <>
                <Circle cx={p.x} cy={p.y} r={15} fill={Colors.primary} opacity={0.08} />
                <Circle cx={p.x} cy={p.y} r={9} fill={Colors.surface} />
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill="none"
                  stroke={Colors.primary}
                  strokeWidth={2.5}
                />
                <Circle cx={p.x} cy={p.y} r={4.5} fill={Colors.primary} />
              </>
            ) : (
              /* Regular point */
              <>
                <Circle cx={p.x} cy={p.y} r={5} fill={Colors.surface} />
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill="none"
                  stroke={Colors.primaryLight}
                  strokeWidth={1.5}
                />
                <Circle cx={p.x} cy={p.y} r={2.5} fill={Colors.primaryLight} />
              </>
            )}

            {/* Score label above dot */}
            <SvgText
              x={p.x}
              y={p.y - (isLatest ? 17 : 12)}
              fontSize={isLatest ? 11 : 9}
              fontWeight={isLatest ? 'bold' : 'normal'}
              fill={isLatest ? Colors.primaryDark : Colors.textSecondary}
              textAnchor="middle"
            >
              {p.score}
            </SvgText>

            {/* Date label below axis */}
            {showDateLabel(i) ? (
              <SvgText
                x={p.x}
                y={bottomY + 20}
                fontSize={isLatest ? 9 : 8}
                fontWeight={isLatest ? 'bold' : 'normal'}
                fill={isLatest ? Colors.primaryDark : Colors.textLight}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Progress Screen ────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router = useRouter();
  const { scans, latestScan } = useScan();
  const { user } = useUser();
  const [chartW, setChartW] = useState(300);
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ── Derive chart data: last 10 scans sorted oldest → newest ─────────────
  const chartData = useMemo(() => {
    if (!scans.length) return [];
    return [...scans]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10)
      .map(s => ({ score: s.overallScore, label: formatShortDate(s.date) }));
  }, [scans]);

  const bestScore = useMemo(() => {
    if (!scans.length) return user.beautyScore ?? 0;
    return Math.max(...scans.map(s => s.overallScore));
  }, [scans, user.beautyScore]);

  // Score delta: latest vs previous scan
  const scoreChange = useMemo(() => {
    if (chartData.length < 2) return null;
    return chartData[chartData.length - 1].score - chartData[chartData.length - 2].score;
  }, [chartData]);

  // Skin metrics from latest scan result (typed from ScanResult.skinAnalysis)
  const skinMetrics = useMemo(() => {
    const sa = latestScan?.skinAnalysis as any;
    // scans[0] = latest, scans[1] = previous (newest-first order)
    const prevSa = scans.length >= 2 ? (scans[1]?.skinAnalysis as any) : null;

    const defs = [
      { label: 'Hydration', key: 'hydration',  color: '#64B5F6' },
      { label: 'Clarity',   key: 'clarity',    color: Colors.success },
      { label: 'Texture',   key: 'texture',    color: Colors.primary },
      { label: 'Redness',   key: 'redness',    color: '#FF8A65' },
      { label: 'Pores',     key: 'pores',      color: Colors.accentDark },
    ];

    return defs.map(d => {
      const score: number | null = sa?.[d.key]?.score ?? null;
      const prevScore: number | null = prevSa?.[d.key]?.score ?? null;
      const delta =
        score !== null && prevScore !== null
          ? Math.round(score - prevScore)
          : null;
      return { label: d.label, score: score ?? 0, color: d.color, delta, hasData: score !== null };
    });
  }, [latestScan, scans]);

  // ── Timeline (oldest → newest) ──────────────────────────────────────────
  const timelineScans = useMemo(() => {
    return [...scans].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [scans]);

  // ── Comparison pair ────────────────────────────────────────────────────────
  const comparisonScans = useMemo<{ before: ScanResult; after: ScanResult } | null>(() => {
    if (selectedScanIds.length < 2) return null;
    const a = scans.find(s => s.id === selectedScanIds[0]);
    const b = scans.find(s => s.id === selectedScanIds[1]);
    if (!a || !b) return null;
    const sorted = [a, b].sort(
      (x, y) => new Date(x.date).getTime() - new Date(y.date).getTime()
    );
    return { before: sorted[0], after: sorted[1] };
  }, [selectedScanIds, scans]);

  // Auto-open when 2 scans selected
  useEffect(() => {
    if (selectedScanIds.length === 2) {
      const t = setTimeout(() => setShowCompareModal(true), 200);
      return () => clearTimeout(t);
    }
  }, [selectedScanIds.length]);

  const handleScanTap = useCallback((scanId: string) => {
    setSelectedScanIds(prev => {
      if (prev.includes(scanId)) return prev.filter(id => id !== scanId);
      if (prev.length >= 2) return [prev[1], scanId];
      return [...prev, scanId];
    });
  }, []);

  const scoreDelta = comparisonScans
    ? comparisonScans.after.overallScore - comparisonScans.before.overallScore
    : 0;

  const hasScans = chartData.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
          <Text style={styles.headerSub}>Track your beauty journey</Text>
        </View>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Day Streak', value: user.streak, emoji: '🔥' },
            { label: 'Total Scans', value: user.totalScans, emoji: '✨' },
            { label: 'Best Score', value: bestScore, emoji: '🌟' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statNum}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Beauty Score Chart ───────────────────────────────────── */}
        <View
          style={styles.chartCard}
          onLayout={e => setChartW(e.nativeEvent.layout.width - 32)}
        >
          {/* Card header */}
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Beauty Score Trend</Text>
              <Text style={styles.cardSub}>
                {chartData.length >= 2
                  ? `Last ${chartData.length} scan${chartData.length > 1 ? 's' : ''}`
                  : chartData.length === 1
                  ? 'First scan recorded'
                  : 'No scans recorded yet'}
              </Text>
            </View>

            {/* Score delta badge */}
            {scoreChange !== null ? (
              <View
                style={[
                  styles.deltaBadge,
                  scoreChange >= 0 ? styles.deltaBadgeUp : styles.deltaBadgeDown,
                ]}
              >
                <Ionicons
                  name={scoreChange > 0 ? 'trending-up' : scoreChange < 0 ? 'trending-down' : 'remove'}
                  size={13}
                  color={scoreChange >= 0 ? Colors.success : Colors.error}
                />
                <Text
                  style={[
                    styles.deltaBadgeText,
                    scoreChange >= 0 ? styles.deltaUp : styles.deltaDown,
                  ]}
                >
                  {scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Chart or empty state */}
          {hasScans ? (
            <View style={styles.chartWrap}>
              <BeautyScoreChart data={chartData} totalWidth={chartW} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[Colors.secondary, Colors.surfaceSecondary]}
                style={styles.emptyIconCircle}
              >
                <Ionicons name="bar-chart-outline" size={30} color={Colors.primaryLight} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Your journey starts here</Text>
              <Text style={styles.emptySub}>
                Take your first AI beauty scan to begin{'\n'}tracking your score over time.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => router.push('/(tabs)/scan')}
              >
                <Text style={styles.emptyBtnText}>Scan Now</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </Pressable>
            </View>
          )}

          {/* Chart footnote */}
          {hasScans && (
            <View style={styles.chartFootnote}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Beauty score</Text>
              <View style={[styles.legendDot, styles.legendDotLatest]} />
              <Text style={styles.legendText}>Latest scan</Text>
            </View>
          )}
        </View>

        {/* ── Photo Timeline ──────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Photo Timeline</Text>
              <Text style={styles.cardSub}>
                {timelineScans.length >= 2
                  ? 'Tap two photos to compare before & after'
                  : timelineScans.length === 1
                  ? 'Take more scans to compare progress'
                  : 'No scans recorded yet'}
              </Text>
            </View>
            {selectedScanIds.length > 0 ? (
              <Pressable
                style={styles.clearSelBtn}
                onPress={() => setSelectedScanIds([])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearSelText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {timelineScans.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timelineContent}
              >
                {timelineScans.map(scan => {
                  const selIdx = selectedScanIds.indexOf(scan.id);
                  const isSelected = selIdx >= 0;
                  return (
                    <Pressable
                      key={scan.id}
                      style={({ pressed }) => [
                        styles.thumbOuter,
                        pressed && { opacity: 0.82, transform: [{ scale: 0.95 }] },
                      ]}
                      onPress={() => handleScanTap(scan.id)}
                    >
                      <View style={[styles.thumbCard, isSelected && styles.thumbCardSelected]}>
                        {scan.imageUri ? (
                          <Image
                            source={{ uri: scan.imageUri }}
                            style={styles.thumbImg}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : (
                          <View style={styles.thumbNoPhoto}>
                            <Ionicons name="person-outline" size={26} color={Colors.textLight} />
                          </View>
                        )}
                        <View style={styles.thumbScoreBadge}>
                          <Text style={styles.thumbScoreText}>{scan.overallScore}</Text>
                        </View>
                        {isSelected ? (
                          <View style={styles.thumbSelBadge}>
                            <Text style={styles.thumbSelNum}>{selIdx + 1}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.thumbDate}>{formatShortDate(scan.date)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.timelineHintRow}>
                {selectedScanIds.length < 2 ? (
                  <Text style={styles.timelineHint}>
                    {selectedScanIds.length === 0
                      ? 'Tap a photo to select \u00b7 Select 2 to compare'
                      : '1 of 2 selected \u00b7 Tap another photo'}
                  </Text>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.compareBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setShowCompareModal(true)}
                  >
                    <Ionicons name="swap-horizontal" size={15} color={Colors.textInverse} />
                    <Text style={styles.compareBtnText}>View Before & After</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <View style={styles.timelineEmpty}>
              <Ionicons name="images-outline" size={34} color={Colors.textLight} />
              <Text style={styles.timelineEmptyTitle}>Start your photo journey</Text>
              <Text style={styles.timelineEmptyText}>
                Take AI scans to build a visual record of your beauty progress.
              </Text>
            </View>
          )}
        </View>

        {/* ── Skin Health Metrics ──────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHead}>
            <View>
              <Text style={styles.cardTitle}>Skin Health Metrics</Text>
              {scans.length >= 2 ? (
                <Text style={styles.cardSub}>vs your previous scan</Text>
              ) : null}
            </View>
            {latestScan ? (
              <View style={styles.aiSourcePill}>
                <Ionicons name="sparkles" size={10} color={Colors.primary} />
                <Text style={styles.aiSourceText}>AI analyzed</Text>
              </View>
            ) : null}
          </View>
          {skinMetrics.map(m => (
            <View key={m.label} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <View style={styles.metricBarBg}>
                <View
                  style={[
                    styles.metricBarFill,
                    { width: m.hasData ? `${m.score}%` : '0%', backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={[styles.metricScore, { color: m.hasData ? m.color : Colors.textLight }]}>
                {m.hasData ? m.score : '–'}
              </Text>
              {m.delta !== null && m.delta !== 0 ? (
                <View style={[styles.metricDelta, m.delta > 0 ? styles.metricDeltaUp : styles.metricDeltaDown]}>
                  <Text style={[styles.metricDeltaText, m.delta > 0 ? styles.deltaUp : styles.deltaDown]}>
                    {m.delta > 0 ? `+${m.delta}` : `${m.delta}`}
                  </Text>
                </View>
              ) : <View style={styles.metricDeltaPlaceholder} />}
            </View>
          ))}
          {!latestScan ? (
            <Text style={styles.metricHint}>
              Scan your face to unlock real-time skin metrics
            </Text>
          ) : !skinMetrics.some(m => m.hasData) ? (
            <Text style={styles.metricHint}>Scan data is being processed…</Text>
          ) : null}
        </View>

        {/* ── Glow-Up Progress ─────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Glow-Up Journey</Text>
          <Pressable
            style={({ pressed }) => [styles.glowUpRow, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/glow-up')}
            accessibilityLabel="View glow-up plan"
          >
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              style={styles.glowCircle}
            >
              <Text style={styles.glowPct}>35%</Text>
            </LinearGradient>
            <View style={styles.glowBarWrap}>
              <View style={styles.glowTopRow}>
                <Text style={styles.glowPlanName}>7-Day Glow-Up Plan</Text>
                <Text style={styles.glowDays}>Day 3 of 7</Text>
              </View>
              <View style={styles.glowBarBg}>
                <View style={[styles.glowBarFill, { width: '35%' }]} />
              </View>
              <Text style={styles.glowCta}>Tap to view your plan →</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Achievements ─────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <View style={styles.achieveGrid}>
            {MOCK_ACHIEVEMENTS.map(a => (
              <View
                key={a.id}
                style={[styles.achieveCard, !a.earned && styles.achieveCardLocked]}
              >
                <Text style={[styles.achieveIcon, !a.earned && { opacity: 0.35 }]}>
                  {a.icon}
                </Text>
                <Text
                  style={[
                    styles.achieveTitle,
                    !a.earned && styles.achieveTitleLocked,
                  ]}
                >
                  {a.title}
                </Text>
                {a.earned ? (
                  <Text style={styles.achieveDate}>{a.date}</Text>
                ) : (
                  <Text style={styles.achieveLocked}>Locked</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Before & After Comparison Modal ──────────────────────── */}
      <Modal
        visible={showCompareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompareModal(false)}
      >
        <SafeAreaView style={styles.modalBg} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.6 }]}
              onPress={() => setShowCompareModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.textInverse} />
            </Pressable>
            <Text style={styles.modalTitle}>Before & After</Text>
            <View style={{ width: 38 }} />
          </View>

          {comparisonScans ? (
            <>
              {/* Compare panels */}
              <View style={styles.compareArea}>
                {/* Before */}
                <View style={styles.comparePanel}>
                  {comparisonScans.before.imageUri ? (
                    <Image
                      source={{ uri: comparisonScans.before.imageUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.comparePlaceholder}>
                      <Ionicons name="person-outline" size={52} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.72)', 'transparent']}
                    style={styles.compareTopGrad}
                  >
                    <Text style={styles.compareLabelTag}>BEFORE</Text>
                    <Text style={styles.compareLabelDate}>{formatLongDate(comparisonScans.before.date)}</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.82)']}
                    style={styles.compareBottomGrad}
                  >
                    <Text style={styles.compareScoreNum}>{comparisonScans.before.overallScore}</Text>
                    <Text style={styles.compareScoreLabel}>Beauty Score</Text>
                  </LinearGradient>
                </View>

                {/* Centre divider */}
                <View style={styles.compareDivider}>
                  <View style={styles.compareDivLine} />
                  <View style={styles.compareDivIcon}>
                    <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
                  </View>
                  <View style={styles.compareDivLine} />
                </View>

                {/* After */}
                <View style={styles.comparePanel}>
                  {comparisonScans.after.imageUri ? (
                    <Image
                      source={{ uri: comparisonScans.after.imageUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.comparePlaceholder}>
                      <Ionicons name="person-outline" size={52} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.72)', 'transparent']}
                    style={styles.compareTopGrad}
                  >
                    <Text style={[styles.compareLabelTag, { color: Colors.primaryLight }]}>AFTER</Text>
                    <Text style={styles.compareLabelDate}>{formatLongDate(comparisonScans.after.date)}</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.82)']}
                    style={styles.compareBottomGrad}
                  >
                    <Text style={[
                      styles.compareScoreNum,
                      { color: scoreDelta >= 0 ? Colors.primaryLight : '#FF8A65' },
                    ]}>
                      {comparisonScans.after.overallScore}
                    </Text>
                    <Text style={styles.compareScoreLabel}>Beauty Score</Text>
                  </LinearGradient>
                </View>
              </View>

              {/* Delta card */}
              <View style={[styles.deltaCard, scoreDelta >= 0 ? styles.deltaCardUp : styles.deltaCardDown]}>
                <Ionicons
                  name={scoreDelta > 0 ? 'trending-up' : scoreDelta < 0 ? 'trending-down' : 'remove'}
                  size={28}
                  color={scoreDelta >= 0 ? Colors.success : Colors.error}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deltaNum, { color: scoreDelta >= 0 ? Colors.success : Colors.error }]}>
                    {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`} points
                  </Text>
                  <Text style={styles.deltaSub}>
                    {formatShortDate(comparisonScans.before.date)} \u2192 {formatShortDate(comparisonScans.after.date)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>Select two scans to compare</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statNum: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Chart card
  chartCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  cardSub: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chartWrap: {
    marginTop: Spacing.sm,
    marginHorizontal: -4,
  },
  chartFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  legendDotLatest: { backgroundColor: Colors.primary, width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: Colors.textLight, marginRight: Spacing.sm },

  // Delta badge
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  deltaBadgeUp: { backgroundColor: Colors.successLight },
  deltaBadgeDown: { backgroundColor: Colors.errorLight },
  deltaBadgeText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
  },
  deltaUp: { color: Colors.success },
  deltaDown: { color: Colors.error },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: Spacing.xs,
    backgroundColor: Colors.secondary,
  },
  emptyBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
  },

  // ── Skin metrics
  sectionCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiSourceText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  metricLabel: {
    width: 72,
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  metricBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: { height: '100%', borderRadius: 4 },
  metricScore: {
    width: 28,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    textAlign: 'right',
  },
  metricHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },

  // Delta badge
  metricDelta: {
    minWidth: 36,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDeltaPlaceholder: { minWidth: 36 },
  metricDeltaUp: { backgroundColor: Colors.successLight },
  metricDeltaDown: { backgroundColor: Colors.errorLight },
  metricDeltaText: {
    fontSize: 9,
    fontWeight: Fonts.weights.bold,
  },

  // ── Glow-Up
  glowUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 12,
  },
  glowCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Shadow.sm,
  },
  glowPct: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
  },
  glowBarWrap: { flex: 1 },
  glowTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  glowPlanName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  glowDays: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
  },
  glowBarBg: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  glowBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  glowCta: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    marginTop: 6,
    fontWeight: Fonts.weights.medium,
  },

  // ── Achievements
  achieveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 12,
  },
  achieveCard: {
    width: '30%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
  },
  achieveCardLocked: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  achieveIcon: { fontSize: 24, marginBottom: 4 },
  achieveTitle: {
    fontSize: 10,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  achieveTitleLocked: { color: Colors.textLight },
  achieveDate: {
    fontSize: 9,
    color: Colors.textLight,
    marginTop: 2,
  },
  achieveLocked: {
    fontSize: 9,
    color: Colors.textLight,
    marginTop: 2,
  },

  // ── Photo Timeline
  timelineContent: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
  },
  thumbOuter: {
    alignItems: 'center',
    marginRight: 10,
  },
  thumbCard: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.border,
  },
  thumbCardSelected: {
    borderColor: Colors.primary,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbNoPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.border,
  },
  thumbScoreBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  thumbScoreText: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
  },
  thumbSelBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSelNum: {
    fontSize: 11,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
  },
  thumbDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  timelineHintRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  timelineHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  clearSelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  clearSelText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...Shadow.sm,
  },
  compareBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textInverse,
  },
  timelineEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  timelineEmptyTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  timelineEmptyText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Comparison Modal
  modalBg: {
    flex: 1,
    backgroundColor: '#111',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  compareArea: {
    flex: 1,
    flexDirection: 'row',
  },
  comparePanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  },
  comparePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  compareTopGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingTop: 16,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  compareBottomGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  compareLabelTag: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.heavy,
    color: Colors.textInverse,
    letterSpacing: 1.8,
    marginBottom: 3,
  },
  compareLabelDate: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.62)',
  },
  compareScoreNum: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: Fonts.weights.heavy,
    color: Colors.textInverse,
  },
  compareScoreLabel: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 1,
  },
  compareDivider: {
    width: 30,
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: '#111',
    zIndex: 2,
  },
  compareDivLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  compareDivIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  deltaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  deltaCardUp: { backgroundColor: Colors.successLight },
  deltaCardDown: { backgroundColor: Colors.errorLight },
  deltaNum: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
  },
  deltaSub: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: Fonts.sizes.base,
    color: 'rgba(255,255,255,0.4)',
  },
});
