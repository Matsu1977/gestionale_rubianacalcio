
-- Create persone table
CREATE TABLE public.persone (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  codice_fiscale TEXT,
  data_nascita DATE,
  telefono TEXT,
  email TEXT,
  indirizzo TEXT,
  note TEXT,
  certificato_medico_scadenza DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.persone ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to CRUD (internal management app)
CREATE POLICY "Authenticated users can view persone" ON public.persone FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert persone" ON public.persone FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update persone" ON public.persone FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete persone" ON public.persone FOR DELETE TO authenticated USING (true);

-- Also allow anonymous access for now (no auth setup yet)
CREATE POLICY "Anon can view persone" ON public.persone FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert persone" ON public.persone FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update persone" ON public.persone FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete persone" ON public.persone FOR DELETE TO anon USING (true);
