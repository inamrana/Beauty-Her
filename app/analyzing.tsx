import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, Spacing } from '@/constants/theme';
import { analyzeSelfie } from '@/services/beautyScanService';
import { analyzeColorSeason } from '@/services/colorAnalysisService';
import { analyzeGlowUp } from '@/services/glowAnalysisService';

const { width: W, height: H } = Dimensions.get('window');

// ── Scan type config ───────────────────────────────────────────────────────
const SCAN_CONFIG = {
  facial: {
    accent: '#2196F3',
    accentLight: '#64B5F6',
    accentPale: '#E8F4FD',
    label: 'Facial & Skin Analysis',
    gradColors: ['#1565C0', '#2196F3'] as [string, string],
    resultRoute: '/facial-result',
    steps: [
      'Detecting face structure…',
      'Measuring facial symmetry…',
      'Analyzing skin tone & undertone…',
      'Evaluating hydration levels…',
      'Assessing skin clarity & texture…',
      'Generating personalized recommendations…',
    ],
  },
  color: {
    accent: '#9B59B6',
    accentLight: '#C39BD3',
    accentPale: '#F5EEF8',
    label: 'Color Analysis',
    gradColors: ['#6C3483', '#9B59B6'] as [string, string],
    resultRoute: '/color-result',
    steps: [
      'Detecting skin undertone…',
      'Analyzing natural contrast…',
      'Mapping to seasonal palette…',
      'Identifying best color families…',
      'Curating your color wardrobe…',
      'Generating style recommendations…',
    ],
  },
  glow: {
    accent: '#F0557A',
    accentLight: '#F8A0B8',
    accentPale: '#FFF0F4',
    label: 'Glow Up & Aesthetic',
    gradColors: ['#C13060', '#F0557A'] as [string, string],
    resultRoute: '/glow-result',
    steps: [
      'Identifying your aesthetic type…',
      'Analyzing facial features…',
      'Curating glow-up steps…',
      'Matching beauty techniques…',
      'Personalizing product picks…',
      'Finalizing your transformation guide…',
    ],
  },
};

