
-- Indici utili per le query di stato pagamento
CREATE INDEX IF NOT EXISTS idx_movimenti_riferimento ON public.movimenti(riferimento_tipo, riferimento_id);
CREATE INDEX IF NOT EXISTS idx_movimenti_persona ON public.movimenti(persona_id);
CREATE INDEX IF NOT EXISTS idx_consumo_presenza ON public.consumo_ingressi(presenza_id);
CREATE INDEX IF NOT EXISTS idx_tessere_persona_corso ON public.tessere_ingressi(persona_id, corso);

-- Funzione: scala 1 ingresso sulla tessera attiva dell'atleta per il corso della sessione
-- Priorità: se l'atleta ha un abbonamento "Pagato" attivo per quel corso/stagione, NON scala la tessera.
CREATE OR REPLACE FUNCTION public.handle_presenza_tessera()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_corso TEXT;
  v_data DATE;
  v_tessera_id UUID;
  v_has_abbonamento BOOLEAN;
  v_existing_consumo UUID;
BEGIN
  -- Recupera il corso e la data della sessione
  SELECT corso, data INTO v_corso, v_data
  FROM public.sessioni_allenamento
  WHERE id = NEW.sessione_id;

  IF v_corso IS NULL THEN
    RETURN NEW;
  END IF;

  -- Caso: presenza appena diventata true
  IF NEW.presente = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND COALESCE(OLD.presente, false) = false)) THEN

    -- Verifica se esiste un abbonamento "Pagato" per l'atleta su quel corso, ancora valido
    -- (data_inizio <= data sessione)
    SELECT EXISTS (
      SELECT 1 FROM public.abbonamenti
      WHERE persona_id = NEW.persona_id
        AND corso = v_corso
        AND stato_pagamento = 'Pagato'
        AND data_inizio <= v_data
    ) INTO v_has_abbonamento;

    -- Se ha abbonamento attivo: salta lo scalo della tessera
    IF v_has_abbonamento THEN
      RETURN NEW;
    END IF;

    -- Trova tessera con ingressi disponibili (FIFO sulla più vecchia ancora aperta)
    SELECT id INTO v_tessera_id
    FROM public.tessere_ingressi
    WHERE persona_id = NEW.persona_id
      AND corso = v_corso
      AND ingressi_usati < ingressi_totali
    ORDER BY data_acquisto ASC, created_at ASC
    LIMIT 1;

    IF v_tessera_id IS NULL THEN
      RETURN NEW; -- Nessuna tessera disponibile, niente da fare
    END IF;

    -- Evita doppio scalo se già esiste un consumo per questa presenza
    SELECT id INTO v_existing_consumo
    FROM public.consumo_ingressi
    WHERE presenza_id = NEW.id
    LIMIT 1;

    IF v_existing_consumo IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Scala 1 ingresso e registra consumo
    UPDATE public.tessere_ingressi
    SET ingressi_usati = ingressi_usati + 1,
        updated_at = now()
    WHERE id = v_tessera_id;

    INSERT INTO public.consumo_ingressi (tessera_id, presenza_id, data_consumo, note)
    VALUES (v_tessera_id, NEW.id, v_data, 'Scalo automatico presenza ' || v_corso);

  -- Caso: presenza tolta (true -> false)
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.presente, false) = true AND NEW.presente = false THEN

    -- Trova consumo collegato a questa presenza
    SELECT tessera_id INTO v_tessera_id
    FROM public.consumo_ingressi
    WHERE presenza_id = NEW.id
    LIMIT 1;

    IF v_tessera_id IS NOT NULL THEN
      -- Riaccredita ingresso
      UPDATE public.tessere_ingressi
      SET ingressi_usati = GREATEST(0, ingressi_usati - 1),
          updated_at = now()
      WHERE id = v_tessera_id;

      DELETE FROM public.consumo_ingressi WHERE presenza_id = NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Trigger AFTER INSERT/UPDATE su presenze
DROP TRIGGER IF EXISTS trg_presenza_tessera ON public.presenze;
CREATE TRIGGER trg_presenza_tessera
AFTER INSERT OR UPDATE OF presente ON public.presenze
FOR EACH ROW
EXECUTE FUNCTION public.handle_presenza_tessera();

-- Anche su DELETE: se cancello la riga presenza con presente=true, riaccredita
CREATE OR REPLACE FUNCTION public.handle_presenza_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tessera_id UUID;
BEGIN
  IF OLD.presente = true THEN
    SELECT tessera_id INTO v_tessera_id
    FROM public.consumo_ingressi
    WHERE presenza_id = OLD.id
    LIMIT 1;

    IF v_tessera_id IS NOT NULL THEN
      UPDATE public.tessere_ingressi
      SET ingressi_usati = GREATEST(0, ingressi_usati - 1),
          updated_at = now()
      WHERE id = v_tessera_id;

      DELETE FROM public.consumo_ingressi WHERE presenza_id = OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_presenza_delete ON public.presenze;
CREATE TRIGGER trg_presenza_delete
BEFORE DELETE ON public.presenze
FOR EACH ROW
EXECUTE FUNCTION public.handle_presenza_delete();
