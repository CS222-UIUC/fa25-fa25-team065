import bcrypt from 'bcryptjs';
import { supabase } from '../supabase/client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
}

export interface LocalUser {
  id: string;
  email: string;
  username: string;
}

const getErrorMessage = (code: string): string => {
  switch (code) {
    case 'user-not-found':
      return 'No account found with this email address.';
    case 'wrong-password':
      return 'Incorrect password. Please try again.';
    case 'invalid-email':
      return 'Invalid email address.';
    case 'email-already-in-use':
      return 'An account with this email already exists.';
    default:
      return 'An error occurred. Please try again.';
  }
};

export class AuthService {
  static async signIn(credentials: LoginCredentials): Promise<LocalUser> {
    try {
      // eslint-disable-next-line no-console
      console.log('[AuthService.signIn] querying users by email');
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, password_hash')
        .eq('email', credentials.email)
        .limit(1)
        .maybeSingle();

      if (error) {
        // eslint-disable-next-line no-console
        console.error('[AuthService.signIn] supabase select error', error);
        throw new Error(error.message || getErrorMessage('unknown'));
      }
      if (!data) throw new Error(getErrorMessage('user-not-found'));

      const passwordMatches = await bcrypt.compare(
        credentials.password,
        data.password_hash as string
      );

      if (!passwordMatches) {
        throw new Error(getErrorMessage('wrong-password'));
      }

      const user: LocalUser = { id: data.id, email: data.email, username: data.username };
      return user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : getErrorMessage('unknown');
      throw new Error(msg);
    }
  }

  static async signUp(credentials: RegisterCredentials): Promise<LocalUser> {
    try {
      // Check duplicates (email)
      const { data: existingEmail, error: emailErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', credentials.email)
        .limit(1)
        .maybeSingle();
      if (emailErr) {
        // eslint-disable-next-line no-console
        console.error('[AuthService.signUp] email check error', emailErr);
        throw new Error(emailErr.message || getErrorMessage('unknown'));
      }
      if (existingEmail) {
        throw new Error(getErrorMessage('email-already-in-use'));
      }

      // Check duplicates (username)
      const { data: existingUsername, error: usernameErr } = await supabase
        .from('users')
        .select('id')
        .eq('username', credentials.username)
        .limit(1)
        .maybeSingle();
      if (usernameErr) {
        // eslint-disable-next-line no-console
        console.error('[AuthService.signUp] username check error', usernameErr);
        throw new Error(usernameErr.message || getErrorMessage('unknown'));
      }
      if (existingUsername) {
        throw new Error('Username is already taken.');
      }

      const passwordHash = await bcrypt.hash(credentials.password, 10);

      // Insert user
      // eslint-disable-next-line no-console
      console.log('[AuthService.signUp] inserting user row');
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: credentials.email,
          username: credentials.username,
          password_hash: passwordHash,
        })
        .select('id, email, username')
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.error('[AuthService.signUp] supabase insert error', error);
        throw new Error(error.message || getErrorMessage('unknown'));
      }

      const user: LocalUser = { id: data.id, email: data.email, username: data.username };
      return user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : getErrorMessage('unknown');
      throw new Error(msg);
    }
  }

  static async signOut(): Promise<void> {
    return;
  }

  static getCurrentUser(): LocalUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalUser;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!AuthService.getCurrentUser();
  }
}
