import React, { useRef, useEffect, useState, useMemo } from 'react';
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
import type { AIScanResponse } from '@/services/beautyScanService';

const { width: W } = Dimensions.get('window');

const B = {
  blue: '#2196F3',
  blueLight: '#64B5F6',
  bluePale: '#E8F4FD',
  blueChip: '#DBEEFB',
  blueBorder: '#BBDEFB',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
  pink: '#F0557A',
  pinkChip: '#FCE4EC',
  pinkBorder: '#FBCDD9',
  gold: '#C8A870',
  green: '#4CAF86',
  purple: '#9B59B6',
};

const METRIC_META: Record<string, { iconName: any; color: string; goodHigh: boolean }> = {
  hydration:        { iconName: 'water',             color: '#4CBBF5', goodHigh: true },
  texture:          { iconName: 'layers-outline',     color: '#7BC67A', goodHigh: true },
  clarity:          { iconName: 'sparkles',           color: '#C8A870', goodHigh: true },
  pores:            { iconName: 'scan-outline',       color: B.purple,  goodHigh: true },
  darkCircles:      { iconName: 'moon-outline',       color: '#5C6BC0', goodHigh: false },
  redness:          { iconName: 'heart-outline',      color: '#E05C5C', goodHigh: false },
  hyperpigmentation:{ iconName: 'contrast-outline',  color: '#8D6E63', goodHigh: false },
};

const UNDERTONE_SWATCHES: Record<string, string[]> = {
  Warm:    ['#F5D5B0', '#EBC898', '#D4A870', '#C08850'],
  Cool:    ['#F2E8F8', '#D8C0F0', '#B89FD8', '#9B78C0'],
  Neutral: ['#F0DCC8', '#DCC0A8', '#C8A890', '#B09080'],
};

const FACE_SHAPE_ICONS: Record<string, any> = {
  Oval: 'radio-button-on-outline', Round: 'ellipse-outline', Square: 'square-outline',
  Heart: 'heart-outline', Diamond: 'diamond-outline', Oblong: 'resize-outline', Rectangle: 'stop-outline',
};

// ── Retake error card ─────────────────────────────────────────────────────
function RetakeErrorCard({ error, onRetake }: { error: string; onRetake: () => void }) {
  const isAuth = error.includes('Unauthorized') || error.includes('401');
  const isNoImage = error === 'no_image' || error.includes('read');
  const title = isAuth ? 'Sign In Required' : isNoImage ? 'No Photo Detected' : 'Photo Unclear';
  const message = isAuth
    ? 'Sign in to use AI facial analysis. Your personalized scan requires an account.'
    : isNoImage
    ? 'No image was detected. Please take or select a clear face photo.'
    : 'The photo was too unclear to analyze. Please ensure your face is clearly visible in good, even lighting, then try again.';
  return (
    <View style={re.root}>
      <View style={re.iconWrap}>
        <Ionicons name={isAuth ? 'lock-closed-outline' : 'camera-outline'} size={38} color={B.blue} />
      </View>
      <Text style={re.title}>{title}</Text>
      <Text style={re.message}>{message}</Text>
      <Pressable style={({ pressed }) => [re.btn, pressed && { opacity: 0.85 }]} onPress={onRetake}>
        <LinearGradient colors={[B.blueLight, B.blue]} start={[0, 0]} end={[1, 0]} style={re.btnGrad}>
          <Ionicons name={isAuth ? 'person-outline' : 'camera'} size={18} color="#fff" />
          <Text style={re.btnText}>{isAuth ? 'Sign In' : 'Retake Photo'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const re = StyleSheet.create({
  root: {
    backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: B.blueBorder, ...Shadow.md,
    marginBottom: Spacing.lg,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: B.bluePale,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: B.blueBorder,
  },
  title: { fontSize: 20, fontWeight: '800', color: B.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: Fonts.sizes.sm, color: B.textSub, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  btn: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', ...Shadow.sm },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  btnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },
});

// ── Animated section ──────────────────────────────────────────────────────
function FadeIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const slide = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ translateY: slide }], opacity: op }}>{children}</Animated.View>;
}

