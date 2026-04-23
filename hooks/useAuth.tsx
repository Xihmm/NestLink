import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
  const profileRequestIdRef = useRef(0);

  const waitForAuthUser = useCallback(
    (predicate: (nextUser: User | null) => boolean, timeoutMs = 5000): Promise<User | null> =>
      new Promise((resolve, reject) => {
        if (predicate(auth.currentUser)) {
          resolve(auth.currentUser);
          return;
        }

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          if (!predicate(nextUser)) {
            return;
          }

          clearTimeout(timeoutId);
          unsubscribe();
          resolve(nextUser);
        });

        const timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error('Timed out waiting for Firebase auth state to settle.'));
        }, timeoutMs);
      }),
    []
  );

  const hydrateCurrentUser = useCallback(async (nextUser: User) => {
    const nextProfile = await ensureUserProfile(nextUser);
    const generatedUsername = buildDefaultUsername(nextUser);
    return {
      nextProfile,
      needsUsernameSetup: nextProfile.username === generatedUsername,
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    // auth.authStateReady() resolves once Firebase has finished reading from
    // AsyncStorage (or any other persistence layer). Waiting for it before we
    // subscribe to onAuthStateChanged eliminates the race where Firebase emits
    // null *before* it has read the persisted session, which was causing the
    // app to flash the login screen even when the user was logged in.
    auth.authStateReady().then(() => {
      if (!active) return;

      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        if (!active) return;
        console.log('[useAuth] onAuthStateChanged fired uid=', nextUser?.uid ?? null, 'isAnonymous=', nextUser?.isAnonymous ?? null);
        setLoading(true);
        profileRequestIdRef.current += 1;
        const requestId = profileRequestIdRef.current;
        setProfile(null);
        setNeedsUsernameSetup(false);

        if (!nextUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(nextUser);

        if (nextUser.isAnonymous) {
          console.log('[useAuth] guest session active, skipping profile fetch for uid=', nextUser.uid);
          setLoading(false);
          return;
        }

        try {
          console.log('[useAuth] profile fetch start uid=', nextUser.uid, 'requestId=', requestId);
          const hydrated = await hydrateCurrentUser(nextUser);
          if (!active || profileRequestIdRef.current !== requestId || auth.currentUser?.uid !== nextUser.uid || auth.currentUser?.isAnonymous) {
            console.log('[useAuth] stale profile fetch ignored uid=', nextUser.uid, 'requestId=', requestId);
            return;
          }
          console.log('[useAuth] profile fetch resolved uid=', nextUser.uid, 'requestId=', requestId);
          setProfile(hydrated.nextProfile);
          setNeedsUsernameSetup(hydrated.needsUsernameSetup);
        } catch (error) {
          if (!active || profileRequestIdRef.current !== requestId || auth.currentUser?.uid !== nextUser.uid || auth.currentUser?.isAnonymous) {
            console.log('[useAuth] stale profile fetch error ignored uid=', nextUser.uid, 'requestId=', requestId);
            return;
          }
          console.error('Failed to initialize auth state:', error);
          const fallbackUsername = buildDefaultUsername(nextUser);
          setProfile({
            uid: nextUser.uid,
            username: fallbackUsername,
            email: nextUser.email ?? null,
            isVerified: isUrEmail(nextUser.email),
            isAnonymous: nextUser.isAnonymous,
          });
          setNeedsUsernameSetup(true);
        } finally {
          if (active) setLoading(false);
        }
      });
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [hydrateCurrentUser]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return;
    const hydrated = await hydrateCurrentUser(auth.currentUser);
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      setProfile(hydrated.nextProfile);
      setNeedsUsernameSetup(hydrated.needsUsernameSetup);
    }
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
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      await waitForAuthUser((nextUser) => !!nextUser?.isAnonymous && nextUser.uid === currentUser.uid);
      return;
    }

    // If a registered (non-anonymous) user's session was restored by Firebase,
    // sign them out first so "Continue as guest" never revives an old account.
    if (currentUser && !currentUser.isAnonymous) {
      console.log('[useAuth] continueAsGuest: signing out registered user before starting guest session');
      await firebaseSignOut(auth);
      await waitForAuthUser((nextUser) => nextUser === null);
    }

    const credential = await signInAnonymously(auth);
    await waitForAuthUser(
      (nextUser) => !!nextUser?.isAnonymous && nextUser.uid === credential.user.uid
    );
  }, [waitForAuthUser]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    await waitForAuthUser((nextUser) => nextUser === null);
  }, [waitForAuthUser]);

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
    isAnonymous: !!user?.isAnonymous,
    isRegisteredUser: !!user && !user.isAnonymous,
    isEduVerified: !user?.isAnonymous && (profile?.isVerified ?? isUrEmail(user?.email)),
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
