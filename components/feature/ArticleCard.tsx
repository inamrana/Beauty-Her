import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

export interface ArticleContent {
  type: 'heading' | 'paragraph';
  text: string;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  image: string;
  excerpt: string;
  isTrending: boolean;
  author?: string;
  publishDate?: string;
  content?: ArticleContent[];
}

interface ArticleCardProps {
  article: Article;
  variant?: 'featured' | 'horizontal' | 'compact';
  onPress?: () => void;
}

export function ArticleCard({ article, variant = 'horizontal', onPress }: ArticleCardProps) {
  if (variant === 'featured') {
    return (
      <Pressable
        style={({ pressed }) => [styles.featured, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
        onPress={onPress}
      >
        <Image source={{ uri: article.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
        <View style={styles.featuredOverlay}>
          <View style={styles.topRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{article.category}</Text>
            </View>
            {article.isTrending ? (
              <View style={styles.trendingPill}>
                <Ionicons name="flame" size={11} color="#FF6B35" />
                <Text style={styles.trendingPillText}>Trending</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.featuredTitle}>{article.title}</Text>
          <View style={styles.featuredMeta}>
            {article.author ? (
              <Text style={styles.featuredMetaText}>{article.author}</Text>
            ) : null}
            <Text style={styles.featuredMetaText}>{article.readTime} read</Text>
          </View>
        </View>
        {/* Read arrow badge */}
        <View style={styles.readBadge}>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        style={({ pressed }) => [styles.compact, pressed && { opacity: 0.85 }]}
        onPress={onPress}
      >
        <Image source={{ uri: article.image }} style={styles.compactImg} contentFit="cover" transition={200} />
        <View style={styles.compactContent}>
          <Text style={styles.compactCategory}>{article.category}</Text>
          <Text style={styles.compactTitle} numberOfLines={2}>{article.title}</Text>
          <Text style={styles.compactMeta}>{article.readTime} read</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.horizontal, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
    >
      <Image source={{ uri: article.image }} style={styles.horizontalImg} contentFit="cover" transition={200} />
      <View style={styles.horizontalContent}>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{article.category}</Text>
          </View>
          {article.isTrending ? (
            <View style={styles.trendingPill}>
              <Ionicons name="flame" size={11} color="#FF6B35" />
              <Text style={styles.trendingPillText}>Trending</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.horizontalTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.horizontalExcerpt} numberOfLines={2}>{article.excerpt}</Text>
        <View style={styles.horizontalFooter}>
          {article.author ? (
            <Text style={styles.horizontalAuthor} numberOfLines={1}>{article.author}</Text>
          ) : null}
          <Text style={styles.horizontalMeta}>{article.readTime} read</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featured: {
    height: 230,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.md,
    marginBottom: Spacing.md,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,10,30,0.48)',
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  topRow: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.textInverse,
    marginBottom: 6,
    lineHeight: 26,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  featuredMetaText: {
    fontSize: Fonts.sizes.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  readBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horizontalImg: { width: 100, height: 115 },
  horizontalContent: { flex: 1, padding: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  horizontalTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 4,
  },
  horizontalExcerpt: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  horizontalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalAuthor: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.medium,
    flex: 1,
  },
  horizontalMeta: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
  },
  trendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF4EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  trendingPillText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: Fonts.weights.semibold,
  },
  categoryPill: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },
  compact: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
    marginRight: Spacing.sm,
  },
  compactImg: { width: '100%', height: 100 },
  compactContent: { padding: 10 },
  compactCategory: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
    marginBottom: 3,
  },
  compactTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  compactMeta: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },
});