// ── Animated progress bar ─────────────────────────────────────────────────
function ProgressBar({ score, color, delay }: { score: number; color: string; delay: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: score / 100, duration: 900, delay, useNativeDriver: false }).start();
  }, [score]);
  return (
    <View style={prog.track}>
      <Animated.View style={[prog.fill, { backgroundColor: color, width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}
const prog = StyleSheet.create({
  track: { height: 7, backgroundColor: '#EBE5F5', borderRadius: 4, flex: 1, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// ── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ label, value, iconName, detail, confidence, color, delay, extra }: {
  label: string; value: string; iconName: any; detail: string;
  confidence: number; color: string; delay: number; extra?: React.ReactNode;
}) {
  const slide = useRef(new Animated.Value(18)).current;
  const op = useRef(new Animated.Value(0)).current;
  const conf = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 460, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(conf, { toValue: confidence / 100, duration: 900, delay: delay + 200, useNativeDriver: false }),
    ]).start();
  }, [confidence]);
  return (
    <Animated.View style={[fc.wrap, { transform: [{ translateY: slide }], opacity: op }]}>
      <View style={[fc.iconCol, { backgroundColor: color + '18' }]}>
        <Ionicons name={iconName} size={26} color={color} />
      </View>
      <View style={fc.body}>
        <Text style={fc.label}>{label.toUpperCase()}</Text>
        <Text style={[fc.value, { color }]}>{value}</Text>
        <Text style={fc.detail}>{detail}</Text>
        <View style={fc.confRow}>
          <View style={{ flex: 1, height: 6, backgroundColor: '#EBE5F5', borderRadius: 3, overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', borderRadius: 3, backgroundColor: color, width: conf.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>
          <Text style={[fc.confPct, { color }]}>{confidence}%</Text>
        </View>
        {extra ? <View style={{ marginTop: 10 }}>{extra}</View> : null}
      </View>
    </Animated.View>
  );
}
const fc = StyleSheet.create({
  wrap: {
    flexDirection: 'row', gap: 14, backgroundColor: '#FFF', borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 2, borderColor: '#EBE5F5', ...Shadow.sm,
  },
  iconCol: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1 },
  label: { fontSize: 9, fontWeight: Fonts.weights.bold, color: B.textLight, letterSpacing: 1.4, marginBottom: 2 },
  value: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, marginBottom: 3 },
  detail: { fontSize: Fonts.sizes.xs, color: B.textSub, lineHeight: 17, marginBottom: 8 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confPct: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold, minWidth: 32, textAlign: 'right' },
});

function SwatchRow({ colors }: { colors: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {colors.map((c, i) => (
        <View key={i} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)' }} />
      ))}
    </View>
  );
}

