// Create and export a Supabase client instance
// Uses environment variables REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
	// Fail fast with a clear error in development
	// eslint-disable-next-line no-console
	console.error('Missing Supabase environment variables. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase;
