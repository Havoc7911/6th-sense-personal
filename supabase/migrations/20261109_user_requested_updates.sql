-- Migration: 20261109_user_requested_updates.sql
-- 1. Add price column to promotions
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS price text;

-- 2. Add address column to tickets and quotes
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS address text;

-- 3. Add status column to ticket_events
ALTER TABLE public.ticket_events ADD COLUMN IF NOT EXISTS status text;

-- 4. Enable RLS and Storage policies on storage.objects for ticket-attachments bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access ticket-attachments'
  ) THEN
    CREATE POLICY "Public Access ticket-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Insert ticket-attachments'
  ) THEN
    CREATE POLICY "Public Insert ticket-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Update ticket-attachments'
  ) THEN
    CREATE POLICY "Public Update ticket-attachments" ON storage.objects FOR UPDATE USING (bucket_id = 'ticket-attachments');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Delete ticket-attachments'
  ) THEN
    CREATE POLICY "Public Delete ticket-attachments" ON storage.objects FOR DELETE USING (bucket_id = 'ticket-attachments');
  END IF;
END $$;

-- 5. Ensure ticket_files table has full public access for anonymous/tech operations
DO $$
BEGIN
  DROP POLICY IF EXISTS "Tech can manage files" ON public.ticket_files;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_files' AND policyname = 'ticket_files_all'
  ) THEN
    CREATE POLICY "ticket_files_all" ON public.ticket_files FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
