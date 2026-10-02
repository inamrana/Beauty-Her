/**
 * AIConsentModal — one-time disclosure modal shown before a user's
 * first AI beauty scan.
 *
 * Apple App Store requirement: apps that share personal data with a
 * third-party AI service must:
 *   1. Disclose what data will be sent
 *   2. Identify who the data is sent to
 *   3. Obtain the user's permission before sending
 *
 * This modal satisfies all three requirements.
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

interface AIConsentModalProps {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

interface DisclosureRowProps {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

function DisclosureRow({ icon, iconColor, iconBg, title, description }: DisclosureRowProps) {
  return (
    <View style={rowStyles.container}>
      <View style={[rowStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.desc}>{description}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    lineHeight: 19,
  },
  desc: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});

export function AIConsentModal({ visible, onAgree, onDecline }: AIConsentModalProps) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />

      {/* Sheet */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header gradient */}
          <LinearGradient
            colors={[Colors.primaryLight + '22', Colors.primary + '08']}
            style={styles.headerGrad}
          >
            <View style={styles.headerIconWrap}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                style={styles.headerIconGrad}
              >
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>AI Analysis & Data Sharing</Text>
            <Text style={styles.headerSub}>
              Before your first scan, please review how your photo is used.
            </Text>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* What is collected */}
            <Text style={styles.sectionLabel}>WHAT DATA IS COLLECTED</Text>
            <View style={styles.disclosureCard}>
              <DisclosureRow
                icon="camera-outline"
                iconColor="#E91E8C"
                iconBg="#FCE4F3"
                title="Your Photo"
                description="The photo you submit for analysis. This may include your face, skin tone, and facial features."
              />
              <DisclosureRow
                icon="analytics-outline"
                iconColor="#2196F3"
                iconBg="#E3F2FD"
                title="Facial & Skin Metrics"
                description="Face shape, skin tone, undertone, texture, clarity, hydration, and symmetry scores derived from your photo."
              />
              <View style={[rowStyles.container, { borderBottomWidth: 0 }]}>
                <View style={[rowStyles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="sparkles-outline" size={18} color="#4CAF50" />
                </View>
                <View style={rowStyles.textWrap}>
                  <Text style={rowStyles.title}>Beauty Recommendations</Text>
                  <Text style={rowStyles.desc}>
                    Personalised skincare, makeup, and lifestyle tips generated from your analysis.
                  </Text>
                </View>
              </View>
            </View>

            {/* Who data is sent to */}
            <Text style={styles.sectionLabel}>WHO RECEIVES YOUR DATA</Text>
            <View style={styles.disclosureCard}>
              <View style={styles.thirdPartyRow}>
                <View style={styles.thirdPartyLogo}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                </View>
                <View style={styles.thirdPartyInfo}>
                  <Text style={styles.thirdPartyName}>Google Gemini (via OnSpace AI)</Text>
                  <Text style={styles.thirdPartyDesc}>
                    Your photo is securely transmitted to Google Gemini multimodal AI to perform the beauty analysis. Google does not retain your photo after the analysis is complete.
                  </Text>
                </View>
              </View>
            </View>

            {/* Key protections */}
            <Text style={styles.sectionLabel}>YOUR PRIVACY PROTECTIONS</Text>
            <View style={styles.disclosureCard}>
              {[
                { icon: 'lock-closed-outline' as const, text: 'Photos are sent over encrypted (TLS) connection' },
                { icon: 'trash-outline' as const, text: 'Your photo is deleted after analysis — not stored' },
                { icon: 'ban-outline' as const, text: 'Your photo is never sold, shared with advertisers, or used for AI training' },
                { icon: 'person-remove-outline' as const, text: 'Not used for face recognition or identity tracking' },
              ].map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.protectionRow,
                    i === 3 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Ionicons name={item.icon} size={15} color={Colors.primary} />
                  <Text style={styles.protectionText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Privacy policy link */}
            <Pressable
              style={({ pressed }) => [styles.privacyLink, pressed && { opacity: 0.6 }]}
              onPress={() => { onDecline(); router.push('/privacy'); }}
            >
              <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
              <Text style={styles.privacyLinkText}>
                Read full Privacy Policy (Section 4 — Face Data)
              </Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
            </Pressable>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.7 }]}
              onPress={onDecline}
            >
              <Text style={styles.declineBtnText}>Not Now</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.agreeBtn, pressed && { opacity: 0.88 }]}
              onPress={onAgree}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.agreeBtnGrad}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.agreeBtnText}>I Understand &amp; Agree</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.footnote}>
            You can review this agreement at any time in Profile → Privacy Policy.
          </Text>

          {/* Bottom safe area spacer */}
          <View style={{ height: Platform.OS === 'ios' ? 8 : 4 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  // Header
  headerGrad: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 8,
  },
  headerIconWrap: { marginBottom: 4 },
  headerIconGrad: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: 8,
  },

  disclosureCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Third party recipient
  thirdPartyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  thirdPartyLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thirdPartyInfo: { flex: 1, gap: 3 },
  thirdPartyName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  thirdPartyDesc: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  // Protection list
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  protectionText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },

  // Privacy link
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginTop: 6,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyLinkText: {
    flex: 1,
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.medium,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 8,
  },
  declineBtn: {
    flex: 1,
    height: 50,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  declineBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textSecondary,
  },
  agreeBtn: {
    flex: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.md,
  },
  agreeBtnGrad: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  agreeBtnText: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
  },

  footnote: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 16,
  },
});
