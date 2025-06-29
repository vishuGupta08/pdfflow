import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Debug Firebase configuration (without exposing sensitive data)
console.log('🔧 Firebase Config Debug:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  configComplete: !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)
});

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Add these scopes for better user info
googleProvider.addScope('email');
googleProvider.addScope('profile');

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string): Promise<AuthUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return this.formatUser(userCredential.user);
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<AuthUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return this.formatUser(userCredential.user);
  }

  // Sign in with Google using popup (reverting to working method)
  static async signInWithGoogle(): Promise<AuthUser> {
    console.log('🚀 Starting Google sign-in popup...');
    const userCredential = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google popup sign-in success:', userCredential.user.email);
    return this.formatUser(userCredential.user);
  }

  // Sign out
  static async signOut(): Promise<void> {
    console.log('🚪 Signing out...');
    await signOut(auth);
  }

  // Get current user
  static getCurrentUser(): User | null {
    const user = auth.currentUser;
    console.log('👤 Getting current user:', user ? user.email : 'No user');
    return user;
  }

  // Get auth token for API calls
  static async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      console.log('🔑 Got auth token for:', user.email);
      return token;
    }
    console.log('🔑 No user for auth token');
    return null;
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    console.log('🎧 Setting up auth state change listener...');
    return onAuthStateChanged(auth, (user: User | null) => {
      console.log('🔄 Firebase auth state changed:', user ? `${user.email} (verified: ${user.emailVerified})` : 'No user');
      if (user) {
        callback(this.formatUser(user));
      } else {
        callback(null);
      }
    });
  }

  // Format Firebase user to our AuthUser interface
  private static formatUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  }
} 