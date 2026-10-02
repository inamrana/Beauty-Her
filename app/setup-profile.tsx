import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Animated,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { useAuth, useAlert } from '@/template';
import { useAIConsent } from '@/hooks/useAIConsent';
import { AIConsentModal } from '@/components/feature/AIConsentModal';

const SKIN_TYPES: { type: string; icon: string; desc: string }[] = [
  { type: 'Normal', icon: '✨', desc: 'Balanced & clear' },
  { type: 'Oily', icon: '💧', desc: 'Shine-prone zones' },
  { type: 'Dry', icon: '🌵', desc: 'Tight & flaky' },
  { type: 'Combination', icon: '⚖️', desc: 'Mix of dry & oily' },
  { type: 'Sensitive', icon: '🌸', desc: 'Easily irritated' },
];

const BEAUTY_GOALS: { label: string; icon: string }[] = [
  { label: 'Clear Skin', icon: '✨' },
  { label: 'Natural Glow', icon: '🌟' },
  { label: 'Anti-Aging', icon: '⏳' },
  { label: 'Hydration', icon: '💧' },
  { label: 'Acne Control', icon: '🎯' },
  { label: 'Even Skin Tone', icon: '🎨' },
  { label: 'Brightening', icon: '☀️' },
  { label: 'Plump Lips', icon: '💋' },
];

const TITLES = ["What's your name?", "What's your skin type?", "Your beauty goals?"];
const SUBTITLES = [
  "We'll personalize your entire BeautyHer experience",
  "We'll tailor routines and recommendations to you",
  "Choose up to 3 goals to focus your glow-up",
];

// Step 4 is the AI consent step shown before the user enters the main app

