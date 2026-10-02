import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import { COLOR_SEASONS } from '@/services/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';

const SKIN_TYPES = ['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive'];
const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Coily'];

// ── Design tokens ──────────────────────────────────────────────────────────
const P = {
  pink: '#FF3366',
  pinkLight: '#FF6B95',
  pinkPale: '#FFF0F4',
  pinkBorder: '#FFD0DC',
};

// ── Guest Profile Banner ───────────────────────────────────────────────────
function GuestBanner({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={guestStyles.root}>
      {/* Hero */}
      <LinearGradient
        colors={[P.pinkPale, '#FFF8FC']}
        style={guestStyles.hero}
      >
        <View style={guestStyles.avatarCircle}>
          <Ionicons name="person-outline" size={40} color={P.pink} />
        </View>
        <Text style={guestStyles.heroTitle}>You are browsing as a Guest</Text>
        <Text style={guestStyles.heroSub}>
          Sign in to save your scans, track your progress, and unlock personalized beauty insights.
        </Text>
      </LinearGradient>

      {/* Sign In CTA */}
      <View style={guestStyles.ctaBlock}>
        <Pressable
          style={({ pressed }) => [guestStyles.signInBtn, pressed && { opacity: 0.9 }]}
          onPress={onSignIn}
        >
          <LinearGradient
            colors={[P.pinkLight, P.pink]}
            start={[0, 0]} end={[1, 0]}
            style={guestStyles.signInGrad}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={guestStyles.signInText}>Sign In / Create Account</Text>
          </LinearGradient>
        </Pressable>

        <Text style={guestStyles.ctaNote}>Free forever · No credit card needed</Text>
      </View>

      {/* Feature list */}
      <View style={guestStyles.featuresCard}>
        <Text style={guestStyles.featuresTitle}>What you unlock with an account</Text>
        {[
          { iconName: 'scan-outline' as const, label: 'Save all your scan results to the cloud' },
          { iconName: 'bar-chart-outline' as const, label: 'Track your beauty score progress over time' },
          { iconName: 'sparkles' as const, label: 'Get AI-personalized product recommendations' },
          { iconName: 'person-circle-outline' as const, label: 'Build your full beauty profile' },
          { iconName: 'gift-outline' as const, label: 'Earn streak rewards and referral bonuses' },
        ].map((f, i) => (
          <View key={i} style={guestStyles.featureRow}>
            <View style={guestStyles.featureIcon}>
              <Ionicons name={f.iconName} size={16} color={P.pink} />
            </View>
            <Text style={guestStyles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const guestStyles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: P.pinkBorder,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: P.pinkBorder, marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  heroTitle: {
    fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold,
    color: '#1A1A2E', marginBottom: 8, textAlign: 'center',
  },
  heroSub: {
    fontSize: Fonts.sizes.sm, color: '#8A8A9A',
    lineHeight: 21, textAlign: 'center',
  },
  ctaBlock: {
    paddingHorizontal: Spacing.md, marginBottom: Spacing.md, alignItems: 'center',
  },
  signInBtn: {
    width: '100%', borderRadius: Radius.full, overflow: 'hidden', marginBottom: 10, ...Shadow.md,
  },
  signInGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17,
  },
  signInText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: '#fff' },
  ctaNote: { fontSize: Fonts.sizes.xs, color: '#AAAACC', fontWeight: '500' },
  featuresCard: {
    marginHorizontal: Spacing.md, backgroundColor: '#FAFAFA',
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1.5, borderColor: '#EBEBF0',
  },
  featuresTitle: {
    fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: '#1A1A2E',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 11,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: P.pinkPale, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, borderWidth: 1.5, borderColor: P.pinkBorder,
  },
  featureLabel: {
    flex: 1, fontSize: Fonts.sizes.sm, color: '#555568', lineHeight: 19, fontWeight: '500',
  },
});

// ── Delete Account Modal (authenticated users) ────────────────────────────
function DeleteAccountModal({
  visible,
  email,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  email: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { sendOTP, verifyOTPAndLogin } = useAuth();
  const { showAlert } = useAlert();
  const [phase, setPhase] = useState<'confirm' | 'otp'>('confirm');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const resetAndClose = () => {
    setPhase('confirm');
    setOtp('');
    onClose();
  };

  const handleSendOTP = async () => {
    setSending(true);
    const { error } = await sendOTP(email);
    setSending(false);
    if (error) {
      showAlert('Could Not Send Code', error);
    } else {
      setPhase('otp');
    }
  };

  const handleVerifyAndDelete = async () => {
    if (!otp.trim()) {
      showAlert('Code Required', 'Please enter the verification code sent to your email.');
      return;
    }
    setVerifying(true);
    try {
      // Step 1: verify OTP to confirm identity
      const { error: otpError } = await verifyOTPAndLogin(email, otp.trim());
      if (otpError) {
        showAlert('Verification Failed', otpError);
        setVerifying(false);
        return;
      }

      // Step 2: get fresh session token
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showAlert('Session Error', 'Could not retrieve session. Please sign in again.');
        setVerifying(false);
        return;
      }

      // Step 3: call delete-account Edge Function
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
        body: {},
      });

      if (fnError) {
        let message = fnError.message;
        if (fnError instanceof FunctionsHttpError) {
          try {
            const text = await fnError.context?.text();
            message = text || message;
          } catch {}
        }
        showAlert('Deletion Failed', message);
        setVerifying(false);
        return;
      }

      // Step 4: clear all local data and sign out
      await AsyncStorage.clear();
      await supabase.auth.signOut();

      setVerifying(false);
      onDeleted();
    } catch (err) {
      console.error('Delete account error:', err);
      showAlert('Error', 'Something went wrong. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={delModalS.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} />
        <View style={delModalS.sheet}>
          {/* Header */}
          <View style={delModalS.iconRow}>
            <View style={delModalS.iconCircle}>
              <Ionicons name="warning-outline" size={28} color="#EF4444" />
            </View>
          </View>

          {phase === 'confirm' ? (
            <>
              <Text style={delModalS.title}>Delete Account</Text>
              <Text style={delModalS.body}>
                This action is permanent and cannot be undone. All your scans, progress, and beauty profile will be deleted.
              </Text>
              <Text style={delModalS.emailNote}>
                We will send a verification code to:{`\n`}
                <Text style={delModalS.emailBold}>{email}</Text>
              </Text>

              <Pressable
                style={({ pressed }) => [delModalS.redBtn, pressed && { opacity: 0.85 }, sending && delModalS.btnDisabled]}
                onPress={handleSendOTP}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={delModalS.redBtnText}>Send Verification Code</Text>
                )}
              </Pressable>
              <Pressable style={delModalS.cancelBtn} onPress={resetAndClose}>
                <Text style={delModalS.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={delModalS.title}>Verify Your Identity</Text>
              <Text style={delModalS.body}>
                Enter the 4-digit code sent to{' '}
                <Text style={delModalS.emailBold}>{email}</Text>
              </Text>

              <TextInput
                style={delModalS.otpInput}
                placeholder="· · · ·"
                placeholderTextColor="#BBBBCC"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus
                accessibilityLabel="Verification code"
              />

              <Pressable
                style={({ pressed }) => [delModalS.redBtn, pressed && { opacity: 0.85 }, verifying && delModalS.btnDisabled]}
                onPress={handleVerifyAndDelete}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={delModalS.redBtnText}>Verify & Delete Account</Text>
                )}
              </Pressable>
              <Pressable style={delModalS.cancelBtn} onPress={() => { setPhase('confirm'); setOtp(''); }}>
                <Text style={delModalS.cancelText}>Back</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const delModalS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
  },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FECACA',
  },
  title: {
    fontSize: 20, fontWeight: '800', color: '#1A1A2E',
    textAlign: 'center', marginBottom: 10,
  },
  body: {
    fontSize: 14, color: '#6B7280', lineHeight: 21,
    textAlign: 'center', marginBottom: 14,
  },
  emailNote: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    marginBottom: 20, lineHeight: 19,
  },
  emailBold: { fontWeight: '700', color: '#374151' },
  otpInput: {
    borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 14, paddingVertical: 16,
    fontSize: 28, fontWeight: '700',
    color: '#1A1A2E', letterSpacing: 10,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  redBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 50, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, minHeight: 52,
  },
  btnDisabled: { opacity: 0.55 },
  redBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 12,
  },
  cancelText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
});

