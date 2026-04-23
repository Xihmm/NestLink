import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { AuthorRow } from '@/components/author-row';
import { CommentsSection } from '@/components/comments-section';
import { TagBadge } from '@/components/tag-badge';
import { usePostsStore } from '@/hooks/usePostsStore';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { formatRelativeTime } from '@/lib/time';
import {
  applyProfileToComment,
  applyProfileToPost,
  fetchUserProfiles,
  validateComment,
} from '@/lib/userProfiles';
import { PostIntent } from '@/types/post';
import { PostComment, UserProfile } from '@/types/user';

const getColors = () => ({
  bg: '#0F172A',
  card: '#111827',
  elevated: '#162131',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#243244',
});

export default function PostDetailScreen() {
  const screenWidth = Dimensions.get('window').width;
  const colors = getColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPostById, updatePostStatus, deletePost, isPostSaved, toggleSavedPost } = usePostsStore();
  const { user: currentUser, username, profile } = useAuth();
  const [showContact, setShowContact] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, UserProfile>>({});

  const post = getPostById(id);

  useEffect(() => {
    if (!post?.id) {
      setComments([]);
      return;
    }

    const commentsQuery = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const nextComments = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<PostComment, 'id'>),
        }));
        setComments(nextComments);
      },
      (error) => {
        console.error('Failed to subscribe to comments:', error);
        setComments([]);
      }
    );

    return unsubscribe;
  }, [post?.id]);

  useEffect(() => {
    const userIds = [post?.authorId, ...comments.map((comment) => comment.authorId)]
      .filter((value): value is string => !!value);

    if (userIds.length === 0) {
      setAuthorProfiles({});
      return;
    }

    let active = true;
    fetchUserProfiles(userIds)
      .then((profiles) => {
        if (active) {
          setAuthorProfiles(profiles);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch author profiles:', error);
        if (active) {
          setAuthorProfiles({});
        }
      });

    return () => {
      active = false;
    };
  }, [comments, post?.authorId]);

  const resolvedPost = useMemo(
    () => (post ? applyProfileToPost(post, post.authorId ? authorProfiles[post.authorId] : undefined) : undefined),
    [authorProfiles, post]
  );

  const resolvedComments = useMemo(
    () =>
      comments.map((comment) =>
        applyProfileToComment(comment, comment.authorId ? authorProfiles[comment.authorId] : undefined)
      ),
    [authorProfiles, comments]
  );

  if (!resolvedPost) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubtext}>The post you&apos;re looking for does not exist.</Text>
        </View>
      </View>
    );
  }

  const getIntentBadgeColor = (intent: PostIntent) => {
    if (intent === 'OFFER') return { backgroundColor: '#4A1634', color: '#F9A8D4' };
    if (intent === 'SEEK') return { backgroundColor: '#192F57', color: '#93C5FD' };
    return { backgroundColor: '#1F2937', color: '#CBD5E1' };
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitComment = async () => {
    try {
      const trimmed = validateComment(commentText);

      if (!currentUser || currentUser.isAnonymous) {
        Alert.alert('Sign in to comment', 'Create a free account to join the conversation.', [
          { text: 'Sign In', onPress: () => router.push('/auth') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      setSubmittingComment(true);
      await addDoc(collection(db, 'posts', resolvedPost.id, 'comments'), {
        text: trimmed,
        authorId: currentUser.uid,
        authorUsername: profile?.username || username || currentUser.email?.split('@')[0] || 'Anonymous',
        authorName: profile?.username || username || currentUser.email?.split('@')[0] || 'Anonymous',
        authorEmail: currentUser.email || null,
        authorAvatarUrl: profile?.avatarUrl ?? null,
        authorAvatarPreset: profile?.avatarUrl ? null : profile?.avatarPreset ?? null,
        authorVerified: profile?.isVerified ?? false,
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Comment')) {
        Alert.alert('Comment not posted', error.message);
      } else {
        console.error('Failed to submit comment:', error);
        Alert.alert('Comment failed', 'We could not post your comment. Please try again.');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', resolvedPost.id, 'comments', commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      Alert.alert('Delete failed', 'We could not delete this comment. Please try again.');
    }
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const handleToggleSaved = async () => {
    try {
      await toggleSavedPost(resolvedPost.id);
    } catch (error) {
      console.error('Failed to toggle saved post from details:', error);
      Alert.alert('Save failed', 'We could not update your saved posts. Please try again.');
    }
  };

  const isOwner = !resolvedPost.isSample && currentUser?.uid != null && currentUser.uid === resolvedPost.authorId;
  const postDisplayName =
    resolvedPost.authorUsername ||
    resolvedPost.authorName ||
    resolvedPost.authorEmail?.split('@')[0] ||
    'Anonymous';
  const postSubtitle = resolvedPost.isSample
    ? 'Example listing'
    : formatRelativeTime(resolvedPost.createdAt, 'Recently');

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
        {resolvedPost.isSample ? (
          <View style={styles.sampleBanner}>
            <Text style={styles.sampleBannerText}>Example listing for preview purposes</Text>
          </View>
        ) : null}

        {resolvedPost.status === 'FOUND' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>Already Found</Text>
          </View>
        )}
        {resolvedPost.status === 'RENTED_OUT' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>Already Rented Out</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.badges}>
            {resolvedPost.types.map((type) => <TagBadge key={type} type={type} />)}
            {resolvedPost.intent ? (
              <View
                style={[
                  styles.intentBadge,
                  {
                    backgroundColor: getIntentBadgeColor(resolvedPost.intent).backgroundColor,
                    borderColor: getIntentBadgeColor(resolvedPost.intent).color,
                  },
                ]}
              >
                <Text style={[styles.intentBadgeText, { color: getIntentBadgeColor(resolvedPost.intent).color }]}>
                  {resolvedPost.intent}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.timeAgo}>{postSubtitle}</Text>
        </View>

        <Text style={styles.title}>{resolvedPost.title}</Text>

        <View style={styles.authorSection}>
          <AuthorRow
            username={postDisplayName}
            subtitle={resolvedPost.authorName && resolvedPost.authorName !== postDisplayName ? resolvedPost.authorName : undefined}
            avatarUrl={resolvedPost.authorAvatarUrl}
            avatarPreset={resolvedPost.authorAvatarPreset}
            verified={resolvedPost.authorVerified}
            avatarSize={42}
          />
        </View>

        <View style={styles.actionPills}>
          <TouchableOpacity
            onPress={handleToggleSaved}
            activeOpacity={0.85}
            style={[
              styles.pillButton,
              isPostSaved(resolvedPost.id) ? styles.pillButtonActive : undefined,
            ]}
          >
            <Text style={styles.pillButtonText}>{isPostSaved(resolvedPost.id) ? 'Saved' : 'Save Post'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Share.share({
                message: `NestLink\n\n${resolvedPost.title}\n\n${resolvedPost.body}`,
                title: resolvedPost.title,
              });
            }}
            style={styles.pillButton}
          >
            <Text style={styles.pillButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {resolvedPost.imageUrls && resolvedPost.imageUrls.length > 0 ? (
          <View style={styles.imagesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesScroll}>
              {resolvedPost.imageUrls.map((url, index) => (
                <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => openPreview(index)}>
                  <Image source={{ uri: url }} style={styles.postImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {(resolvedPost.location || resolvedPost.budgetMin || resolvedPost.budgetMax || resolvedPost.startDate || resolvedPost.endDate) ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            {resolvedPost.location ? (
              <DetailRow label="Location" value={resolvedPost.location} />
            ) : null}
            {resolvedPost.budgetMin || resolvedPost.budgetMax ? (
              <DetailRow
                label="Budget"
                value={
                  resolvedPost.budgetMin && resolvedPost.budgetMax
                    ? `$${resolvedPost.budgetMin}–$${resolvedPost.budgetMax}/month`
                    : resolvedPost.budgetMin
                    ? `$${resolvedPost.budgetMin}+/month`
                    : `Up to $${resolvedPost.budgetMax}/month`
                }
              />
            ) : null}
            {resolvedPost.startDate ? (
              <DetailRow label="Start" value={formatDate(resolvedPost.startDate)} />
            ) : null}
            {resolvedPost.endDate ? (
              <DetailRow label="End" value={formatDate(resolvedPost.endDate)} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{resolvedPost.body}</Text>
        </View>

        {!resolvedPost.types.includes('QA') && !resolvedPost.isSample && (resolvedPost.wechatId || resolvedPost.phone || resolvedPost.email) ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => setShowContact((previous) => !previous)}
            >
              <Text style={styles.contactButtonText}>{showContact ? 'Hide Contact Info' : 'Show Contact Info'}</Text>
            </TouchableOpacity>
            {showContact ? (
              <View style={styles.contactDetails}>
                {resolvedPost.wechatId ? (
                  <ContactRow
                    label="WeChat"
                    value={resolvedPost.wechatId}
                    copied={copiedField === 'wechat'}
                    onCopy={() => copyToClipboard(resolvedPost.wechatId!, 'wechat')}
                  />
                ) : null}
                {resolvedPost.phone ? (
                  <ContactRow
                    label="Phone"
                    value={resolvedPost.phone}
                    copied={copiedField === 'phone'}
                    onCopy={() => copyToClipboard(resolvedPost.phone!, 'phone')}
                  />
                ) : null}
                {resolvedPost.email ? (
                  <ContactRow
                    label="Email"
                    value={resolvedPost.email}
                    copied={copiedField === 'email'}
                    onCopy={() => copyToClipboard(resolvedPost.email!, 'email')}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <CommentsSection
          comments={resolvedComments}
          commentText={commentText}
          onChangeCommentText={setCommentText}
          onSubmitComment={handleSubmitComment}
          onDeleteComment={handleDeleteComment}
          currentUserId={currentUser?.uid}
          submitting={submittingComment}
          emptyText="No comments yet. Start the conversation."
        />

        {isOwner ? (
          <View style={styles.ownerActions}>
            {resolvedPost.status !== 'FOUND' && resolvedPost.status !== 'RENTED_OUT' ? (
              <TouchableOpacity style={styles.primaryAction} onPress={() => router.push(`/post/edit/${id}`)}>
                <Text style={styles.primaryActionText}>Edit Post</Text>
              </TouchableOpacity>
            ) : null}

            {resolvedPost.status !== 'FOUND' && resolvedPost.status !== 'RENTED_OUT' && (
              <TouchableOpacity
                style={styles.successAction}
                onPress={() =>
                  Alert.alert('Mark as closed?', 'This post will stop appearing as active.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Mark Closed',
                      style: 'destructive',
                      onPress: () =>
                        updatePostStatus(
                          id,
                          resolvedPost.types.includes('ROOMMATE') || resolvedPost.intent === 'SEEK' ? 'FOUND' : 'RENTED_OUT',
                          resolvedPost.isSample
                        ),
                    },
                  ])
                }
              >
                <Text style={styles.primaryActionText}>
                  {resolvedPost.types.includes('ROOMMATE') || resolvedPost.intent === 'SEEK'
                    ? 'Mark as Found'
                    : 'Mark as Rented Out'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteAction}
              onPress={() =>
                Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deletePost(id, resolvedPost.isSample);
                      router.replace('/(tabs)/index');
                    },
                  },
                ])
              }
            >
              <Text style={styles.deleteActionText}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {resolvedPost.imageUrls && resolvedPost.imageUrls.length > 0 ? (
        <Modal
          visible={previewVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewVisible(false)}
        >
          <View style={styles.previewOverlay}>
            <Pressable style={styles.previewBackdrop} onPress={() => setPreviewVisible(false)} />
            <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewVisible(false)}>
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: previewIndex * screenWidth, y: 0 }}
            >
              {resolvedPost.imageUrls.map((url, index) => (
                <View key={index} style={[styles.previewSlide, { width: screenWidth }]}>
                  <Image source={{ uri: url }} style={styles.previewImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={stylesShared.row}>
      <Text style={stylesShared.label}>{label}</Text>
      <Text style={stylesShared.value}>{value}</Text>
    </View>
  );
}

function ContactRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <View style={stylesShared.contactRow}>
      <View style={{ flex: 1 }}>
        <Text style={stylesShared.label}>{label}</Text>
        <Text style={stylesShared.value}>{value}</Text>
      </View>
      <TouchableOpacity style={stylesShared.copyButton} onPress={onCopy}>
        <Text style={stylesShared.copyButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const stylesShared = StyleSheet.create({
  row: {
    marginBottom: 14,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
  },
  value: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#13263E',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyButtonText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '700',
  },
});

const createStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    sampleBanner: {
      backgroundColor: '#13263E',
      borderWidth: 1,
      borderColor: '#1D4ED8',
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
    },
    sampleBannerText: {
      color: '#BFDBFE',
      fontSize: 13,
      fontWeight: '700',
    },
    statusBanner: {
      backgroundColor: '#163329',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#10B981',
    },
    statusBannerText: {
      color: '#A7F3D0',
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      flex: 1,
    },
    intentBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    intentBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    timeAgo: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    title: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '800',
      marginBottom: 14,
    },
    authorSection: {
      marginBottom: 16,
    },
    actionPills: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    pillButton: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    pillButtonActive: {
      backgroundColor: '#13263E',
      borderColor: '#1D4ED8',
    },
    pillButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    imagesSection: {
      marginBottom: 18,
    },
    imagesScroll: {
      gap: 10,
      paddingRight: 4,
    },
    postImage: {
      width: 260,
      height: 180,
      borderRadius: 14,
      backgroundColor: colors.border,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 14,
    },
    description: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
    },
    contactButton: {
      backgroundColor: '#2563EB',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    contactButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    contactDetails: {
      marginTop: 14,
      gap: 12,
    },
    ownerActions: {
      gap: 10,
      marginTop: 18,
    },
    primaryAction: {
      backgroundColor: '#2563EB',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    successAction: {
      backgroundColor: '#059669',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryActionText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    deleteAction: {
      borderWidth: 1,
      borderColor: '#F87171',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    deleteActionText: {
      color: '#FCA5A5',
      fontSize: 14,
      fontWeight: '700',
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
    },
  });
