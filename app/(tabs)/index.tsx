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
  Modal,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsStore } from '@/hooks/usePostsStore';
import { useAuth } from '@/hooks/useAuth';
import { Post, PostType, PostIntent } from '@/types/post';

type FilterType = 'ALL' | PostType;
type FilterIntent = 'ALL' | 'OFFER' | 'SEEK';
type ActiveTab = 'ALL' | 'SAVED' | 'mine';


const LOCATION_OPTIONS = [
  'Any',
  'UR Campus',
  'Tower 280',
  'Innovation Square',
  'Nathaniel',
  'Riverview',
  'South Wedge',
  'Park Ave',
  'Downtown Rochester',
];

const TIME_OPTIONS = [
  { label: 'Any time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
];

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#111827' : '#EEF2F7',
  card: isDark ? '#1F2937' : '#FFFFFF',
  text: isDark ? '#F9FAFB' : '#1F2937',
  subtext: isDark ? '#9CA3AF' : '#6B7280',
  border: isDark ? '#374151' : '#E5E7EB',
  input: isDark ? '#1F2937' : '#FFFFFF',
  pill: isDark ? '#1F2937' : '#FFFFFF',
  isDark,
});

export default function FeedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const { posts, savedPostIds, isPostSaved, toggleSavedPost } = usePostsStore();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterIntent, setFilterIntent] = useState<FilterIntent>('ALL');
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL');

  // Applied filter state
  const [timeFilter, setTimeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  // Modal state
  const [showFilter, setShowFilter] = useState(false);

  // Draft state (lives inside the modal before Apply)
  const [pendingTime, setPendingTime] = useState('all');
  const [pendingLocations, setPendingLocations] = useState<string[]>([]);
  const [budgetPills, setBudgetPills] = useState<string[]>([]);

  const hasActiveFilter =
    locationFilter.length > 0 || timeFilter !== 'all' || budgetPills.length > 0;

  const openFilter = () => {
    setPendingTime(timeFilter);
    setPendingLocations([...locationFilter]);
    // minPrice/maxPrice are already live draft state, no reset needed on open
    setShowFilter(true);
  };

  const applyFilter = () => {
    setTimeFilter(pendingTime);
    setLocationFilter([...pendingLocations]);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setPendingTime('all');
    setPendingLocations([]);
    setBudgetPills([]);
  };

  const toggleBudgetPill = (val: string) => {
    setBudgetPills((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const togglePendingLocation = (loc: string) => {
    if (loc === 'Any') {
      setPendingLocations([]);
      return;
    }
    setPendingLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  // Filter and search posts
  const filteredPosts = useMemo(() => {
    if (activeTab === 'mine') {
      if (!user || user.isAnonymous) return [];
      return posts.filter((p) => p.authorId === user.uid && !p.isSample);
    }

    return posts.filter((post) => {
      if (activeTab === 'SAVED' && !savedPostIds.includes(post.id)) return false;

      // Type filter
      if (filterType !== 'ALL' && !post.types.includes(filterType)) return false;

      // Intent filter (skip for QA posts)
      if (filterIntent !== 'ALL' && !post.types.includes('QA')) {
        if (post.intent !== filterIntent) return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !post.title.toLowerCase().includes(query) &&
          !post.body.toLowerCase().includes(query) &&
          !post.location?.toLowerCase().includes(query)
        ) return false;
      }

      // Time filter
      if (timeFilter === 'today') {
        if (post.createdAt < Date.now() - 24 * 60 * 60 * 1000) return false;
      }
      if (timeFilter === 'week') {
        if (post.createdAt < Date.now() - 7 * 24 * 60 * 60 * 1000) return false;
      }
      if (timeFilter === 'month') {
        if (post.createdAt < Date.now() - 30 * 24 * 60 * 60 * 1000) return false;
      }


      // Location filter
      if (locationFilter.length > 0) {
        if (!post.location) return false;
        const loc = post.location.toLowerCase();
        if (!locationFilter.some((f) => loc.includes(f.toLowerCase()))) return false;
      }

      // Budget filter (pills take priority over slider)
      if (budgetPills.length > 0) {
        const b = post.budgetMin ?? post.budgetMax ?? 0;
        const match = budgetPills.some((pill) => {
          if (pill === '<$500') return b < 500;
          if (pill === '$500-$800') return b >= 500 && b <= 800;
          if (pill === '$800-$1200') return b >= 800 && b <= 1200;
          if (pill === '$1200-$1800') return b >= 1200 && b <= 1800;
          if (pill === '$1800+') return b > 1800;
          return false;
        });
        if (!match) return false;
      }

      return true;
    });
  }, [posts, searchQuery, filterType, filterIntent, activeTab, savedPostIds, user, timeFilter, locationFilter, budgetPills]);

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
    } catch {
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

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

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
      {/* Search Bar + Filter Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 8, gap: 8 }}>
        <View style={[styles.searchContainer, { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
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
        <TouchableOpacity
          onPress={openFilter}
          style={{
            paddingHorizontal: 12, paddingVertical: 10,
            borderRadius: 12, borderWidth: 1,
            borderColor: hasActiveFilter ? '#3B82F6' : colors.border,
            backgroundColor: hasActiveFilter ? '#EFF6FF' : colors.card,
            flexDirection: 'row', alignItems: 'center', gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, color: hasActiveFilter ? '#3B82F6' : colors.subtext, fontWeight: '600' }}>
            ⚙ Filter{hasActiveFilter ? ' •' : ''}
          </Text>
        </TouchableOpacity>
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
            style={[styles.filterButton, activeTab === 'ALL' && styles.filterButtonActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.filterButtonText, activeTab === 'ALL' && styles.filterButtonTextActive]}>
              All Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeTab === 'SAVED' && styles.filterButtonActive]}
            onPress={() => setActiveTab('SAVED')}
          >
            <Text style={[styles.filterButtonText, activeTab === 'SAVED' && styles.filterButtonTextActive]}>
              Saved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeTab === 'mine' && styles.filterButtonActive]}
            onPress={() => setActiveTab('mine')}
          >
            <Text style={[styles.filterButtonText, activeTab === 'mine' && styles.filterButtonTextActive]}>
              My Posts
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
            <Text style={styles.emptyText}>
              {activeTab === 'mine'
                ? (user?.isAnonymous ? 'Sign in to see your posts' : "You haven't posted anything yet")
                : activeTab === 'SAVED' ? 'No saved posts yet' : 'No posts found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'mine'
                ? (user?.isAnonymous ? 'Create a free account to start posting.' : 'Your posts will appear here once you create them.')
                : activeTab === 'SAVED' ? 'Save posts from the feed or post details to find them here' : 'Try adjusting your filters or search query'}
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

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFilter(false)} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Budget */}
            <Text style={styles.modalSectionTitle}>Budget ($/month)</Text>
            <Text style={styles.modalSectionHint}>
              Choose one or more preset ranges for the fastest filter.
            </Text>

            {/* Budget quick-pick pills */}
            <View style={[styles.pillRow, { marginBottom: 20 }]}>
              {['<$500', '$500-$800', '$800-$1200', '$1200-$1800', '$1800+'].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => toggleBudgetPill(val)}
                  style={[styles.pill, budgetPills.includes(val) && styles.pillActiveBlue]}
                >
                  <Text style={[styles.pillText, budgetPills.includes(val) && styles.pillTextActiveBlue]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Popular Areas */}
            <Text style={styles.modalSectionTitle}>Popular Areas</Text>
            <View style={styles.pillRow}>
              {LOCATION_OPTIONS.map((loc) => {
                const isAny = loc === 'Any';
                const active = isAny ? pendingLocations.length === 0 : pendingLocations.includes(loc);
                return (
                  <TouchableOpacity
                    key={loc}
                    onPress={() => togglePendingLocation(loc)}
                    style={[styles.pill, active && styles.pillActiveGreen]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActiveGreen]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Posted */}
            <Text style={styles.modalSectionTitle}>Posted</Text>
            <View style={styles.pillRow}>
              {TIME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPendingTime(opt.value)}
                  style={[styles.pill, pendingTime === opt.value && styles.pillActiveBlue]}
                >
                  <Text style={[styles.pillText, pendingTime === opt.value && styles.pillTextActiveBlue]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalClearButton} onPress={clearFilter}>
              <Text style={styles.modalClearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalApplyButton} onPress={applyFilter}>
              <Text style={styles.modalApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: colors.isDark ? 0.5 : 0,
    borderColor: colors.isDark ? colors.border : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.isDark ? 0 : 0.06,
    shadowRadius: 6,
    elevation: colors.isDark ? 0 : 3,
  },
  cardClosed: {
    opacity: 0.55,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: colors.border,
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
    color: colors.text,
    lineHeight: 19,
    marginBottom: 4,
  },
  cardMeta: {
    gap: 2,
    marginBottom: 6,
  },
  cardMetaText: {
    fontSize: 11,
    color: colors.subtext,
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
    color: colors.subtext,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  modalSectionHint: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: 12,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pill,
  },
  pillActiveBlue: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  pillActiveGreen: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  pillText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  pillTextActiveBlue: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  pillTextActiveGreen: {
    color: '#10B981',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalClearText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtext,
  },
  modalApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
