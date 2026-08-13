CREATE POLICY "Authenticated can read team avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');