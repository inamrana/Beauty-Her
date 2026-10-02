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
  FlatList,
  ViewToken,
  Dimensions,
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

const { width: W } = Dimensions.get('window');

// ── Design tokens ──────────────────────────────────────────────────────────
const G = {
  pink: '#F0557A',
  pinkLight: '#F8A0B8',
  pinkPale: '#FFF0F4',
  pinkChip: '#FCE4EC',
  pinkBorder: '#FBCDD9',
  text: '#1A1A2E',
  textSub: '#666680',
  textLight: '#AAAACC',
};

// ── Aesthetics ─────────────────────────────────────────────────────────────
const AESTHETICS = [
  {
    id: 'soft-girl',
    label: 'Soft Girl',
    desc: 'Delicate, dreamy with blush tones',
    vibe: 'Feminine · Pastel · Romantic',
    image: require('@/assets/aesthetic-soft-girl.jpg'),
    color: '#F8A0B8',
    gradEnd: '#E8709A',
    gradient: ['rgba(248,160,184,0.9)', 'rgba(232,112,154,0.95)'] as [string, string],
    tags: ['Blush Makeup', 'Dewy Skin', 'Pastel Tones'],
  },
  {
    id: 'natural-glam',
    label: 'Natural Glam',
    desc: 'Effortless radiance, glowing skin',
    vibe: 'Luminous · Warm · Elevated',
    image: require('@/assets/aesthetic-natural-glam.jpg'),
    color: '#C8A96E',
    gradEnd: '#A87840',
    gradient: ['rgba(200,169,110,0.9)', 'rgba(168,120,64,0.95)'] as [string, string],
    tags: ['Bronzer', 'Highlight', 'Nude Lips'],
  },
  {
    id: 'soft-grunge',
    label: 'Soft Grunge',
    desc: 'Edgy yet soft, with smokey eyes',
    vibe: 'Moody · Cool · Alternative',
    image: require('@/assets/aesthetic-soft-grunge.jpg'),
    color: '#8B7FA8',
    gradEnd: '#6B5F88',
    gradient: ['rgba(139,127,168,0.9)', 'rgba(107,95,136,0.95)'] as [string, string],
    tags: ['Smokey Eye', 'Dark Lips', 'Cool Tones'],
  },
  {
    id: 'latina-baddie',
    label: 'Latina Baddie',
    desc: 'Bold, fierce, and full of fire',
    vibe: 'Bold · Confident · Spicy',
    image: require('@/assets/aesthetic-latina-baddie.jpg'),
    color: '#E05C5C',
    gradEnd: '#C03030',
    gradient: ['rgba(224,92,92,0.9)', 'rgba(192,48,48,0.95)'] as [string, string],
    tags: ['Graphic Liner', 'Bold Brow', 'Red Lip'],
  },
  {
    id: 'full-glam',
    label: 'Full Glam',
    desc: 'Dramatic, show-stopping glamour',
    vibe: 'Dramatic · Luxe · Commanding',
    image: require('@/assets/aesthetic-full-glam.jpg'),
    color: '#B8860B',
    gradEnd: '#886000',
    gradient: ['rgba(184,134,11,0.9)', 'rgba(136,96,0,0.95)'] as [string, string],
    tags: ['Full Coverage', 'Drama Lash', 'Gold Glam'],
  },
];

const AES_CARD_W = W * 0.60;

