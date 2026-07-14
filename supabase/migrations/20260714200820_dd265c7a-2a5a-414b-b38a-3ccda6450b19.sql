
CREATE POLICY "own alarm sounds read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'alarm-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own alarm sounds insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'alarm-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own alarm sounds update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'alarm-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own alarm sounds delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'alarm-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
