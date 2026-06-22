
DROP POLICY IF EXISTS "Users can view their own medication photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own medication photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own medication photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own medication photos" ON storage.objects;

CREATE POLICY "Users can view their own medication photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medication-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own medication photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medication-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own medication photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medication-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own medication photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medication-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);
