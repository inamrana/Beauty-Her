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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { usePaywallGuard } from '@/components';

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
};

// ── Corner guides component ────────────────────────────────────────────────
function FaceGuideOverlay() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const CORNER_SIZE = 22;
  const corners = [
    { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
    { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
    { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
    { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  ];

  return (
    <Animated.View style={[faceStyles.oval, { transform: [{ scale: pulseAnim }] }]}>
      {corners.map((style, i) => (
        <View key={i} style={[faceStyles.corner, style, { width: CORNER_SIZE, height: CORNER_SIZE, borderColor: B.blue }]} />
      ))}
      {/* Center crosshair */}
      <View style={faceStyles.crossH} />
      <View style={faceStyles.crossV} />
      {/* Scanning line */}
      <View style={faceStyles.scanHint}>
        <Ionicons name="scan-outline" size={28} color="rgba(33,150,243,0.6)" />
      </View>
    </Animated.View>
  );
}

const faceStyles = StyleSheet.create({
  oval: {
    width: W * 0.58,
    height: W * 0.58 * 1.28,
    borderRadius: W * 0.29,
    borderWidth: 1.5,
    borderColor: 'rgba(33,150,243,0.35)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: { position: 'absolute' },
  crossH: {
    position: 'absolute',
    width: 30, height: 1.5,
    backgroundColor: 'rgba(33,150,243,0.4)',
    top: '50%',
  },
  crossV: {
    position: 'absolute',
    height: 30, width: 1.5,
    backgroundColor: 'rgba(33,150,243,0.4)',
    left: '50%',
  },
  scanHint: {
    position: 'absolute',
    bottom: 28,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function FacialScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ skinType?: string; concerns?: string }>();
  const insets = useSafeAreaInsets();
  const { gate, PaywallModal } = usePaywallGuard();
  const heroFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, []);

  const openGuidelines = () => {
    gate(() => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      router.push({
        pathname: '/camera-guidelines',
        params: {
          scanType: 'facial',
          skinType: params.skinType ?? 'normal',
          concerns: params.concerns ?? '',
        },
      });
    });
  };

  const skinTypeLabel = params.skinType
    ? params.skinType.charAt(0).toUpperCase() + params.skinType.slice(1)
    : null;
  const concernsList = params.concerns ? params.concerns.split(',').filter(Boolean) : [];

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={[B.bluePale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={B.blue} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Facial Scan</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
              </View>
            </View>
            <View style={{ width: 38 }} />
          </View>

          {/* Progress bar — 2/3 filled */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '66%' }]} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 130 }]}
      >
        {/* ── Selected skin type badge ─────────────────────────────── */}
        {skinTypeLabel ? (
          <Animated.View style={[styles.skinBadgeRow, { opacity: heroFade }]}>
            <View style={styles.skinBadge}>
              <Ionicons name="checkmark-circle" size={15} color={B.blue} />
              <Text style={styles.skinBadgeText}>Skin type: <Text style={{ fontWeight: '700' }}>{skinTypeLabel}</Text></Text>
            </View>
            {concernsList.length > 0 ? (
              <View style={styles.skinBadge}>
                <Ionicons name="list-outline" size={14} color={B.blue} />
                <Text style={styles.skinBadgeText}>{concernsList.length} concern{concernsList.length > 1 ? 's' : ''} noted</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* ── Face alignment guide ───────────────────────────────── */}
        <Animated.View style={[styles.frameSection, { opacity: heroFade, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.frameSectionTitle}>Align Your Face</Text>
          <Text style={styles.frameSectionSub}>Position your face within the oval for the best accuracy</Text>

          <View style={styles.frameWrap}>
            <LinearGradient
              colors={['#E8F4FD', '#F0F8FF']}
              style={styles.frameBg}
            >
              {/* Guide dots */}
              <View style={[styles.guideDot, { top: 24, left: '25%' }]} />
              <View style={[styles.guideDot, { top: 24, right: '25%' }]} />
              <View style={[styles.guideDot, { top: '45%', left: '10%' }]} />
              <View style={[styles.guideDot, { top: '45%', right: '10%' }]} />

              <FaceGuideOverlay />
            </LinearGradient>
          </View>

          {/* Position tips */}
          <View style={styles.posTips}>
            {[
              { icon: 'eye-outline', text: 'Eyes at the center of the frame' },
              { icon: 'resize-outline', text: 'Face should fill 60-70% of the oval' },
              { icon: 'hand-left-outline', text: 'Hold phone at arm\'s length' },
            ].map(tip => (
              <View key={tip.text} style={styles.posTip}>
                <View style={styles.posTipIcon}>
                  <Ionicons name={tip.icon as any} size={14} color={B.blue} />
                </View>
                <Text style={styles.posTipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Lighting reminder ─────────────────────────────────── */}
        <View style={styles.lightingCard}>
          <LinearGradient colors={[B.bluePale, '#EEF5FF']} style={styles.lightingGrad}>
            <Ionicons name="sunny-outline" size={22} color={B.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lightingTitle}>Lighting Is Critical 💡</Text>
              <Text style={styles.lightingDesc}>
                For accurate skin analysis, use <Text style={{ fontWeight: '700' }}>natural daylight</Text> or a bright, even artificial light. Avoid shadows on your face.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── What will be analyzed ─────────────────────────────── */}
        <View style={styles.analyzeSection}>
          <Text style={styles.analyzeSectionTitle}>What AI Will Analyze</Text>
          <View style={styles.analyzeGrid}>
            {[
              { icon: '🔷', label: 'Face Shape' },
              { icon: '🎨', label: 'Skin Tone' },
              { icon: '🌡️', label: 'Undertone' },
              { icon: '⚡', label: 'Contrast' },
              { icon: '💧', label: 'Hydration' },
              { icon: '🌿', label: 'Skin Health' },
            ].map(item => (
              <View key={item.label} style={styles.analyzeChip}>
                <Text style={styles.analyzeEmoji}>{item.icon}</Text>
                <Text style={styles.analyzeLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={13} color={B.textLight} />
          <Text style={styles.privacyText}>Photos analyzed securely — never stored or shared</Text>
        </View>
      </ScrollView>

      <PaywallModal />

      {/* ── Bottom CTAs ──────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [styles.galleryBtn, pressed && { opacity: 0.8 }]}
            onPress={openGuidelines}
          >
            <Ionicons name="images-outline" size={19} color={B.blue} />
            <Text style={styles.galleryBtnText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cameraBtn, pressed && { opacity: 0.9 }]}
            onPress={openGuidelines}
          >
            <LinearGradient
              colors={[B.blueLight, B.blue]}
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
  headerGrad: { paddingBottom: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: B.blueChip, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: B.text },
  stepBadge: {
    backgroundColor: B.blueChip, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  stepBadgeText: { fontSize: 10, fontWeight: Fonts.weights.bold, color: B.blue },
  progressWrap: { paddingHorizontal: Spacing.md, paddingBottom: 4 },
  progressTrack: { height: 4, backgroundColor: B.blueChip, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: B.blue, borderRadius: 2 },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Skin badge
  skinBadgeRow: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap',
  },
  skinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: B.blueChip, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: B.blueBorder,
  },
  skinBadgeText: { fontSize: Fonts.sizes.xs, color: B.blue },

  // Frame section
  frameSection: { marginBottom: Spacing.md },
  frameSectionTitle: {
    fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: B.text, marginBottom: 4, textAlign: 'center',
  },
  frameSectionSub: {
    fontSize: Fonts.sizes.sm, color: B.textSub, textAlign: 'center', lineHeight: 19, marginBottom: Spacing.md,
  },
  frameWrap: {
    alignItems: 'center', marginBottom: Spacing.md,
  },
  frameBg: {
    width: W - Spacing.md * 2, height: 280,
    borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: B.blueBorder, position: 'relative',
  },
  guideDot: {
    position: 'absolute', width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(33,150,243,0.25)',
  },

  // Position tips
  posTips: { gap: 6 },
  posTip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: B.blueBorder, ...Shadow.sm,
  },
  posTipIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: B.bluePale, alignItems: 'center', justifyContent: 'center',
  },
  posTipText: { flex: 1, fontSize: Fonts.sizes.sm, color: B.text, fontWeight: '500' },

  // Lighting card
  lightingCard: {
    borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.sm,
  },
  lightingGrad: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: Spacing.md, borderWidth: 1, borderColor: B.blueBorder, borderRadius: Radius.lg,
  },
  lightingTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: B.text, marginBottom: 3 },
  lightingDesc: { fontSize: Fonts.sizes.xs, color: B.textSub, lineHeight: 17 },

  // Analyze section
  analyzeSection: { marginBottom: Spacing.md },
  analyzeSectionTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: B.text, marginBottom: Spacing.sm,
  },
  analyzeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  analyzeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: B.bluePale, borderRadius: Radius.full,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1, borderColor: B.blueBorder,
  },
  analyzeEmoji: { fontSize: 14 },
  analyzeLabel: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: B.text },

  // Privacy
  privacyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', paddingVertical: 8,
  },
  privacyText: { fontSize: Fonts.sizes.xs, color: B.textLight },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: B.blueBorder,
  },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  galleryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 15, borderRadius: Radius.full,
    backgroundColor: B.bluePale, borderWidth: 1.5, borderColor: B.blueBorder,
  },
  galleryBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: B.blue },
  cameraBtn: { flex: 2, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  cameraBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  cameraBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
});
