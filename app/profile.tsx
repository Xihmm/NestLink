import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Avatar } from '@/components/avatar';
import { TagBadge } from '@/components/tag-badge';
import { VerifiedBadge } from '@/components/verified-badge';
import { AVATAR_PRESETS } from '@/constants/avatar-presets';
import { useAuth } from '@/hooks/useAuth';
import { usePostsStore } from '@/hooks/usePostsStore';
import { storage } from '@/lib/firebase';
import { formatRelativeTime, toMillis } from '@/lib/time';

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0F172A' : '#EEF2F7',
  card: isDark ? '#111827' : '#FFFFFF',
  elevated: isDark ? '#162131' : '#F8FAFC',
  text: isDark ? '#F8FAFC' : '#111827',
  subtext: isDark ? '#94A3B8' : '#6B7280',
  border: isDark ? '#243244' : '#E2E8F0',
  input: isDark ? '#111827' : '#FFFFFF',
});

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, signOut, isRegisteredUser, isAnonymous, loading } = useAuth();
  const { posts } = usePostsStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [editing, setEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState(profile?.username ?? '');
  const [bioInput, setBioInput] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [avatarPreset, setAvatarPreset] = useState(profile?.avatarPreset ?? '');
  const [saving, setSaving] = useState(false);

  const myPosts = useMemo(
    () =>
      posts
        .filter((post) => !post.isSample && post.authorId === user?.uid)
        .sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0)),
    [posts, user?.uid]
  );

  if (!user) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>No active session</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.primaryButtonText}>Go to Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isAnonymous) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Avatar
            username="Guest Session"
            size={88}
          />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.username}>Guest Session</Text>
            </View>
            <Text style={styles.metaText}>Browsing anonymously</Text>
            <Text style={styles.bioText}>
              Create an account to unlock your profile, posts, and verified identity.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.signOutButton]}
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        >
          <Text style={styles.secondaryButtonText}>End Guest Session</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (loading || !profile) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>Loading profile…</Text>
      </View>
    );
  }

  const resetDraft = () => {
    setUsernameInput(profile.username ?? '');
    setBioInput(profile.bio ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setAvatarPreset(profile.avatarPreset ?? '');
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const avatarRef = storageRef(storage, `avatars/${user.uid}/profile.jpg`);
      await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(avatarRef);
      setAvatarUrl(downloadUrl);
      setAvatarPreset('');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      Alert.alert('Upload failed', 'We could not upload that avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        username: usernameInput,
        bio: bioInput,
        avatarUrl: avatarUrl || null,
        avatarPreset: avatarUrl ? null : avatarPreset || null,
      });
      setEditing(false);
      Alert.alert('Profile updated', 'Your profile changes are live.');
    } catch (error) {
      Alert.alert('Profile not saved', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Avatar
          username={editing ? usernameInput : profile.username}
          avatarUrl={editing ? avatarUrl || undefined : profile.avatarUrl}
          avatarPreset={editing ? avatarPreset || undefined : profile.avatarPreset}
          size={88}
        />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile.username}</Text>
            {profile.isVerified ? <VerifiedBadge /> : null}
          </View>
          <Text style={styles.metaText}>
            {profile.school || (profile.email ? profile.email : isAnonymous ? 'Guest session' : 'NestLink user')}
          </Text>
          {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.linkText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {editing ? (
          <>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="Short bio"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={140}
            />

            <Text style={styles.fieldLabel}>Avatar</Text>
            <View style={styles.avatarActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handlePickAvatar} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Upload Avatar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => {
                  setAvatarUrl('');
                  setAvatarPreset('');
                }}
                disabled={saving}
              >
                <Text style={styles.ghostButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetGrid}>
              {AVATAR_PRESETS.map((preset) => {
                const selected = !avatarUrl && avatarPreset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      setAvatarUrl('');
                      setAvatarPreset(preset.id);
                    }}
                    style={[styles.presetCard, selected && styles.presetCardSelected]}
                  >
                    <Avatar username={usernameInput} avatarPreset={preset.id} size={52} />
                    <Text style={styles.presetLabel}>{preset.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => {
                  resetDraft();
                  setEditing(false);
                }}
              >
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.readOnlyList}>
            <Text style={styles.detailRow}>Username: <Text style={styles.detailValue}>{profile.username}</Text></Text>
            <Text style={styles.detailRow}>Email: <Text style={styles.detailValue}>{profile.email || 'Not set'}</Text></Text>
            <Text style={styles.detailRow}>Bio: <Text style={styles.detailValue}>{profile.bio || 'No bio yet'}</Text></Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Posts</Text>
          <Text style={styles.counter}>{myPosts.length}</Text>
        </View>
        {myPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>Your listings and questions will appear here once you publish them.</Text>
          </View>
        ) : (
          <View style={styles.postsList}>
            {myPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => router.push(`/post/${post.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.postTopRow}>
                  <View style={styles.postTags}>
                    {post.types.map((type) => (
                      <TagBadge key={`${post.id}-${type}`} type={type} />
                    ))}
                  </View>
                  <Text style={styles.postTime}>{formatRelativeTime(post.createdAt, 'Recently')}</Text>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postBody} numberOfLines={2}>{post.body}</Text>
                {post.imageUrls?.[0] ? (
                  <Image source={{ uri: post.imageUrls[0] }} style={styles.postImage} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, styles.signOutButton]}
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
      >
        <Text style={styles.secondaryButtonText}>{isRegisteredUser ? 'Sign Out' : 'End Guest Session'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      padding: 24,
      gap: 12,
    },
    headerCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      gap: 6,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    username: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    metaText: {
      color: colors.subtext,
      fontSize: 14,
    },
    bioText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    noticeCard: {
      backgroundColor: '#13263E',
      borderColor: '#1D4ED8',
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    noticeTitle: {
      color: '#DBEAFE',
      fontSize: 16,
      fontWeight: '700',
    },
    noticeBody: {
      color: '#BFDBFE',
      fontSize: 14,
      lineHeight: 20,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    counter: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
    },
    linkText: {
      color: '#60A5FA',
      fontSize: 14,
      fontWeight: '700',
    },
    fieldLabel: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: -6,
    },
    input: {
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      color: colors.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    bioInput: {
      minHeight: 84,
      textAlignVertical: 'top',
    },
    avatarActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    presetCard: {
      width: '30%',
      minWidth: 96,
      backgroundColor: colors.elevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 8,
    },
    presetCardSelected: {
      borderColor: '#60A5FA',
      backgroundColor: '#13263E',
    },
    presetLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    readOnlyList: {
      gap: 10,
    },
    detailRow: {
      color: colors.subtext,
      fontSize: 14,
    },
    detailValue: {
      color: colors.text,
      fontWeight: '600',
    },
    postsList: {
      gap: 12,
    },
    postCard: {
      backgroundColor: colors.elevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    postTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'flex-start',
    },
    postTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      flex: 1,
    },
    postTime: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    postTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    postBody: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    postImage: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    emptyCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      backgroundColor: colors.elevated,
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    emptyBody: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    primaryButton: {
      backgroundColor: '#2563EB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: '#162131',
      borderColor: '#243244',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: '#E2E8F0',
      fontSize: 14,
      fontWeight: '700',
    },
    ghostButton: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    ghostButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    signOutButton: {
      marginBottom: 24,
    },
  });
