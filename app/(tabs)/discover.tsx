import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { ArticleCard, Article, usePaywallGuard } from '@/components';
import { MOCK_ARTICLES, DISCOVER_CATEGORIES } from '@/services/mockData';

// ── Article Reader Modal ───────────────────────────────────────────────────
function ArticleReader({
  article,
  visible,
  onClose,
}: {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Header opacity: fades in as user scrolls past the cover image
  const headerOpacity = scrollY.interpolate({
    inputRange: [160, 240],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const backBgOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (!article) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={reader.root}>
        {/* Floating back button — always visible */}
        <Animated.View
          style={[
            reader.backBtn,
            { top: insets.top + 10 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [reader.backCircle, pressed && { opacity: 0.8 }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        </Animated.View>

        {/* Sticky mini-header that fades in on scroll */}
        <Animated.View
          style={[
            reader.stickyHeader,
            { paddingTop: insets.top, opacity: headerOpacity },
          ]}
        >
          <View style={reader.stickyInner}>
            <Pressable
              style={({ pressed }) => [reader.stickyBack, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </Pressable>
            <Text style={reader.stickyTitle} numberOfLines={1}>{article.title}</Text>
            <View style={{ width: 36 }} />
          </View>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        >
          {/* Cover image */}
          <View style={reader.coverWrap}>
            <Image
              source={{ uri: article.image }}
              style={reader.coverImg}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Content card */}
          <View style={reader.contentCard}>
            {/* Category + read time */}
            <View style={reader.metaRow}>
              <View style={reader.categoryPill}>
                <Text style={reader.categoryPillText}>{article.category}</Text>
              </View>
              <View style={reader.readTimePill}>
                <Ionicons name="time-outline" size={12} color={Colors.textLight} />
                <Text style={reader.readTimeText}>{article.readTime} read</Text>
              </View>
              {article.isTrending ? (
                <View style={reader.trendingPill}>
                  <Ionicons name="flame" size={12} color="#FF6B35" />
                  <Text style={reader.trendingText}>Trending</Text>
                </View>
              ) : null}
            </View>

            {/* Title */}
            <Text style={reader.title}>{article.title}</Text>

            {/* Author row */}
            {(article.author || article.publishDate) ? (
              <View style={reader.authorRow}>
                <View style={reader.authorAvatar}>
                  <Ionicons name="person" size={16} color={Colors.primary} />
                </View>
                <View>
                  {article.author ? (
                    <Text style={reader.authorName}>{article.author}</Text>
                  ) : null}
                  {article.publishDate ? (
                    <Text style={reader.authorDate}>{article.publishDate}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Divider */}
            <View style={reader.divider} />

            {/* Excerpt / intro */}
            <Text style={reader.excerpt}>{article.excerpt}</Text>

            {/* Body content */}
            {article.content && article.content.length > 0 ? (
              <View style={reader.bodyWrap}>
                {article.content.map((block, idx) => {
                  if (block.type === 'heading') {
                    return (
                      <Text key={idx} style={reader.bodyHeading}>{block.text}</Text>
                    );
                  }
                  return (
                    <Text key={idx} style={reader.bodyParagraph}>{block.text}</Text>
                  );
                })}
              </View>
            ) : null}

            {/* Footer */}
            <View style={reader.footer}>
              <View style={reader.footerTag}>
                <Ionicons name="sparkles" size={13} color={Colors.primary} />
                <Text style={reader.footerTagText}>BeautyHer · Expert Beauty Guides</Text>
              </View>
            </View>
          </View>
        </Animated.ScrollView>
      </View>
    </Modal>
  );
}

// ── Discover Screen ────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [readerVisible, setReaderVisible] = useState(false);
  const { gate, PaywallModal } = usePaywallGuard();

  const filtered = useMemo(() => {
    let list = MOCK_ARTICLES as Article[];
    if (activeCategory !== 'all') {
      list = list.filter(a => a.category.toLowerCase() === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  const openArticle = useCallback((article: Article) => {
    gate(() => {
      setSelectedArticle(article);
      setReaderVisible(true);
    });
  }, [gate]);

  const closeArticle = useCallback(() => {
    setReaderVisible(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>Beauty knowledge at your fingertips</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="sparkles" size={16} color={Colors.primary} />
          <Text style={styles.headerBadgeText}>{MOCK_ARTICLES.length} guides</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles, tips, ingredients..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </Pressable>
        ) : null}
      </View>

      {/* Categories */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {DISCOVER_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.catLabel, activeCategory === cat.id && styles.catLabelActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Articles */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={32} color={Colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySub}>Try a different search or category</Text>
          </View>
        ) : (
          <>
            {filtered.length > 0 ? (
              <ArticleCard
                article={filtered[0]}
                variant="featured"
                onPress={() => openArticle(filtered[0])}
              />
            ) : null}
            {filtered.slice(1).map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                variant="horizontal"
                onPress={() => openArticle(article)}
              />
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Article Reader Modal */}
      <ArticleReader
        article={selectedArticle}
        visible={readerVisible}
        onClose={closeArticle}
      />
      <PaywallModal />
    </SafeAreaView>
  );
}

// ── Reader Styles ──────────────────────────────────────────────────────────
const reader = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Floating back button (always on cover)
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Sticky header (fades in after scroll)
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  stickyBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    flex: 1,
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },

  // Cover image
  coverWrap: {
    height: 280,
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },

  // Content card lifts over cover
  contentCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    minHeight: 600,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryPill: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPillText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.bold,
  },
  readTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readTimeText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    fontWeight: Fonts.weights.medium,
  },
  trendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4EE',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trendingText: {
    fontSize: Fonts.sizes.xs,
    color: '#FF6B35',
    fontWeight: Fonts.weights.semibold,
  },

  // Title
  title: {
    fontSize: 26,
    fontWeight: Fonts.weights.heavy,
    color: Colors.text,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 14,
  },

  // Author
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  authorName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  authorDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 18,
  },

  // Excerpt (intro paragraph — slightly larger)
  excerpt: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 26,
    fontStyle: 'italic',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // Body
  bodyWrap: {
    gap: 4,
  },
  bodyHeading: {
    fontSize: 18,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
    lineHeight: 24,
  },
  bodyParagraph: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 27,
    marginBottom: 4,
  },

  // Footer
  footer: {
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  footerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  footerTagText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },
});

// ── Discover Screen Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  headerBadgeText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
  },

  catRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    color: Colors.textSecondary,
  },
  catLabelActive: {
    color: Colors.textInverse,
    fontWeight: Fonts.weights.semibold,
  },

  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 32,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
});
