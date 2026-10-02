
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useChat, extractConcerns, ChatMessage } from '@/hooks/useChat';
import { useUser } from '@/hooks/useUser';
import { useScan } from '@/hooks/useScan';
import { useAIConsent } from '@/hooks/useAIConsent';
import { AIConsentModal } from '@/components/feature/AIConsentModal';

export default function AIChatScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { latestScan } = useScan();

  const userContext = useMemo(() => ({
    skinType: user.skinType,
    hairType: user.hairType,
    beautyGoals: user.beautyGoals,
    colorSeason: user.colorSeason,
    latestScan: latestScan
      ? {
          overallScore: latestScan.overallScore,
          faceShape: latestScan.faceAnalysis.faceShape,
          skinTone: latestScan.faceAnalysis.skinTone,
          undertone: latestScan.faceAnalysis.undertone,
          concerns: extractConcerns(latestScan),
        }
      : null,
  }), [user.skinType, user.hairType, user.colorSeason, latestScan?.id]);

  const suggestions = useMemo(() => [
    `Best routine for ${user.skinType.toLowerCase()} skin?`,
    'How do I use retinol safely?',
    'Which ingredients should I avoid?',
    'Tips for getting glass skin?',
  ], [user.skinType]);

  const { messages, isTyping, sendMessage } = useChat(userContext);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const aiConsent = useAIConsent();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    if (!aiConsent.consented) {
      aiConsent.openModal();
      return;
    }
    setInput('');
    await sendMessage(text);
  }, [input, aiConsent.consented, aiConsent.openModal, sendMessage]);

  const handleConsentAgree = useCallback(async () => {
    await aiConsent.grantConsent();
    // After consent, send any pending input
    const text = input.trim();
    if (text) {
      setInput('');
      await sendMessage(text);
    }
  }, [aiConsent.grantConsent, input, sendMessage]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.isUser) {
      return (
        <View style={styles.userMsgRow}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={styles.userBubble}
          >
            <Text style={styles.userBubbleText}>{item.text}</Text>
          </LinearGradient>
        </View>
      );
    }
    return (
      <View style={styles.botMsgRow}>
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>✨</Text>
        </View>
        <View style={styles.botBubble}>
          <Text style={styles.botBubbleText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>✨</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>BeautyHer AI</Text>
              <Text style={styles.headerStatus}>✓ Personalized for {user.skinType} skin</Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.botMsgRow}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>✨</Text>
                </View>
                <View style={[styles.botBubble, styles.typingBubble]}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                </View>
              </View>
            ) : null
          }
        />

        {/* AI Consent Modal */}
        <AIConsentModal
          visible={aiConsent.showModal}
          onAgree={handleConsentAgree}
          onDecline={aiConsent.closeModal}
        />

        {/* Suggestions */}
        {messages.length <= 1 ? (
          <View style={{ height: 52 }}>
            <FlatList
              horizontal
              data={suggestions}
              keyExtractor={s => s}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestRow}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.suggestChip, pressed && { opacity: 0.8 }]}
                  onPress={() => sendMessage(item)}
                >
                  <Text style={styles.suggestText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={aiConsent.consented ? 'Ask BeautyHer anything...' : 'Tap to enable AI chat...'}
            placeholderTextColor={Colors.textLight}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            accessibilityLabel="Message input"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || isTyping) && styles.sendBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Ionicons name="arrow-up" size={20} color={Colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 18 },
  headerTitle: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.text },
  headerStatus: { fontSize: Fonts.sizes.xs, color: Colors.success },
  msgList: { padding: Spacing.md, gap: 12, paddingBottom: Spacing.lg },
  userMsgRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  userBubble: {
    maxWidth: '78%', borderRadius: Radius.xl,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  userBubbleText: { fontSize: Fonts.sizes.base, color: Colors.textInverse, lineHeight: 22 },
  botMsgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  botAvatarText: { fontSize: 15 },
  botBubble: {
    maxWidth: '78%', backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    ...Shadow.sm,
  },
  botBubbleText: { fontSize: Fonts.sizes.base, color: Colors.text, lineHeight: 23 },
  typingBubble: { paddingHorizontal: 20, paddingVertical: 14 },
  suggestRow: { paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 8 },
  suggestChip: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  suggestText: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: Fonts.weights.medium },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1, backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: Fonts.sizes.base, color: Colors.text,
    minHeight: 44, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
