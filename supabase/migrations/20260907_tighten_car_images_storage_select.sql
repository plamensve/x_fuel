-- Tighten read/list access for the public car-images bucket.
--
-- The bucket remains PUBLIC, so image URLs generated with getPublicUrl()
-- continue to work for everyone. This migration only removes anonymous
-- object-listing access and replaces it with owner-scoped SELECT access for
-- authenticated users. SELECT is still required by Supabase Storage when an
-- authenticated owner removes one of their own files.

DROP POLICY IF EXISTS "Public can view car images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own car image objects" ON storage.objects;

CREATE POLICY "Users can read own car image objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'car-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
