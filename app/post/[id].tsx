import React, { useEffect, useState } from 'react';
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
  Share,
  useColorScheme,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { usePostsStore } from '@/hooks/usePostsStore';
import { useAuth } from '@/hooks/useAuth';
import { POST_TYPE_STYLES } from '@/constants/tag-styles';
import { db } from '@/lib/firebase';
import { PostType, PostIntent } from '@/types/post';

type PostComment = {
  id: string;
  text: string;
  authorId?: string;
  authorUsername?: string;
  authorName?: string;
  authorEmail?: string;
  createdAt?: number;
};

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0F172A' : '#EEF2F7',
  card: isDark ? '#1E293B' : '#FFFFFF',
  text: isDark ? '#F1F5F9' : '#1F2937',
  subtext: isDark ? '#94A3B8' : '#6B7280',
  border: isDark ? '#334155' : '#E5E7EB',
  input: isDark ? '#1E293B' : '#FFFFFF',
  commentSurface: isDark ? '#182334' : '#F8FAFC',
  commentBorder: isDark ? '#253246' : '#E2E8F0',
  composerSurface: isDark ? '#162131' : '#FFFFFF',
});

export default function PostDetailScreen() {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPostById, updatePostStatus, deletePost, isPostSaved, toggleSavedPost } = usePostsStore();
  const { user: currentUser, username } = useAuth();
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const post = getPostById(id);

  const isQAPost = post?.types.includes('QA') ?? false;

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
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  useEffect(() => {
    if (!post?.id || !isQAPost) {
      setComments([]);
      return;
    }

    const commentsQuery = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const nextComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PostComment, 'id'>),
        }));
        setComments(nextComments);
      },
      (error) => {
        console.error('Failed to subscribe to comments:', error);
        setComments([]);
      }
    );

    return unsubscribe;
  }, [isQAPost, post?.id]);

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

  const handleSubmitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (!currentUser || currentUser.isAnonymous) {
      Alert.alert(
        'Sign in to comment',
        'Create a free account to join the conversation.',
        [
          { text: 'Sign In', onPress: () => router.push('/auth') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text: trimmed,
        authorId: currentUser.uid,
        authorUsername: username || currentUser.email?.split('@')[0] || 'Anonymous',
        authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        authorEmail: currentUser.email || null,
        createdAt: Date.now(),
      });
      setCommentText('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
      Alert.alert('Comment failed', 'We could not post your comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete this comment?',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', post.id, 'comments', commentId));
            } catch (error) {
              console.error('Failed to delete comment:', error);
              Alert.alert('Delete failed', 'We could not delete this comment. Please try again.');
            }
          },
        },
      ]
    );
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
  const displayPostIdentity = () => {
    const isAnonymousPost = post.isAnonymousAuthor
      ?? (!(post.authorUsername || (post.authorName && post.authorName !== 'Anonymous')));
    if (isAnonymousPost) return 'Posted by Anonymous';

    const usernameLabel = post.authorUsername || post.authorName || 'Anonymous';
    if (post.authorName && post.authorName !== 'Anonymous' && post.authorName !== usernameLabel) {
      return `Posted by ${usernameLabel} · ${post.authorName}`;
    }
    return `Posted by ${usernameLabel}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Post Details' }} />
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >
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
              <View key={t} style={[styles.badge, { backgroundColor: POST_TYPE_STYLES[t].backgroundColor }]}>
                <Text style={[styles.badgeText, { color: POST_TYPE_STYLES[t].color }]}>{t}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Text style={styles.author}>{displayPostIdentity()}</Text>
          {post.authorEmail?.toLowerCase().endsWith('.edu') && (
            <Text style={{ fontSize: 11, color: '#3B82F6' }}>🎓 UR Verified</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleToggleSaved}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isPostSaved(post.id) ? '#FCA5A5' : '#E5E7EB',
            backgroundColor: isPostSaved(post.id) ? '#FFF1F2' : 'white',
          }}
        >
          <Text style={{ fontSize: 14 }}>{isPostSaved(post.id) ? '❤️' : '🤍'}</Text>
          <Text style={{ fontSize: 13, color: isPostSaved(post.id) ? '#EF4444' : '#6B7280', fontWeight: '500' }}>
            {isPostSaved(post.id) ? 'Saved' : 'Save Post'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            await Share.share({
              message: `🏠 NestLink - UR Housing Board\n\n${post.title}\n\n${post.body ? post.body + '\n\n' : ''}${post.location ? '📍 ' + post.location + '\n' : ''}${post.budgetMin || post.budgetMax ? '💰 ' + (post.budgetMin ? '$' + post.budgetMin : '') + (post.budgetMax ? ' - $' + post.budgetMax : '') + '/mo\n' : ''}${post.startDate && post.endDate ? '📅 ' + post.startDate + ' - ' + post.endDate + '\n' : ''}\nFind more housing posts on NestLink 🐷`,
              title: post.title,
            });
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 12, paddingVertical: 6,
            borderRadius: 20, borderWidth: 1,
            borderColor: '#E5E7EB', backgroundColor: 'white',
            marginTop: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>📤 Share</Text>
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
        {(post.location || post.budgetMin || post.budgetMax || post.startDate || post.endDate) && (
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
            {(post.budgetMin || post.budgetMax) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>
                    {post.budgetMin && post.budgetMax
                      ? `$${post.budgetMin} - $${post.budgetMax}/month`
                      : post.budgetMin
                      ? `$${post.budgetMin}+/month`
                      : `Up to $${post.budgetMax}/month`}
                  </Text>
                  {post.negotiable && (
                    <Text style={{ color: '#3B82F6', fontSize: 13, marginTop: 4 }}>🔪 Price negotiable</Text>
                  )}
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
              onPress={() => {
                if (currentUser?.isAnonymous) {
                  Alert.alert(
                    'Sign in to view contact info',
                    'Create a free account to contact this person.',
                    [
                      { text: 'Sign In', onPress: () => router.push('/auth') },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                  return;
                }
                setShowContact(!showContact);
              }}
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

        {isQAPost && (
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments</Text>
            {comments.length === 0 ? (
              <Text style={styles.commentsEmpty}>No comments yet. Start the conversation.</Text>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment) => {
                  const isEdu = comment.authorEmail?.toLowerCase().endsWith('.rochester.edu');
                  const isCommentOwner = currentUser?.uid != null && currentUser.uid === comment.authorId;
                  const commentDisplayName =
                    comment.authorUsername ||
                    comment.authorName ||
                    comment.authorEmail?.split('@')[0] ||
                    'Anonymous';
                  return (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeaderTop}>
                        <View style={styles.commentAuthorRow}>
                          <Text style={styles.commentAuthor}>{commentDisplayName}</Text>
                          {isEdu && <Text style={styles.commentBadge}>🎓</Text>}
                        </View>
                        <View style={styles.commentMetaRow}>
                          <Text style={styles.commentTime}>
                            {comment.createdAt ? getTimeAgo(comment.createdAt) : 'Just now'}
                          </Text>
                          {isCommentOwner && (
                            <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                              <Text style={styles.commentDeleteText}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                editable={!submittingComment}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendButton,
                  (!commentText.trim() || submittingComment) && styles.commentSendButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
              >
                <Text style={styles.commentSendButtonText}>
                  {submittingComment ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons — only shown to the post owner */}
        {isOwner && (() => {
          const isHousing = post.types.includes('SUBLET') || post.types.includes('SHORT_TERM');
          const isRoommateOnly = post.types.length === 1 && post.types.includes('ROOMMATE');
          const isClosed = post.status === 'FOUND' || post.status === 'RENTED_OUT';
          const showRentedOut = isHousing && post.intent === 'OFFER' && !isClosed;
          const showFound = (isRoommateOnly || (isHousing && post.intent === 'SEEK')) && !isClosed;
          return (
            <View style={styles.actionSection}>
              {!isClosed && (
                <TouchableOpacity
                  style={styles.actionButtonBlue}
                  onPress={() => router.push(`/post/edit/${id}`)}
                >
                  <Text style={styles.actionButtonText}>Edit Post ✏️</Text>
                </TouchableOpacity>
              )}
              {showFound && (
                <TouchableOpacity
                  style={styles.actionButtonGreen}
                  onPress={() =>
                    Alert.alert('Mark as Closed?', 'Once marked, this post cannot be edited.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm', style: 'destructive', onPress: () => updatePostStatus(id, 'FOUND', post.isSample) },
                    ])
                  }
                >
                  <Text style={styles.actionButtonText}>Mark as Found 🎉</Text>
                </TouchableOpacity>
              )}
              {showRentedOut && (
                <TouchableOpacity
                  style={styles.actionButtonGreen}
                  onPress={() =>
                    Alert.alert('Mark as Closed?', 'Once marked, this post cannot be edited.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm', style: 'destructive', onPress: () => updatePostStatus(id, 'RENTED_OUT', post.isSample) },
                    ])
                  }
                >
                  <Text style={styles.actionButtonText}>Mark as Rented Out 🏠</Text>
                </TouchableOpacity>
              )}
              {!isClosed && (
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
              )}
              {isClosed && (
                <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                  This post has been closed and cannot be edited.
                </Text>
              )}
            </View>
          );
        })()}

        <View style={styles.bottomPadding} />
      </KeyboardAwareScrollView>

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

const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    flexGrow: 1,
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
    color: colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  author: {
    fontSize: 14,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  savePostButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
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
    color: colors.text,
  },
  savePostButtonTextActive: {
    color: '#1D4ED8',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
    backgroundColor: colors.border,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.subtext,
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  descriptionSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  contactSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
  commentsSection: {
    paddingTop: 14,
    marginTop: 16,
  },
  commentsList: {
    gap: 8,
    marginBottom: 12,
  },
  commentsEmpty: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 12,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: colors.commentBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.commentSurface,
  },
  commentHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commentBadge: {
    fontSize: 11,
    opacity: 0.9,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentTime: {
    fontSize: 11,
    color: colors.subtext,
  },
  commentDeleteText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.commentBorder,
    backgroundColor: colors.composerSurface,
    borderRadius: 14,
    padding: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  commentSendButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 11,
    minWidth: 70,
    alignItems: 'center',
  },
  commentSendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  commentSendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    color: colors.subtext,
    fontWeight: '500',
  },
  contactValue: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
    color: colors.subtext,
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
