import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

// ── Design tokens ──────────────────────────────────────────────────────────
const B = {
  pink: '#FF3366',
  pinkLight: '#FF6B95',
  pinkPale: '#FFF0F4',
  pinkBorder: '#FFD0DC',
  blue: '#2196F3',
  bluePale: '#E8F4FD',
  blueBorder: '#BBDEFB',
  text: '#1A1A2E',
  textSub: '#8A8A9A',
  textLight: '#BBBBCC',
  cardBorder: '#EBEBF0',
  success: '#4CAF86',
};

// ── Skin type options ──────────────────────────────────────────────────────
const SKIN_TYPES = [
  {
    id: 'oily',
    label: 'Oily',
    desc: 'Shiny throughout, enlarged pores, prone to breakouts',
    iconName: 'water' as const,
    color: '#4CAF86',
  },
  {
    id: 'dry',
    label: 'Dry',
    desc: 'Tight feeling, flaky patches, dull complexion',
    iconName: 'sunny-outline' as const,
    color: '#C8A870',
  },
  {
    id: 'combination',
    label: 'Combination',
    desc: 'Oily T-zone, dry or normal cheeks',
    iconName: 'git-branch-outline' as const,
    color: '#9B59B6',
  },
  {
    id: 'normal',
    label: 'Normal',
    desc: 'Balanced, minimal issues, small pores',
    iconName: 'sparkles' as const,
    color: '#F0557A',
  },
];

// ── Skin concern options ───────────────────────────────────────────────────
const CONCERNS = [
  { id: 'acne', label: 'Acne-Prone', iconName: 'alert-circle-outline' as const },
  { id: 'sensitive', label: 'Sensitive', iconName: 'heart-outline' as const },
  { id: 'aging', label: 'Anti-Aging', iconName: 'time-outline' as const },
  { id: 'hyperpigmentation', label: 'Hyperpigmentation', iconName: 'contrast-outline' as const },
  { id: 'redness', label: 'Redness', iconName: 'medical-outline' as const },
  { id: 'dehydrated', label: 'Dehydrated', iconName: 'water-outline' as const },
];

