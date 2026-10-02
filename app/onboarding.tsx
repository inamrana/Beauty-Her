import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const ONBOARD_KEY = '@beautyher_onboarded';
const PROFILE_PREFS_KEY = '@beautyher_prefs';

// ── Design tokens ──────────────────────────────────────────────────────────
const P = {
  pink: '#FF3366',
  pinkLight: '#FF6B95',
  pinkPale: '#FFF0F4',
  pinkBorder: '#FFD0DC',
  pinkChip: '#FFE4EC',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSub: '#8A8A9A',
  textLight: '#BBBBCC',
  bg: '#FFFFFF',
  cardBorder: '#EBEBF0',
};

// ── Intro slides ───────────────────────────────────────────────────────────
const INTRO_SLIDES = [
  {
    id: 0,
    image: require('@/assets/onboarding1.png'),
    cardGradient: ['#FFD6E7', '#FFF0F4'] as [string, string],
    accentColor: '#FF3366',
    badge: 'AI BEAUTY',
    title: 'Glow Up Now',
    subtitle: 'Transform your look in seconds and get tutorials on your dream glow up',
    tag1: { iconName: 'sparkles' as const, text: 'AI-Powered' },
    tag2: { iconName: 'color-palette-outline' as const, text: 'Personalized' },
  },
  {
    id: 1,
    image: require('@/assets/onboarding2.png'),
    cardGradient: ['#E8D5FF', '#F5EDFF'] as [string, string],
    accentColor: '#9B59B6',
    badge: 'FACE SCAN',
    title: 'Discover Your Features',
    subtitle: 'Unlock detailed insights, customized tips, and personalized products for your unique face',
    tag1: { iconName: 'scan-outline' as const, text: 'Face Analysis' },
    tag2: { iconName: 'diamond-outline' as const, text: 'Premium Insights' },
  },
  {
    id: 2,
    image: require('@/assets/onboarding3.png'),
    cardGradient: ['#FFE4B5', '#FFF8E8'] as [string, string],
    accentColor: '#C8A870',
    badge: 'EXPERT TEAM',
    title: 'Built By Experts',
    subtitle: 'Made with love by top beauty and tech professionals for the very best results',
    tag1: { iconName: 'ribbon-outline' as const, text: 'Pro Quality' },
    tag2: { iconName: 'star-outline' as const, text: 'Trusted Results' },
  },
];

// ── Personalization data ───────────────────────────────────────────────────
const BEAUTY_GOALS = [
  { id: 'products', label: 'Find the best products for me', iconName: 'bag-handle-outline' as const },
  { id: 'guide', label: 'Get my personalized glow-up guide', iconName: 'sparkles' as const },
  { id: 'color', label: 'Do my color analysis', iconName: 'color-palette-outline' as const },
  { id: 'trends', label: 'Try new beauty trends', iconName: 'trending-up-outline' as const },
  { id: 'skincare', label: 'Improve my skincare routine', iconName: 'leaf-outline' as const },
  { id: 'other', label: 'Other', iconName: 'add-circle-outline' as const },
];

const SKIN_CONCERNS = [
  { id: 'acne', label: 'Acne & Breakouts', iconName: 'alert-circle-outline' as const },
  { id: 'dryness', label: 'Dryness', iconName: 'water-outline' as const },
  { id: 'oiliness', label: 'Oiliness', iconName: 'water' as const },
  { id: 'dark_spots', label: 'Dark Spots', iconName: 'contrast-outline' as const },
  { id: 'wrinkles', label: 'Wrinkles & Fine Lines', iconName: 'time-outline' as const },
  { id: 'redness', label: 'Redness & Sensitivity', iconName: 'heart-outline' as const },
  { id: 'pores', label: 'Large Pores', iconName: 'scan-outline' as const },
  { id: 'uneven', label: 'Uneven Skin Tone', iconName: 'color-filter-outline' as const },
  { id: 'dullness', label: 'Dullness', iconName: 'moon-outline' as const },
  { id: 'none', label: 'None (Lucky you!)', iconName: 'happy-outline' as const },
];

