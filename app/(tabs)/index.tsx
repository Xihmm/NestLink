import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsStore } from '@/hooks/usePostsStore';
import { Post, PostType, PostIntent } from '@/types/post';

type FilterType = 'ALL' | PostType;
type FilterIntent = 'ALL' | 'OFFER' | 'SEEK';

export default function FeedScreen() {
  const router = useRouter();
  const { posts } = usePostsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterIntent, setFilterIntent] = useState<FilterIntent>('ALL');

  // Filter and search posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
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
  }, [posts, searchQuery, filterType, filterIntent]);

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

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null;
    const start = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const end = endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return null;
  };

  const getTypeBadgeColor = (type: PostType) => {
    switch (type) {
      case 'ROOMMATE':
        return '#3B82F6'; // blue
      case 'SUBLET':
        return '#10B981'; // green
      case 'SHORT_TERM':
        return '#F59E0B'; // amber
      case 'QA':
        return '#8B5CF6'; // purple
    }
  };

  const getIntentBadgeColor = (intent: PostIntent) => {
    if (intent === 'OFFER') return '#EC4899'; // pink
    if (intent === 'SEEK') return '#6366F1'; // indigo
    return '#9CA3AF'; // gray
  };

  const isClosedStatus = (item: Post) =>
    item.status === 'FOUND' || item.status === 'RENTED_OUT';

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[styles.postCard, isClosedStatus(item) && styles.postCardClosed]}
      onPress={() => router.push(`/post/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.imageUrls && item.imageUrls.length > 0 && (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: item.imageUrls[0] }}
            style={styles.postThumbnail}
            resizeMode="cover"
          />
          <View style={styles.imageOverlayTop}>
            <View style={styles.badges}>
              {item.types.map((t) => (
                <View key={t} style={[styles.badge, { backgroundColor: getTypeBadgeColor(t) }]}>
                  <Text style={styles.badgeText}>{t}</Text>
                </View>
              ))}
              {item.intent && (
                <View style={[styles.badge, { backgroundColor: getIntentBadgeColor(item.intent) }]}>
                  <Text style={styles.badgeText}>{item.intent}</Text>
                </View>
              )}
            </View>
            {item.imageUrls.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountText}>+{item.imageUrls.length - 1}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.postHeader}>
        {!item.imageUrls?.length ? (
          <View style={styles.badges}>
            {item.types.map((t) => (
              <View key={t} style={[styles.badge, { backgroundColor: getTypeBadgeColor(t) }]}>
                <Text style={styles.badgeText}>{t}</Text>
              </View>
            ))}
            {item.intent && (
              <View style={[styles.badge, { backgroundColor: getIntentBadgeColor(item.intent) }]}>
                <Text style={styles.badgeText}>{item.intent}</Text>
              </View>
            )}
          </View>
        ) : (
          <View />
        )}
        <View style={styles.cardTopRight}>
          {item.status === 'FOUND' && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>✅ Found</Text>
            </View>
          )}
          {item.status === 'RENTED_OUT' && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>🏠 Rented</Text>
            </View>
          )}
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postBody} numberOfLines={2}>
        {item.body}
      </Text>

      <View style={styles.postMeta}>
        {item.location && (
          <Text style={styles.metaText}>📍 {item.location}</Text>
        )}
        {item.budget && (
          <Text style={styles.metaText}>💰 ${item.budget}/mo</Text>
        )}
        {formatDateRange(item.startDate, item.endDate) && (
          <Text style={styles.metaText}>📅 {formatDateRange(item.startDate, item.endDate)}</Text>
        )}
      </View>

      <View style={styles.authorRow}>
        <Text style={styles.authorText}>by {item.authorName || 'Anonymous'}</Text>
        {item.isSample && (
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>Sample</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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

      {/* Filter rows — fixed-height parent so layout never shifts */}
      <View style={styles.filterSection}>
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
      </View>

      {/* Posts List */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or search query</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    height: 100,
  },
  filterRow: {
    height: 44,
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
  listContent: {
    padding: 14,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postCardClosed: {
    opacity: 0.6,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    minHeight: 22,
  },
  cardTopRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  postBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    marginBottom: 10,
    marginHorizontal: -12,
    marginTop: -12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  postThumbnail: {
    width: '100%',
    height: 200,
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  photoCountBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  sampleBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sampleBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
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
  },
});
