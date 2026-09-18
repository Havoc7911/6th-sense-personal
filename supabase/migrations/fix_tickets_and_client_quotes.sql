-- Migration: Fix tickets table for missing columns and add client quote access
-- Run this in the Supabase SQL Editor

-- Add missing columns to tickets that insertTicket expects
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS service text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS eligible_for_unlock boolean DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS magic_link_requested boolean DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS estimate_amount numeric;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'Estimate. Not final.';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS invoice_items jsonb DEFAULT '[]'::jsonb;

-- Add eligible_for_unlock to quotes too (for completeness)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS eligible_for_unlock boolean DEFAULT false;

-- Make job_type nullable since quotes converted to tickets may not have one
ALTER TABLE public.tickets ALTER COLUMN job_type DROP NOT NULL;

-- Allow authenticated clients to view their own quotes (for MagicLink login)
DROP POLICY IF EXISTS "client_view_own_quotes" ON public.quotes;
CREATE POLICY "client_view_own_quotes" ON public.quotes FOR SELECT
  USING (lower(auth.jwt() ->> 'email') = lower(email));
