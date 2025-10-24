import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User,
  AuthError,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';

// Custom error messages for better UX
const getErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
}

export class AuthService {
  // Sign in with email and password
  static async signIn(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('Attempting to sign in with:', credentials.email);
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      console.log('Sign in successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  }

  // Create new user account
  static async signUp(credentials: RegisterCredentials): Promise<User> {
    try {
      console.log('Attempting to create account for:', credentials.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      
      console.log('Account created successfully:', userCredential.user.uid);
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: credentials.username
      });
      
      console.log('Profile updated with username:', credentials.username);
      return userCredential.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  }

  // Sign out current user
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!auth.currentUser;
  }
}
