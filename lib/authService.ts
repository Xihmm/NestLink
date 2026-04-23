/**
 * authService.ts
 *
 * Thin service layer over Firebase Auth.
 * All auth operations go through here so the rest of the app
 * never imports directly from firebase/auth.
 *
 * Anonymous accounts can be upgraded to email or Google later via
 * linkWithCredential() — the uid stays the same, all Firestore data
 * (posts, etc.) remains linked without any migration.
 */

import {
  signInAnonymously,
  signOut,
  linkWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Starts or restores an anonymous guest session. */
export const initAnonymousUser = async (): Promise<void> => {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
};

/** Returns the currently authenticated user, or null. */
export const getCurrentUser = (): User | null => auth.currentUser;

/** Signs the user out completely. */
export const signOutUser = (): Promise<void> => signOut(auth);

/** Returns true if the email is a .edu address. */
export const isEduEmail = (email: string): boolean => email.trim().toLowerCase().endsWith('.edu');

/**
 * Registers with email+password.
 * If the user is currently anonymous, upgrades the account (uid preserved).
 * Otherwise creates a brand-new account.
 */
export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  const current = auth.currentUser;
  if (current && current.isAnonymous) {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(current, credential);
    return result.user;
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

/** Signs in with email+password. */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

/**
 * Upgrades an anonymous account to email+password.
 * uid is preserved — all existing posts stay linked.
 *
 * Usage (when you build the UI):
 *   await linkEmail('user@example.com', 'password123');
 */
export const linkEmail = async (email: string, password: string): Promise<User> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No current user to upgrade');
  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(user, credential);
  return result.user;
};

/**
 * Upgrades an anonymous account to Google.
 * uid is preserved — all existing posts stay linked.
 * Pass the idToken received from Google OAuth flow.
 *
 * Usage (when you build the UI):
 *   const idToken = ...; // from expo-auth-session or google-signin
 *   await linkGoogle(idToken);
 */
export const linkGoogle = async (idToken: string): Promise<User> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No current user to upgrade');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await linkWithCredential(user, credential);
  return result.user;
};
