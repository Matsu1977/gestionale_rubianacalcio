
CREATE TABLE public.categorie_spesa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categorie_spesa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select categorie_spesa" ON public.categorie_spesa FOR SELECT USING (true);
CREATE POLICY "Anon insert categorie_spesa" ON public.categorie_spesa FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update categorie_spesa" ON public.categorie_spesa FOR UPDATE USING (true);
CREATE POLICY "Anon delete categorie_spesa" ON public.categorie_spesa FOR DELETE USING (true);
CREATE POLICY "Auth select categorie_spesa" ON public.categorie_spesa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert categorie_spesa" ON public.categorie_spesa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update categorie_spesa" ON public.categorie_spesa FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete categorie_spesa" ON public.categorie_spesa FOR DELETE TO authenticated USING (true);

-- Seed default categories
INSERT INTO public.categorie_spesa (nome) VALUES
  ('Affitto'), ('Utenze'), ('Materiale sportivo'), ('Manutenzione'), ('Stipendi'), ('Assicurazioni'), ('Altro');