function RecommendationSection({ title, iconName, color, items, delay }: {
  title: string; iconName: any; color: string; items: string[]; delay: number;
}) {
  return (
    <FadeIn delay={delay}>
      <View style={rec.wrap}>
        <View style={rec.header}>
          <View style={[rec.iconWrap, { backgroundColor: color + '18' }]}>
            <Ionicons name={iconName} size={18} color={color} />
          </View>
          <Text style={rec.title}>{title}</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={rec.row}>
            <View style={[rec.bullet, { backgroundColor: color }]} />
            <Text style={rec.text}>{item}</Text>
          </View>
        ))}
      </View>
    </FadeIn>
  );
}
const rec = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: '#EBE5F5', ...Shadow.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: B.text },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: { width: 7, height: 7, borderRadius: 3.5, marginTop: 6, flexShrink: 0 },
  text: { flex: 1, fontSize: Fonts.sizes.sm, color: B.textSub, lineHeight: 20 },
});

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[chip.wrap, { borderColor: color + '30' }]}>
      <Text style={[chip.value, { color }]}>{value}</Text>
      <Text style={chip.label}>{label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5, borderRadius: 12, backgroundColor: '#FFF', minWidth: 70 },
  value: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, marginBottom: 2 },
  label: { fontSize: 9, color: B.textLight, letterSpacing: 0.3 },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function FacialResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; skinType?: string; concerns?: string; aiResult?: string; aiError?: string }>();

  const aiData = useMemo<AIScanResponse | null>(() => {
    if (!params.aiResult) return null;
    try { return JSON.parse(params.aiResult) as AIScanResponse; } catch { return null; }
  }, [params.aiResult]);

  const hasError = !aiData || !!params.aiError;
  const [userInvites] = useState(0);
  const totalNeeded = 3;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: userInvites / totalNeeded, duration: 900, delay: 400, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({ message: 'Just got my full facial analysis on BeautyHer — face shape, skin tone, undertone & more! Try it free: https://beautyher.app' });
    } catch { /* ignore */ }
  };

  const fa = aiData?.faceAnalysis;
  const sa = aiData?.skinAnalysis;
  const recs = aiData?.recommendations;
  const faceShape = fa?.faceShape ?? 'Oval';
  const skinTone = fa?.skinTone ?? 'Medium';
  const undertone = fa?.undertone ?? 'Neutral';
  const eyeShape = fa?.eyeShape ?? 'Almond';
  const lipShape = fa?.lipShape ?? 'Full & Defined';
  const jawline = fa?.jawline ?? 'Softly Defined';
  const symmetry = fa?.facialSymmetry ?? 82;
  const overallScore = aiData?.overallScore ?? 78;
  const confidenceScore = aiData?.confidenceScore ?? 40;
  const undertoneSwatches = UNDERTONE_SWATCHES[undertone] ?? UNDERTONE_SWATCHES['Neutral'];

  const skinMetrics = sa ? Object.entries(sa).map(([key, val]) => {
    const meta = METRIC_META[key] ?? { iconName: 'stats-chart-outline', color: B.blue, goodHigh: true };
    const v = val as { score: number; label: string };
    const score = v?.score ?? 70;
    const displayScore = meta.goodHigh ? score : 100 - score;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
    return { key, label, score: displayScore, colorLabel: v?.label ?? '', ...meta };
  }) : [];

  const skinTypeLabel = params.skinType ? params.skinType.charAt(0).toUpperCase() + params.skinType.slice(1) : 'Normal';

  return (
    <View style={styles.root}>
      <LinearGradient colors={[B.bluePale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={20} color={B.blue} />
            </Pressable>
            <Text style={styles.headerTitle}>Facial Analysis</Text>
            <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={B.blue} />
            </Pressable>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.stepText}>Step 3 of 3 · Complete</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Error / Retake */}
        {hasError ? (
          <RetakeErrorCard error={params.aiError ?? 'unknown'} onRetake={() => router.back()} />
        ) : null}

        {/* Score hero — only when analysis succeeded */}
        {!hasError ? (
          <Animated.View style={[styles.heroCard, { opacity: heroFade }]}>
            <LinearGradient colors={['#1565C0', '#2196F3']} style={styles.heroGrad}>
              <View style={styles.heroRow}>
                {params.imageUri ? (
                  <View style={styles.heroPhotoWrap}>
                    <Image source={{ uri: params.imageUri }} style={styles.heroPhoto} contentFit="cover" transition={300} />
                    <View style={styles.heroPhotoStamp}>
                      <Ionicons name="scan" size={9} color="#fff" />
                      <Text style={styles.heroPhotoStampText}>AI</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.scoreBlock}>
                  <View style={styles.scoreRing}>
                    <View style={styles.scoreRingInner}>
                      <Text style={styles.scoreNum}>{overallScore}</Text>
                      <Text style={styles.scoreLabel}>Score</Text>
                    </View>
                  </View>
                  <Text style={styles.scoreRating}>
                    {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Great' : overallScore >= 60 ? 'Good' : 'Fair'}
                  </Text>
                </View>
                <View style={styles.heroQuick}>
                  {[
                    { label: 'Shape', val: faceShape },
                    { label: 'Tone', val: skinTone.split(' ')[0] },
                    { label: 'Skin', val: skinTypeLabel },
                  ].map(s => (
                    <View key={s.label} style={styles.heroQuickItem}>
                      <Text style={styles.heroQuickVal}>{s.val}</Text>
                      <Text style={styles.heroQuickLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}>
                  <Ionicons name="sparkles" size={11} color={B.blueLight} />
                  <Text style={styles.heroBadgeText}>Analyzed by BeautyHer AI · Gemini Vision</Text>
                </View>
                <View style={styles.confBadge}>
                  <Text style={styles.confBadgeText}>{confidenceScore}% confidence</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {/* Feature cards */}
        {!hasError ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FACE FEATURES</Text>
            <Text style={styles.sectionTitle}>Your Analysis</Text>
            <FeatureCard
              label="Face Shape" value={faceShape}
              iconName={FACE_SHAPE_ICONS[faceShape] ?? 'radio-button-on-outline'}
              detail={`${faceShape} face shapes have naturally ${faceShape === 'Oval' ? 'balanced proportions with a gently curved jaw' : faceShape === 'Round' ? 'soft, curved features and fuller cheeks' : faceShape === 'Square' ? 'strong jaw and forehead with angular definition' : faceShape === 'Heart' ? 'a wider forehead tapering to a delicate chin' : 'distinctive features that suit versatile styles'}`}
              confidence={Math.min(98, confidenceScore + 8)} color={B.blue} delay={100}
            />
            <FeatureCard
              label="Skin Tone" value={skinTone} iconName="sunny-outline"
              detail={`Your ${skinTone.toLowerCase()} skin tone with ${undertone.toLowerCase()} undertones — ${undertone === 'Warm' ? 'golden and peachy shades light you up' : undertone === 'Cool' ? 'rosy and jewel tones complement you perfectly' : 'you have the versatility to wear most shades'}`}
              confidence={Math.min(98, confidenceScore + 5)} color={B.gold} delay={200}
              extra={<SwatchRow colors={undertoneSwatches} />}
            />
            <FeatureCard
              label="Undertone" value={undertone} iconName="thermometer-outline"
              detail={`${undertone} undertones — ${undertone === 'Warm' ? 'gold, bronze, and earthy shades suit you best' : undertone === 'Cool' ? 'silver, blue-based, and jewel tones are your match' : 'you can wear both warm and cool shades'}`}
              confidence={Math.min(98, confidenceScore + 3)}
              color={undertone === 'Warm' ? '#E8916A' : undertone === 'Cool' ? '#5C6BC0' : B.purple}
              delay={300} extra={<SwatchRow colors={undertoneSwatches} />}
            />
            {fa ? (
              <>
                <FeatureCard
                  label="Eye Shape" value={eyeShape} iconName="eye-outline"
                  detail={`${eyeShape} eyes — ${eyeShape === 'Almond' ? 'slightly tapered ends with a classic, versatile shape' : eyeShape === 'Round' ? 'open, wide-set eyes with a youthful appearance' : eyeShape === 'Hooded' ? 'extra skin along the brow bone — liner and cut-crease work perfectly' : 'your eye shape creates beautiful definition'}`}
                  confidence={Math.min(95, confidenceScore + 2)} color="#6C5CE7" delay={400}
                />
                <FeatureCard
                  label="Face Symmetry" value={`${symmetry}%`} iconName="git-compare-outline"
                  detail={`${symmetry >= 88 ? 'Exceptional' : symmetry >= 75 ? 'Strong' : symmetry >= 60 ? 'Good' : 'Moderate'} facial symmetry — ${symmetry >= 80 ? 'your features are naturally well-balanced' : 'strategic makeup can enhance your unique features'}`}
                  confidence={confidenceScore} color={B.green} delay={500}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {/* Skin Health Metrics */}
        {!hasError && skinMetrics.length > 0 ? (
          <FadeIn delay={600}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SKIN HEALTH</Text>
              <Text style={styles.sectionTitle}>Health Metrics</Text>
              <View style={styles.metricsCard}>
                {skinMetrics.map((metric, i) => (
                  <View key={metric.key} style={[styles.metricRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#EBE5F5', paddingTop: 10 }]}>
                    <View style={styles.metricLeft}>
                      <View style={[styles.metricIconWrap, { backgroundColor: metric.color + '18' }]}>
                        <Ionicons name={metric.iconName} size={15} color={metric.color} />
                      </View>
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                    </View>
                    <View style={styles.metricBar}>
                      <ProgressBar score={metric.score} color={metric.color} delay={600 + i * 80} />
                    </View>
                    <View style={styles.metricRight}>
                      <Text style={[styles.metricScore, { color: metric.color }]}>{metric.score}</Text>
                      <View style={[styles.metricLabel2, { backgroundColor: metric.color + '18', borderColor: metric.color + '30' }]}>
                        <Text style={[styles.metricLabel2Text, { color: metric.color }]} numberOfLines={1}>{metric.colorLabel}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* Additional face details */}
        {!hasError && fa ? (
          <FadeIn delay={700}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>FEATURES DETAIL</Text>
              <Text style={styles.sectionTitle}>More About You</Text>
              <View style={styles.detailGrid}>
                <StatChip label="Lip Shape" value={lipShape.split(' ')[0]} color={B.pink} />
                <StatChip label="Jawline" value={jawline.split(' ')[0]} color={B.blue} />
                <StatChip label="Eyebrows" value={(fa?.eyebrows ?? 'Defined').split(' ')[0]} color={B.purple} />
                <StatChip label="Symmetry" value={`${symmetry}%`} color={B.green} />
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* Recommendations */}
        {!hasError && recs ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSONALIZED</Text>
            <Text style={styles.sectionTitle}>Your Recommendations</Text>
            <RecommendationSection title="Skincare Routine" iconName="leaf-outline" color={B.green} items={recs.skincare} delay={750} />
            <RecommendationSection title="Makeup Suggestions" iconName="brush-outline" color={B.pink} items={recs.makeup} delay={820} />
            <RecommendationSection title="Lifestyle Tips" iconName="sunny-outline" color={B.gold} items={recs.lifestyle} delay={890} />
          </View>
        ) : null}

        {/* Referral unlock card */}
        {!hasError ? (
          <FadeIn delay={940}>
            <View style={styles.section}>
              <LinearGradient colors={['#FDF9F0', '#FBF0E0']} style={styles.referralCard}>
                <View style={styles.referralTop}>
                  <View style={styles.referralIcon}>
                    <Ionicons name="lock-open-outline" size={26} color={B.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.referralTitle}>Unlock Full Breakdown</Text>
                    <Text style={styles.referralSub}>Invite 3 friends to reveal all hidden insights</Text>
                  </View>
                </View>
                <View style={styles.refProgressWrap}>
                  <View style={styles.refProgressRow}>
                    <Text style={styles.refProgressLabel}>
                      <Text style={styles.refProgressCount}>{userInvites}</Text>/{totalNeeded} invites
                    </Text>
                    <Text style={styles.refProgressPct}>{Math.round((userInvites / totalNeeded) * 100)}%</Text>
                  </View>
                  <View style={styles.refBar}>
                    <Animated.View style={[styles.refBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                    {[1, 2, 3].map(n => (
                      <View key={n} style={[styles.refMilestone, { left: `${(n / totalNeeded) * 100}%` as any, backgroundColor: userInvites >= n ? B.gold : '#E8E0D0' }]} />
                    ))}
                  </View>
                </View>
                <View style={styles.lockedList}>
                  {[
                    { label: 'Detailed Makeup Matches', iconName: 'brush-outline' as const, needs: 1 },
                    { label: 'Face Shape Styling Guide', iconName: 'cut-outline' as const, needs: 2 },
                    { label: 'Full Skincare Routine Deep Dive', iconName: 'leaf-outline' as const, needs: 3 },
                  ].map(item => (
                    <View key={item.label} style={styles.lockedRow}>
                      <View style={styles.lockedIconWrap}>
                        <Ionicons name={item.iconName} size={18} color="#888899" />
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={8} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.lockedLabel}>{item.label}</Text>
                      <View style={styles.lockedNeeds}>
                        <Ionicons name="people-outline" size={11} color={B.pink} />
                        <Text style={styles.lockedNeedsText}>{item.needs}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.88 }]} onPress={handleShare}>
                  <LinearGradient colors={['#F8A0B8', B.pink]} start={[0, 0]} end={[1, 0]} style={styles.inviteBtnGrad}>
                    <Ionicons name="people" size={17} color="#fff" />
                    <Text style={styles.inviteBtnText}>Invite a Friend</Text>
                    <View style={styles.invitePlusBadge}><Text style={styles.invitePlusText}>+1</Text></View>
                  </LinearGradient>
                </Pressable>
                <Text style={styles.refOr}>or</Text>
                <Pressable style={({ pressed }) => [styles.upgradeAlt, pressed && { opacity: 0.8 }]} onPress={() => router.push('/subscription')}>
                  <Ionicons name="diamond-outline" size={13} color={B.gold} />
                  <Text style={styles.upgradeAltText}>Unlock instantly with Premium</Text>
                  <Ionicons name="chevron-forward" size={12} color={B.gold} />
                </Pressable>
              </LinearGradient>
            </View>
          </FadeIn>
        ) : null}

        {/* Action buttons */}
        {!hasError ? (
          <FadeIn delay={1020}>
            <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
              <Pressable style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push('/(tabs)/progress')}>
                <LinearGradient colors={[B.blueLight, B.blue]} start={[0, 0]} end={[1, 0]} style={styles.ctaBtnGrad}>
                  <Ionicons name="bar-chart" size={16} color="#fff" />
                  <Text style={styles.ctaBtnText}>View Progress Tracking</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]} onPress={() => router.back()}>
                <Ionicons name="camera-outline" size={15} color={B.blue} />
                <Text style={styles.retryBtnText}>Retake Scan</Text>
              </Pressable>
            </View>
          </FadeIn>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  headerGrad: { paddingBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: B.blueChip, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: B.text },
  shareBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: B.blueChip, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { paddingHorizontal: Spacing.md },
  progressTrack: { height: 5, backgroundColor: B.blueChip, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: B.blue, borderRadius: 3 },
  stepText: { fontSize: 10, color: B.blue, fontWeight: Fonts.weights.semibold, textAlign: 'right' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 48 },

  heroCard: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.md },
  heroGrad: { padding: Spacing.md, paddingBottom: Spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  heroPhotoWrap: { width: 72, height: 88, borderRadius: Radius.md, overflow: 'hidden', position: 'relative', flexShrink: 0, ...Shadow.sm },
  heroPhoto: { width: '100%', height: '100%' },
  heroPhotoStamp: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: B.blue, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 2 },
  heroPhotoStampText: { fontSize: 7, fontWeight: '700', color: '#fff' },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  scoreRingInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 20, fontWeight: '800', color: B.blue, lineHeight: 24 },
  scoreLabel: { fontSize: 8, color: B.textLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  scoreRating: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  heroQuick: { gap: 8, alignItems: 'center' },
  heroQuickItem: { alignItems: 'center' },
  heroQuickVal: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#fff', textAlign: 'center' },
  heroQuickLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: Spacing.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  confBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  confBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  section: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: 9, fontWeight: Fonts.weights.bold, color: B.blue, letterSpacing: 2, marginBottom: 4 },
  sectionTitle: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: B.text, marginBottom: Spacing.sm },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  metricsCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 2, borderColor: '#EBE5F5', ...Shadow.sm },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
  metricIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metricLabel: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, color: B.text, flex: 1 },
  metricBar: { flex: 1 },
  metricRight: { alignItems: 'flex-end', gap: 3, minWidth: 60 },
  metricScore: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, textAlign: 'right' },
  metricLabel2: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  metricLabel2Text: { fontSize: 8, fontWeight: '700' },

  referralCard: { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 2, borderColor: '#F0E0C8', ...Shadow.sm },
  referralTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  referralIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: 'rgba(200,168,112,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 2, borderColor: 'rgba(200,168,112,0.3)' },
  referralTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: B.text, marginBottom: 2 },
  referralSub: { fontSize: Fonts.sizes.xs, color: B.textSub },
  refProgressWrap: { marginBottom: Spacing.md },
  refProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refProgressLabel: { fontSize: Fonts.sizes.xs, color: B.textSub },
  refProgressCount: { fontWeight: '800', color: B.gold, fontSize: Fonts.sizes.sm },
  refProgressPct: { fontSize: Fonts.sizes.xs, color: B.textLight },
  refBar: { height: 8, backgroundColor: '#EDE0CC', borderRadius: 4, overflow: 'visible', position: 'relative' },
  refBarFill: { height: '100%', backgroundColor: B.gold, borderRadius: 4 },
  refMilestone: { position: 'absolute', top: -4, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: '#FFF', marginLeft: -8 },
  lockedList: { marginBottom: Spacing.md, gap: 7 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: 'rgba(200,168,112,0.3)' },
  lockedIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(200,200,220,0.12)', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1.5, borderColor: '#E8E0F0' },
  lockBadge: { position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: B.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  lockedLabel: { flex: 1, fontSize: Fonts.sizes.sm, color: B.textSub, fontWeight: '500' },
  lockedNeeds: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: B.pinkChip, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5, borderColor: B.pinkBorder },
  lockedNeedsText: { fontSize: 10, fontWeight: Fonts.weights.bold, color: B.pink },
  inviteBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadow.sm },
  inviteBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  inviteBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
  invitePlusBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  invitePlusText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold, color: '#fff' },
  refOr: { textAlign: 'center', color: B.textLight, fontSize: Fonts.sizes.xs, marginBottom: Spacing.sm },
  upgradeAlt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.full, backgroundColor: 'rgba(200,168,112,0.1)', borderWidth: 2, borderColor: '#F0E0C8' },
  upgradeAltText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: B.gold },
  ctaBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadow.md },
  ctaBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  ctaBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: Radius.full, borderWidth: 2, borderColor: B.blueBorder, backgroundColor: B.bluePale },
  retryBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: B.blue },
});
