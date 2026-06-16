
CREATE TYPE public.document_category AS ENUM ('receita', 'exame', 'laudo', 'outros');

CREATE TABLE public.medical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category public.document_category NOT NULL DEFAULT 'outros',
  title TEXT NOT NULL,
  description TEXT,
  document_date DATE,
  doctor_name TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_documents TO authenticated;
GRANT ALL ON public.medical_documents TO service_role;

ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON public.medical_documents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER medical_documents_set_updated_at
  BEFORE UPDATE ON public.medical_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_medical_documents_user ON public.medical_documents(user_id, document_date DESC);

-- Storage policies for medical-documents bucket (bucket created via tool)
CREATE POLICY "Users read own medical documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own medical documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own medical documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own medical documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
