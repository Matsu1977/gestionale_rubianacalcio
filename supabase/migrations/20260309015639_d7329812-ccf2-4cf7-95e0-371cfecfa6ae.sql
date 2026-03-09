
-- Comunicazioni table
CREATE TABLE public.comunicazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oggetto text NOT NULL,
  messaggio text NOT NULL,
  tipo_destinatari text NOT NULL DEFAULT 'tutti',
  corso_filtro text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Destinatari associati a ogni comunicazione
CREATE TABLE public.comunicazioni_destinatari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicazione_id uuid NOT NULL REFERENCES public.comunicazioni(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS comunicazioni
ALTER TABLE public.comunicazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select comunicazioni" ON public.comunicazioni FOR SELECT USING (true);
CREATE POLICY "Anon insert comunicazioni" ON public.comunicazioni FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete comunicazioni" ON public.comunicazioni FOR DELETE USING (true);
CREATE POLICY "Auth select comunicazioni" ON public.comunicazioni FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert comunicazioni" ON public.comunicazioni FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete comunicazioni" ON public.comunicazioni FOR DELETE TO authenticated USING (true);

-- RLS comunicazioni_destinatari
ALTER TABLE public.comunicazioni_destinatari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select comunicazioni_destinatari" ON public.comunicazioni_destinatari FOR SELECT USING (true);
CREATE POLICY "Anon insert comunicazioni_destinatari" ON public.comunicazioni_destinatari FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth select comunicazioni_destinatari" ON public.comunicazioni_destinatari FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert comunicazioni_destinatari" ON public.comunicazioni_destinatari FOR INSERT TO authenticated WITH CHECK (true);
