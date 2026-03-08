
-- Add tipo column to categorie_spesa
ALTER TABLE public.categorie_spesa ADD COLUMN tipo text NOT NULL DEFAULT 'Uscita';

-- Update unique constraint to be per tipo
ALTER TABLE public.categorie_spesa DROP CONSTRAINT categorie_spesa_nome_key;
ALTER TABLE public.categorie_spesa ADD CONSTRAINT categorie_spesa_nome_tipo_key UNIQUE (nome, tipo);

-- Mark existing categories as Uscita (already default)
-- Insert Entrata categories
INSERT INTO public.categorie_spesa (nome, tipo) VALUES
  ('Abbonamenti', 'Entrata'),
  ('Tesseramenti', 'Entrata'),
  ('Eventi', 'Entrata'),
  ('Donazioni', 'Entrata'),
  ('Quote sociali', 'Entrata'),
  ('Altro', 'Entrata');
