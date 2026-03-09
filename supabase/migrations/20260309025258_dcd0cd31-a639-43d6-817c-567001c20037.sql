
-- Create documenti_firmati table
CREATE TABLE public.documenti_firmati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  nome_persona text NOT NULL,
  data_firma timestamptz NOT NULL DEFAULT now(),
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documenti_firmati ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anon select documenti_firmati" ON public.documenti_firmati FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert documenti_firmati" ON public.documenti_firmati FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon delete documenti_firmati" ON public.documenti_firmati FOR DELETE TO anon USING (true);
CREATE POLICY "Auth select documenti_firmati" ON public.documenti_firmati FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert documenti_firmati" ON public.documenti_firmati FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete documenti_firmati" ON public.documenti_firmati FOR DELETE TO authenticated USING (true);

-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documenti-firmati', 'documenti-firmati', true);

-- Storage RLS policies
CREATE POLICY "Anyone can upload documenti" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documenti-firmati');
CREATE POLICY "Anyone can read documenti" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'documenti-firmati');
CREATE POLICY "Anyone can delete documenti" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documenti-firmati');
