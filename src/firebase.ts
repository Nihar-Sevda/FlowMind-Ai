import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request Google Calendar scope
provider.addScope('https://www.googleapis.com/auth/calendar');

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

// Cache the access token in memory
let cachedAccessToken: string | null = null;

// Fallback local accounts database helpers
const getLocalAccounts = (): Record<string, { passwordHash: string; displayName?: string }> => {
  try {
    const raw = localStorage.getItem('flowmind_local_accounts');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalAccounts = (accounts: Record<string, { passwordHash: string; displayName?: string }>) => {
  try {
    localStorage.setItem('flowmind_local_accounts', JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save local accounts:', err);
  }
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // First check if there is a active local session
  const localSessionRaw = localStorage.getItem('flowmind_local_session');
  if (localSessionRaw) {
    try {
      const localUser = JSON.parse(localSessionRaw);
      if (onAuthSuccess) {
        // Run on next tick to let React components mount completely
        setTimeout(() => {
          onAuthSuccess(localUser as User, '');
        }, 0);
        return () => {}; // return empty unsubscribe
      }
    } catch {}
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || sessionStorage.getItem('gcal_temp_access_token') || '';
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Login with email and password
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
      console.warn('Firebase Email/Password auth is disabled on this project. Falling back to local accounts.');
      const accounts = getLocalAccounts();
      const normalizedEmail = email.toLowerCase().trim();
      const account = accounts[normalizedEmail];
      
      if (!account || account.passwordHash !== btoa(password)) {
        const mockError = new Error('Invalid email or password.') as any;
        mockError.code = 'auth/invalid-credential';
        throw mockError;
      }
      
      const mockUser = {
        uid: `local_${normalizedEmail}`,
        email: normalizedEmail,
        displayName: account.displayName || normalizedEmail.split('@')[0],
        photoURL: null,
      } as unknown as User;
      
      localStorage.setItem('flowmind_local_session', JSON.stringify(mockUser));
      return mockUser;
    }
    throw error;
  }
};

// Register with email and password
export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
      console.warn('Firebase Email/Password auth is disabled on this project. Falling back to local sandbox registration.');
      const accounts = getLocalAccounts();
      const normalizedEmail = email.toLowerCase().trim();
      
      if (accounts[normalizedEmail]) {
        const mockError = new Error('This email is already registered.') as any;
        mockError.code = 'auth/email-already-in-use';
        throw mockError;
      }
      
      accounts[normalizedEmail] = {
        passwordHash: btoa(password),
        displayName: normalizedEmail.split('@')[0]
      };
      saveLocalAccounts(accounts);
      
      const mockUser = {
        uid: `local_${normalizedEmail}`,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        photoURL: null,
      } as unknown as User;
      
      localStorage.setItem('flowmind_local_session', JSON.stringify(mockUser));
      return mockUser;
    }
    throw error;
  }
};

// Connect Google Account for Calendar
export const connectGoogleCalendar = async (): Promise<string> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth Provider');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('gcal_temp_access_token', cachedAccessToken);
    return cachedAccessToken;
  } catch (error: any) {
    console.error('Google Calendar linking error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Also save a reference in sessionStorage for session survivability, since HMR or partial reloads can clear in-memory cache
    sessionStorage.setItem('gcal_temp_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('gcal_temp_access_token');
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  sessionStorage.removeItem('gcal_temp_access_token');
  localStorage.removeItem('flowmind_local_session');
};
