import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

// ── Per-scan-type theming ──────────────────────────────────────────────────
const SCAN_CONFIG = {
  color: {
    accent: '#9B59B6',
    accentLight: '#C39BD3',
    accentPale: '#F5EEF8',
    accentChip: '#EAD9F7',
    accentBorder: '#D7BDE2',
    label: 'Color Analysis',
    icon: 'color-palette' as const,
    tip: 'Natural lighting reveals your true skin tone and undertone for accurate seasonal color matching.',
    gradColors: ['#C39BD3', '#9B59B6'] as [string, string],
    resultRoute: '/color-result',
  },
  glow: {
    accent: '#F0557A',
    accentLight: '#F8A0B8',
    accentPale: '#FFF0F4',
    accentChip: '#FCE4EC',
    accentBorder: '#FBCDD9',
    label: 'Glow Up & Aesthetic',
    icon: 'sparkles' as const,
    tip: 'A clear, well-lit photo helps AI pick the best glow-up steps for your unique features.',
    gradColors: ['#F8A0B8', '#F0557A'] as [string, string],
    resultRoute: '/glow-result',
  },
  facial: {
    accent: '#2196F3',
    accentLight: '#64B5F6',
    accentPale: '#E8F4FD',
    accentChip: '#DBEEFB',
    accentBorder: '#BBDEFB',
    label: 'Facial & Skin Analysis',
    icon: 'scan' as const,
    tip: 'Accurate face geometry and skin readings need even, shadow-free lighting with a direct angle.',
    gradColors: ['#64B5F6', '#2196F3'] as [string, string],
    resultRoute: '/facial-result',
  },
} as const;

