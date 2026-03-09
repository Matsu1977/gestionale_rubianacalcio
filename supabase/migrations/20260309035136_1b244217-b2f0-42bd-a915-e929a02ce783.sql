
-- Add 'atleta' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'atleta';

-- Add user_id column to persone table to link persona to auth user
ALTER TABLE public.persone ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- Update get_user_role function to also return 'atleta'
-- (no change needed, it already returns any app_role)
