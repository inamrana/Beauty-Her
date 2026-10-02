import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing } from '@/constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  light?: boolean;
}

export function Header({ title, subtitle, showBack = false, rightElement, transparent = false, light = false }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      !transparent && styles.solid,
      { paddingTop: insets.top + 8 },
    ]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={light ? Colors.textInverse : Colors.text} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={[styles.title, light && styles.titleLight]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, light && styles.subtitleLight]}>{subtitle}</Text> : null}
        </View>
        <View style={styles.side}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  solid: {
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  titleLight: { color: Colors.textInverse },
  subtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  subtitleLight: { color: 'rgba(255,255,255,0.7)' },
});
