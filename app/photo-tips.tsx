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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

// ── Design tokens ──────────────────────────────────────────────────────────
const P = {
  pink: '#F0557A',
  pinkLight: '#F8A0B8',
  pinkPale: '#FFF0F4',
  pinkChip: '#FCE4EC',
  pinkBorder: '#FBCDD9',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
  success: '#4CAF86',
  error: '#E05C5C',
};

// ── Scan types config ──────────────────────────────────────────────────────
const SCAN_CONFIGS: Record<string, { title: string; subtitle: string; icon: string; gradient: [string, string] }> = {
  color: {
    title: 'Color Analysis',
    subtitle: 'Find your color season and perfect colors',
    icon: '🎨',
    gradient: ['#E8C5E0', '#C8A0D4'],
  },
  facial: {
    title: 'Facial Analysis',
    subtitle: 'Facial analysis & makeup recommendations',
    icon: '👁️',
    gradient: ['#C8E6F5', '#A8D4ED'],
  },
  glow: {
    title: 'Glow Up Guide',
    subtitle: 'See yourself glowed up and get a guide',
    icon: '✨',
    gradient: ['#FFD6E0', '#FFB3C6'],
  },
};

// ── Dos and Don'ts data ────────────────────────────────────────────────────
const DOS = [
  { icon: 'eye-outline', text: 'Look straight at the camera', check: true },
  { icon: 'sunny-outline', text: 'Use good, even lighting', check: true },
  { icon: 'happy-outline', text: 'Keep a neutral expression', check: true },
  { icon: 'phone-portrait-outline', text: 'Hold the camera at face level', check: true },
];

const DONTS = [
  { icon: 'options-outline', text: "Don't use any filters", check: false },
  { icon: 'baseball-outline', text: "Don't wear hats or glasses", check: false },
  { icon: 'hand-left-outline', text: "Don't cover your face (bangs too!)", check: false },
  { icon: 'moon-outline', text: "Don't use dark or backlit settings", check: false },
];