const PRODUCT_PREFS = [
  { id: 'cruelty_free', label: 'Cruelty-Free', iconName: 'heart-outline' as const },
  { id: 'vegan', label: 'Vegan', iconName: 'leaf-outline' as const },
  { id: 'natural', label: 'Natural & Organic', iconName: 'flower-outline' as const },
  { id: 'drugstore', label: 'Drugstore Friendly', iconName: 'pricetag-outline' as const },
  { id: 'luxury', label: 'Luxury Brands', iconName: 'diamond-outline' as const },
  { id: 'fragrance_free', label: 'Fragrance-Free', iconName: 'ban-outline' as const },
  { id: 'spf', label: 'SPF Included', iconName: 'sunny-outline' as const },
  { id: 'minimal', label: 'Minimalist Routine', iconName: 'layers-outline' as const },
];

const ETHNICITIES = [
  { id: 'east_asian', label: 'East Asian', iconName: 'person-outline' as const },
  { id: 'south_asian', label: 'South Asian', iconName: 'person-outline' as const },
  { id: 'southeast_asian', label: 'Southeast Asian', iconName: 'person-outline' as const },
  { id: 'black', label: 'Black / African', iconName: 'person-outline' as const },
  { id: 'hispanic', label: 'Hispanic / Latina', iconName: 'person-outline' as const },
  { id: 'middle_eastern', label: 'Middle Eastern', iconName: 'person-outline' as const },
  { id: 'white', label: 'White / Caucasian', iconName: 'person-outline' as const },
  { id: 'multiracial', label: 'Multiracial / Mixed', iconName: 'person-outline' as const },
  { id: 'prefer_not', label: 'Prefer not to say', iconName: 'shield-outline' as const },
];

const GENDERS = [
  { id: 'woman', label: 'Woman', iconName: 'person' as const },
  { id: 'man', label: 'Man', iconName: 'person' as const },
  { id: 'nonbinary', label: 'Non-binary', iconName: 'person' as const },
  { id: 'prefer_not', label: 'Prefer not to say', iconName: 'shield-outline' as const },
];

const AGES = Array.from({ length: 67 }, (_, i) => i + 14);
const AGE_ITEM_H = 60;
const PERSONALIZATION_STEPS = 6;

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = Math.min(1, Math.max(0, (step - 3) / (PERSONALIZATION_STEPS - 1)));
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
  fill: { height: '100%', backgroundColor: P.pink, borderRadius: 2 },
});

