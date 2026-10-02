import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

const LAST_UPDATED = 'September 25, 2026';
const APP_NAME = 'BeautyHer';
const CONTACT_EMAIL = 'legal@beautyher.app';
const WEBSITE = 'https://beautyher.app';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Text style={styles.intro}>
          {APP_NAME} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Text>

        <Section title="1. Information We Collect">
          <Para>We collect information you provide directly to us, including:</Para>
          <BulletItem text="Account information: email address and username when you create an account." />
          <BulletItem text="Profile information: skin type, hair type, beauty goals, and color season preferences." />
          <BulletItem text="Photos: images you voluntarily submit for beauty scan analysis." />
          <BulletItem text="Scan results: face analysis data including beauty scores, skin metrics, facial feature measurements, and AI-generated recommendations." />
          <BulletItem text="Communications: messages sent to our AI beauty coach." />
        </Section>

        <Section title="2. Automatically Collected Information">
          <Para>When you use the App, we may automatically collect:</Para>
          <BulletItem text="Device information: device model, operating system version, and unique device identifiers." />
          <BulletItem text="Usage data: features accessed, scan frequency, and session duration." />
          <BulletItem text="Crash reports: technical error information to improve app stability." />
        </Section>

        <Section title="3. How We Use Your Information">
          <Para>We use the information we collect to:</Para>
          <BulletItem text="Provide, maintain, and improve the App's AI beauty analysis features." />
          <BulletItem text="Analyze facial features and skin conditions to generate personalized beauty scores and recommendations." />
          <BulletItem text="Personalize your beauty recommendations and coaching experience." />
          <BulletItem text="Process subscription payments through Apple In-App Purchase." />
          <BulletItem text="Send transactional notifications related to your account and subscription." />
          <BulletItem text="Respond to your support requests and feedback." />
          <BulletItem text="Monitor and analyze usage patterns to improve the App." />
          <BulletItem text="Comply with legal obligations." />
        </Section>

        <Section title="4. Face Data — Collection, Use, Storage, and Retention">
          <Para>
            BeautyHer collects and processes face data when you voluntarily submit a photo for AI beauty analysis. This section specifically describes all practices related to face data.
          </Para>

          <Bold>What face data is collected:</Bold>
          <BulletItem text="Facial geometry and structure: face shape (e.g. oval, round, square, heart, diamond), jawline definition, and facial symmetry score (0–100)." />
          <BulletItem text="Facial features: eye shape, eyebrow shape, and lip shape as observed in the submitted photo." />
          <BulletItem text="Skin tone and undertone: descriptive skin tone (e.g. light, medium, deep) and undertone classification (warm, cool, neutral)." />
          <BulletItem text="Skin condition metrics: texture score, clarity score, hydration level, pore visibility, dark circle severity, redness level, and hyperpigmentation level — each scored 0–100 with a descriptive label." />
          <BulletItem text="Overall beauty score and AI confidence score generated from the above observations." />

          <Bold>Purpose and use of face data:</Bold>
          <Para>
            Face data is used exclusively to generate your personalized beauty analysis report, skin health scores, and tailored beauty and skincare recommendations within the App. Face data is never used for identity verification, user tracking, advertising targeting, or any purpose other than delivering the beauty analysis you requested.
          </Para>

          <Bold>How face data is processed (AI analysis):</Bold>
          <Para>
            When you submit a photo, it is transmitted over an encrypted (TLS/HTTPS) connection to our AI analysis service (OnSpace AI, powered by Google Gemini multimodal models). The AI model analyzes the image and returns a structured result containing the face metrics listed above. The submitted photo is not retained by the AI service after the analysis is completed; only the resulting metrics are returned to the App.
          </Para>

          <Bold>Storage:</Bold>
          <Para>
            The face analysis results (scores, labels, and feature descriptions listed above) are stored in your personal account's scan history in our secure cloud database (OnSpace Cloud / Supabase, hosted on AWS infrastructure in the United States). The original photo you submitted is not stored permanently in our database — only the derived analysis data is retained. Photos are held only in temporary server memory during active processing and are discarded immediately after the AI response is received.
          </Para>

          <Bold>Retention:</Bold>
          <Para>
            Face analysis results are retained for as long as your account remains active so you can view your beauty history and track progress over time. You may delete individual scan entries at any time from the Progress screen in the App. You may also delete your entire account — and all associated face data — at any time through Profile. Upon account deletion, all face analysis data is permanently and irreversibly removed from our systems within 30 days.
          </Para>

          <Bold>Sharing of face data:</Bold>
          <Para>
            Face data (photos and analysis results) is never sold, rented, licensed, or shared with advertisers, data brokers, or marketing partners under any circumstances. Face data is shared only with the following party for the sole purpose of performing your requested analysis:
          </Para>
          <BulletItem text="OnSpace AI (Google Gemini) — receives the submitted photo via encrypted API call to perform the analysis. The photo is not retained by this service after the response is delivered." />
          <Para>
            No other third party receives your face data. All data processing agreements with service providers include strict confidentiality and data protection obligations.
          </Para>

          <Bold>No facial recognition or biometric identification:</Bold>
          <Para>
            BeautyHer does not use facial geometry data or any face data to identify, authenticate, recognize, or track individual users. The face data collected is used only for cosmetic analysis (skin health assessment and beauty recommendations) and is not cross-referenced with any identity database, biometric database, or third-party recognition system.
          </Para>

          <Bold>No AI training use:</Bold>
          <Para>
            Your photos and face analysis data are never used to train, improve, or develop AI or machine learning models without your explicit opt-in consent.
          </Para>
        </Section>

        <Section title="5. Photos and Camera Data">
          <Para>
            Camera and photo library access is only requested when you actively initiate a beauty scan. You can revoke camera and photo library access at any time through your device Settings app. Revoking access will prevent new scans but will not affect previously saved results.
          </Para>
          <Para>
            You may delete any or all of your scan photos and results at any time through the App. See Section 4 for complete details on face data handling.
          </Para>
        </Section>

        <Section title="6. AI Analysis and Third-Party AI Services">
          <Para>
            {APP_NAME} uses AI models (OnSpace AI, powered by Google Gemini) to analyze facial features, skin conditions, color seasons, and generate personalized beauty recommendations. All AI processing is performed under strict data processing agreements. We do not use your personal photos or face data to train AI models without your explicit consent.
          </Para>
        </Section>

        <Section title="7. Sharing of Information">
          <Para>We do not sell your personal information. We may share information in the following circumstances:</Para>
          <BulletItem text="Service providers: trusted third parties who assist in operating the App (cloud hosting, AI processing, analytics) under strict confidentiality obligations." />
          <BulletItem text="Legal requirements: when required by law, court order, or governmental authority." />
          <BulletItem text="Business transfers: in connection with a merger, acquisition, or sale of assets, with appropriate notice to you." />
          <BulletItem text="With your consent: in any other case with your explicit permission." />
        </Section>

        <Section title="8. Data Retention">
          <Para>
            We retain your personal information for as long as your account is active or as needed to provide services. For face data retention specifically, see Section 4. You may request deletion of your account and all associated data at any time through Profile. Upon deletion, your data is permanently removed from our systems within 30 days.
          </Para>
        </Section>

        <Section title="9. Data Security">
          <Para>
            We implement industry-standard security measures including encryption in transit (TLS) and at rest, access controls, and regular security reviews. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </Para>
        </Section>

        <Section title="10. Children's Privacy">
          <Para>
            The App is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.
          </Para>
        </Section>

        <Section title="11. Your Rights and Choices">
          <Para>Depending on your location, you may have the following rights:</Para>
          <BulletItem text="Access: Request a copy of the personal information we hold about you, including face analysis data." />
          <BulletItem text="Correction: Request that we correct inaccurate or incomplete information." />
          <BulletItem text="Deletion: Request deletion of your personal information, face data, and account." />
          <BulletItem text="Portability: Request your data in a portable format." />
          <BulletItem text="Opt-out: Opt out of marketing communications at any time." />
          <Para>
            To exercise these rights, contact us at {CONTACT_EMAIL} or use the in-app account management features.
          </Para>
        </Section>

        <Section title="12. Apple Sign In and Third-Party Authentication">
          <Para>
            If you sign in using Apple Sign In, we receive a unique identifier and optionally your name and email address from Apple. We do not receive your Apple ID password. Apple may provide a relay email address to protect your privacy. Please review Apple's Privacy Policy for more information.
          </Para>
        </Section>

        <Section title="13. Subscription and Payment Data">
          <Para>
            All payments are processed by Apple through the App Store. We do not collect or store your payment card information. Purchase history and subscription status are managed by Apple. Please refer to Apple's Privacy Policy for details on how Apple handles payment data.
          </Para>
        </Section>

        <Section title="14. International Data Transfers">
          <Para>
            Your information, including face analysis data, may be transferred to and processed in countries other than your country of residence (including the United States, where our cloud infrastructure is hosted). We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
          </Para>
        </Section>

        <Section title="15. Changes to This Privacy Policy">
          <Para>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last Updated" date and, where appropriate, providing additional notice within the App. Your continued use of the App after changes constitutes acceptance of the updated policy.
          </Para>
        </Section>

        <Section title="16. Contact Us">
          <Para>
            If you have questions, concerns, or requests regarding this Privacy Policy, our face data practices, or any other data practices, please contact us:{'\n\n'}
            Email: {CONTACT_EMAIL}{'\n'}
            Website: {WEBSITE}
          </Para>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This Privacy Policy is effective as of {LAST_UPDATED} and applies to all users of the {APP_NAME} application.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={sectionStyles.bold}>{children}</Text>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={sectionStyles.para}>{children}</Text>;
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={sectionStyles.bullet}>
      <Text style={sectionStyles.bulletDot}>•</Text>
      <Text style={sectionStyles.bulletText}>{text}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 20,
  },
  para: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    lineHeight: 22,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  updated: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  footer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
