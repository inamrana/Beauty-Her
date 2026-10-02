import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/template';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';

const { width: W, height: H } = Dimensions.get('window');
// Show splash for a minimum of 2.8 s
const SPLASH_MIN_MS = 2800;

// ── Animated floating sparkle dot ─────────────────────────────────────────
function Sparkle({
  x, y, size, delay, color,
}: { x: number; y: number; size: number; delay: number; color: string }) {
  const op = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(op, { toValue: 0.85, duration: 900, delay, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, delay, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 1200, delay, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(op, { toValue: 0.15, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.5, duration: 900, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        splashStyles.sparkle,
        {
          left: x, top: y, width: size, height: size, borderRadius: size / 2,
          backgroundColor: color,
          opacity: op,
          transform: [{ scale }, { translateY }],
        },
      ]}
    />
  );
}

// ── Splash screen component ───────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  // Entry animations
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const taglineOp = useRef(new Animated.Value(0)).current;
  const dotsOp = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  // Exit animation
  const rootOp = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
      // Title fades in
      Animated.timing(textOp, { toValue: 1, duration: 420, delay: 80, useNativeDriver: true }),
      // Tagline
      Animated.timing(taglineOp, { toValue: 1, duration: 360, delay: 60, useNativeDriver: true }),
      // Loading dots
      Animated.timing(dotsOp, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Loading dot pulse loop
    const dotLoop = Animated.loop(
      Animated.stagger(180, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ]),
      ])
    );
    dotLoop.start();

    // Exit after minimum time
    const timer = setTimeout(() => {
      dotLoop.stop();
      Animated.timing(rootOp, { toValue: 0, duration: 480, useNativeDriver: true }).start(() => {
        onDone();
      });
    }, SPLASH_MIN_MS);

    return () => {
      clearTimeout(timer);
      dotLoop.stop();
    };
  }, []);

  const SPARKLES = [
    { x: W * 0.08, y: H * 0.12, size: 10, delay: 0,   color: '#F9CDD8' },
    { x: W * 0.82, y: H * 0.09, size: 8,  delay: 200, color: '#E8C8F8' },
    { x: W * 0.15, y: H * 0.32, size: 6,  delay: 400, color: '#FAD8E8' },
    { x: W * 0.78, y: H * 0.28, size: 12, delay: 150, color: '#F0D0F0' },
    { x: W * 0.05, y: H * 0.68, size: 9,  delay: 300, color: '#F5C8D8' },
    { x: W * 0.88, y: H * 0.62, size: 7,  delay: 500, color: '#E8D0F8' },
    { x: W * 0.22, y: H * 0.78, size: 11, delay: 100, color: '#FCC8DC' },
    { x: W * 0.72, y: H * 0.80, size: 6,  delay: 350, color: '#F0C8F0' },
    { x: W * 0.50, y: H * 0.10, size: 8,  delay: 250, color: '#F8D8E8' },
    { x: W * 0.35, y: H * 0.88, size: 10, delay: 420, color: '#ECC8F8' },
  ];

  return (
    <Animated.View style={[splashStyles.root, { opacity: rootOp }]}>
      <LinearGradient
        colors={['#FFF0F4', '#FFF8FC', '#FFFBFE']}
        start={[0, 0]}
        end={[1, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating sparkles */}
      {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}

      {/* Background glow rings */}
      <View style={splashStyles.glowRing1} />
      <View style={splashStyles.glowRing2} />

      {/* Center content */}
      <View style={splashStyles.center}>
        {/* Logo */}
        <Animated.View
          style={[
            splashStyles.logoWrap,
            { opacity: logoOp, transform: [{ scale: logoScale }] },
          ]}
        >
          <LinearGradient
            colors={['#FFF0F6', '#FFDDE8']}
            style={splashStyles.logoGlow}
          />
          <Image
            source={require('@/assets/logo-512.png')}
            style={splashStyles.logo}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>

        {/* Brand name */}
        <Animated.View style={{ opacity: textOp, alignItems: 'center' }}>
          <Text style={splashStyles.brandName}>BeautyHer</Text>
          <View style={splashStyles.accentLine} />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[splashStyles.tagline, { opacity: taglineOp }]}>
          Your AI Beauty Companion ✨
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <Animated.View style={[splashStyles.dotsRow, { opacity: dotsOp }]}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              splashStyles.dot,
              { opacity: anim, transform: [{ scale: anim }] },
            ]}
          />
        ))}
      </Animated.View>

      {/* Bottom branding */}
      <Animated.Text style={[splashStyles.footer, { opacity: taglineOp }]}>
        beautyher.app
      </Animated.Text>
    </Animated.View>
  );
}

// ── Root index ────────────────────────────────────────────────────────────
export default function Index() {
  const [splashDone, setSplashDone] = useState(false);
  const { user: authUser } = useAuth();
  const { user } = useUser();

  // Splash shows for the minimum duration — no AsyncStorage needed for routing
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  // Authenticated user who hasn't completed profile setup
  if (authUser && !user.setupComplete) {
    return <Redirect href="/setup-profile" />;
  }

  // Authenticated user → dashboard (skip onboarding)
  if (authUser) {
    return <Redirect href="/(tabs)" />;
  }

  // All unauthenticated users → onboarding carousel first (always)
  return <Redirect href="/onboarding" />;
}

// ── Styles ────────────────────────────────────────────────────────────────
const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8FC',
  },
  sparkle: {
    position: 'absolute',
  },
  glowRing1: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: 'rgba(255,182,204,0.08)',
    top: H * 0.5 - W * 0.45,
    left: W * 0.05,
  },
  glowRing2: {
    position: 'absolute',
    width: W * 0.6,
    height: W * 0.6,
    borderRadius: W * 0.3,
    backgroundColor: 'rgba(240,130,170,0.06)',
    top: H * 0.5 - W * 0.3,
    left: W * 0.2,
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.7,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 28,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#C0527A',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  accentLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F0A0C0',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#C080A0',
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: H * 0.14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E090B8',
  },
  footer: {
    position: 'absolute',
    bottom: H * 0.06,
    fontSize: 11,
    color: '#D0A0B8',
    fontWeight: '500',
    letterSpacing: 0.8,
  },
});
