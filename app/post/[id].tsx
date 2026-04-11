import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { usePostsStore } from '@/hooks/usePostsStore';
import { useAuth } from '@/hooks/useAuth';
import { PostType, PostIntent } from '@/types/post';

export default function PostDetailScreen() {
  const screenWidth = Dimensions.get('window').width;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPostById, updatePostStatus, deletePost, isPostSaved, toggleSavedPost } = usePostsStore();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const post = getPostById(id);

  if (!post) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubtext}>The post you're looking for does not exist.</Text>
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
      case 'ROOMMATE': return '#3B82F6';
      case 'SUBLET': return '#10B981';
      case 'SHORT_TERM': return '#F59E0B';
      case 'QA': return '#8B5CF6';
    }
  };

  const getIntentBadgeColor = (intent: PostIntent) => {
    if (intent === 'OFFER') return '#EC4899';
    if (intent === 'SEEK') return '#6366F1';
    return '#9CA3AF';
  };

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const handleToggleSaved = async () => {
    try {
      console.info('Toggling saved post from details.', {
        uid: currentUser?.uid ?? null,
        postId: post.id,
      });
      await toggleSavedPost(post.id);
    } catch (error) {
      console.error('Failed to toggle saved post from details:', error);
      Alert.alert('Save failed', 'We could not update your saved posts. Please try again.');
    }
  };

  const isOwner = !post.isSample && currentUser?.uid != null && currentUser.uid === post.authorId;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Post Details' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Status Banner */}
        {post.status === 'FOUND' && (
          <View style={[styles.statusBanner, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statusBannerText, { color: '#065F46' }]}>✅ Already Found</Text>
          </View>
        )}
        {post.status === 'RENTED_OUT' && (
          <View style={[styles.statusBanner, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statusBannerText, { color: '#065F46' }]}>🏠 Already Rented Out</Text>
          </View>
        )}

        {/* Header with badges */}
        <View style={styles.header}>
          <View style={styles.badges}>
            {post.types.map((t) => (
              <View key={t} style={[styles.badge, { backgroundColor: getTypeBadgeColor(t) }]}>
                <Text style={styles.badgeText}>{t}</Text>
              </View>
            ))}
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

        <TouchableOpacity
          style={[styles.savePostButton, isPostSaved(post.id) && styles.savePostButtonActive]}
          onPress={handleToggleSaved}
          activeOpacity={0.85}
        >
          <Text style={[styles.savePostButtonText, isPostSaved(post.id) && styles.savePostButtonTextActive]}>
            {isPostSaved(post.id) ? '🔖 Saved' : '🔖 Save Post'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <View style={styles.imagesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesScroll}>
              {post.imageUrls.map((url, i) => (
                <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => openPreview(i)}>
                  <Image source={{ uri: url }} style={styles.postImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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

        {/* Contact Section */}
        {(post.wechatId || post.phone || post.email) && (
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity
              style={styles.showContactButton}
              onPress={() => setShowContact(!showContact)}
            >
              <Text style={styles.showContactButtonText}>
                {showContact ? 'Hide Contact Info' : 'Show Contact Info'}
              </Text>
            </TouchableOpacity>
            {showContact && (
              <View style={styles.contactDetails}>
                {post.wechatId && (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactIcon}>💬</Text>
                    <Text style={styles.contactLabel}>WeChat</Text>
                    <Text style={styles.contactValue}>{post.wechatId}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(post.wechatId!, 'wechat')}
                    >
                      <Text style={styles.copyButtonText}>
                        {copiedField === 'wechat' ? 'Copied!' : '📋 Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {post.phone && (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactIcon}>📱</Text>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{post.phone}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(post.phone!, 'phone')}
                    >
                      <Text style={styles.copyButtonText}>
                        {copiedField === 'phone' ? 'Copied!' : '📋 Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {post.email && (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactIcon}>📧</Text>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{post.email}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(post.email!, 'email')}
                    >
                      <Text style={styles.copyButtonText}>
                        {copiedField === 'email' ? 'Copied!' : '📋 Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons — only shown to the post owner */}
        {isOwner && (() => {
          const isHousing = post.types.includes('SUBLET') || post.types.includes('SHORT_TERM');
          const isRoommateOnly = post.types.length === 1 && post.types.includes('ROOMMATE');
          const showRentedOut = isHousing && post.intent === 'OFFER';
          const showFound = isRoommateOnly || (isHousing && post.intent === 'SEEK');
          return (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.actionButtonBlue}
                onPress={() => router.push(`/post/edit/${id}`)}
              >
                <Text style={styles.actionButtonText}>Edit Post ✏️</Text>
              </TouchableOpacity>
              {showFound && post.status !== 'FOUND' && (
                <TouchableOpacity
                  style={styles.actionButtonGreen}
                  onPress={() =>
                    Alert.alert('Mark as Found', 'Mark this post as already found?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes, Mark Found', onPress: () => updatePostStatus(id, 'FOUND', post.isSample) },
                    ])
                  }
                >
                  <Text style={styles.actionButtonText}>Mark as Found 🎉</Text>
                </TouchableOpacity>
              )}
              {showRentedOut && post.status !== 'RENTED_OUT' && (
                <TouchableOpacity
                  style={styles.actionButtonGreen}
                  onPress={() =>
                    Alert.alert('Mark as Rented Out', 'Mark this post as already rented out?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes, Mark Rented Out', onPress: () => updatePostStatus(id, 'RENTED_OUT', post.isSample) },
                    ])
                  }
                >
                  <Text style={styles.actionButtonText}>Mark as Rented Out 🏠</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButtonRed}
                onPress={() =>
                  Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deletePost(id, post.isSample);
                        router.replace('/(tabs)');
                      },
                    },
                  ])
                }
              >
                <Text style={styles.actionButtonRedText}>Delete Post 🗑️</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {post.imageUrls && post.imageUrls.length > 0 && (
        <Modal
          visible={previewVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewVisible(false)}
        >
          <View style={styles.previewOverlay}>
            <Pressable style={styles.previewBackdrop} onPress={() => setPreviewVisible(false)} />
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setPreviewVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: previewIndex * screenWidth, y: 0 }}
            >
              {post.imageUrls.map((url, i) => (
                <View key={i} style={[styles.previewSlide, { width: screenWidth }]}>
                  <Image source={{ uri: url }} style={styles.previewImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
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
    marginBottom: 12,
  },
  savePostButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  savePostButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#60A5FA',
  },
  savePostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  savePostButtonTextActive: {
    color: '#1D4ED8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesScroll: {
    gap: 10,
    paddingRight: 4,
  },
  postImage: {
    width: 260,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCloseButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewImage: {
    width: '100%',
    height: '78%',
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
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  showContactButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  showContactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactDetails: {
    marginTop: 14,
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  contactLabel: {
    width: 60,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  contactValue: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
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
  statusBanner: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionSection: {
    marginTop: 16,
    gap: 10,
  },
  actionButtonBlue: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonGreen: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonRed: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionButtonRedText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