// ── Full-width option card ─────────────────────────────────────────────────
function OptionCard({
  label,
  iconName,
  isSelected,
  onPress,
  multiSelect,
}: {
  label: string;
  iconName: any;
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
        <View style={[card.iconWrap, isSelected && card.iconWrapSelected]}>
          <Ionicons name={iconName} size={20} color={isSelected ? P.pink : '#9999AA'} />
        </View>
        <Text style={[card.label, isSelected && card.labelSelected]} numberOfLines={2}>
          {label}
        </Text>
        <View style={[
          card.checkCircle,
          isSelected ? card.checkCircleFilled : card.checkCircleEmpty,
          multiSelect ? card.checkSquare : {},
        ]}>
          {isSelected ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
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
    paddingVertical: 17,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: P.cardBorder,
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
  },
  wrapSelected: {
    backgroundColor: P.pink,
    borderColor: P.pink,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F0F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    flex: 1,
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: P.text,
    lineHeight: 22,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkSquare: {
    borderRadius: 7,
  },
  checkCircleFilled: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  checkCircleEmpty: {
    borderWidth: 2,
    borderColor: '#DDDDE8',
    backgroundColor: '#FFF',
  },
});

// ── Main Onboarding Screen ─────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const slideScrollRef = useRef<ScrollView>(null);

  const [age, setAge] = useState(22);
  const [gender, setGender] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [skinConcerns, setSkinConcerns] = useState<string[]>([]);
  const [productPrefs, setProductPrefs] = useState<string[]>([]);
  const [ethnicities, setEthnicities] = useState<string[]>([]);


  const ageScrollRef = useRef<ScrollView>(null);
  const ageIdx = AGES.indexOf(age);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStep = useCallback((next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  useEffect(() => {
    if (step === 3) {
      setTimeout(() => {
        ageScrollRef.current?.scrollTo({ y: ageIdx * AGE_ITEM_H, animated: false });
      }, 100);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 10) return;
    loadingProgress.setValue(0);
    Animated.timing(loadingProgress, { toValue: 1, duration: 2400, useNativeDriver: false }).start(() => {
      setStep(11);
    });
  }, [step]);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const handleFinish = async () => {
    const prefs = { age, gender, goals, skinConcerns, productPrefs, ethnicities };
    await AsyncStorage.multiSet([
      [ONBOARD_KEY, 'true'],
      [PROFILE_PREFS_KEY, JSON.stringify(prefs)],
    ]);
    // Only now, after completing the full questionnaire, route to Sign Up
    router.replace('/login');
  };

  const goNext = () => {
    if (step < 8) animateStep(step + 1);
    else if (step === 8) animateStep(10);
  };

  const goBack = () => {
    if (step > 3) animateStep(step - 1);
  };

  const handleIntroNext = () => {
    if (slideIdx < INTRO_SLIDES.length - 1) {
      const next = slideIdx + 1;
      slideScrollRef.current?.scrollTo({ x: W * next, animated: true });
      setSlideIdx(next);
    } else {
      // Final intro slide → continue to personalization questionnaire
      animateStep(3);
    }
  };

  const handleSkipIntro = () => {
    // Skip intro → jump straight into personalization questionnaire
    animateStep(3);
  };

  // ── Intro slides ───────────────────────────────────────────────────────
  if (step <= 2) {
    const currentSlide = INTRO_SLIDES[slideIdx];
    return (
      <View style={[intro.root, { backgroundColor: '#FFF' }]}>
        {/* ── Top bar: dots center + skip right ── */}
        <View style={[intro.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 60 }} />
          <View style={intro.dotsRow}>
            {INTRO_SLIDES.map((_, di) => (
              <View key={di} style={[
                intro.dot,
                di === slideIdx
                  ? [intro.dotActive, { backgroundColor: currentSlide.accentColor }]
                  : {},
              ]} />
            ))}
          </View>
          {slideIdx < INTRO_SLIDES.length - 1 ? (
            <Pressable
              onPress={handleSkipIntro}
              style={intro.skipBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={intro.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* ── Swipeable carousel ── */}
        <ScrollView
          ref={slideScrollRef}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / W);
            setSlideIdx(Math.min(Math.max(0, idx), INTRO_SLIDES.length - 1));
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'flex-start' }}
        >
          {INTRO_SLIDES.map((slide) => (
            <View key={slide.id} style={[intro.slidePage, { width: W }]}>
              {/* ── Hero visual card (upper ~60%) ── */}
              <View style={intro.heroCardWrap}>
                <LinearGradient
                  colors={slide.cardGradient}
                  style={intro.heroCard}
                >
                  {/* Decorative ring 1 */}
                  <View style={[
                    intro.ring,
                    { borderColor: slide.accentColor + '20',
                      width: W * 0.85, height: W * 0.85,
                      borderRadius: W * 0.425,
                      top: -W * 0.12, left: -W * 0.1 },
                  ]} />
                  {/* Decorative ring 2 */}
                  <View style={[
                    intro.ring,
                    { borderColor: slide.accentColor + '14',
                      width: W * 0.55, height: W * 0.55,
                      borderRadius: W * 0.275,
                      bottom: W * 0.05, right: -W * 0.08 },
                  ]} />

                  {/* Badge */}
                  <View style={[intro.heroBadge, { backgroundColor: slide.accentColor + '18', borderColor: slide.accentColor + '40' }]}>
                    <View style={[intro.heroBadgeDot, { backgroundColor: slide.accentColor }]} />
                    <Text style={[intro.heroBadgeText, { color: slide.accentColor }]}>{slide.badge}</Text>
                  </View>

                  {/* Photo */}
                  <Image
                    source={slide.image}
                    style={intro.heroImage}
                    contentFit="cover"
                    transition={300}
                  />

                  {/* Tags row */}
                  <View style={intro.tagsRow}>
                    <View style={[intro.tag, { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: slide.accentColor + '30' }]}>
                      <Ionicons name={slide.tag1.iconName} size={13} color={slide.accentColor} />
                      <Text style={[intro.tagText, { color: slide.accentColor }]}>{slide.tag1.text}</Text>
                    </View>
                    <View style={[intro.tag, { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: slide.accentColor + '30' }]}>
                      <Ionicons name={slide.tag2.iconName} size={13} color={slide.accentColor} />
                      <Text style={[intro.tagText, { color: slide.accentColor }]}>{slide.tag2.text}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* ── Text below hero ── */}
              <View style={intro.textBlock}>
                <Text style={intro.title}>{slide.title}</Text>
                <Text style={intro.subtitle}>{slide.subtitle}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── Bottom: full-width CTA ── */}
        <View style={[intro.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [intro.ctaBtn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
            onPress={handleIntroNext}
          >
            <LinearGradient
              colors={['#FF6B95', '#FF3366']}
              start={[0, 0]} end={[1, 0]}
              style={intro.ctaGrad}
            >
              <Text style={intro.ctaText}>
                {slideIdx === INTRO_SLIDES.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────
  if (step === 10) {
    return (
      <View style={[loadS.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#FFF0F4', '#FFE4EC']} style={StyleSheet.absoluteFill} />
        <View style={loadS.content}>
          <View style={loadS.iconCircle}>
            <Ionicons name="sparkles" size={48} color={P.pink} />
          </View>
          <Text style={loadS.title}>Setting Up Your Profile</Text>
          <Text style={loadS.sub}>Calibrating your personalized recommendations…</Text>
          <View style={loadS.barBg}>
            <Animated.View style={[loadS.barFill, {
              width: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
          {[
            'Analyzing your beauty goals…',
            'Personalizing your recommendations…',
            'Preparing your AI coach…',
          ].map((t, i) => (
            <View key={i} style={loadS.row}>
              <View style={loadS.rowCheck}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <Text style={loadS.rowText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Profile ready screen ───────────────────────────────────────────────
  if (step === 11) {
    return (
      <View style={[doneS.root, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[doneS.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={doneS.heroBg}>
            <View style={doneS.iconCircle}>
              <Ionicons name="star" size={52} color={P.pink} />
            </View>
          </View>

          <Text style={doneS.title}>Profile Ready!</Text>
          <Text style={doneS.sub}>
            Based on your answers, we will ensure our scans focus on:
          </Text>

          {[
            {
              iconName: 'bag-handle-outline' as const,
              title: 'Personalized Recommendations',
              desc: 'Get tailored product suggestions matched to your skin type, skin tone, and facial features.',
            },
            {
              iconName: 'brush-outline' as const,
              title: 'Technique Improvement',
              desc: 'Master techniques for blush, eye makeup, foundation and many more.',
            },
            {
              iconName: 'scan-outline' as const,
              title: 'Understand Your Face',
              desc: 'Learn about your face shape, eye shape and more. Use that to do your makeup in the best way for your face.',
            },
          ].map((item, i) => (
            <View key={i} style={doneS.featureCard}>
              <View style={doneS.featureIcon}>
                <Ionicons name={item.iconName} size={22} color={P.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={doneS.featureTitle}>{item.title}</Text>
                <Text style={doneS.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [doneS.cta, pressed && { opacity: 0.88 }]}
            onPress={handleFinish}
          >
            <LinearGradient
              colors={[P.pinkLight, P.pink]}
              start={[0, 0]} end={[1, 0]}
              style={doneS.ctaGrad}
            >
              <Text style={doneS.ctaText}>Start My Glow-Up Journey</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Personalization steps ──────────────────────────────────────────────
  const canContinue =
    step === 3 ? true :
    step === 4 ? gender !== null :
    step === 5 ? goals.length > 0 :
    step === 6 ? true :
    step === 7 ? true :
    step === 8 ? ethnicities.length > 0 :
    true;

  const STEP_META: Record<number, { title: string; sub: string; skipable?: boolean }> = {
    3: { title: 'How old are you?', sub: 'Your age helps us tailor beauty recommendations to your stage of life.' },
    4: { title: 'What is your gender?', sub: 'Gender-specific characteristics influence your skincare and makeup.' },
    5: { title: 'What are your beauty goals?', sub: 'Select all that apply — we use this to drive our recommendations.' },
    6: { title: 'Any skin concerns?', sub: '85% of 12–24 year olds experience skin issues. We are here to help.', skipable: true },
    7: { title: 'Product preferences?', sub: '76% of users select specific products to match their beauty values.', skipable: true },
    8: { title: 'What is your ethnicity?', sub: 'Different ethnicities have unique skin characteristics and concerns.' },
  };

  const meta = STEP_META[step];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[qs.root, { paddingTop: insets.top }]}>

        {/* ── Top header: back + progress bar ── */}
        <View style={qs.topBar}>
          {step > 3 ? (
            <Pressable
              style={qs.backBtn}
              onPress={goBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={P.text} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <ProgressBar step={step} />
          <Text style={qs.stepCount}>{step - 2}/{PERSONALIZATION_STEPS}</Text>
        </View>

        {/* ── Question header ── */}
        <View style={qs.qHeader}>
          <Text style={qs.qTitle}>{meta.title}</Text>
          <Text style={qs.qSub}>{meta.sub}</Text>
          {step === 5 || step === 6 || step === 7 || step === 8 ? (
            <View style={qs.multiHint}>
              <Ionicons name="checkmark-circle-outline" size={13} color={P.pink} />
              <Text style={qs.multiHintText}>Select all that apply</Text>
            </View>
          ) : null}
        </View>

        {/* ── Content area ── */}
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={qs.scroll}
            keyboardShouldPersistTaps="handled"
          >

            {/* STEP 3: Age picker */}
            {step === 3 ? (
              <View style={qs.agePicker}>
                <LinearGradient
                  colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
                  style={qs.ageFadeTop}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                  style={qs.ageFadeBot}
                  pointerEvents="none"
                />
                <View style={qs.ageHighlight} pointerEvents="none" />
                <ScrollView
                  ref={ageScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={AGE_ITEM_H}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: AGE_ITEM_H * 2 }}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / AGE_ITEM_H);
                    setAge(AGES[Math.min(Math.max(0, idx), AGES.length - 1)]);
                  }}
                >
                  {AGES.map(a => (
                    <Pressable
                      key={a}
                      style={[qs.ageItem, { height: AGE_ITEM_H }]}
                      onPress={() => {
                        setAge(a);
                        const idx = AGES.indexOf(a);
                        ageScrollRef.current?.scrollTo({ y: idx * AGE_ITEM_H, animated: true });
                      }}
                    >
                      <Text style={a === age ? qs.ageSelectedNum : qs.ageText}>{a}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* STEP 4: Gender — full-width cards */}
            {step === 4 ? (
              <View style={qs.cards}>
                {GENDERS.map(g => (
                  <OptionCard
                    key={g.id}
                    label={g.label}
                    iconName={g.iconName}
                    isSelected={gender === g.id}
                    onPress={() => setGender(prev => prev === g.id ? null : g.id)}
                  />
                ))}
              </View>
            ) : null}

            {/* STEP 5: Beauty Goals — full-width multiselect cards */}
            {step === 5 ? (
              <View style={qs.cards}>
                {BEAUTY_GOALS.map(item => (
                  <OptionCard
                    key={item.id}
                    label={item.label}
                    iconName={item.iconName}
                    isSelected={goals.includes(item.id)}
                    onPress={() => toggleItem(goals, setGoals, item.id)}
                    multiSelect
                  />
                ))}
              </View>
            ) : null}

            {/* STEP 6: Skin Concerns — full-width multiselect cards */}
            {step === 6 ? (
              <View style={qs.cards}>
                {SKIN_CONCERNS.map(item => (
                  <OptionCard
                    key={item.id}
                    label={item.label}
                    iconName={item.iconName}
                    isSelected={skinConcerns.includes(item.id)}
                    onPress={() => toggleItem(skinConcerns, setSkinConcerns, item.id)}
                    multiSelect
                  />
                ))}
              </View>
            ) : null}

            {/* STEP 7: Product Preferences — full-width multiselect cards */}
            {step === 7 ? (
              <View style={qs.cards}>
                {PRODUCT_PREFS.map(item => (
                  <OptionCard
                    key={item.id}
                    label={item.label}
                    iconName={item.iconName}
                    isSelected={productPrefs.includes(item.id)}
                    onPress={() => toggleItem(productPrefs, setProductPrefs, item.id)}
                    multiSelect
                  />
                ))}
              </View>
            ) : null}

            {/* STEP 8: Ethnicity — full-width multiselect cards */}
            {step === 8 ? (
              <View style={qs.cards}>
                {ETHNICITIES.map(item => (
                  <OptionCard
                    key={item.id}
                    label={item.label}
                    iconName={item.iconName}
                    isSelected={ethnicities.includes(item.id)}
                    onPress={() => toggleItem(ethnicities, setEthnicities, item.id)}
                    multiSelect
                  />
                ))}
              </View>
            ) : null}



            <View style={{ height: 16 }} />
          </ScrollView>
        </Animated.View>

        {/* ── Bottom CTA ── */}
        <View style={[qs.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          {meta.skipable ? (
            <Pressable style={qs.skipRow} onPress={goNext}>
              <Text style={qs.skipText}>Skip for now</Text>
            </Pressable>
          ) : null}

          {
            <Pressable
              style={({ pressed }) => [
                qs.continueBtn,
                !canContinue && qs.continueBtnDisabled,
                pressed && canContinue && { opacity: 0.9 },
              ]}
              onPress={canContinue ? goNext : undefined}
              disabled={!canContinue}
            >
              <LinearGradient
                colors={canContinue ? [P.pinkLight, P.pink] : ['#DDD', '#CCC']}
                start={[0, 0]} end={[1, 0]}
                style={qs.ctaGrad}
              >
                <Text style={qs.ctaText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── StyleSheets ────────────────────────────────────────────────────────────

const HERO_CARD_H = H * 0.56;

const intro = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    zIndex: 10,
  },
  skipBtn: {
    width: 60, alignItems: 'flex-end',
  },
  skipText: {
    fontSize: Fonts.sizes.sm, color: P.textLight, fontWeight: '600',
  },
  dotsRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8E0EC' },
  dotActive: { width: 22, borderRadius: 4 },

  // Carousel
  slidePage: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },

  // Hero card
  heroCardWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    height: HERO_CARD_H,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  heroCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  heroBadge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, zIndex: 2,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroImage: {
    width: '75%',
    height: '82%',
    borderRadius: 20,
    ...Shadow.sm,
  },
  tagsRow: {
    position: 'absolute',
    bottom: 16, left: 16, right: 16,
    flexDirection: 'row', gap: 8, zIndex: 2,
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5,
  },
  tagText: { fontSize: 11, fontWeight: '700' },

  // Text below hero
  textBlock: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: P.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: Fonts.sizes.base,
    color: P.textSub,
    lineHeight: 24,
  },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F4F0F8',
  },
  ctaBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaGrad: {
    height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
  },
  ctaText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
});

const loadS = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: Spacing.xl, width: '100%' },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: P.pinkPale,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 2, borderColor: P.pinkBorder,
  },
  title: {
    fontSize: Fonts.sizes.xxl, fontWeight: '800',
    color: P.text, marginBottom: 6, textAlign: 'center',
  },
  sub: {
    fontSize: Fonts.sizes.base, color: P.textSub,
    marginBottom: Spacing.xl, textAlign: 'center', lineHeight: 22,
  },
  barBg: {
    width: '100%', height: 8, backgroundColor: '#F0EEF5',
    borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.lg,
  },
  barFill: { height: '100%', backgroundColor: P.pink, borderRadius: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, alignSelf: 'flex-start',
  },
  rowCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: P.pink,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { fontSize: Fonts.sizes.sm, color: P.textSub },
});

const doneS = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  scroll: {
    alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.lg,
  },
  heroBg: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: P.pinkPale,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3, borderColor: P.pinkBorder,
  },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 28, fontWeight: '800', color: P.text,
    marginBottom: 8, letterSpacing: -0.3,
  },
  sub: {
    fontSize: Fonts.sizes.base, color: P.textSub,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg,
  },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 18, padding: 16, marginBottom: 10,
    width: '100%', borderWidth: 1.5, borderColor: P.cardBorder,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: P.pinkPale,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1.5, borderColor: P.pinkBorder,
  },
  featureTitle: {
    fontSize: Fonts.sizes.base, fontWeight: '700',
    color: P.text, marginBottom: 4,
  },
  featureDesc: {
    fontSize: Fonts.sizes.sm, color: P.textSub, lineHeight: 19,
  },
  cta: {
    width: '100%', borderRadius: Radius.full, overflow: 'hidden',
    marginTop: Spacing.lg, ...Shadow.md,
  },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
  },
  ctaText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },
});

const qs = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F4F4F8',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepCount: {
    fontSize: 12, color: P.textLight, fontWeight: '600',
    flexShrink: 0, minWidth: 36, textAlign: 'right',
  },

  qHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  qTitle: {
    fontSize: 24, fontWeight: '800', color: P.text,
    marginBottom: 6, letterSpacing: -0.3, lineHeight: 30,
  },
  qSub: {
    fontSize: Fonts.sizes.sm, color: P.textSub, lineHeight: 20,
  },
  multiHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
  },
  multiHintText: {
    fontSize: Fonts.sizes.xs, color: P.pink, fontWeight: '600',
  },

  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  cards: { gap: 0 },

  // Age picker
  agePicker: {
    height: AGE_ITEM_H * 5, overflow: 'hidden',
    marginHorizontal: Spacing.lg, position: 'relative',
  },
  ageFadeTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: AGE_ITEM_H * 1.5, zIndex: 2,
  },
  ageFadeBot: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: AGE_ITEM_H * 1.5, zIndex: 2,
  },
  ageHighlight: {
    position: 'absolute',
    top: AGE_ITEM_H * 2, left: 0, right: 0,
    height: AGE_ITEM_H,
    backgroundColor: '#FFE4EC',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: P.pink,
  },
  ageItem: { alignItems: 'center', justifyContent: 'center' },
  ageText: { fontSize: 28, fontWeight: '500', color: '#C8C8D8' },
  ageTextSelected: { fontSize: 42, fontWeight: '900', color: P.pink },
  ageSelectedNum: {
    fontSize: 42, fontWeight: '900', color: P.pink,
    textShadowColor: 'rgba(255, 51, 102, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: P.bg,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  skipRow: {
    alignItems: 'center', paddingBottom: 8,
  },
  skipText: {
    fontSize: Fonts.sizes.sm, color: P.textLight, fontWeight: '500',
  },
  continueBtn: {
    borderRadius: Radius.full, overflow: 'hidden', ...Shadow.md,
  },
  continueBtnDisabled: { opacity: 0.55 },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
  },
  ctaText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: '#fff' },

});
