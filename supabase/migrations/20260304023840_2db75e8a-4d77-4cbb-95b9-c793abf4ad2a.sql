
-- Create enum for role types
CREATE TYPE public.tipo_ruolo AS ENUM ('Dirigente', 'Socio', 'Abbonato', 'Atleta', 'Allenatore', 'Genitore');

-- Create ruoli table
CREATE TABLE public.ruoli (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  tipo_ruolo tipo_ruolo NOT NULL,
  data_inizio DATE DEFAULT CURRENT_DATE,
  data_fine DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (persona_id, tipo_ruolo)
);

-- Enable RLS
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;

-- Policies (same open access as persone for now)
CREATE POLICY "Anon can view ruoli" ON public.ruoli FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert ruoli" ON public.ruoli FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update ruoli" ON public.ruoli FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete ruoli" ON public.ruoli FOR DELETE TO anon USING (true);
CREATE POLICY "Auth can view ruoli" ON public.ruoli FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert ruoli" ON public.ruoli FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update ruoli" ON public.ruoli FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete ruoli" ON public.ruoli FOR DELETE TO authenticated USING (true);

-- Index for faster lookups
CREATE INDEX idx_ruoli_persona_id ON public.ruoli(persona_id);
