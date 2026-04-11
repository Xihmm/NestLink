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
  GoogleAuthProvider,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Called on app start. Signs in anonymously if no session exists. */
export const initAnonymousUser = async (): Promise<void> => {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
};

/** Returns the currently authenticated user, or null. */
export const getCurrentUser = (): User | null => auth.currentUser;

/** Signs the user out (they will be auto-signed-in anonymously again on next launch). */
export const signOutUser = (): Promise<void> => signOut(auth);

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
