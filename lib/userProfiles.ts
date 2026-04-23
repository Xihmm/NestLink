import { User } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types/post';
import { AvatarPresetId, PostComment, UserProfile } from '@/types/user';

export const USERNAME_MAX_LENGTH = 24;
export const BIO_MAX_LENGTH = 140;
export const COMMENT_MAX_LENGTH = 400;

export function isUrEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase().endsWith('.rochester.edu') ?? false;
}

export function buildDefaultUsername(user: User): string {
  const emailPrefix = user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '').trim();
  if (emailPrefix) return emailPrefix.slice(0, USERNAME_MAX_LENGTH);
  return `guest_${user.uid.slice(0, 6)}`;
}

export function validateUsername(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Username is required.');
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

export function validateBio(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length > BIO_MAX_LENGTH) {
    throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

export function validateComment(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Comment cannot be empty.');
  }
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    throw new Error(`Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

export function deriveSchool(email?: string | null, existingSchool?: string | null): string | null {
  if (existingSchool) return existingSchool;
  if (isUrEmail(email)) return 'University of Rochester';
  return null;
}

export function normalizeUserProfile(uid: string, raw: Record<string, unknown> | undefined, user?: User | null): UserProfile {
  const fallbackUsername = user ? buildDefaultUsername(user) : `user_${uid.slice(0, 6)}`;
  const email = typeof raw?.email === 'string' ? raw.email : user?.email ?? null;
  const isAnonymous = typeof raw?.isAnonymous === 'boolean' ? raw.isAnonymous : user?.isAnonymous ?? false;
  const username =
    typeof raw?.username === 'string' && raw.username.trim()
      ? raw.username.trim()
      : fallbackUsername;

  return {
    uid,
    username,
    bio: typeof raw?.bio === 'string' ? raw.bio : undefined,
    avatarUrl: typeof raw?.avatarUrl === 'string' ? raw.avatarUrl : undefined,
    avatarPreset: typeof raw?.avatarPreset === 'string' ? raw.avatarPreset as AvatarPresetId : undefined,
    email,
    school: deriveSchool(email, typeof raw?.school === 'string' ? raw.school : null),
    isVerified:
      typeof raw?.isVerified === 'boolean'
        ? raw.isVerified
        : isUrEmail(email),
    isAnonymous,
    savedPostIds: Array.isArray(raw?.savedPostIds) ? raw.savedPostIds.filter((item): item is string => typeof item === 'string') : undefined,
    createdAt: raw?.createdAt as UserProfile['createdAt'],
    updatedAt: raw?.updatedAt as UserProfile['updatedAt'],
  };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return normalizeUserProfile(uid, snapshot.data());
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
      return null;
    }
    throw error;
  }
}

export async function fetchUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const uniqueIds = Array.from(new Set(uids.filter(Boolean)));
  const entries = await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const profile = await fetchUserProfile(uid);
        return profile ? [uid, profile] as const : null;
      } catch (error) {
        console.error('Failed to fetch user profile:', { uid, error });
        return null;
      }
    })
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, UserProfile] => entry !== null));
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : undefined;
  const normalized = normalizeUserProfile(user.uid, existing, user);

  await setDoc(
    ref,
    {
      username: normalized.username,
      email: user.email ?? null,
      isAnonymous: user.isAnonymous,
      isVerified: normalized.isVerified ?? false,
      school: normalized.school ?? null,
      createdAt: existing?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return normalized;
}

type IdentityFields = Pick<UserProfile, 'username' | 'avatarUrl' | 'avatarPreset' | 'isVerified' | 'email'>;

export async function syncUserIdentityAcrossContent(uid: string, identity: IdentityFields): Promise<void> {
  const postSnapshot = await getDocs(query(collectionGroup(db, 'comments'), where('authorId', '==', uid)));
  const directPosts = await getDocs(query(collection(db, 'posts'), where('authorId', '==', uid)));
  const batch = writeBatch(db);
  let mutationCount = 0;

  directPosts.forEach((postDoc) => {
    batch.set(
      postDoc.ref,
      {
        authorUsername: identity.username,
        authorAvatarUrl: identity.avatarUrl ?? null,
        authorAvatarPreset: identity.avatarPreset ?? null,
        authorVerified: identity.isVerified ?? false,
        authorEmail: identity.email ?? null,
      },
      { merge: true }
    );
    mutationCount += 1;
  });

  postSnapshot.forEach((commentDoc) => {
    batch.set(
      commentDoc.ref,
      {
        authorUsername: identity.username,
        authorAvatarUrl: identity.avatarUrl ?? null,
        authorAvatarPreset: identity.avatarPreset ?? null,
        authorVerified: identity.isVerified ?? false,
        authorEmail: identity.email ?? null,
      },
      { merge: true }
    );
    mutationCount += 1;
  });

  if (mutationCount > 0) {
    await batch.commit();
  }
}

export function applyProfileToPost(post: Post, profile?: UserProfile | null): Post {
  if (!profile || post.authorId !== profile.uid) return post;
  return {
    ...post,
    authorUsername: profile.username,
    authorAvatarUrl: profile.avatarUrl,
    authorAvatarPreset: profile.avatarPreset,
    authorVerified: profile.isVerified,
    authorEmail: profile.email ?? post.authorEmail,
  };
}

export function applyProfileToComment(comment: PostComment, profile?: UserProfile | null): PostComment {
  if (!profile || comment.authorId !== profile.uid) return comment;
  return {
    ...comment,
    authorUsername: profile.username,
    authorAvatarUrl: profile.avatarUrl,
    authorAvatarPreset: profile.avatarPreset,
    authorVerified: profile.isVerified,
    authorEmail: profile.email ?? comment.authorEmail ?? null,
  };
}
