
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