// ── Main Profile Screen ────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { user, updateUser, uploadAvatar, notificationsEnabled, toggleNotifications } = useUser();
  const { subscribed, tier, expiresAt, isTrial, openPortal, checkLoading } = useSubscription();
  const { showAlert } = useAlert();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const season = COLOR_SEASONS[user.colorSeason];

  const handleDeleteGuestData = () => {
    showAlert(
      'Delete Guest Data',
      'Are you sure? All local scan history and settings will be permanently cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Data',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/');
          },
        },
      ]
    );
  };

  // ── Guest mode ─────────────────────────────────────────────────────────
  if (!authUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <GuestBanner onSignIn={() => router.push('/login')} />
          {/* Delete guest data */}
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
            onPress={handleDeleteGuestData}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Guest Data</Text>
          </Pressable>
          <Text style={[styles.version, { marginTop: Spacing.sm }]}>BeautyHer v1.0 · Made with 💗</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Authenticated user ─────────────────────────────────────────────────

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ('images' as any),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setAvatarUploading(true);
    try {
      await uploadAvatar(result.assets[0].uri);
    } catch (err) {
      console.error('Avatar upload error:', err);
      showAlert('Upload Failed', 'Could not update your profile photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleManageSubscription = async () => {
    // IAP users manage subscriptions via App Store Settings
    const { Linking, Platform } = require('react-native');
    if (Platform.OS === 'ios') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {
        showAlert('Manage Subscription', 'Go to iPhone Settings → Apple ID → Subscriptions to manage your BeautyHer subscription.');
      });
      return;
    }
    const { error } = await openPortal();
    if (error) {
      showAlert('Cannot Open Portal', 'Please ensure you have an active subscription, then try again.');
    }
  };

  const handleLogout = () => {
    showAlert(
      'Log Out',
      'Are you sure you want to log out of BeautyHer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await logout();
            if (error) {
              showAlert('Error', error);
            } else {
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    { icon: 'sparkles-outline', label: 'Beauty Goals', value: user.beautyGoals.join(', '), action: () => {} },
    { icon: 'color-palette-outline', label: 'Color Analysis', value: season.name, action: () => router.push('/color-analysis') },
    { icon: 'trending-up-outline', label: 'Glow-Up Plan', value: '7-Day Active', action: () => router.push('/glow-up') },
    { icon: 'chatbubble-ellipses-outline', label: 'AI Beauty Coach', value: 'Chat now', action: () => router.push('/ai-chat') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          style={styles.profileCard}
        >
          <Pressable
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
            onPress={handlePickAvatar}
            disabled={avatarUploading}
            accessibilityLabel="Change profile photo"
          >
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImg}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="camera" size={12} color={Colors.primary} />
              )}
            </View>
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>{season.emoji}</Text>
            </View>
          </Pressable>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{user.streak}</Text>
              <Text style={styles.profileStatLabel}>Day Streak</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{user.totalScans}</Text>
              <Text style={styles.profileStatLabel}>Scans</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{user.beautyScore}</Text>
              <Text style={styles.profileStatLabel}>Score</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Subscription Status */}
        {subscribed ? (
          <LinearGradient
            colors={[Colors.accent, 'rgba(232,207,167,0.4)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.card, styles.premiumCard]}
          >
            <View style={styles.premiumRow}>
              <View style={styles.premiumLeft}>
                <Text style={styles.premiumEmoji}>👑</Text>
                <View>
                  <Text style={styles.premiumTitle}>Premium Active</Text>
                  <Text style={styles.premiumTier}>
                    {tier === 'founding' ? 'Founding Member' : tier === 'yearly' ? 'Yearly Plan' : tier === 'annual' ? 'Annual Plan' : tier === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'}
                    {isTrial ? ' · Free Trial' : ''}
                  </Text>
                  {expiresAt ? (
                    <Text style={styles.premiumExpiry}>
                      {isTrial ? 'Trial ends ' : 'Renews '}
                      {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.75 }]}
                onPress={handleManageSubscription}
                disabled={checkLoading}
              >
                {checkLoading ? (
                  <ActivityIndicator size="small" color={Colors.primaryDark} />
                ) : (
                  <Text style={styles.manageBtnText}>Manage</Text>
                )}
              </Pressable>
            </View>
          </LinearGradient>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.card, styles.upgradeCard, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            onPress={() => router.push('/subscription')}
          >
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.upgradeIconWrap}
            >
              <Ionicons name="sparkles" size={18} color={Colors.textInverse} />
            </LinearGradient>
            <View style={styles.upgradeBody}>
              <Text style={styles.upgradeTitle}>Unlock Premium</Text>
              <Text style={styles.upgradeSub}>Unlimited scans · AI coach · 3-day free trial</Text>
            </View>
            <View style={styles.upgradeArrow}>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </View>
          </Pressable>
        )}

        {/* Skin & Hair */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Beauty Profile</Text>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Skin Type</Text>
            <View style={styles.prefChips}>
              {SKIN_TYPES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.prefChip, user.skinType === t && styles.prefChipActive]}
                  onPress={() => updateUser({ skinType: t })}
                >
                  <Text style={[styles.prefChipText, user.skinType === t && styles.prefChipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Hair Type</Text>
            <View style={styles.prefChips}>
              {HAIR_TYPES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.prefChip, user.hairType === t && styles.prefChipActive]}
                  onPress={() => updateUser({ hairType: t })}
                >
                  <Text style={[styles.prefChipText, user.hairType === t && styles.prefChipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Beauty Tools</Text>
          {settingsItems.map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.settingRow,
                i < settingsItems.length - 1 && styles.settingRowBorder,
                pressed && { backgroundColor: Colors.surfaceTinted },
              ]}
              onPress={item.action}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue} numberOfLines={1}>{item.value}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingSubLabel}>Reminders & beauty tips</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Log Out */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          {[
            { icon: 'document-text-outline', label: 'Terms of Use', route: '/terms' },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', route: '/privacy' },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.settingRow,
                i === 0 && styles.settingRowBorder,
                pressed && { backgroundColor: Colors.surfaceTinted },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </Pressable>
          ))}
        </View>

        {/* Delete Account */}
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </Pressable>

        <Text style={styles.version}>BeautyHer v1.0 · Made with 💗</Text>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          visible={deleteModalVisible}
          email={user.email}
          onClose={() => setDeleteModalVisible(false)}
          onDeleted={async () => {
            setDeleteModalVisible(false);
            router.replace('/');
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  headerTitle: { fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, color: Colors.text },
  profileCard: {
    marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.md, ...Shadow.md,
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    ...Shadow.sm,
  },
  avatarText: { fontSize: Fonts.sizes.xxxl, fontWeight: Fonts.weights.bold, color: Colors.textInverse },
  seasonBadge: {
    position: 'absolute', right: -4, bottom: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  seasonBadgeText: { fontSize: 14 },
  profileName: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textInverse },
  profileEmail: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: Spacing.md },
  profileStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  profileStat: { alignItems: 'center' },
  profileStatNum: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.textInverse },
  profileStatLabel: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  profileStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  card: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm,
  },
  cardTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.text, marginBottom: 12 },
  prefRow: { marginBottom: 12 },
  prefLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: 8, fontWeight: Fonts.weights.medium },
  prefChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prefChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  prefChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  prefChipText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },
  prefChipTextActive: { color: Colors.textInverse, fontWeight: Fonts.weights.semibold },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: Fonts.sizes.base, color: Colors.text, fontWeight: Fonts.weights.medium },
  settingSubLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 120 },
  settingValue: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, flexShrink: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  logoutBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.error,
  },
  version: { textAlign: 'center', fontSize: Fonts.sizes.xs, color: Colors.textLight, marginTop: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 12,
  },
  deleteBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    color: '#EF4444',
  },

  // Premium active card
  premiumCard: { padding: 0, overflow: 'hidden' },
  premiumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  premiumLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  premiumEmoji: { fontSize: 28 },
  premiumTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.primaryDark },
  premiumTier: { fontSize: Fonts.sizes.sm, color: Colors.primaryDark, fontWeight: Fonts.weights.medium, opacity: 0.85 },
  premiumExpiry: { fontSize: Fonts.sizes.xs, color: Colors.primaryDark, opacity: 0.65, marginTop: 2 },
  manageBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.primaryDark,
    minWidth: 70, alignItems: 'center',
  },
  manageBtnText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: Colors.primaryDark },

  // Free/upgrade card
  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  upgradeIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  upgradeBody: { flex: 1 },
  upgradeTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.text },
  upgradeSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  upgradeArrow: { flexShrink: 0 },
});
