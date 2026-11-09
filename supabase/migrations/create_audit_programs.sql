-- ==============================================================================
-- 6th Sense Personal - Supabase Schema Migration: Cost-Saving Audit Programs
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

create table if not exists public.audit_programs (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text not null default 'TELECOM',
  inclusion_criteria text not null,
  benefit_type text not null default 'Monthly Discount',
  benefit_amount text not null,
  benefit_numeric numeric default 0,
  timeframe text not null default 'Ongoing Monthly',
  description text,
  tc_notes text,
  active boolean not null default true,
  document jsonb
);

create index if not exists audit_programs_category_idx on public.audit_programs (category);
create index if not exists audit_programs_active_idx on public.audit_programs (active);

alter table public.audit_programs enable row level security;

-- Security Policies
drop policy if exists "public_read_audit_programs" on public.audit_programs;
create policy "public_read_audit_programs" on public.audit_programs
  for select using (true);

drop policy if exists "admin_manage_audit_programs" on public.audit_programs;
create policy "admin_manage_audit_programs" on public.audit_programs
  for all using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com')
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

-- Enable Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.audit_programs;
  exception when duplicate_object then null; end;
end $$;
