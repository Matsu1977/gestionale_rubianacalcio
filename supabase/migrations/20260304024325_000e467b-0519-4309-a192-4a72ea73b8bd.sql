
-- Create enums for movimenti
CREATE TYPE public.tipo_movimento AS ENUM ('Entrata', 'Uscita');
CREATE TYPE public.categoria_movimento AS ENUM ('Quota socio', 'Abbonamento', 'Tesseramento', 'Altro');
CREATE TYPE public.metodo_pagamento AS ENUM ('Contanti', 'Bonifico', 'Carta', 'Satispay', 'Altro');

-- Create movimenti table
CREATE TABLE public.movimenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_movimento NOT NULL,
  categoria categoria_movimento NOT NULL,
  importo NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo_pagamento metodo_pagamento NOT NULL,
  persona_id UUID REFERENCES public.persone(id) ON DELETE SET NULL,
  riferimento TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movimenti ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth yet)
CREATE POLICY "Anon can view movimenti" ON public.movimenti FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert movimenti" ON public.movimenti FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update movimenti" ON public.movimenti FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete movimenti" ON public.movimenti FOR DELETE TO anon USING (true);
CREATE POLICY "Auth can view movimenti" ON public.movimenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert movimenti" ON public.movimenti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update movimenti" ON public.movimenti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete movimenti" ON public.movimenti FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX idx_movimenti_persona_id ON public.movimenti(persona_id);
CREATE INDEX idx_movimenti_data ON public.movimenti(data DESC);
