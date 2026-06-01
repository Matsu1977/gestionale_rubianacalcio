CREATE POLICY "Authenticated users can insert notifications"
ON public.notifiche
FOR INSERT
TO authenticated
WITH CHECK (true);