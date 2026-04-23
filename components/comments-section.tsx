import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AuthorRow } from '@/components/author-row';
import { formatRelativeTime } from '@/lib/time';
import { PostComment } from '@/types/user';

type Props = {
  comments: PostComment[];
  commentText: string;
  onChangeCommentText: (value: string) => void;
  onSubmitComment: () => void;
  onDeleteComment?: (commentId: string) => void;
  currentUserId?: string | null;
  submitting: boolean;
  emptyText?: string;
};

const getColors = (isDark: boolean) => ({
  sectionTitle: isDark ? '#F8FAFC' : '#111827',
  empty: isDark ? '#94A3B8' : '#6B7280',
  cardBg: isDark ? '#162131' : '#FFFFFF',
  cardBorder: isDark ? '#243244' : '#E2E8F0',
  body: isDark ? '#E2E8F0' : '#374151',
  delete: isDark ? '#FCA5A5' : '#EF4444',
  composerBg: isDark ? '#1F2937' : '#FFFFFF',
  composerBorder: isDark ? '#374151' : '#E2E8F0',
  inputText: isDark ? '#F8FAFC' : '#111827',
  placeholder: isDark ? '#94A3B8' : '#9CA3AF',
});

export function CommentsSection({
  comments,
  commentText,
  onChangeCommentText,
  onSubmitComment,
  onDeleteComment,
  currentUserId,
  submitting,
  emptyText = 'No comments yet. Start the conversation.',
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = getColors(isDark);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.sectionTitle }]}>Comments</Text>
      {comments.length === 0 ? (
        <Text style={[styles.empty, { color: c.empty }]}>{emptyText}</Text>
      ) : (
        <View style={styles.list}>
          {comments.map((comment) => {
            const isOwner = !!currentUserId && currentUserId === comment.authorId;
            const name =
              comment.authorUsername ||
              comment.authorName ||
              comment.authorEmail?.split('@')[0] ||
              'Anonymous';

            return (
              <View key={comment.id} style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.authorWrapper}>
                    <AuthorRow
                      username={name}
                      subtitle={formatRelativeTime(comment.createdAt, 'Recently')}
                      avatarUrl={comment.authorAvatarUrl}
                      avatarPreset={comment.authorAvatarPreset}
                      verified={comment.authorVerified}
                      avatarSize={34}
                    />
                  </View>
                  {isOwner && onDeleteComment ? (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() =>
                        Alert.alert('Delete this comment?', '', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => onDeleteComment(comment.id),
                          },
                        ])
                      }
                    >
                      <Text style={[styles.delete, { color: c.delete }]}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={[styles.body, { color: c.body }]}>{comment.text}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.composer, { backgroundColor: c.composerBg, borderColor: c.composerBorder }]}>
        <TextInput
          style={[styles.input, { color: c.inputText }]}
          placeholder="Add a comment..."
          placeholderTextColor={c.placeholder}
          value={commentText}
          onChangeText={onChangeCommentText}
          multiline
          editable={!submitting}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
          onPress={onSubmitComment}
          disabled={!commentText.trim() || submitting}
        >
          <Text style={styles.sendButtonText}>{submitting ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  empty: {
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    gap: 10,
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  authorWrapper: {
    flex: 1,
    minWidth: 0,
  },
  deleteButton: {
    paddingLeft: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  delete: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 14,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 11,
    minWidth: 72,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
