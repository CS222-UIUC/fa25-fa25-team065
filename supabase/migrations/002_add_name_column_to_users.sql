-- Migration: Add name column to users table
-- This migration adds a name column to store the user's full name from Google OAuth

-- Add name column (nullable, as existing users won't have names)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name VARCHAR;

-- Add a comment to document the column
COMMENT ON COLUMN public.users.name IS 'Full name from Google OAuth account (e.g., "John Doe"). NULL for email/password users or if not available.';