// ── Full-width option card ─────────────────────────────────────────────────
function OptionCard({
  label,
  desc,
  iconName,
  iconColor,
  isSelected,
  onPress,
  multiSelect,
}: {
  label: string;
  desc?: string;
  iconName: any;
  iconColor?: string;
  isSelected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          card.wrap,
          isSelected && card.wrapSelected,
        ]}
        onPress={handlePress}
      >
        <View style={[
          card.iconWrap,
          isSelected
            ? card.iconWrapSelected
            : { backgroundColor: (iconColor ? iconColor + '18' : '#F0F0F8') },
        ]}>
          <Ionicons
            name={iconName}
            size={22}
            color={isSelected ? '#fff' : (iconColor ?? '#9999AA')}
          />
        </View>
        <View style={card.body}>
          <Text style={[card.label, isSelected && card.labelSelected]}>{label}</Text>
          {desc ? (
            <Text style={[card.desc, isSelected && card.descSelected]} numberOfLines={2}>
              {desc}
            </Text>
          ) : null}
        </View>
        <View style={[
          card.check,
          multiSelect ? card.checkSquare : {},
          isSelected ? card.checkFilled : card.checkEmpty,
        ]}>
          {isSelected ? (
            <Ionicons name="checkmark" size={14} color={B.pink} />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: B.cardBorder,
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
  },
  wrapSelected: {
    backgroundColor: B.pink,
    borderColor: B.pink,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  body: { flex: 1 },
  label: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: B.text,
    marginBottom: 2,
  },
  labelSelected: { color: '#fff' },
  desc: {
    fontSize: Fonts.sizes.xs,
    color: B.textSub,
    lineHeight: 16,
  },
  descSelected: { color: 'rgba(255,255,255,0.8)' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkSquare: { borderRadius: 8 },
  checkFilled: {
    backgroundColor: '#fff',
    borderWidth: 0,
  },
  checkEmpty: {
    borderWidth: 2,
    borderColor: B.cardBorder,
    backgroundColor: '#fff',
  },
});

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const width = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 350, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, {
        width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 4, backgroundColor: '#F0F0F5', borderRadius: 2, flex: 1, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: B.pink, borderRadius: 2 },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function SkinQuizScreen() {
  const router = useRouter();
  const [skinType, setSkinType] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const toggleConcern = (id: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    setConcerns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleContinue = () => {
    if (!skinType) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/facial-scan',
      params: { skinType, concerns: concerns.join(',') },
    });
  };

  const isComplete = skinType !== null;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Back + progress bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={B.text} />
          </Pressable>
          <ProgressBar pct={0.33} />
          <Text style={styles.stepCount}>1/3</Text>
        </View>
      </SafeAreaView>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
      >
        {/* ── Q1 header ── */}
        <View style={styles.qHeader}>
          <Text style={styles.qTitle}>What is your skin type?</Text>
          <Text style={styles.qSub}>
            Choose the one that best describes your skin most days
          </Text>
        </View>

        {/* ── Skin type cards ── */}
        {SKIN_TYPES.map(type => (
          <OptionCard
            key={type.id}
            label={type.label}
            desc={type.desc}
            iconName={type.iconName}
            iconColor={type.color}
            isSelected={skinType === type.id}
            onPress={() => setSkinType(prev => prev === type.id ? null : type.id)}
          />
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* ── Q2 header ── */}
        <View style={styles.qHeader}>
          <Text style={styles.qTitle}>Any skin concerns?</Text>
          <Text style={styles.qSub}>
            Select all that apply — helps us personalize recommendations
          </Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>Optional</Text>
          </View>
        </View>

        {/* ── Skin concern cards ── */}
        {CONCERNS.map(concern => (
          <OptionCard
            key={concern.id}
            label={concern.label}
            iconName={concern.iconName}
            isSelected={concerns.includes(concern.id)}
            onPress={() => toggleConcern(concern.id)}
            multiSelect
          />
        ))}

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={B.textLight} />
          <Text style={styles.privacyText}>
            This info is only used to personalize your scan results — never shared
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ── Bottom CTA ── */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              !isComplete && styles.continueBtnDisabled,
              pressed && isComplete && { opacity: 0.9 },
            ]}
            onPress={handleContinue}
            disabled={!isComplete}
          >
            <LinearGradient
              colors={isComplete ? [B.pinkLight, B.pink] : ['#DDD', '#CCC']}
              start={[0, 0]} end={[1, 0]}
              style={styles.continueBtnGrad}
            >
              <Text style={styles.continueBtnText}>
                {isComplete ? 'Continue to Photo Scan' : 'Select Your Skin Type to Continue'}
              </Text>
              {isComplete ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },

  safeTop: { backgroundColor: '#FFF' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F4F4F8',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepCount: {
    fontSize: 12, color: B.textLight, fontWeight: '600',
    flexShrink: 0, minWidth: 30, textAlign: 'right',
  },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  qHeader: { marginBottom: Spacing.md },
  qTitle: {
    fontSize: 22, fontWeight: '800', color: B.text,
    marginBottom: 6, letterSpacing: -0.3, lineHeight: 28,
  },
  qSub: {
    fontSize: Fonts.sizes.sm, color: B.textSub, lineHeight: 20,
  },
  optionalBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F4F4F8',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  optionalText: {
    fontSize: Fonts.sizes.xs, color: B.textLight, fontWeight: '600',
  },

  divider: {
    height: 1, backgroundColor: '#F0F0F5',
    marginVertical: Spacing.lg,
  },

  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9F9FC', borderRadius: 14,
    padding: 12, marginTop: Spacing.sm,
    borderWidth: 1.5, borderColor: '#EBEBF0',
  },
  privacyText: { flex: 1, fontSize: Fonts.sizes.xs, color: B.textLight, lineHeight: 17 },

  bottomSafe: { backgroundColor: '#FFF' },
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  continueBtn: { borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md },
  continueBtnDisabled: { opacity: 0.55 },
  continueBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
  },
  continueBtnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },
});