export default function SetupProfileScreen() {
  const router = useRouter();
  const { completeProfileSetup } = useUser();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [skinType, setSkinType] = useState('Combination');
  const [goals, setGoals] = useState<string[]>(['Clear Skin', 'Natural Glow']);
  const [saving, setSaving] = useState(false);
  const aiConsent = useAIConsent();
  const [showAIConsent, setShowAIConsent] = useState(false);

  const [cardW, setCardW] = useState((Dimensions.get('window').width - Spacing.md * 2 - 12) / 2);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setCardW((window.width - Spacing.md * 2 - 12) / 2);
    });
    return () => sub.remove();
  }, []);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      slideAnim.setValue(20);
      setStep(next);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const displayName = name.trim() || authUser?.email?.split('@')[0] || 'Beautiful';
      await completeProfileSetup(
        displayName,
        skinType,
        goals.length > 0 ? goals : ['Natural Glow'],
      );
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Profile setup error:', err);
      showAlert('Setup Error', 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (step < 2) {
      animateToStep(step + 1);
    } else {
      // After goals step, show AI consent before entering the app
      if (!aiConsent.consented) {
        setShowAIConsent(true);
      } else {
        handleFinish();
      }
    }
  };

  const handleAIConsentAgree = async () => {
    setShowAIConsent(false);
    await aiConsent.grantConsent();
    handleFinish();
  };

  const handleAIConsentDecline = () => {
    // User declined — still let them into the app, consent will be re-asked before any AI feature
    setShowAIConsent(false);
    handleFinish();
  };

  const toggleGoal = (goal: string) => {
    setGoals(prev => {
      if (prev.includes(goal)) {
        return prev.length > 1 ? prev.filter(g => g !== goal) : prev;
      }
      if (prev.length >= 3) {
        showAlert('Up to 3 goals', 'Deselect a goal to choose a different one.');
        return prev;
      }
      return [...prev, goal];
    });
  };

  return (
    <LinearGradient colors={[Colors.secondary, Colors.background, Colors.background]} style={{ flex: 1 }}>
      <AIConsentModal
        visible={showAIConsent}
        onAgree={handleAIConsentAgree}
        onDecline={handleAIConsentDecline}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.logo}>BeautyHer</Text>
            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
              hitSlop={8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.textLight} />
              ) : (
                <Text style={styles.skipText}>Skip</Text>
              )}
            </Pressable>
          </View>

          {/* ── Progress bar ── */}
          <View style={styles.progressRow}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i < step && styles.progressBarDone,
                  i === step && styles.progressBarActive,
                ]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <Text style={styles.stepBadge}>Step {step + 1} of 3</Text>
              <Text style={styles.title}>{TITLES[step]}</Text>
              <Text style={styles.subtitle}>{SUBTITLES[step]}</Text>

              {/* ── Step 0: Name ── */}
              {step === 0 ? (
                <View style={styles.nameBlock}>
                  <LinearGradient
                    colors={[Colors.primaryLight, Colors.primary]}
                    style={styles.avatarCircle}
                  >
                    <Text style={styles.avatarChar}>
                      {name.trim() ? name.trim().charAt(0).toUpperCase() : '✨'}
                    </Text>
                  </LinearGradient>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Your name..."
                    placeholderTextColor={Colors.textLight}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    maxLength={30}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    accessibilityLabel="Display name"
                  />
                  <Text style={styles.nameHint}>
                    Optional — we will use your email prefix if left blank
                  </Text>
                </View>
              ) : null}

              {/* ── Step 1: Skin Type ── */}
              {step === 1 ? (
                <View style={styles.skinGrid}>
                  {SKIN_TYPES.map(({ type, icon, desc }) => {
                    const sel = skinType === type;
                    return (
                      <Pressable
                        key={type}
                        style={({ pressed }) => [
                          styles.skinCard,
                          { width: cardW },
                          sel && styles.skinCardActive,
                          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                        ]}
                        onPress={() => setSkinType(type)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
                      >
                        {sel ? (
                          <View style={styles.checkCorner}>
                            <Ionicons name="checkmark" size={11} color={Colors.textInverse} />
                          </View>
                        ) : null}
                        <Text style={styles.skinCardIcon}>{icon}</Text>
                        <Text style={[styles.skinCardName, sel && styles.skinCardNameActive]}>{type}</Text>
                        <Text style={[styles.skinCardDesc, sel && styles.skinCardDescActive]}>{desc}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {/* ── Step 2: Goals ── */}
              {step === 2 ? (
                <>
                  <View style={styles.goalsGrid}>
                    {BEAUTY_GOALS.map(({ label, icon }) => {
                      const sel = goals.includes(label);
                      return (
                        <Pressable
                          key={label}
                          style={({ pressed }) => [
                            styles.goalChip,
                            { width: cardW },
                            sel && styles.goalChipActive,
                            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                          ]}
                          onPress={() => toggleGoal(label)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: sel }}
                        >
                          <Text style={styles.goalIcon}>{icon}</Text>
                          <Text
                            style={[styles.goalLabel, sel && styles.goalLabelActive]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                          {sel ? (
                            <Ionicons name="checkmark-circle" size={17} color={Colors.primary} />
                          ) : (
                            <View style={styles.goalEmptyCircle} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.goalsCounter}>{goals.length}/3 selected</Text>
                </>
              ) : null}
            </Animated.View>
          </ScrollView>

          {/* ── Footer CTA ── */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                saving && { opacity: 0.65 },
                pressed && !saving && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleContinue}
              disabled={saving}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtnInner}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.ctaBtnText}>
                      {step < 2 ? 'Continue' : 'Start My Glow-Up'}
                    </Text>
                    <Text style={styles.ctaBtnArrow}>{step < 2 ? '→' : '✨'}</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  logo: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  skipBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressBarDone: {
    backgroundColor: Colors.primaryLight,
  },
  progressBarActive: {
    backgroundColor: Colors.primary,
  },

  // Scroll
  scroll: {
    padding: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  stepBadge: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 30,
    fontWeight: Fonts.weights.heavy,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // Step 0 - Name
  nameBlock: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  avatarChar: {
    fontSize: 42,
    color: Colors.textInverse,
    fontWeight: Fonts.weights.bold,
    lineHeight: 50,
  },
  nameInput: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.medium,
    color: Colors.text,
    textAlign: 'center',
    ...Shadow.sm,
  },
  nameHint: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Step 1 - Skin Type
  skinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  skinCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    minHeight: 110,
    justifyContent: 'center',
    ...Shadow.sm,
  },
  skinCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  checkCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinCardIcon: { fontSize: 30, lineHeight: 36 },
  skinCardName: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    marginTop: 2,
  },
  skinCardNameActive: { color: Colors.primaryDark },
  skinCardDesc: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
  skinCardDescActive: { color: Colors.textSecondary },

  // Step 2 - Goals
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
    ...Shadow.sm,
  },
  goalChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  goalIcon: { fontSize: 18, lineHeight: 22 },
  goalLabel: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    color: Colors.text,
  },
  goalLabelActive: {
    color: Colors.primaryDark,
    fontWeight: Fonts.weights.semibold,
  },
  goalEmptyCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goalsCounter: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },

  // Footer
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  ctaBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.md,
  },
  ctaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    minHeight: 56,
  },
  ctaBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
    letterSpacing: 0.3,
  },
  ctaBtnArrow: {
    fontSize: 18,
    color: Colors.textInverse,
    lineHeight: 22,
  },
});
