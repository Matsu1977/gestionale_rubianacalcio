
CREATE TABLE public.modelli_documento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento TEXT NOT NULL UNIQUE,
  titolo TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.modelli_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document templates"
  ON public.modelli_documento FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage document templates"
  ON public.modelli_documento FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default templates
INSERT INTO public.modelli_documento (tipo_documento, titolo, contenuto) VALUES
('Modulo iscrizione', 'Modulo di Iscrizione', 
'MODULO DI ISCRIZIONE

Il/La sottoscritto/a {nome} {cognome}
C.F.: {codice_fiscale}
Nato/a il: {data_nascita}
Residente in: {indirizzo}

chiede di essere iscritto/a presso l''Associazione Sportiva per la stagione in corso.

Dichiara di aver preso visione dello statuto e del regolamento interno e di accettarne integralmente il contenuto.'),

('Informativa privacy', 'Informativa sulla Privacy (GDPR)',
'INFORMATIVA SULLA PRIVACY (GDPR)

Il/La sottoscritto/a {nome} {cognome}
C.F.: {codice_fiscale}

dichiara di aver ricevuto l''informativa ai sensi dell''art. 13 del Regolamento UE 2016/679 (GDPR) relativa al trattamento dei dati personali e di acconsentire al trattamento dei propri dati per le finalità indicate nell''informativa.

I dati saranno trattati con strumenti informatici e/o cartacei, nel rispetto delle misure di sicurezza previste dalla normativa vigente.'),

('Liberatoria medica', 'Liberatoria Medica / Scarico Responsabilità',
'LIBERATORIA MEDICA / SCARICO RESPONSABILITÀ

Il/La sottoscritto/a {nome} {cognome}
C.F.: {codice_fiscale}

dichiara di essere in buono stato di salute e di essere idoneo/a alla pratica dell''attività sportiva non agonistica.

Solleva l''Associazione Sportiva da ogni responsabilità per danni derivanti dalla propria partecipazione alle attività sportive.

Certificato medico: {certificato_medico}'),

('Autorizzazione minori', 'Autorizzazione per Atleti Minorenni',
'AUTORIZZAZIONE PER ATLETI MINORENNI

Il/La sottoscritto/a (genitore/tutore)

autorizza il/la minore {nome} {cognome}
C.F.: {codice_fiscale}
Nato/a il: {data_nascita}

a partecipare alle attività sportive organizzate dall''Associazione.

Si impegna a comunicare tempestivamente eventuali variazioni dello stato di salute del/della minore.');
