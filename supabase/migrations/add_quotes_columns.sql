-- Migration: Add enhanced columns to the quotes table
-- Run this in: https://supabase.com/dashboard/project/bqpumvfdpgyubisslmbc/sql/new

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS request_type       text    DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS device_type        text,
  ADD COLUMN IF NOT EXISTS brand              text,
  ADD COLUMN IF NOT EXISTS model              text,
  ADD COLUMN IF NOT EXISTS os                 text,
  ADD COLUMN IF NOT EXISTS priority           text    DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS preferred_contact  text    DEFAULT 'Email',
  ADD COLUMN IF NOT EXISTS tech_response      text,
  ADD COLUMN IF NOT EXISTS estimate_amount    numeric;
