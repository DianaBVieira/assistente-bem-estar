
CREATE POLICY "Users view own med photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'medication-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own med photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medication-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own med photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'medication-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own med photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'medication-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
