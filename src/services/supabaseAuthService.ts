import { supabase } from '../lib/supabase';

export interface SupabaseLoginCredentials {
  email: string;
  password: string;
}

export interface SupabaseRegisterCredentials extends SupabaseLoginCredentials {
  username?: string; // optional, stored in your own users table later if needed
}

export class SupabaseAuthService {
  static async signIn(credentials: SupabaseLoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
    return data.user;
  }

  static async signUp(credentials: SupabaseRegisterCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
    return data.user;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  static async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
    return data;
  }
}


