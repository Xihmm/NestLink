import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export function CommentsSection({
  comments,
  commentText,
  onChangeCommentText,
  onSubmitComment,
  onDeleteComment,
  currentUserId,
  submitting,
  emptyText = 'No comments yet.',
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Comments</Text>
      {comments.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
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
              <View key={comment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <AuthorRow
                    username={name}
                    subtitle={formatRelativeTime(comment.createdAt, 'Recently')}
                    avatarUrl={comment.authorAvatarUrl}
                    avatarPreset={comment.authorAvatarPreset}
                    verified={comment.authorVerified}
                    avatarSize={34}
                  />
                  {isOwner && onDeleteComment ? (
                    <TouchableOpacity
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
                      <Text style={styles.delete}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.body}>{comment.text}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#94A3B8"
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
    color: '#F8FAFC',
    marginBottom: 14,
  },
  empty: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  list: {
    gap: 10,
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: '#243244',
    backgroundColor: '#162131',
    borderRadius: 14,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  delete: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderColor: '#243244',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: '#F8FAFC',
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
    backgroundColor: '#60A5FA',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
