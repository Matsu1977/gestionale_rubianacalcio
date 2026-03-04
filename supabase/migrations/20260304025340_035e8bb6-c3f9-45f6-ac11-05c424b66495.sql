
-- Create tesseramenti table
CREATE TABLE public.tesseramenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  stagione TEXT NOT NULL,
  tipo_tesseramento TEXT NOT NULL DEFAULT 'Standard',
  data_inizio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine DATE,
  stato TEXT NOT NULL DEFAULT 'Attivo' CHECK (stato IN ('Attivo', 'Scaduto', 'In attesa')),
  importo NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tesseramenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon select tesseramenti" ON public.tesseramenti FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert tesseramenti" ON public.tesseramenti FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update tesseramenti" ON public.tesseramenti FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon delete tesseramenti" ON public.tesseramenti FOR DELETE TO anon USING (true);
CREATE POLICY "Auth select tesseramenti" ON public.tesseramenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert tesseramenti" ON public.tesseramenti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tesseramenti" ON public.tesseramenti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete tesseramenti" ON public.tesseramenti FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_tesseramenti_persona ON public.tesseramenti(persona_id);

-- Create abbonamenti table
CREATE TABLE public.abbonamenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  corso TEXT NOT NULL,
  stagione TEXT NOT NULL,
  importo_totale NUMERIC(10,2) NOT NULL DEFAULT 0,
  numero_rate INTEGER NOT NULL DEFAULT 1,
  stato_pagamento TEXT NOT NULL DEFAULT 'Non pagato' CHECK (stato_pagamento IN ('Pagato', 'Parziale', 'Non pagato')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.abbonamenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon select abbonamenti" ON public.abbonamenti FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert abbonamenti" ON public.abbonamenti FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update abbonamenti" ON public.abbonamenti FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon delete abbonamenti" ON public.abbonamenti FOR DELETE TO anon USING (true);
CREATE POLICY "Auth select abbonamenti" ON public.abbonamenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert abbonamenti" ON public.abbonamenti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update abbonamenti" ON public.abbonamenti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete abbonamenti" ON public.abbonamenti FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_abbonamenti_persona ON public.abbonamenti(persona_id);

-- Add riferimento columns to movimenti
ALTER TABLE public.movimenti ADD COLUMN riferimento_tipo TEXT CHECK (riferimento_tipo IN ('tesseramento', 'abbonamento', 'quota_socio'));
ALTER TABLE public.movimenti ADD COLUMN riferimento_id UUID;
CREATE INDEX idx_movimenti_riferimento ON public.movimenti(riferimento_tipo, riferimento_id);
