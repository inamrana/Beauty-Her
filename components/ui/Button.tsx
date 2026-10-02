import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}` as keyof typeof styles],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && { opacity: 0.84, transform: [{ scale: 0.98 }] },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.textInverse : Colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}` as keyof typeof styles], styles[`label_${size}` as keyof typeof styles], textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  // Variants
  primary: { backgroundColor: Colors.primary, ...Shadow.md },
  secondary: { backgroundColor: Colors.secondary, borderWidth: 1.5, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  // Sizes
  size_sm: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36 },
  size_md: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 48 },
  size_lg: { paddingHorizontal: 32, paddingVertical: 18, minHeight: 56 },
  // Labels
  label: { fontWeight: Fonts.weights.semibold, letterSpacing: 0.3 },
  label_primary: { color: Colors.textInverse },
  label_secondary: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.textInverse },
  label_sm: { fontSize: Fonts.sizes.sm },
  label_md: { fontSize: Fonts.sizes.base },
  label_lg: { fontSize: Fonts.sizes.lg },
  // States
  disabled: { opacity: 0.45 },
});
