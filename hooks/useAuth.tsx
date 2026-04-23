import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { initAnonymousUser } from '@/lib/authService';
import {
  buildDefaultUsername,
  ensureUserProfile,
  isUrEmail,
  syncUserIdentityAcrossContent,
  validateBio,
  validateUsername,
} from '@/lib/userProfiles';
import { SessionState } from '@/types/user';
import { UserProfile } from '@/types/user';

type UpdateProfileInput = {
  username?: string;
  bio?: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionState: SessionState;
  hasSession: boolean;
  isAnonymous: boolean;
  isRegisteredUser: boolean;
  isEduVerified: boolean;
  userEmail: string | null;
  username: string | null;
  profile: UserProfile | null;
  needsUsernameSetup: boolean;
  continueAsGuest: () => Promise<void>;
  saveUsername: (nextUsername: string) => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const hydrateCurrentUser = useCallback(async (nextUser: User) => {
    const nextProfile = await ensureUserProfile(nextUser);
    const generatedUsername = buildDefaultUsername(nextUser);
    setUser(nextUser);
    setProfile(nextProfile);
    setNeedsUsernameSetup(!nextUser.isAnonymous && nextProfile.username === generatedUsername);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      console.log('[useAuth] onAuthStateChanged fired uid=', nextUser?.uid ?? null, 'isAnonymous=', nextUser?.isAnonymous ?? null);
      setLoading(true);

      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setNeedsUsernameSetup(false);
        setLoading(false);
        return;
      }

      try {
        await hydrateCurrentUser(nextUser);
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        const fallbackUsername = buildDefaultUsername(nextUser);
        setUser(nextUser);
        setProfile({
          uid: nextUser.uid,
          username: fallbackUsername,
          email: nextUser.email ?? null,
          isVerified: isUrEmail(nextUser.email),
          isAnonymous: nextUser.isAnonymous,
        });
        setNeedsUsernameSetup(!nextUser.isAnonymous);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [hydrateCurrentUser]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await hydrateCurrentUser(auth.currentUser);
  }, [hydrateCurrentUser]);

  const updateProfile = useCallback(async (updates: UpdateProfileInput) => {
    if (!user?.uid) {
      throw new Error('You must be signed in to update your profile.');
    }

    const nextUsername =
      updates.username !== undefined
        ? validateUsername(updates.username)
        : profile?.username ?? buildDefaultUsername(user);
    const nextBio =
      updates.bio !== undefined
        ? validateBio(updates.bio)
        : profile?.bio ?? '';
    const nextAvatarUrl =
      updates.avatarUrl !== undefined ? updates.avatarUrl ?? null : profile?.avatarUrl ?? null;
    const nextAvatarPreset =
      updates.avatarPreset !== undefined ? updates.avatarPreset ?? null : profile?.avatarPreset ?? null;
    const nextVerified = isUrEmail(user.email);

    await setDoc(
      doc(db, 'users', user.uid),
      {
        username: nextUsername,
        bio: nextBio || null,
        avatarUrl: nextAvatarUrl,
        avatarPreset: nextAvatarUrl ? null : nextAvatarPreset,
        email: user.email ?? null,
        isAnonymous: user.isAnonymous,
        isVerified: nextVerified,
        school: nextVerified ? 'University of Rochester' : profile?.school ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await syncUserIdentityAcrossContent(user.uid, {
      username: nextUsername,
      avatarUrl: nextAvatarUrl ?? undefined,
      avatarPreset: (nextAvatarUrl ? undefined : nextAvatarPreset ?? undefined) as UserProfile['avatarPreset'],
      isVerified: nextVerified,
      email: user.email ?? null,
    });

    setProfile((prev) => ({
      uid: user.uid,
      username: nextUsername,
      bio: nextBio || undefined,
      avatarUrl: nextAvatarUrl ?? undefined,
      avatarPreset: (nextAvatarUrl ? undefined : nextAvatarPreset ?? undefined) as UserProfile['avatarPreset'],
      email: user.email ?? null,
      school: nextVerified ? 'University of Rochester' : prev?.school ?? null,
      isVerified: nextVerified,
      isAnonymous: user.isAnonymous,
      savedPostIds: prev?.savedPostIds,
      createdAt: prev?.createdAt,
      updatedAt: Date.now(),
    }));
    setNeedsUsernameSetup(false);
  }, [profile, user]);

  const saveUsername = useCallback(async (nextUsername: string) => {
    await updateProfile({ username: nextUsername });
  }, [updateProfile]);

  const continueAsGuest = useCallback(async () => {
    await initAnonymousUser();
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
  }, []);

  const sessionState: SessionState = useMemo(() => {
    if (loading) return 'loading';
    if (!user) return 'signed_out';
    return user.isAnonymous ? 'guest' : 'registered';
  }, [loading, user]);

  useEffect(() => {
    console.log(
      '[useAuth] state loading=',
      loading,
      'sessionState=',
      sessionState,
      'uid=',
      user?.uid ?? null,
      'isAnonymous=',
      user?.isAnonymous ?? null
    );
  }, [loading, sessionState, user]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    sessionState,
    hasSession: sessionState === 'guest' || sessionState === 'registered',
    isAnonymous: sessionState === 'guest',
    isRegisteredUser: sessionState === 'registered',
    isEduVerified: profile?.isVerified ?? isUrEmail(user?.email),
    userEmail: user?.email ?? null,
    username: profile?.username ?? null,
    profile,
    needsUsernameSetup,
    continueAsGuest,
    saveUsername,
    updateProfile,
    refreshProfile,
    signOut,
  }), [
    continueAsGuest,
    loading,
    needsUsernameSetup,
    profile,
    refreshProfile,
    saveUsername,
    sessionState,
    updateProfile,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
