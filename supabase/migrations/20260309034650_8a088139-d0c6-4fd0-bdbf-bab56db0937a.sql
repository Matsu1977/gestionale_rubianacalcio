
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
