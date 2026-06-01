
-- Add segreteria to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'segreteria';

-- Add active/disabled status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
