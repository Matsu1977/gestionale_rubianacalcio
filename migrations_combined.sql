
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

-- Create enum for role types
CREATE TYPE public.tipo_ruolo AS ENUM ('Dirigente', 'Socio', 'Abbonato', 'Atleta', 'Allenatore', 'Genitore');

-- Create ruoli table
CREATE TABLE public.ruoli (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  tipo_ruolo tipo_ruolo NOT NULL,
  data_inizio DATE DEFAULT CURRENT_DATE,
  data_fine DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (persona_id, tipo_ruolo)
);

-- Enable RLS
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;

-- Policies (same open access as persone for now)
CREATE POLICY "Anon can view ruoli" ON public.ruoli FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert ruoli" ON public.ruoli FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update ruoli" ON public.ruoli FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete ruoli" ON public.ruoli FOR DELETE TO anon USING (true);
CREATE POLICY "Auth can view ruoli" ON public.ruoli FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert ruoli" ON public.ruoli FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update ruoli" ON public.ruoli FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete ruoli" ON public.ruoli FOR DELETE TO authenticated USING (true);

-- Index for faster lookups
CREATE INDEX idx_ruoli_persona_id ON public.ruoli(persona_id);

-- Create enums for movimenti
CREATE TYPE public.tipo_movimento AS ENUM ('Entrata', 'Uscita');
CREATE TYPE public.categoria_movimento AS ENUM ('Quota socio', 'Abbonamento', 'Tesseramento', 'Altro');
CREATE TYPE public.metodo_pagamento AS ENUM ('Contanti', 'Bonifico', 'Carta', 'Satispay', 'Altro');

-- Create movimenti table
CREATE TABLE public.movimenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_movimento NOT NULL,
  categoria categoria_movimento NOT NULL,
  importo NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo_pagamento metodo_pagamento NOT NULL,
  persona_id UUID REFERENCES public.persone(id) ON DELETE SET NULL,
  riferimento TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movimenti ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth yet)
CREATE POLICY "Anon can view movimenti" ON public.movimenti FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert movimenti" ON public.movimenti FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update movimenti" ON public.movimenti FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete movimenti" ON public.movimenti FOR DELETE TO anon USING (true);
CREATE POLICY "Auth can view movimenti" ON public.movimenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert movimenti" ON public.movimenti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update movimenti" ON public.movimenti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete movimenti" ON public.movimenti FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX idx_movimenti_persona_id ON public.movimenti(persona_id);
CREATE INDEX idx_movimenti_data ON public.movimenti(data DESC);

CREATE TABLE public.rate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abbonamento_id UUID NOT NULL REFERENCES public.abbonamenti(id) ON DELETE CASCADE,
  numero_rata INTEGER NOT NULL,
  importo NUMERIC NOT NULL DEFAULT 0,
  data_scadenza DATE NOT NULL,
  stato TEXT NOT NULL DEFAULT 'Non pagata',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select rate" ON public.rate FOR SELECT USING (true);
CREATE POLICY "Anon insert rate" ON public.rate FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update rate" ON public.rate FOR UPDATE USING (true);
CREATE POLICY "Anon delete rate" ON public.rate FOR DELETE USING (true);
CREATE POLICY "Auth select rate" ON public.rate FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert rate" ON public.rate FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update rate" ON public.rate FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete rate" ON public.rate FOR DELETE TO authenticated USING (true);
ALTER TABLE public.abbonamenti 
ADD COLUMN tipo_pagamento text NOT NULL DEFAULT 'Pagamento unico',
ADD COLUMN data_inizio date NOT NULL DEFAULT CURRENT_DATE;

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

-- Create documenti_firmati table
CREATE TABLE public.documenti_firmati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  nome_persona text NOT NULL,
  data_firma timestamptz NOT NULL DEFAULT now(),
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documenti_firmati ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anon select documenti_firmati" ON public.documenti_firmati FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert documenti_firmati" ON public.documenti_firmati FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon delete documenti_firmati" ON public.documenti_firmati FOR DELETE TO anon USING (true);
CREATE POLICY "Auth select documenti_firmati" ON public.documenti_firmati FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert documenti_firmati" ON public.documenti_firmati FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete documenti_firmati" ON public.documenti_firmati FOR DELETE TO authenticated USING (true);

-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documenti-firmati', 'documenti-firmati', true);

-- Storage RLS policies
CREATE POLICY "Anyone can upload documenti" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documenti-firmati');
CREATE POLICY "Anyone can read documenti" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'documenti-firmati');
CREATE POLICY "Anyone can delete documenti" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documenti-firmati');

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'allenatore');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can manage user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS policies for profiles
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add segreteria to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'segreteria';

-- Add active/disabled status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Sessioni di allenamento
CREATE TABLE public.sessioni_allenamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corso TEXT NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(corso, data)
);

ALTER TABLE public.sessioni_allenamento ENABLE ROW LEVEL SECURITY;

