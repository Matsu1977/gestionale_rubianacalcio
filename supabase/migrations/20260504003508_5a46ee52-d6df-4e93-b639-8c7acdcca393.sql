-- Aggiorna check constraint movimenti.riferimento_tipo per supportare tutti i servizi
ALTER TABLE public.movimenti DROP CONSTRAINT IF EXISTS movimenti_riferimento_tipo_check;

ALTER TABLE public.movimenti ADD CONSTRAINT movimenti_riferimento_tipo_check
  CHECK (riferimento_tipo IS NULL OR riferimento_tipo = ANY (ARRAY[
    'abbonamento'::text,
    'tessera_ingressi'::text,
    'tessera_socio'::text,
    'quota_socio'::text,
    'tesseramento'::text
  ]));

-- Garantisce che le categorie entrata necessarie esistano
INSERT INTO public.categorie_spesa (nome, tipo)
SELECT v.nome, 'Entrata'
FROM (VALUES
  ('Abbonamenti'),
  ('Tessera ingressi'),
  ('Tesseramenti'),
  ('Quote sociali')
) AS v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorie_spesa c WHERE c.nome = v.nome AND c.tipo = 'Entrata'
);

-- Indice per velocizzare le lookup pagamento -> servizio
CREATE INDEX IF NOT EXISTS idx_movimenti_riferimento ON public.movimenti(riferimento_tipo, riferimento_id);