// ── Guideline row ─────────────────────────────────────────────────────────
function GuideRow({
  icon,
  title,
  desc,
  isGood,
  accent,
  accentPale,
}: {
  icon: string;
  title: string;
  desc: string;
  isGood: boolean;
  accent: string;
  accentPale: string;
}) {
  const good = '#4CAF86';
  const bad = '#E05C5C';
  const color = isGood ? good : bad;

  return (
    <View style={row.wrap}>
      <View style={[row.iconWrap, { backgroundColor: isGood ? 'rgba(76,175,134,0.1)' : 'rgba(224,92,92,0.09)' }]}>
        <Ionicons name={icon as any} size={19} color={color} />
      </View>
      <View style={row.body}>
        <Text style={[row.title, { color: isGood ? '#1A1A2E' : bad }]}>{title}</Text>
        <Text style={row.desc}>{desc}</Text>
      </View>
      <View style={[row.badge, { backgroundColor: isGood ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
        <Ionicons name={isGood ? 'checkmark' : 'close'} size={14} color={color} />
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#F2EDF8',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  title: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: '#1A1A2E',
    marginBottom: 2,
  },
  desc: {
    fontSize: Fonts.sizes.xs,
    color: '#888899',
    lineHeight: 16,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

// ── Example photo tiles ───────────────────────────────────────────────────
function ExampleTile({ label, isGood, icon, accent }: { label: string; isGood: boolean; icon: string; accent: string }) {
  const color = isGood ? '#4CAF86' : '#E05C5C';
  return (
    <View style={tile.wrap}>
      <View style={[tile.img, { backgroundColor: isGood ? 'rgba(76,175,134,0.08)' : 'rgba(224,92,92,0.07)' }]}>
        {/* Face silhouette */}
        <View style={[tile.faceOval, {
          borderColor: isGood ? 'rgba(76,175,134,0.5)' : 'rgba(224,92,92,0.4)',
          backgroundColor: isGood ? 'rgba(76,175,134,0.06)' : 'rgba(224,92,92,0.05)',
        }]}>
          <Ionicons name="person" size={38} color={isGood ? 'rgba(76,175,134,0.55)' : 'rgba(224,92,92,0.4)'} />
          {/* Overlay icon */}
          {!isGood ? (
            <View style={tile.badgeOverlay}>
              <Ionicons name={icon as any} size={16} color="#E05C5C" />
            </View>
          ) : null}
        </View>
        {/* Good lighting lines */}
        {isGood ? (
          <>
            <View style={[tile.lightRay, { top: 8, left: '30%', transform: [{ rotate: '-20deg' }] }]} />
            <View style={[tile.lightRay, { top: 8, right: '30%', transform: [{ rotate: '20deg' }] }]} />
          </>
        ) : null}
      </View>
      <View style={[tile.footer, { backgroundColor: isGood ? 'rgba(76,175,134,0.1)' : 'rgba(224,92,92,0.09)' }]}>
        <Ionicons name={isGood ? 'checkmark-circle' : 'close-circle'} size={13} color={color} />
        <Text style={[tile.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const tile = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F0EBF8',
    ...Shadow.sm,
  },
  img: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  faceOval: {
    width: 68,
    height: 84,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    position: 'relative',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E05C5C',
  },
  lightRay: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(76,175,134,0.3)',
    borderRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  label: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function CameraGuidelinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    scanType?: string;
    aesthetic?: string;
    skinType?: string;
    concerns?: string;
  }>();

  const scanType = (params.scanType ?? 'facial') as keyof typeof SCAN_CONFIG;
  const cfg = SCAN_CONFIG[scanType] ?? SCAN_CONFIG.facial;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const cardAnims = useRef([0, 1, 2, 3].map(() => ({
    fade: new Animated.Value(0),
    slide: new Animated.Value(16),
  }))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ...cardAnims.flatMap((a, i) => [
        Animated.timing(a.fade, { toValue: 1, duration: 420, delay: 100 + i * 80, useNativeDriver: true }),
        Animated.timing(a.slide, { toValue: 0, duration: 380, delay: 100 + i * 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const doCapture = async (fromCamera: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    let uri: string | null = null;

    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Access Required', 'Please enable camera in Settings to continue.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.88,
      });
      if (!res.canceled && res.assets[0]) uri = res.assets[0].uri;
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Gallery Access Required', 'Please enable photo library in Settings to continue.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.88,
      });
      if (!res.canceled && res.assets[0]) uri = res.assets[0].uri;
    }

    if (!uri) return;

    const routeParams: Record<string, string> = { imageUri: uri };
    if (params.aesthetic) routeParams.aesthetic = params.aesthetic;
    if (params.skinType) routeParams.skinType = params.skinType;
    if (params.concerns) routeParams.concerns = params.concerns;

    router.push({ pathname: '/analyzing' as any, params: { ...routeParams, scanType } });
  };

  const GOOD_RULES = [
    {
      icon: 'sunny-outline',
      title: 'Natural or even lighting',
      desc: 'Stand near a window or in a well-lit room with light facing you directly.',
    },
    {
      icon: 'camera-outline',
      title: 'Face the camera directly',
      desc: 'Look straight at the lens — no side angles or tilted head positions.',
    },
    {
      icon: 'happy-outline',
      title: 'Relaxed neutral expression',
      desc: 'A soft, resting expression gives the most accurate facial geometry reading.',
    },
    {
      icon: 'resize-outline',
      title: 'Fill 60–80% of the frame',
      desc: 'Position your face so it takes up most of the photo for detailed analysis.',
    },
  ];

  const BAD_RULES = [
    {
      icon: 'glasses-outline',
      title: 'No glasses or sunglasses',
      desc: 'Frames and lenses block key facial features and distort color readings.',
    },
    {
      icon: 'flash-outline',
      title: 'Avoid harsh flash or backlight',
      desc: 'Flash washes out skin tone; backlight silhouettes your face.',
    },
    {
      icon: 'person-outline',
      title: 'No heavy filters or edits',
      desc: 'Filters alter skin tone, texture, and undertone — undermining accuracy.',
    },
    {
      icon: 'contrast-outline',
      title: 'Avoid deep shadows on face',
      desc: 'Shadows cause uneven skin tone readings and inaccurate shape detection.',
    },
  ];

  return (
    <View style={styles.root}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <LinearGradient colors={[cfg.accentPale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { backgroundColor: cfg.accentChip }, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={cfg.accent} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Photo Guidelines</Text>
              <View style={[styles.stepBadge, { backgroundColor: cfg.accentChip }]}>
                <Ionicons name={cfg.icon} size={10} color={cfg.accent} />
                <Text style={[styles.stepBadgeText, { color: cfg.accent }]}>{cfg.label}</Text>
              </View>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
      >
        {/* ── Hero banner ───────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient
            colors={cfg.gradColors}
            start={[0, 0]} end={[1, 1]}
            style={styles.heroBanner}
          >
            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Ionicons name="camera" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Get the Best Results</Text>
              <Text style={styles.heroDesc}>{cfg.tip}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Photo examples ────────────────────────────────────── */}
        <Animated.View style={[styles.examplesRow, { opacity: cardAnims[0].fade, transform: [{ translateY: cardAnims[0].slide }] }]}>
          <ExampleTile label="Good Photo" isGood icon="sunny" accent={cfg.accent} />
          <ExampleTile label="Too Dark" isGood={false} icon="moon-outline" accent={cfg.accent} />
          <ExampleTile label="Side Angle" isGood={false} icon="body-outline" accent={cfg.accent} />
        </Animated.View>

        {/* ── DO's section ──────────────────────────────────────── */}
        <Animated.View style={{ opacity: cardAnims[1].fade, transform: [{ translateY: cardAnims[1].slide }] }}>
          <View style={styles.ruleBlock}>
            <View style={styles.ruleBlockHeader}>
              <View style={styles.dosBadge}>
                <Ionicons name="checkmark-circle" size={15} color="#4CAF86" />
                <Text style={styles.dosBadgeText}>DO's — For Best Accuracy</Text>
              </View>
            </View>
            {GOOD_RULES.map((r) => (
              <GuideRow
                key={r.title}
                icon={r.icon}
                title={r.title}
                desc={r.desc}
                isGood
                accent={cfg.accent}
                accentPale={cfg.accentPale}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── DONT's section ────────────────────────────────────── */}
        <Animated.View style={{ opacity: cardAnims[2].fade, transform: [{ translateY: cardAnims[2].slide }] }}>
          <View style={styles.ruleBlock}>
            <View style={styles.ruleBlockHeader}>
              <View style={styles.dontsBadge}>
                <Ionicons name="close-circle" size={15} color="#E05C5C" />
                <Text style={styles.dontsBadgeText}>DON'Ts — Avoid These</Text>
              </View>
            </View>
            {BAD_RULES.map((r) => (
              <GuideRow
                key={r.title}
                icon={r.icon}
                title={r.title}
                desc={r.desc}
                isGood={false}
                accent={cfg.accent}
                accentPale={cfg.accentPale}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Quick checklist ───────────────────────────────────── */}
        <Animated.View style={{ opacity: cardAnims[3].fade, transform: [{ translateY: cardAnims[3].slide }] }}>
          <View style={[styles.checklistCard, { backgroundColor: cfg.accentPale, borderColor: cfg.accentBorder }]}>
            <Text style={[styles.checklistTitle, { color: cfg.accent }]}>Quick Checklist Before You Shoot</Text>
            {[
              'Facing a light source (window or lamp)',
              'Looking directly at camera lens',
              'Glasses removed',
              'Hair pulled back or away from face',
              'No heavy filters active',
            ].map((item, i) => (
              <View key={i} style={styles.checklistRow}>
                <View style={[styles.checklistDot, { backgroundColor: cfg.accent + '30', borderColor: cfg.accent + '50' }]}>
                  <Ionicons name="checkmark" size={10} color={cfg.accent} />
                </View>
                <Text style={styles.checklistText}>{item}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={13} color="#AAAACC" />
          <Text style={styles.privacyText}>Photos are analyzed securely and never stored on our servers</Text>
        </View>
      </ScrollView>

      {/* ── Bottom CTAs ──────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14, borderTopColor: cfg.accentBorder }]}>
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [
              styles.galleryBtn,
              { backgroundColor: cfg.accentPale, borderColor: cfg.accentBorder },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => doCapture(false)}
          >
            <Ionicons name="images-outline" size={19} color={cfg.accent} />
            <Text style={[styles.galleryBtnText, { color: cfg.accent }]}>Gallery</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cameraBtn, pressed && { opacity: 0.9 }]}
            onPress={() => doCapture(true)}
          >
            <LinearGradient
              colors={cfg.gradColors}
              start={[0, 0]} end={[1, 0]}
              style={styles.cameraBtnGrad}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.cameraBtnText}>Continue to Camera</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },

  // Header
  headerGrad: { paddingBottom: 6 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 5 },
  headerTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#1A1A2E' },
  stepBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  stepBadgeText: { fontSize: 10, fontWeight: Fonts.weights.bold },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero banner
  heroBanner: {
    borderRadius: Radius.xl, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: Spacing.lg, ...Shadow.md,
  },
  heroIconWrap: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroTitle: {
    fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold,
    color: '#fff', marginBottom: 4,
  },
  heroDesc: {
    fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
  },

  // Examples row
  examplesRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg,
  },

  // Rule blocks
  ruleBlock: { marginBottom: Spacing.lg },
  ruleBlockHeader: { marginBottom: 10 },
  dosBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(76,175,134,0.1)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(76,175,134,0.25)',
  },
  dosBadgeText: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#3D9970',
  },
  dontsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(224,92,92,0.09)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(224,92,92,0.25)',
  },
  dontsBadgeText: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#C44040',
  },

  // Checklist
  checklistCard: {
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, marginBottom: Spacing.md, ...Shadow.sm,
  },
  checklistTitle: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, marginBottom: 12,
  },
  checklistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5,
  },
  checklistDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  checklistText: {
    fontSize: Fonts.sizes.sm, color: '#444455', fontWeight: '500', flex: 1,
  },

  // Privacy
  privacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingBottom: 10,
  },
  privacyText: {
    fontSize: Fonts.sizes.xs, color: '#AAAACC', flex: 1, textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingTop: 14,
    borderTopWidth: 1,
  },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  galleryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 15, borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  galleryBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  cameraBtn: { flex: 2.2, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  cameraBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  cameraBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
});
