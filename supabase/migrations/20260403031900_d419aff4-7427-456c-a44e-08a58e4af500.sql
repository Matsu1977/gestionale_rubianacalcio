
CREATE TABLE public.impostazioni_generali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chiave text NOT NULL UNIQUE,
  valore text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impostazioni_generali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.impostazioni_generali FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read settings" ON public.impostazioni_generali FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can manage settings" ON public.impostazioni_generali FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment info keys
INSERT INTO public.impostazioni_generali (chiave, valore) VALUES
  ('pagamento_iban', ''),
  ('pagamento_intestatario', ''),
  ('pagamento_banca', ''),
  ('pagamento_causale', 'Quota associativa / Abbonamento'),
  ('pagamento_note', '');
