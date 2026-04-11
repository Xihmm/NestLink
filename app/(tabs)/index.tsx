import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsStore } from '@/hooks/usePostsStore';
import { Post, PostType, PostIntent } from '@/types/post';

type FilterType = 'ALL' | PostType;
type FilterIntent = 'ALL' | 'OFFER' | 'SEEK';
type FeedMode = 'ALL' | 'SAVED';

export default function FeedScreen() {
  const router = useRouter();
  const { posts, savedPostIds, isPostSaved, toggleSavedPost } = usePostsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterIntent, setFilterIntent] = useState<FilterIntent>('ALL');
  const [feedMode, setFeedMode] = useState<FeedMode>('ALL');

  // Filter and search posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (feedMode === 'SAVED' && !savedPostIds.includes(post.id)) {
        return false;
      }

      // Type filter
      if (filterType !== 'ALL' && !post.types.includes(filterType)) {
        return false;
      }

      // Intent filter (skip for QA posts)
      if (filterIntent !== 'ALL' && !post.types.includes('QA')) {
        if (post.intent !== filterIntent) {
          return false;
        }
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.body.toLowerCase().includes(query) ||
          post.location?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [posts, searchQuery, filterType, filterIntent, feedMode, savedPostIds]);

  const leftCol = filteredPosts.filter((_, i) => i % 2 === 0);
  const rightCol = filteredPosts.filter((_, i) => i % 2 === 1);

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const parseLocalDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null;
    const start = startDate ? parseLocalDate(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const end = endDate ? parseLocalDate(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return null;
  };

  const getTypeTagStyle = (type: PostType): { backgroundColor: string; color: string } => {
    switch (type) {
      case 'ROOMMATE': return { backgroundColor: '#EDE9FE', color: '#5B21B6' };
      case 'SUBLET':   return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'SHORT_TERM': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'QA':       return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const getIntentTagStyle = (intent: PostIntent): { backgroundColor: string; color: string } => {
    if (intent === 'OFFER') return { backgroundColor: '#FCE7F3', color: '#9D174D' };
    if (intent === 'SEEK')  return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    return { backgroundColor: '#F3F4F6', color: '#374151' };
  };

  const isClosedStatus = (item: Post) =>
    item.status === 'FOUND' || item.status === 'RENTED_OUT';

  const handleToggleSaved = async (postId: string) => {
    try {
      await toggleSavedPost(postId);
    } catch (error) {
      Alert.alert('Save failed', 'We could not update your saved posts. Please try again.');
    }
  };

  const PostCard = ({ item }: { item: Post }) => {
    const hasImage = item.imageUrls && item.imageUrls.length > 0;
    const dateRange = formatDateRange(item.startDate, item.endDate);
    const budgetText = item.budgetMin && item.budgetMax
      ? `$${item.budgetMin}–$${item.budgetMax}/mo`
      : item.budgetMin
      ? `$${item.budgetMin}+/mo`
      : item.budgetMax
      ? `Up to $${item.budgetMax}/mo`
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, isClosedStatus(item) && styles.cardClosed]}
        onPress={() => router.push(`/post/${item.id}`)}
        activeOpacity={0.75}
      >
        {/* Image */}
        {hasImage && (
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: item.imageUrls![0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {item.imageUrls!.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountText}>+{item.imageUrls!.length - 1}</Text>
              </View>
            )}
            {isClosedStatus(item) && (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedOverlayText}>
                  {item.status === 'FOUND' ? '✅ Found' : '🏠 Rented'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardBody}>
          {/* Tags row */}
          <View style={styles.tagsRow}>
            {item.types.map((t) => {
              const ts = getTypeTagStyle(t);
              return (
                <View key={t} style={[styles.tag, { backgroundColor: ts.backgroundColor }]}>
                  <Text style={[styles.tagText, { color: ts.color }]}>{t}</Text>
                </View>
              );
            })}
            {item.intent && (() => {
              const is = getIntentTagStyle(item.intent);
              return (
                <View style={[styles.tag, { backgroundColor: is.backgroundColor }]}>
                  <Text style={[styles.tagText, { color: is.color }]}>{item.intent}</Text>
                </View>
              );
            })()}
            {!hasImage && isClosedStatus(item) && (
              <View style={[styles.tag, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.tagText, { color: '#374151' }]}>{item.status === 'FOUND' ? 'FOUND' : 'RENTED'}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          {/* Meta */}
          {(item.location || budgetText || dateRange) && (
            <View style={styles.cardMeta}>
              {item.location && (
                <Text style={styles.cardMetaText} numberOfLines={1}>📍 {item.location}</Text>
              )}
              {budgetText && (
                <Text style={styles.cardMetaText} numberOfLines={1}>
                  💰 {budgetText}{item.negotiable ? ' 🔪' : ''}
                </Text>
              )}
              {dateRange && (
                <Text style={styles.cardMetaText} numberOfLines={1}>📅 {dateRange}</Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardTime}>{getTimeAgo(item.createdAt)}</Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleToggleSaved(item.id); }}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 16 }}>{isPostSaved(item.id) ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const TypeFilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterType === type && styles.filterButtonActive]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[styles.filterButtonText, filterType === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const IntentFilterButton = ({ intent, label }: { intent: FilterIntent; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterIntent === intent && styles.filterButtonActive]}
      onPress={() => setFilterIntent(intent)}
    >
      <Text style={[styles.filterButtonText, filterIntent === intent && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter rows */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <TouchableOpacity
            style={[styles.filterButton, feedMode === 'ALL' && styles.filterButtonActive]}
            onPress={() => setFeedMode('ALL')}
          >
            <Text style={[styles.filterButtonText, feedMode === 'ALL' && styles.filterButtonTextActive]}>
              All Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, feedMode === 'SAVED' && styles.filterButtonActive]}
            onPress={() => setFeedMode('SAVED')}
          >
            <Text style={[styles.filterButtonText, feedMode === 'SAVED' && styles.filterButtonTextActive]}>
              Saved
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <TypeFilterButton type="ALL" label="All" />
          <TypeFilterButton type="ROOMMATE" label="Roommate" />
          <TypeFilterButton type="SUBLET" label="Sublet" />
          <TypeFilterButton type="SHORT_TERM" label="Short-term" />
          <TypeFilterButton type="QA" label="Q&A" />
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterRow, filterType === 'QA' && { opacity: 0 }]}
          contentContainerStyle={styles.filterRowContent}
          scrollEnabled={filterType !== 'QA'}
          pointerEvents={filterType === 'QA' ? 'none' : 'auto'}
        >
          <IntentFilterButton intent="ALL" label="All" />
          <IntentFilterButton intent="OFFER" label="Offering" />
          <IntentFilterButton intent="SEEK" label="Seeking" />
        </ScrollView>
        {filterIntent === 'OFFER' && (
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, paddingHorizontal: 16 }}>
            Showing posts from people offering a place
          </Text>
        )}
        {filterIntent === 'SEEK' && (
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, paddingHorizontal: 16 }}>
            Showing posts from people looking for a place
          </Text>
        )}
      </View>

      {/* Masonry Feed */}
      <ScrollView
        style={styles.feedScroll}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{feedMode === 'SAVED' ? 'No saved posts yet' : 'No posts found'}</Text>
            <Text style={styles.emptySubtext}>
              {feedMode === 'SAVED' ? 'Save posts from the feed or post details to find them here' : 'Try adjusting your filters or search query'}
            </Text>
          </View>
        ) : (
          <View style={styles.masonryRow}>
            <View style={styles.masonryCol}>
              {leftCol.map((item) => <PostCard key={item.id} item={item} />)}
            </View>
            <View style={styles.masonryCol}>
              {rightCol.map((item) => <PostCard key={item.id} item={item} />)}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F7',
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    fontSize: 18,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  filterSection: {
    minHeight: 144,
  },
  filterRow: {
    minHeight: 44,
    marginBottom: 8,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  masonryCol: {
    flex: 1,
    gap: 8,
  },
  // Masonry card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardClosed: {
    opacity: 0.55,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  photoCountBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closedOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  closedOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
    minHeight: 100,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 19,
    marginBottom: 4,
  },
  cardMeta: {
    gap: 2,
    marginBottom: 6,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
