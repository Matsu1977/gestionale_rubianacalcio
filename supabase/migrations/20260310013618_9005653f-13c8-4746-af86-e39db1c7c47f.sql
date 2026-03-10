
-- 1. Add metodo_pagamento to tesseramenti
ALTER TABLE public.tesseramenti ADD COLUMN IF NOT EXISTS metodo_pagamento text DEFAULT 'Contanti';

-- 2. Create corsi table
CREATE TABLE IF NOT EXISTS public.corsi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.corsi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select corsi" ON public.corsi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert corsi" ON public.corsi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update corsi" ON public.corsi FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete corsi" ON public.corsi FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon select corsi" ON public.corsi FOR SELECT TO anon USING (true);
