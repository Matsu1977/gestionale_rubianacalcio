-- 1. Tabella tessere ingressi prepagate
CREATE TABLE public.tessere_ingressi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL,
  corso TEXT NOT NULL,
  ingressi_totali INTEGER NOT NULL DEFAULT 11,
  ingressi_usati INTEGER NOT NULL DEFAULT 0,
  importo NUMERIC NOT NULL DEFAULT 0,
  data_acquisto DATE NOT NULL DEFAULT CURRENT_DATE,
  stato_pagamento TEXT NOT NULL DEFAULT 'Pagato',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tessere_ingressi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select tessere" ON public.tessere_ingressi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert tessere" ON public.tessere_ingressi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tessere" ON public.tessere_ingressi FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete tessere" ON public.tessere_ingressi FOR DELETE TO authenticated USING (true);

-- 2. Tabella per tracciare consumo ingressi (collegamento presenze -> tessera)
CREATE TABLE public.consumo_ingressi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tessera_id UUID NOT NULL REFERENCES public.tessere_ingressi(id) ON DELETE CASCADE,
  presenza_id UUID,
  data_consumo DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consumo_ingressi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select consumo" ON public.consumo_ingressi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert consumo" ON public.consumo_ingressi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete consumo" ON public.consumo_ingressi FOR DELETE TO authenticated USING (true);

-- 3. Trigger per aggiornare updated_at su tessere_ingressi
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tessere_ingressi_updated_at
BEFORE UPDATE ON public.tessere_ingressi
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Inserimento impostazione switch pagamento online (default OFF)
INSERT INTO public.impostazioni_generali (chiave, valore)
VALUES ('pagamento_online_attivo', 'false')
ON CONFLICT DO NOTHING;