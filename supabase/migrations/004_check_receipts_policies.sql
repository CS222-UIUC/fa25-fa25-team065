-- Check existing RLS policies on receipts table
-- Run this query first to see what policies exist

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'receipts'
ORDER BY policyname;

-- Also check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'receipts';