// ── Tip row ────────────────────────────────────────────────────────────────
function TipRow({ icon, text, isGood }: { icon: string; text: string; isGood: boolean }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[tipStyles.row, { transform: [{ scale }], opacity }]}>
      <View style={[tipStyles.iconWrap, { backgroundColor: isGood ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
        <Ionicons name={icon as any} size={18} color={isGood ? P.success : P.error} />
      </View>
      <Text style={tipStyles.text}>{text}</Text>
      <View style={[tipStyles.badge, { backgroundColor: isGood ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
        <Ionicons
          name={isGood ? 'checkmark' : 'close'}
          size={14}
          color={isGood ? P.success : P.error}
        />
      </View>
    </Animated.View>
  );
}

const tipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
    borderRadius: Radius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F5EEF0',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: P.text,
    fontWeight: '500',
    lineHeight: 19,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function PhotoTipsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const insets = useSafeAreaInsets();
  const scanType = params.type ?? 'facial';
  const config = SCAN_CONFIGS[scanType] ?? SCAN_CONFIGS.facial;

  const [showExamples, setShowExamples] = useState(false);
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleTakePhoto = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Camera Access Required', 'Please enable camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/feature-analysis',
        params: { imageUri: result.assets[0].uri, type: scanType },
      });
    }
  };

  const handleUploadPhoto = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Gallery Access Required', 'Please enable photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/feature-analysis',
        params: { imageUri: result.assets[0].uri, type: scanType },
      });
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={[P.pinkPale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={[styles.header, { paddingTop: 4 }]}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={P.pink} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerEmoji}>{config.icon}</Text>
              <Text style={styles.headerTitle}>{config.title}</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        {/* ── Hero card ──────────────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          <LinearGradient colors={config.gradient} start={[0, 0]} end={[1, 1]} style={styles.heroGrad}>
            <View style={styles.heroIconBg}>
              <Text style={styles.heroIcon}>{config.icon}</Text>
            </View>
            <Text style={styles.heroTitle}>{config.title}</Text>
            <Text style={styles.heroSub}>{config.subtitle}</Text>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>AI POWERED</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Dos & Don'ts ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: P.success }]} />
            <Text style={styles.sectionTitle}>Do's</Text>
          </View>
          {DOS.map((d, i) => (
            <TipRow key={i} icon={d.icon} text={d.text} isGood />
          ))}

          <View style={[styles.sectionTitleRow, { marginTop: Spacing.md }]}>
            <View style={[styles.sectionDot, { backgroundColor: P.error }]} />
            <Text style={styles.sectionTitle}>Don'ts</Text>
          </View>
          {DONTS.map((d, i) => (
            <TipRow key={i} icon={d.icon} text={d.text} isGood={false} />
          ))}
        </View>

        {/* ── Photo Examples ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.examplesToggle, pressed && { opacity: 0.8 }]}
            onPress={() => setShowExamples(v => !v)}
          >
            <Text style={styles.examplesToggleTitle}>Photo Examples</Text>
            <Ionicons
              name={showExamples ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={P.pink}
            />
          </Pressable>

          {showExamples ? (
            <View style={styles.examplesRow}>
              {/* Good Example */}
              <View style={styles.exampleCard}>
                <View style={styles.exampleImgWrap}>
                  <Image
                    source={require('@/assets/photo-good.jpg')}
                    style={styles.exampleImg}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={[styles.exampleBadge, { backgroundColor: P.success }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                    <Text style={styles.exampleBadgeText}>Good</Text>
                  </View>
                </View>
                <View style={[styles.exampleFooter, { backgroundColor: 'rgba(76,175,134,0.08)' }]}>
                  <Text style={[styles.exampleLabel, { color: P.success }]}>✓ Clear · Well-lit · Straight</Text>
                </View>
              </View>

              {/* Bad Example */}
              <View style={styles.exampleCard}>
                <View style={styles.exampleImgWrap}>
                  <Image
                    source={require('@/assets/photo-bad-example.jpg')}
                    style={styles.exampleImg}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={[styles.exampleBadge, { backgroundColor: P.error }]}>
                    <Ionicons name="close" size={12} color="#fff" />
                    <Text style={styles.exampleBadgeText}>Bad</Text>
                  </View>
                </View>
                <View style={[styles.exampleFooter, { backgroundColor: 'rgba(224,92,92,0.08)' }]}>
                  <Text style={[styles.exampleLabel, { color: P.error }]}>✗ Dark · Covered · Angled</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Privacy note ───────────────────────────────────────── */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color={P.textLight} />
          <Text style={styles.privacyText}>
            We will <Text style={{ fontWeight: '700', color: P.textSub }}>NEVER</Text> share your image without your consent
          </Text>
        </View>
      </ScrollView>

      {/* ── Fixed bottom CTAs ───────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient
          colors={['rgba(255,250,252,0)', 'rgba(255,250,252,1)']}
          style={styles.bottomFade}
          pointerEvents="none"
        />
        <View style={styles.ctaRow}>
          {/* Upload */}
          <Pressable
            style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}
            onPress={handleUploadPhoto}
          >
            <Ionicons name="images-outline" size={20} color={P.pink} />
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </Pressable>

          {/* Take photo */}
          <Pressable
            style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.9 }]}
            onPress={handleTakePhoto}
          >
            <LinearGradient
              colors={[P.pinkLight, P.pink]}
              start={[0, 0]} end={[1, 0]}
              style={styles.scanBtnGrad}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.scanBtnText}>Take Photo</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },

  headerGrad: { paddingBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: P.pinkChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 20 },
  headerTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: P.text,
  },

  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero card
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  heroGrad: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  heroIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  heroIcon: { fontSize: 34 },
  heroTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: '#1A1A2E',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: Fonts.sizes.sm,
    color: 'rgba(26,26,46,0.65)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    letterSpacing: 1.2,
  },

  // Section
  section: { marginBottom: Spacing.lg },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: P.text,
  },

  // Examples toggle
  examplesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.pinkPale,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: P.pinkBorder,
    marginBottom: Spacing.sm,
  },
  examplesToggleTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: P.pink,
  },

  // Examples photos
  examplesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  exampleCard: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: '#F5EEF0',
  },
  exampleImgWrap: {
    height: 160,
    position: 'relative',
  },
  exampleImg: {
    width: '100%',
    height: '100%',
  },
  exampleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  exampleBadgeText: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
  exampleFooter: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  exampleLabel: {
    fontSize: 10,
    fontWeight: Fonts.weights.semibold,
    letterSpacing: 0.2,
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    backgroundColor: '#F9F9FC',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: '#EDEDF5',
  },
  privacyText: {
    fontSize: Fonts.sizes.xs,
    color: P.textLight,
    flex: 1,
    lineHeight: 17,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: P.pinkBorder,
  },
  bottomFade: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    height: 28,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: Radius.full,
    backgroundColor: P.pinkPale,
    borderWidth: 1.5,
    borderColor: P.pinkBorder,
  },
  uploadBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: P.pink,
  },
  scanBtn: {
    flex: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.md,
  },
  scanBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  scanBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },
});
