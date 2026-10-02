import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { signInWithGoogle } from '@/services/socialOAuthService';
import { signInWithApple, isAppleAuthAvailable } from '@/services/appleAuthService';
import { AppleSignInButton } from '@/components/feature/AppleSignInButton';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useUser } from '@/hooks/useUser';

type Mode = 'login' | 'register' | 'otp' | 'forgot' | 'reset-otp' | 'new-password';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { user } = useUser();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExistsBanner, setEmailExistsBanner] = useState(false);
  // Forgot-password flow state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Check Apple Sign In availability once on mount
  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) {
      showAlert('Login Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  };

  const switchToLoginWithEmail = (existingEmail: string) => {
    setMode('login');
    setEmail(existingEmail.trim());
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setEmailExistsBanner(true);
  };

  const checkEmailExists = async (emailVal: string): Promise<boolean | null> => {
    if (!emailVal.trim() || !emailVal.includes('@')) return false;
    setCheckingEmail(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('check-email', {
        body: { email: emailVal.trim().toLowerCase() },
      });
      setCheckingEmail(false);
      if (error) return null;
      if (data?.exists === true) {
        switchToLoginWithEmail(emailVal);
        return true;
      }
      return false;
    } catch {
      setCheckingEmail(false);
      return null;
    }
  };

  const handleSendOTP = async () => {
    if (!fullName.trim()) {
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      showAlert('Email Required', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      showAlert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Passwords Do Not Match', 'Please make sure your passwords match.');
      return;
    }
    const checkResult = await checkEmailExists(email);
    if (checkResult === true) return;
    if (checkResult === null) {
      showAlert('Verification Error', 'Could not verify email availability. Please check your connection and try again.');
      return;
    }
    const { error } = await sendOTP(email.trim());
    if (error) {
      showAlert('Could Not Send Code', error);
    } else {
      setMode('otp');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showAlert('Code Required', 'Please enter the verification code sent to your email.');
      return;
    }
    const { error, user: newUser } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) {
      showAlert('Verification Failed', error);
      return;
    }
    if (!newUser?.id) {
      showAlert('Something went wrong', 'Please try again.');
      return;
    }
    const createdAt = newUser.created_at ? new Date(newUser.created_at).getTime() : 0;
    const isNewUser = Date.now() - createdAt < 3 * 60 * 1000;
    if (!isNewUser) {
      showAlert(
        'Welcome Back',
        'This email is already registered. You have been signed in to your existing account.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );
      return;
    }
    const supabase = getSupabaseClient();
    if (fullName.trim()) {
      await supabase
        .from('user_profiles')
        .update({ username: fullName.trim() })
        .eq('id', newUser.id);
    }
    router.replace('/setup-profile');
  };

  // ── Google Sign In ───────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok && result.code !== 'cancelled') {
      showAlert('Google Sign-In Failed', result.message ?? 'Please try again.');
    }
  };

  // ── Sign in with Apple ────────────────────────────────────────────────────
  const handleApple = async () => {
    setAppleLoading(true);
    const result = await signInWithApple();
    setAppleLoading(false);
    if (!result.ok && result.code !== 'cancelled') {
      showAlert('Apple Sign-In Failed', result.message ?? 'Please try again.');
    }
    // On success the AuthProvider's onAuthStateChange fires → AuthRouter navigates
  };

  // ── Forgot password: send OTP ────────────────────────────────────────────
  const handleForgotSendOTP = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      showAlert('Email Required', 'Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    const { error } = await sendOTP(forgotEmail.trim());
    setForgotLoading(false);
    if (error) {
      showAlert('Could Not Send Code', error);
    } else {
      setForgotOtp('');
      setMode('reset-otp');
    }
  };

  // ── Forgot password: verify OTP → proceed to set new password ────────────
  const handleForgotVerifyOTP = async () => {
    if (!forgotOtp.trim()) {
      showAlert('Code Required', 'Please enter the verification code sent to your email.');
      return;
    }
    setForgotLoading(true);
    // Verify OTP — we pass a temp password; user will set real one next
    const { error } = await verifyOTPAndLogin(forgotEmail.trim(), forgotOtp.trim());
    setForgotLoading(false);
    if (error) {
      showAlert('Verification Failed', 'The code is incorrect or has expired. Please try again.');
      return;
    }
    setNewPassword('');
    setNewPasswordConfirm('');
    setMode('new-password');
  };

  // ── Forgot password: update to new password ───────────────────────────────
  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      showAlert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showAlert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }
    setForgotLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showAlert('Update Failed', error.message);
        setForgotLoading(false);
        return;
      }
      setForgotLoading(false);
      showAlert(
        'Password Updated',
        'Your password has been changed successfully. You are now signed in.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err) {
      setForgotLoading(false);
      showAlert('Error', 'Could not update password. Please try again.');
    }
  };

  const heroTitles: Record<Mode, string> = {
    login: 'Welcome Back',
    register: 'Join BeautyHer',
    otp: 'Check Your Email',
    forgot: 'Reset Password',
    'reset-otp': 'Verify Your Email',
    'new-password': 'Set New Password',
  };
  const heroSubs: Record<Mode, string> = {
    login: 'Your beauty journey continues',
    register: 'Start your glow-up today',
    otp: `We sent a 4-digit code to ${email}`,
    forgot: 'Enter your email to receive a reset code',
    'reset-otp': `We sent a 4-digit code to ${forgotEmail}`,
    'new-password': 'Choose a new secure password',
  };

  const isAnyLoading = operationLoading || googleLoading || appleLoading || checkingEmail;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gradient Hero */}
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/logo-512.png')}
              style={styles.logoImg}
              contentFit="contain"
              transition={200}
            />
          </View>
          <Text style={styles.heroTitle}>{heroTitles[mode]}</Text>
          <Text style={styles.heroSub}>{heroSubs[mode]}</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Email-exists banner */}
          {emailExistsBanner && mode === 'login' ? (
            <View style={styles.existsBanner}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
              <Text style={styles.existsBannerText}>
                This email is already registered. Please sign in below.
              </Text>
              <Pressable hitSlop={8} onPress={() => setEmailExistsBanner(false)}>
                <Ionicons name="close" size={16} color={Colors.primary} />
              </Pressable>
            </View>
          ) : null}

          {mode === 'forgot' ? (
            <>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                accessibilityLabel="Email address for password reset"
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, forgotLoading && styles.disabled]}
                onPress={handleForgotSendOTP}
                disabled={forgotLoading}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {forgotLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Reset Code</Text>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.textBtn} onPress={() => { setMode('login'); setForgotEmail(''); }}>
                <Text style={styles.textBtnText}>Back to Sign In</Text>
              </Pressable>
            </>
          ) : mode === 'reset-otp' ? (
            <>
              <Text style={styles.fieldLabel}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="· · · ·"
                placeholderTextColor={Colors.textLight}
                value={forgotOtp}
                onChangeText={setForgotOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus
                accessibilityLabel="Password reset verification code"
              />
              <Text style={styles.otpHint}>
                Didn&apos;t receive it? Check your spam folder.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, forgotLoading && styles.disabled]}
                onPress={handleForgotVerifyOTP}
                disabled={forgotLoading}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {forgotLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify Code</Text>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.textBtn} onPress={() => setMode('forgot')}>
                <Text style={styles.textBtnText}>Back</Text>
              </Pressable>
            </>
          ) : mode === 'new-password' ? (
            <>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.textLight}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoFocus
                  accessibilityLabel="New password"
                />
                <Pressable onPress={() => setShowNewPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
                </Pressable>
              </View>
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor={Colors.textLight}
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                secureTextEntry={!showNewPassword}
                accessibilityLabel="Confirm new password"
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, forgotLoading && styles.disabled]}
                onPress={handleSetNewPassword}
                disabled={forgotLoading}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {forgotLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          ) : mode === 'otp' ? (
            <>
              <Text style={styles.fieldLabel}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="· · · ·"
                placeholderTextColor={Colors.textLight}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                accessibilityLabel="Verification code"
              />
              <Text style={styles.otpHint}>
                Didn&apos;t receive it? Check your spam folder.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, operationLoading && styles.disabled]}
                onPress={handleVerifyOTP}
                disabled={operationLoading}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {operationLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.textBtn} onPress={() => { setMode('register'); setOtp(''); }}>
                <Text style={styles.textBtnText}>Back to Registration</Text>
              </Pressable>
            </>
          ) : mode === 'register' ? (
            <>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textLight}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Full name"
              />
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailExistsBanner(false); }}
                onBlur={() => checkEmailExists(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email address"
              />
              {checkingEmail ? (
                <View style={styles.inlineCheckingWrap}>
                  <Text style={styles.inlineCheckingText}>Checking email...</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  accessibilityLabel="Password"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
                </Pressable>
              </View>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor={Colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Confirm password"
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, (operationLoading || checkingEmail) && styles.disabled]}
                onPress={handleSendOTP}
                disabled={operationLoading || checkingEmail}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {operationLoading || checkingEmail ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailExistsBanner(false); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email address"
              />
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Your password"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  accessibilityLabel="Password"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, operationLoading && styles.disabled]}
                onPress={handleLogin}
                disabled={operationLoading}
              >
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.primaryBtnInner}>
                  {operationLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* Social buttons — hidden during OTP, forgot-password steps */}
          {mode !== 'otp' && mode !== 'forgot' && mode !== 'reset-otp' && mode !== 'new-password' ? (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── iOS: Apple Sign In only ─────────────────────────────── */}
              {Platform.OS === 'ios' ? (
                appleAvailable ? (
                  <AppleSignInButton onPress={handleApple} />
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }, isAnyLoading && styles.disabled]}
                    onPress={handleApple}
                    disabled={isAnyLoading}
                    accessibilityLabel="Sign in with Apple"
                  >
                    {appleLoading ? (
                      <ActivityIndicator color={Colors.text} size="small" />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={20} color={Colors.text} />
                        <Text style={styles.googleBtnText}>Sign in with Apple</Text>
                      </>
                    )}
                  </Pressable>
                )
              ) : null}

              {/* ── Android: Google Sign In only ──────────────────────── */}
              {Platform.OS === 'android' ? (
                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }, isAnyLoading && styles.disabled]}
                  onPress={handleGoogle}
                  disabled={isAnyLoading}
                  accessibilityLabel="Continue with Google"
                >
                  {googleLoading ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                      <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <Pressable
                  onPress={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setOtp('');
                    setFullName('');
                    setEmailExistsBanner(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.toggleLink}>
                    {mode === 'login' ? 'Create Account' : 'Sign In'}
                  </Text>
                </Pressable>
              </View>
              {mode === 'login' ? (
                <Pressable
                  style={styles.forgotBtn}
                  onPress={() => { setForgotEmail(email); setMode('forgot'); }}
                  hitSlop={8}
                >
                  <Text style={styles.forgotBtnText}>Forgot Password?</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

        <Text style={[styles.legal, { paddingBottom: 8 }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>

        {/* Guest bypass */}
        <Pressable
          style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.7 }, { paddingBottom: insets.bottom + 20 }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.guestBtnText}>Continue as Guest</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.textLight} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 56,
    alignItems: 'center',
  },
  logoWrap: {
    width: 114,
    height: 114,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: Fonts.weights.heavy,
    color: Colors.textInverse,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: Fonts.sizes.base,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.xl,
    padding: Spacing.lg,
    zIndex: 10,
    ...Shadow.lg,
  },
  existsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  existsBannerText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: Fonts.weights.medium,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    marginBottom: 7,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
    marginBottom: 2,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: Fonts.weights.bold,
    letterSpacing: 12,
    marginBottom: 0,
  },
  inlineCheckingWrap: {
    marginTop: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  inlineCheckingText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  otpHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: 2,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
  },
  primaryBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  disabled: { opacity: 0.6 },
  primaryBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
    letterSpacing: 0.3,
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  textBtnText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: Fonts.weights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: Fonts.sizes.sm, color: Colors.textLight },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minHeight: 52,
  },
  googleBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  toggleText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  toggleLink: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.primary,
  },
  legal: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  guestBtnText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
  },
  forgotBtn: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: 2,
  },
  forgotBtnText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: Fonts.weights.medium,
  },
});
