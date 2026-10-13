/*
# Private Storage Bucket for Excel Files

1. Storage
- Create bucket `excel-files` as PRIVATE (public = false)
- No storage policies are added — users cannot read or write this bucket
- Only the service role key (used in edge functions) can upload/read files

2. Security
- Bucket is private (public = false)
- NO policies are created for authenticated or anon roles
- This means no user can access files via the Supabase client
- Files are only accessible via the Supabase admin dashboard or service role
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-files', 'excel-files', false)
ON CONFLICT (id) DO NOTHING;
