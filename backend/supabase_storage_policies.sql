-- Drop existing restrictive storage policies for teams bucket
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- Recreate storage policies to allow both public (anon) and authenticated roles
CREATE POLICY "Admin Upload" ON storage.objects 
FOR INSERT TO public, authenticated 
WITH CHECK (bucket_id = 'teams');

CREATE POLICY "Admin Update" ON storage.objects 
FOR UPDATE TO public, authenticated 
USING (bucket_id = 'teams');

CREATE POLICY "Admin Delete" ON storage.objects 
FOR DELETE TO public, authenticated 
USING (bucket_id = 'teams');
