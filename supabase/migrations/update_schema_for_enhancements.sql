-- ==============================================================================
-- 6th Sense Personal - Supabase Schema Migration: Enhancements & Additions
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Extend tickets table with dual IMEI/ICCID, intake details, and service data
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS imei2 text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS iccid2 text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS intake jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS service text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'Estimate. Not final.';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS invoice_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS estimate_amount numeric;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS magic_link_requested boolean DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS eligible_for_unlock boolean DEFAULT false;
ALTER TABLE public.tickets ALTER COLUMN job_type DROP NOT NULL;

-- 2. Create ticket_events table for Technician Service Logs
CREATE TABLE IF NOT EXISTS public.ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  note text NOT NULL
);

CREATE INDEX IF NOT EXISTS ticket_events_ticket_id_idx ON public.ticket_events(ticket_id);
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

-- Service Log Security Policies
DROP POLICY IF EXISTS "admin_all_ticket_events" ON public.ticket_events;
CREATE POLICY "admin_all_ticket_events" ON public.ticket_events FOR ALL 
  USING (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

DROP POLICY IF EXISTS "client_view_ticket_events" ON public.ticket_events;
CREATE POLICY "client_view_ticket_events" ON public.ticket_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = public.ticket_events.ticket_id
      AND lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 3. Create ticket_files table for Attachments and Documents
CREATE TABLE IF NOT EXISTS public.ticket_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL
);

CREATE INDEX IF NOT EXISTS ticket_files_ticket_id_idx ON public.ticket_files(ticket_id);
ALTER TABLE public.ticket_files ENABLE ROW LEVEL SECURITY;

-- Ticket Files Security Policies
DROP POLICY IF EXISTS "admin_all_ticket_files" ON public.ticket_files;
CREATE POLICY "admin_all_ticket_files" ON public.ticket_files FOR ALL 
  USING (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

DROP POLICY IF EXISTS "client_view_ticket_files" ON public.ticket_files;
CREATE POLICY "client_view_ticket_files" ON public.ticket_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = public.ticket_files.ticket_id
      AND lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 4. Storage Bucket Setup for ticket-attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public access to ticket attachments" ON storage.objects;
CREATE POLICY "Public access to ticket attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Allow upload to ticket attachments" ON storage.objects;
CREATE POLICY "Allow upload to ticket attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Admin full control of ticket attachments" ON storage.objects;
CREATE POLICY "Admin full control of ticket attachments" ON storage.objects
  FOR ALL USING (bucket_id = 'ticket-attachments' AND auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

-- 5. Realtime publication additions
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_events;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_files;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
