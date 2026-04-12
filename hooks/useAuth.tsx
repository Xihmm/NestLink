import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  isEduVerified: boolean;
  userEmail: string | null;
  username: string | null;
  needsUsernameSetup: boolean;
  saveUsername: (nextUsername: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildDefaultUsername = (u: User) => {
  const emailPrefix = u.email?.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '').trim();
  if (emailPrefix) return emailPrefix.slice(0, 24);
  return `user_${u.uid.slice(0, 8)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const saveUsername = useCallback(async (nextUsername: string) => {
    const trimmed = nextUsername.trim();
    if (!user?.uid || !trimmed) {
      throw new Error('Username cannot be empty.');
    }

    await setDoc(
      doc(db, 'users', user.uid),
      {
        username: trimmed,
        email: user.email ?? null,
      },
      { merge: true }
    );

    setUsername(trimmed);
    setNeedsUsernameSetup(false);
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const defaultUsername = buildDefaultUsername(u);

        try {
          const userDocRef = doc(db, 'users', u.uid);
          const snapshot = await getDoc(userDocRef);
          const existingData = snapshot.exists() ? snapshot.data() : {};
          const resolvedUsername =
            typeof existingData.username === 'string' && existingData.username.trim()
              ? existingData.username
              : defaultUsername;
          const isDefaultGenerated = resolvedUsername === defaultUsername;

          setUsername(resolvedUsername);
          setNeedsUsernameSetup(!u.isAnonymous && isDefaultGenerated);

          const profileUpdates: Record<string, unknown> = {};
          if (!snapshot.exists()) {
            profileUpdates.createdAt = Date.now();
          }
          if (existingData.username !== resolvedUsername) {
            profileUpdates.username = resolvedUsername;
          }
          if (u.email && existingData.email !== u.email) {
            profileUpdates.email = u.email;
          }

          if (Object.keys(profileUpdates).length > 0) {
            await setDoc(userDocRef, profileUpdates, { merge: true });
          }
        } catch (error) {
          console.error('Failed to initialize user profile:', error);
          setUsername(defaultUsername);
          setNeedsUsernameSetup(!u.isAnonymous);
        }

        setLoading(false);
      } else {
        // No user — sign in anonymously automatically
        setUser(null);
        setUsername(null);
        setNeedsUsernameSetup(false);
        signInAnonymously(auth).catch((error) => {
          console.error('Anonymous sign-in failed:', error);
          setLoading(false);
        });
      }
    });
    return unsub;
  }, []);

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAnonymous: user?.isAnonymous ?? true,
      isEduVerified: user?.email?.toLowerCase().endsWith('.edu') ?? false,
      userEmail: user?.email ?? null,
      username,
      needsUsernameSetup,
      saveUsername,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
