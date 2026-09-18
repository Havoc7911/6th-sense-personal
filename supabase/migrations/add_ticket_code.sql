-- Migration: Add ticket_code column to quotes and tickets tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL)

-- Add ticket_code columns
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS ticket_code text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code text;

-- Unique indexes so codes are never duplicated
CREATE UNIQUE INDEX IF NOT EXISTS quotes_ticket_code_idx ON public.quotes(ticket_code);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_code_idx ON public.tickets(ticket_code);

-- Allow anonymous lookup by ticket code (public SELECT when filtering by code)
CREATE POLICY "public_lookup_quote_by_code" ON public.quotes FOR SELECT
  USING (ticket_code IS NOT NULL);

CREATE POLICY "public_lookup_ticket_by_code" ON public.tickets FOR SELECT
  USING (ticket_code IS NOT NULL);
