import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

interface BeautyScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  light?: boolean;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Radiant';
  if (score >= 80) return 'Glowing';
  if (score >= 70) return 'Beautiful';
  if (score >= 60) return 'Lovely';
  return 'Blossoming';
}

export function BeautyScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
  light = false,
}: BeautyScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={light ? 'rgba(255,255,255,0.25)' : Colors.border}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={light ? Colors.textInverse : Colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.scoreNum, light && styles.scoreNumLight]}>{clampedScore}</Text>
          {showLabel ? (
            <Text style={[styles.scoreLabel, light && styles.scoreLabelLight]}>{getScoreLabel(clampedScore)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontSize: 28,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    includeFontPadding: false,
    lineHeight: 32,
  },
  scoreNumLight: { color: Colors.textInverse },
  scoreLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.medium,
    marginTop: 2,
  },
  scoreLabelLight: { color: 'rgba(255,255,255,0.75)' },
});
