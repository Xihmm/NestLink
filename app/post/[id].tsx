import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { usePostsStore } from '@/hooks/usePostsStore';
import { PostType, PostIntent } from '@/types/post';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPostById } = usePostsStore();

  const post = getPostById(id);

  if (!post) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubtext}>The post you're looking for doesn&apos;t exist.</Text>
        </View>
      </View>
    );
  }

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeBadgeColor = (type: PostType) => {
    switch (type) {
      case 'ROOMMATE':
        return '#3B82F6';
      case 'SUBLET':
        return '#10B981';
      case 'SHORT_TERM':
        return '#F59E0B';
      case 'QA':
        return '#8B5CF6';
    }
  };

  const getIntentBadgeColor = (intent: PostIntent) => {
    if (intent === 'OFFER') return '#EC4899';
    if (intent === 'SEEK') return '#6366F1';
    return '#9CA3AF';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Post Details' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header with badges */}
        <View style={styles.header}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getTypeBadgeColor(post.type) }]}>
              <Text style={styles.badgeText}>{post.type}</Text>
            </View>
            {post.intent && (
              <View style={[styles.badge, { backgroundColor: getIntentBadgeColor(post.intent) }]}>
                <Text style={styles.badgeText}>{post.intent}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(post.createdAt)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{post.title}</Text>

        {/* Author */}
        <Text style={styles.author}>Posted by {post.authorName || 'Anonymous'}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Details Section */}
        {(post.location || post.budget || post.startDate || post.endDate) && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            {post.location && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{post.location}</Text>
                </View>
              </View>
            )}

            {post.budget && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>${post.budget}/month</Text>
                </View>
              </View>
            )}

            {post.startDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{formatDate(post.startDate)}</Text>
                </View>
              </View>
            )}

            {post.endDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>End Date</Text>
                  <Text style={styles.detailValue}>{formatDate(post.endDate)}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Description Section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{post.body}</Text>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeAgo: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 36,
  },
  author: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});


