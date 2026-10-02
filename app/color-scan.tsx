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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { usePaywallGuard } from '@/components';

// ── Design tokens ──────────────────────────────────────────────────────────
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
  success: '#4CAF86',
  error: '#E05C5C',
};

// ── Season preview chips ───────────────────────────────────────────────────
const SEASONS = [
  { name: 'Deep Autumn', colors: ['#8B4513', '#CD853F', '#D2691E', '#A0522D'], desc: 'Rich & earthy' },
  { name: 'Light Spring', colors: ['#FFB6C1', '#FFC0CB', '#98FB98', '#87CEEB'], desc: 'Fresh & delicate' },
  { name: 'True Summer', colors: ['#DDA0DD', '#B0C4DE', '#778899', '#C8A2C8'], desc: 'Soft & muted' },
  { name: 'Bright Winter', colors: ['#000080', '#DC143C', '#FFFFFF', '#FF1493'], desc: 'Bold & contrasting' },
];

// ── Photo guideline row ────────────────────────────────────────────────────
function GuideRow({ icon, text, isGood }: { icon: string; text: string; isGood: boolean }) {
  return (
    <View style={guide.row}>
      <View style={[guide.iconWrap, { backgroundColor: isGood ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
        <Ionicons name={icon as any} size={17} color={isGood ? C.success : C.error} />
      </View>
      <Text style={guide.text}>{text}</Text>
      <View style={[guide.check, { backgroundColor: isGood ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
        <Ionicons name={isGood ? 'checkmark' : 'close'} size={13} color={isGood ? C.success : C.error} />
      </View>
    </View>
  );
}

const guide = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: Radius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0EBF8',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: Fonts.sizes.sm, color: C.text, fontWeight: '500', lineHeight: 18 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function ColorScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gate, PaywallModal } = usePaywallGuard();
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(22)).current;
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, []);

  const openGuidelines = () => {
    gate(() => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      router.push({ pathname: '/camera-guidelines', params: { scanType: 'color' } });
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
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
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Color Analysis</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
              </View>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        {/* ── Hero ───────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroSlide }] }}>
          <LinearGradient
            colors={['#C39BD3', '#9B59B6']}
            start={[0, 0]} end={[1, 1]}
            style={styles.heroCard}
          >
            <View style={styles.heroIconWrap}>
              <Ionicons name="color-palette" size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Discover Your Color Season</Text>
            <Text style={styles.heroSub}>
              Our AI analyzes your skin tone, undertone, and hair color to identify your unique color season
            </Text>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>AI · Gemini Vision</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Season preview ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Season Could Be…</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}>
            {SEASONS.map(season => (
              <View key={season.name} style={styles.seasonChip}>
                <View style={styles.seasonSwatches}>
                  {season.colors.map((c, i) => (
                    <View key={i} style={[styles.seasonSwatch, { backgroundColor: c }]} />
                  ))}
                </View>
                <Text style={styles.seasonName}>{season.name}</Text>
                <Text style={styles.seasonDesc}>{season.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Photo Guidelines ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Analysis Photo Tips</Text>
          <Text style={styles.sectionSub}>Accurate colors require specific lighting conditions</Text>
          <GuideRow icon="sunny" text="Use natural daylight — go near a window" isGood />
          <GuideRow icon="contrast" text="Avoid warm bulb or filtered lighting" isGood={false} />
          <GuideRow icon="happy" text="Keep a relaxed, neutral expression" isGood />
          <GuideRow icon="shirt" text="Wear a white or neutral top for accuracy" isGood />
          <GuideRow icon="flash-off" text="Turn off flash — it distorts skin tone" isGood={false} />
          <GuideRow icon="glasses-outline" text="Remove colored glasses or tinted lenses" isGood={false} />
        </View>

        {/* ── What you'll get ────────────────────────────────────── */}
        <View style={[styles.section, styles.getCard]}>
          <Text style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>What You Get</Text>
          {[
            { icon: '🍂', title: 'Color Season', desc: 'Deep Autumn, Light Spring, True Summer, or Bright Winter' },
            { icon: '💄', title: 'Makeup Shades', desc: 'Foundation, blush, lip, and eyeshadow recommendations' },
            { icon: '👗', title: 'Wardrobe Colors', desc: 'Best and worst colors for your clothing' },
            { icon: '🎨', title: 'Full Palette', desc: 'A curated color palette made just for you' },
          ].map(item => (
            <View key={item.title} style={styles.getRow}>
              <Text style={styles.getEmoji}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.getTitle}>{item.title}</Text>
                <Text style={styles.getDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={13} color={C.textLight} />
          <Text style={styles.privacyText}>Photos are analyzed securely and never stored</Text>
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
            <Ionicons name="images-outline" size={19} color={C.purple} />
            <Text style={styles.galleryBtnText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cameraBtn, pressed && { opacity: 0.9 }]}
            onPress={openGuidelines}
          >
            <LinearGradient
              colors={[C.purpleLight, C.purple]}
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
  headerGrad: { paddingBottom: 6 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.purpleChip, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: C.text },
  stepBadge: {
    backgroundColor: C.purpleChip, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  stepBadgeText: { fontSize: 10, fontWeight: Fonts.weights.bold, color: C.purple },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.lg, ...Shadow.md,
  },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm, ...Shadow.sm,
  },
  heroTitle: {
    fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold,
    color: '#fff', textAlign: 'center', marginBottom: 6,
  },
  heroSub: {
    fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 10, fontWeight: Fonts.weights.bold, color: '#fff', letterSpacing: 0.5 },

  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: C.text, marginBottom: 4 },
  sectionSub: { fontSize: Fonts.sizes.xs, color: C.textSub, marginBottom: Spacing.sm, lineHeight: 17 },

  // Season chips
  seasonChip: {
    backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 12,
    borderWidth: 1, borderColor: '#EEE8F5', alignItems: 'center', width: 120, ...Shadow.sm,
  },
  seasonSwatches: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  seasonSwatch: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  seasonName: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold, color: C.text, textAlign: 'center', marginBottom: 2 },
  seasonDesc: { fontSize: 9, color: C.textLight, textAlign: 'center' },

  // What you get
  getCard: {
    backgroundColor: C.purplePale, borderRadius: Radius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: C.purpleBorder,
  },
  getRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.purpleBorder,
  },
  getEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  getTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: C.text, marginBottom: 2 },
  getDesc: { fontSize: Fonts.sizes.xs, color: C.textSub, lineHeight: 17 },

  privacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  privacyText: { fontSize: Fonts.sizes.xs, color: C.textLight },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.purpleBorder,
  },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  galleryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 15, borderRadius: Radius.full,
    backgroundColor: C.purplePale, borderWidth: 1.5, borderColor: C.purpleBorder,
  },
  galleryBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: C.purple },
  cameraBtn: { flex: 2, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  cameraBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  cameraBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
});
