import { TimestampValue } from '@/types/post';

export type SessionState = 'loading' | 'signed_out' | 'guest' | 'registered';

export type AvatarPresetId =
  | 'otter'
  | 'frog'
  | 'cat'
  | 'panda'
  | 'duck'
  | 'hamster';

export interface UserProfile {
  uid: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  avatarPreset?: AvatarPresetId;
  email?: string | null;
  school?: string | null;
  isVerified?: boolean;
  isAnonymous?: boolean;
  savedPostIds?: string[];
  createdAt?: TimestampValue;
  updatedAt?: TimestampValue;
}

export interface PostComment {
  id: string;
  text: string;
  authorId?: string;
  authorUsername?: string;
  authorName?: string;
  authorEmail?: string | null;
  authorAvatarUrl?: string;
  authorAvatarPreset?: AvatarPresetId;
  authorVerified?: boolean;
  createdAt?: TimestampValue;
}
