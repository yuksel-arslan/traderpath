// ===========================================
// Firebase Configuration
// ===========================================

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';

// Firebase configuration - set these in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ===========================================
// Auth Helper Functions
// ===========================================

export async function loginWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    return {
      success: true,
      user: result.user,
      token,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Firebase login error:', firebaseError.code, firebaseError.message);
    return {
      success: false,
      error: getErrorMessage(firebaseError.code),
    };
  }
}

export async function registerWithEmail(email: string, password: string, name: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update user profile with name
    await updateProfile(result.user, { displayName: name });

    const token = await result.user.getIdToken();
    return {
      success: true,
      user: result.user,
      token,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Firebase register error:', firebaseError.code, firebaseError.message);
    return {
      success: false,
      error: getErrorMessage(firebaseError.code),
    };
  }
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    return {
      success: true,
      user: result.user,
      token,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Firebase Google login error:', firebaseError.code, firebaseError.message);
    return {
      success: false,
      error: getErrorMessage(firebaseError.code),
    };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    // Clear cookie
    document.cookie = 'accessToken=; path=/; max-age=0';
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to logout' };
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ===========================================
// Error Message Mapping
// ===========================================

function getErrorMessage(code?: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  return errorMessages[code || ''] || 'An error occurred. Please try again.';
}

export { auth, googleProvider };
