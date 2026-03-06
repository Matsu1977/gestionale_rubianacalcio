
CREATE TABLE public.rate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abbonamento_id UUID NOT NULL REFERENCES public.abbonamenti(id) ON DELETE CASCADE,
  numero_rata INTEGER NOT NULL,
  importo NUMERIC NOT NULL DEFAULT 0,
  data_scadenza DATE NOT NULL,
  stato TEXT NOT NULL DEFAULT 'Non pagata',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select rate" ON public.rate FOR SELECT USING (true);
CREATE POLICY "Anon insert rate" ON public.rate FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update rate" ON public.rate FOR UPDATE USING (true);
CREATE POLICY "Anon delete rate" ON public.rate FOR DELETE USING (true);
CREATE POLICY "Auth select rate" ON public.rate FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert rate" ON public.rate FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update rate" ON public.rate FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete rate" ON public.rate FOR DELETE TO authenticated USING (true);