// ── Aesthetic card ─────────────────────────────────────────────────────────
function AestheticCard({
  item,
  isSelected,
  onSelect,
}: {
  item: typeof AESTHETICS[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onSelect();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.aesCard,
          isSelected && { borderColor: item.color, borderWidth: 2.5 },
        ]}
        onPress={handlePress}
      >
        <Image source={item.image} style={styles.aesCardImg} contentFit="cover" transition={200} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} />

        {/* Selected check */}
        {isSelected ? (
          <View style={[styles.aesCheck, { backgroundColor: item.color }]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : null}

        {/* Content */}
        <View style={styles.aesBottom}>
          <Text style={styles.aesLabel}>{item.label}</Text>
          <Text style={styles.aesVibe}>{item.vibe}</Text>
          <View style={styles.aesTags}>
            {item.tags.map(tag => (
              <View key={tag} style={styles.aesTag}>
                <Text style={styles.aesTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={[styles.aesSelectBtn, { backgroundColor: isSelected ? item.color : 'rgba(255,255,255,0.2)' }]}
            onPress={handlePress}
          >
            <Text style={styles.aesSelectBtnText}>{isSelected ? '✓ Selected' : 'Choose'}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function GlowScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedAesthetic, setSelectedAesthetic] = useState<string | null>(null);
  const [dotIdx, setDotIdx] = useState(0);
  const { gate, PaywallModal } = usePaywallGuard();
  const heroFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const selectedItem = AESTHETICS.find(a => a.id === selectedAesthetic);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setDotIdx(viewableItems[0].index ?? 0);
  }).current;

  const openGuidelines = () => {
    gate(() => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      router.push({
        pathname: '/camera-guidelines',
        params: { scanType: 'glow', aesthetic: selectedAesthetic ?? 'natural-glam' },
      });
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={[G.pinkPale, '#FFF']} style={styles.headerGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color={G.pink} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Glow Up & Aesthetic</Text>
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 130 }]}
      >
        {/* ── Intro ──────────────────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: heroFade }]}>
          <LinearGradient
            colors={[G.pinkLight, G.pink]}
            start={[0, 0]} end={[1, 1]}
            style={styles.heroGrad}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Choose Your Dream Aesthetic</Text>
            <Text style={styles.heroSub}>
              Select a look, upload your photo, and get a personalized step-by-step glow-up plan
            </Text>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>AI-POWERED TRANSFORM</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Aesthetic picker ────────────────────────────────────── */}
        <View style={styles.pickerSection}>
          <Text style={styles.pickerLabel}>SELECT YOUR AESTHETIC</Text>
          <Text style={styles.pickerTitle}>
            {selectedAesthetic
              ? `${selectedItem?.label} ✓`
              : 'Which look inspires you?'}
          </Text>
          {selectedAesthetic ? (
            <Text style={styles.pickerSub}>{selectedItem?.desc}</Text>
          ) : (
            <Text style={styles.pickerSub}>Swipe through and pick your vibe</Text>
          )}
        </View>

        <FlatList
          data={AESTHETICS}
          keyExtractor={a => a.id}
          horizontal
          snapToInterval={AES_CARD_W + Spacing.sm}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: 6 }}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={{ width: AES_CARD_W }}>
              <AestheticCard
                item={item}
                isSelected={selectedAesthetic === item.id}
                onSelect={() => setSelectedAesthetic(prev => prev === item.id ? null : item.id)}
              />
            </View>
          )}
        />

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {AESTHETICS.map((a, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === dotIdx && styles.dotActive,
                selectedAesthetic === a.id && { backgroundColor: a.color, width: 18 },
              ]}
            />
          ))}
        </View>

        {/* ── Skip aesthetic note ──────────────────────────────────── */}
        <View style={styles.skipNote}>
          <Ionicons name="information-circle-outline" size={15} color={G.textLight} />
          <Text style={styles.skipNoteText}>You can skip selecting an aesthetic and AI will suggest the best look for you</Text>
        </View>

        {/* ── Photo guidelines ─────────────────────────────────────── */}
        <View style={styles.guideSection}>
          <Text style={styles.sectionTitle}>Photo Guidelines</Text>
          {[
            { icon: 'sunny-outline', text: 'Bright, even lighting — natural is best', good: true },
            { icon: 'eye-outline', text: 'Look straight at the camera', good: true },
            { icon: 'happy-outline', text: 'Relaxed, neutral expression', good: true },
            { icon: 'contrast-outline', text: 'No heavy filters or edits', good: false },
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipIcon, { backgroundColor: tip.good ? 'rgba(76,175,134,0.12)' : 'rgba(224,92,92,0.1)' }]}>
                <Ionicons name={tip.icon as any} size={16} color={tip.good ? '#4CAF86' : '#E05C5C'} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
              <Ionicons name={tip.good ? 'checkmark-circle' : 'close-circle'} size={16} color={tip.good ? '#4CAF86' : '#E05C5C'} />
            </View>
          ))}
        </View>
      </ScrollView>

      <PaywallModal />

      {/* ── Bottom CTAs ──────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {selectedAesthetic ? (
          <View style={[styles.selectedBanner, { backgroundColor: selectedItem?.color + '20', borderColor: selectedItem?.color + '50' }]}>
            <Ionicons name="checkmark-circle" size={14} color={selectedItem?.color} />
            <Text style={[styles.selectedBannerText, { color: selectedItem?.color }]}>
              {selectedItem?.label} selected — now take your photo
            </Text>
          </View>
        ) : null}
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [styles.galleryBtn, pressed && { opacity: 0.8 }]}
            onPress={openGuidelines}
          >
            <Ionicons name="images-outline" size={19} color={G.pink} />
            <Text style={styles.galleryBtnText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cameraBtn, pressed && { opacity: 0.9 }]}
            onPress={openGuidelines}
          >
            <LinearGradient
              colors={[G.pinkLight, G.pink]}
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
    backgroundColor: G.pinkChip, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: G.text },
  stepBadge: {
    backgroundColor: G.pinkChip, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  stepBadgeText: { fontSize: 10, fontWeight: Fonts.weights.bold, color: G.pink },

  scroll: { paddingTop: Spacing.sm },

  // Hero
  heroCard: {
    borderRadius: Radius.xl, overflow: 'hidden',
    marginHorizontal: Spacing.md, marginBottom: Spacing.lg, ...Shadow.md,
  },
  heroGrad: {
    padding: Spacing.lg, alignItems: 'center', minHeight: 170, justifyContent: 'center',
  },
  heroIcon: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
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
  heroBadgeText: { fontSize: 9, fontWeight: Fonts.weights.bold, color: '#fff', letterSpacing: 1 },

  // Picker section
  pickerSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  pickerLabel: {
    fontSize: 9, fontWeight: Fonts.weights.bold, color: G.pink,
    letterSpacing: 2, marginBottom: 4,
  },
  pickerTitle: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: G.text, marginBottom: 3 },
  pickerSub: { fontSize: Fonts.sizes.sm, color: G.textSub },

  // Aesthetic card
  aesCard: {
    height: 300, borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'transparent', ...Shadow.md,
  },
  aesCardImg: { ...StyleSheet.absoluteFillObject },
  aesCheck: {
    position: 'absolute', top: 12, right: 12,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  aesBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14,
  },
  aesLabel: {
    fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: '#fff', marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  aesVibe: {
    fontSize: 10, color: 'rgba(255,255,255,0.75)', marginBottom: 8, letterSpacing: 0.5,
  },
  aesTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  aesTag: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  aesTagText: { fontSize: 9, color: '#fff', fontWeight: Fonts.weights.semibold },
  aesSelectBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  aesSelectBtnText: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#fff',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    marginTop: Spacing.sm, marginBottom: Spacing.md, paddingHorizontal: Spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, backgroundColor: G.pink },

  // Skip note
  skipNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginHorizontal: Spacing.md, marginBottom: Spacing.lg,
    backgroundColor: '#F9F9FC', borderRadius: Radius.md,
    padding: 11, borderWidth: 1, borderColor: '#EDEDF5',
  },
  skipNoteText: { flex: 1, fontSize: Fonts.sizes.xs, color: G.textLight, lineHeight: 17 },

  // Guide section
  guideSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: G.text, marginBottom: 10 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 12,
    backgroundColor: '#FFF', borderRadius: Radius.md, marginBottom: 6,
    borderWidth: 1, borderColor: '#F5EEF0', ...Shadow.sm,
  },
  tipIcon: {
    width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: Fonts.sizes.sm, color: G.text, fontWeight: '500', lineHeight: 18 },

  // Bottom CTAs
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: G.pinkBorder,
  },
  selectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, marginBottom: 8,
  },
  selectedBannerText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  galleryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 15, borderRadius: Radius.full,
    backgroundColor: G.pinkPale, borderWidth: 1.5, borderColor: G.pinkBorder,
  },
  galleryBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: G.pink },
  cameraBtn: { flex: 2, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  cameraBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  cameraBtnText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
});
