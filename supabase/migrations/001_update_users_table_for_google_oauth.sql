-- Migration: Update users table to support Google OAuth
-- This migration makes password_hash and username nullable to support Google OAuth users
-- who don't have passwords and may not have usernames initially

-- Make password_hash nullable (Google OAuth users don't have passwords)
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Make username nullable (Google OAuth users will have username generated from email)
-- Note: If username has a UNIQUE constraint, we may need to handle that separately
-- For now, we'll keep the UNIQUE constraint but allow NULL values
ALTER TABLE public.users 
ALTER COLUMN username DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN public.users.password_hash IS 'Password hash for email/password users. NULL for OAuth users.';
COMMENT ON COLUMN public.users.username IS 'Username for the user. For Google OAuth users, this is generated from the Gmail tag (part before @).';
COMMENT ON COLUMN public.users.method IS 'Authentication method: NULL for OAuth users, "email" for email/password users.';