// ── Animated scan line ─────────────────────────────────────────────────────
function ScanLine({ color }: { color: string }) {
  const scanY = useRef(new Animated.Value(0)).current;
  const scanOp = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(scanY, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanOp, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(scanOp, { toValue: 0.9, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    pulse.start();
    return () => { loop.stop(); pulse.stop(); };
  }, []);

  const PHOTO_H = W * 1.1;
  return (
    <Animated.View
      style={[
        scanLineStyles.line,
        {
          backgroundColor: color,
          opacity: scanOp,
          top: scanY.interpolate({ inputRange: [0, 1], outputRange: [0, PHOTO_H - 3] }),
        },
      ]}
    />
  );
}

const scanLineStyles = StyleSheet.create({
  line: {
    position: 'absolute', left: 0, right: 0, height: 3,
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 8, elevation: 4, zIndex: 10,
  },
});

// ── Step label ─────────────────────────────────────────────────────────────
function StepLabel({ text, active, done, color }: { text: string; active: boolean; done: boolean; color: string }) {
  const op = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    } else if (done) {
      Animated.timing(op, { toValue: 0.5, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(op, { toValue: 0.2, duration: 200, useNativeDriver: true }).start();
    }
  }, [active, done]);

  return (
    <Animated.View style={[stepStyles.row, { opacity: op, transform: [{ scale }] }]}>
      <View style={[stepStyles.dot, { backgroundColor: done || active ? color : '#DDD' }]}>
        {done ? (
          <Ionicons name="checkmark" size={11} color="#fff" />
        ) : active ? (
          <View style={stepStyles.activeDot} />
        ) : null}
      </View>
      <Text style={[stepStyles.text, active && { color: '#1A1A2E', fontWeight: '600' }]}>
        {text}
      </Text>
    </Animated.View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  text: { fontSize: Fonts.sizes.sm, color: '#888899', fontWeight: '500', flex: 1 },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function AnalyzingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri?: string;
    scanType?: string;
    aesthetic?: string;
    skinType?: string;
    concerns?: string;
  }>();

  const scanType = (params.scanType ?? 'facial') as keyof typeof SCAN_CONFIG;
  const cfg = SCAN_CONFIG[scanType] ?? SCAN_CONFIG.facial;

  const [currentStep, setCurrentStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [animDone, setAnimDone] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.92)).current;
  const photoFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  const TOTAL_DURATION = 4200;
  const STEP_INTERVAL = TOTAL_DURATION / cfg.steps.length;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(photoScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(photoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();

    const rotateLoop = Animated.loop(
      Animated.timing(badgeRotate, { toValue: 1, duration: 3000, useNativeDriver: true })
    );
    rotateLoop.start();

    Animated.timing(progressAnim, {
      toValue: 1, duration: TOTAL_DURATION, useNativeDriver: false,
    }).start(() => setAnimDone(true));

    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    cfg.steps.forEach((_, i) => {
      stepTimers.push(setTimeout(() => setCurrentStep(i), i * STEP_INTERVAL));
    });

    // Run real AI analysis based on scan type
    if (params.imageUri) {
      if (scanType === 'facial') {
        analyzeSelfie(params.imageUri).then(({ data, error }) => {
          setAnalysisResult(data);
          setAnalysisError(error);
          setAnalysisComplete(true);
        });
      } else if (scanType === 'color') {
        analyzeColorSeason(params.imageUri).then(({ data, error }) => {
          setAnalysisResult(data);
          setAnalysisError(error);
          setAnalysisComplete(true);
        });
      } else if (scanType === 'glow') {
        analyzeGlowUp(params.imageUri, params.aesthetic ?? 'natural-glam').then(({ data, error }) => {
          setAnalysisResult(data);
          setAnalysisError(error);
          setAnalysisComplete(true);
        });
      }
    } else {
      setTimeout(() => {
        setAnalysisError('no_image');
        setAnalysisComplete(true);
      }, TOTAL_DURATION + 200);
    }

    return () => {
      stepTimers.forEach(clearTimeout);
      rotateLoop.stop();
    };
  }, []);

  // Navigate when BOTH animation AND analysis are done
  useEffect(() => {
    if (!analysisComplete || !animDone) return;

    const routeParams: Record<string, string> = {};
    if (params.imageUri) routeParams.imageUri = params.imageUri;
    if (params.aesthetic) routeParams.aesthetic = params.aesthetic;
    if (params.skinType) routeParams.skinType = params.skinType;
    if (params.concerns) routeParams.concerns = params.concerns;

    if (analysisResult) {
      routeParams.aiResult = JSON.stringify(analysisResult);
    }
    if (analysisError) {
      routeParams.aiError = analysisError;
    }

    router.replace({ pathname: cfg.resultRoute as any, params: routeParams });
  }, [analysisComplete, animDone]);

  const PHOTO_H = W * 1.1;
  const badgeSpin = badgeRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#F8F4FF', '#F0F8FF', '#FFF']} style={StyleSheet.absoluteFill} />

      <View style={{ height: insets.top }} />

      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <LinearGradient colors={cfg.gradColors} style={styles.headerBadge}>
          <Ionicons name="sparkles" size={12} color="#fff" />
          <Text style={styles.headerBadgeText}>AI Analyzing</Text>
        </LinearGradient>
        <Text style={styles.headerTitle}>Analyzing Your Photo</Text>
        <Text style={styles.headerSub}>{cfg.label}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.photoWrap,
          { opacity: photoFade, transform: [{ scale: photoScale }], height: PHOTO_H },
        ]}
      >
        {params.imageUri ? (
          <Image source={{ uri: params.imageUri }} style={styles.photo} contentFit="cover" transition={300} />
        ) : (
          <LinearGradient colors={[cfg.accentPale, '#FFF']} style={styles.photoPlaceholder}>
            <Ionicons name="person" size={80} color={cfg.accent + '40'} />
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(248,244,255,0.85)', 'rgba(248,244,255,0)', 'rgba(255,255,255,0.9)']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />

        <ScanLine color={cfg.accent} />

        {[
          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
          { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
          { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
        ].map((style, i) => (
          <View key={i} style={[styles.corner, style, { borderColor: cfg.accent + 'CC', width: 24, height: 24 }]} />
        ))}

        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.badgeRing, { borderColor: cfg.accent + '50', transform: [{ rotate: badgeSpin }] }]} />
          <View style={[styles.badgeInner, { backgroundColor: cfg.accent + '18' }]}>
            <Image source={require('@/assets/logo-512.png')} style={styles.badgeLogo} contentFit="contain" />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, { opacity: cardFade }]}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: cfg.accent,
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.progressDot,
              {
                backgroundColor: cfg.accent,
                left: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>

        <View style={styles.stepsWrap}>
          {cfg.steps.map((step, i) => (
            <StepLabel
              key={i}
              text={step}
              active={i === currentStep}
              done={i < currentStep}
              color={cfg.accent}
            />
          ))}
        </View>

        <View style={[styles.processingBadge, { backgroundColor: cfg.accentPale }]}>
          <Ionicons name="sparkles" size={12} color={cfg.accent} />
          <Text style={[styles.processingText, { color: cfg.accent }]}>
            Powered by BeautyHer AI · Gemini Vision
          </Text>
        </View>
      </Animated.View>

      <View style={{ height: insets.bottom + 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  header: {
    alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm, paddingBottom: Spacing.sm, gap: 4,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 2,
  },
  headerBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.3 },
  headerSub: { fontSize: Fonts.sizes.xs, color: '#888899', fontWeight: '500' },

  photoWrap: {
    marginHorizontal: Spacing.md, borderRadius: 20, overflow: 'hidden', position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
  corner: { position: 'absolute' },

  badgeWrap: {
    position: 'absolute', top: 14, right: 14,
    width: 52, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  badgeRing: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderStyle: 'dashed',
  },
  badgeInner: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  badgeLogo: { width: 28, height: 28, borderRadius: 8 },

  card: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: '#FFF', borderRadius: 20, padding: Spacing.md,
    borderWidth: 1.5, borderColor: '#EBE5F5',
    shadowColor: '#9B59B6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  progressTrack: {
    height: 6, backgroundColor: '#EBE5F5', borderRadius: 3,
    overflow: 'visible', marginBottom: Spacing.md, position: 'relative',
  },
  progressFill: { height: '100%', borderRadius: 3, position: 'absolute', left: 0, top: 0 },
  progressDot: {
    position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6, marginLeft: -6,
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  stepsWrap: { gap: 0, marginBottom: Spacing.sm },
  processingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'center',
  },
  processingText: { fontSize: 10, fontWeight: '600' },

  get accentPale() { return '#F5EEF8'; },
  get accent() { return '#9B59B6'; },
});
