import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Frontend must ONLY use the anon public key. Do NOT expose service role.
// Set in .env.local (Create React App):
//   REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
//   REACT_APP_SUPABASE_ANON_KEY=<anon-public-key>

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in dev; avoids silent undefined behavior
  // eslint-disable-next-line no-console
  console.error('Missing Supabase env vars. Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export type UploadResult = {
  key: string;
  path: string; // same as key
};

// Matches your receipts table schema
export type ReceiptRecordInput = {
  userId: string; // users.id (uuid)
  merchantName?: string | null;
  totalAmount?: number | null;
  taxAmount?: number | null;
  tipAmount?: number | null;
  receiptUrl: string; // public or signed/permanent URL to the stored file
  parsed?: boolean | null;
};

/**
 * Upload a file to Supabase Storage in a pseudo-folder under the user's id.
 * Bucket should exist (e.g., 'receipts').
 */
export async function uploadToStorage(
  bucket: string,
  userId: string,
  file: File
): Promise<UploadResult> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const key = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return { key, path: key };
}

/** Insert a receipt row into the receipts table using your schema. */
export async function insertReceipt(
  input: ReceiptRecordInput
) {
  const { error } = await supabase.from('receipts').insert({
    user_id: input.userId,
    merchant_name: input.merchantName ?? null,
    total_amount: input.totalAmount ?? null,
    tax_amount: input.taxAmount ?? null,
    tip_amount: input.tipAmount ?? null,
    receipt_url: input.receiptUrl,
    parsed: input.parsed ?? false,
  });
  if (error) throw error;
}

/** Create a time-limited URL for a private object. */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number
): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw error || new Error('No signed URL');
  return data.signedUrl;
}

/** Get a public URL (for objects in a public bucket). */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ===== Supabase Auth-centric helpers (no Firebase) =====

/** Get the current Supabase Auth user (or null if not signed in). */
export async function getCurrentSupabaseUser(): Promise<{ id: string; email: string | null } | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const u = data.user;
  if (!u) return null;
  return { id: u.id, email: u.email ?? null };
}

/** Fetch app user by auth_user_id from your users table. */
// Look up app user by email (your users table does not have auth_user_id)
export async function getUserByEmail(email: string): Promise<{ id: string; email: string | null } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Ensure a users row exists linked to Supabase Auth (returns users.id). */
export async function getOrCreateUserByAuth(_authUserId: string, email: string | null): Promise<string> {
  if (!email) throw new Error('Missing email for user linkage');

  const existing = await getUserByEmail(email);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('users')
    .insert({ email })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}