-- RLS: tutti gli autenticati possono leggere, admin e allenatore possono gestire
CREATE POLICY "Auth select sessioni" ON public.sessioni_allenamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sessioni" ON public.sessioni_allenamento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sessioni" ON public.sessioni_allenamento FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete sessioni" ON public.sessioni_allenamento FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon select sessioni" ON public.sessioni_allenamento FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert sessioni" ON public.sessioni_allenamento FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update sessioni" ON public.sessioni_allenamento FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon delete sessioni" ON public.sessioni_allenamento FOR DELETE TO anon USING (true);

-- Presenze (una riga per atleta per sessione)
CREATE TABLE public.presenze (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessione_id UUID NOT NULL REFERENCES public.sessioni_allenamento(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(sessione_id, persona_id)
);

ALTER TABLE public.presenze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select presenze" ON public.presenze FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert presenze" ON public.presenze FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update presenze" ON public.presenze FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete presenze" ON public.presenze FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon select presenze" ON public.presenze FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert presenze" ON public.presenze FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update presenze" ON public.presenze FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon delete presenze" ON public.presenze FOR DELETE TO anon USING (true);

-- Add 'atleta' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'atleta';

-- Add user_id column to persone table to link persona to auth user
ALTER TABLE public.persone ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- Update get_user_role function to also return 'atleta'
-- (no change needed, it already returns any app_role)

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

dichiara di aver ricevuto l''informativa ai sensi dell''art. 13 del Regolamento UE 2016/679 (GDPR) relativa al trattamento dei dati personali e di acconsentire al trattamento dei propri dati per le finalitﾃ indicate nell''informativa.

I dati saranno trattati con strumenti informatici e/o cartacei, nel rispetto delle misure di sicurezza previste dalla normativa vigente.'),

('Liberatoria medica', 'Liberatoria Medica / Scarico Responsabilitﾃ',
'LIBERATORIA MEDICA / SCARICO RESPONSABILITﾃ

Il/La sottoscritto/a {nome} {cognome}
C.F.: {codice_fiscale}

dichiara di essere in buono stato di salute e di essere idoneo/a alla pratica dell''attivitﾃ sportiva non agonistica.

Solleva l''Associazione Sportiva da ogni responsabilitﾃ per danni derivanti dalla propria partecipazione alle attivitﾃ sportive.

Certificato medico: {certificato_medico}'),

('Autorizzazione minori', 'Autorizzazione per Atleti Minorenni',
'AUTORIZZAZIONE PER ATLETI MINORENNI

Il/La sottoscritto/a (genitore/tutore)

autorizza il/la minore {nome} {cognome}
C.F.: {codice_fiscale}
Nato/a il: {data_nascita}

a partecipare alle attivitﾃ sportive organizzate dall''Associazione.

Si impegna a comunicare tempestivamente eventuali variazioni dello stato di salute del/della minore.');

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

CREATE TABLE public.notifiche (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ruolo_destinatario TEXT,
  titolo TEXT NOT NULL,
  messaggio TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'manuale',
  letta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifiche ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications (by user_id or by role)
CREATE POLICY "Users can read own notifications"
ON public.notifiche FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND ruolo_destinatario IS NOT NULL AND ruolo_destinatario = (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1))
  OR (user_id IS NULL AND ruolo_destinatario IS NULL)
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can mark own notifications read"
ON public.notifiche FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND ruolo_destinatario IS NOT NULL AND ruolo_destinatario = (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1))
  OR (user_id IS NULL AND ruolo_destinatario IS NULL)
)
WITH CHECK (
  user_id = auth.uid()
  OR (user_id IS NULL AND ruolo_destinatario IS NOT NULL AND ruolo_destinatario = (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1))
  OR (user_id IS NULL AND ruolo_destinatario IS NULL)
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications"
ON public.notifiche FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Read tracking per user for broadcast notifications
CREATE TABLE public.notifiche_lette (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notifica_id UUID NOT NULL REFERENCES public.notifiche(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notifica_id, user_id)
);

ALTER TABLE public.notifiche_lette ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own read status"
ON public.notifiche_lette FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can mark as read"
ON public.notifiche_lette FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage read status"
ON public.notifiche_lette FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifiche
FOR INSERT
TO authenticated
WITH CHECK (true);
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

-- Indici utili per le query di stato pagamento
CREATE INDEX IF NOT EXISTS idx_movimenti_riferimento ON public.movimenti(riferimento_tipo, riferimento_id);
CREATE INDEX IF NOT EXISTS idx_movimenti_persona ON public.movimenti(persona_id);
CREATE INDEX IF NOT EXISTS idx_consumo_presenza ON public.consumo_ingressi(presenza_id);
CREATE INDEX IF NOT EXISTS idx_tessere_persona_corso ON public.tessere_ingressi(persona_id, corso);

-- Funzione: scala 1 ingresso sulla tessera attiva dell'atleta per il corso della sessione
-- Prioritﾃ: se l'atleta ha un abbonamento "Pagato" attivo per quel corso/stagione, NON scala la tessera.
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

    -- Trova tessera con ingressi disponibili (FIFO sulla piﾃｹ vecchia ancora aperta)
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

    -- Evita doppio scalo se giﾃ esiste un consumo per questa presenza
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
