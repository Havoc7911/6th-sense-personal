-- Run this in the Supabase SQL Editor (Dashboard → SQL) after creating a project.
-- Enables live rows + Realtime for tickets and messages.
-- If "already member of publication" appears for the last two lines, skip them — Realtime is already on.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  service text not null,
  request_type text not null default 'quote',
  device_type text,
  brand text,
  model text,
  os text,
  priority text not null default 'Normal',
  preferred_contact text not null default 'Email',
  status text not null default 'Pending',
  estimate_amount numeric,
  tech_response text,
  snap_medicaid text,
  hardship_financing boolean default false,
  hardship_details text,
  description text not null,
  ticket_code text
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  job_type text not null,
  device_type text not null,
  brand text not null,
  os text not null,
  imei text,
  imei2 text,
  iccid text,
  iccid2 text,
  provider text,
  service text,
  snap_medicaid text,
  hardship_financing boolean default false,
  hardship_details text,
  notes text,
  credentials jsonb not null default '[]'::jsonb,
  intake jsonb,
  status text not null default 'Pending',
  priority text not null default 'Normal',
  eligible_for_unlock boolean default false,
  magic_link_requested boolean default false,
  accepted_at timestamptz,
  estimate_amount numeric,
  summary text,
  invoice_status text default 'Estimate. Not final.',
  invoice_items jsonb default '[]'::jsonb,
  ticket_code text
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  sender text not null,
  text text not null,
  is_tech boolean not null default false
);

create index if not exists tickets_email_lower_idx on public.tickets (lower(email));
create index if not exists messages_ticket_id_idx on public.messages (ticket_id);
create unique index if not exists quotes_ticket_code_idx on public.quotes(ticket_code);
create unique index if not exists tickets_ticket_code_idx on public.tickets(ticket_code);

alter table public.quotes enable row level security;
alter table public.tickets enable row level security;
alter table public.messages enable row level security;

-- 🛡️ PRODUCTION SECURITY: Hardened RLS policies
-- Admin Technician: jmcc5271@gmail.com

-- 📋 Quotes Policies
drop policy if exists "quotes_all" on public.quotes;
create policy "public_insert_quotes" on public.quotes for insert with check (true);
create policy "public_lookup_quote_by_code" on public.quotes for select
  using (ticket_code is not null);
create policy "admin_all_quotes" on public.quotes for all 
  using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com') 
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

-- 📋 Tickets Policies
drop policy if exists "tickets_all" on public.tickets;
create policy "public_insert_tickets" on public.tickets for insert with check (true);
create policy "public_lookup_ticket_by_code" on public.tickets for select
  using (ticket_code is not null);
create policy "admin_all_tickets" on public.tickets for all 
  using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com') 
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');
create policy "client_view_own_tickets" on public.tickets for select
  using (lower(auth.jwt() ->> 'email') = lower(email));

-- 📋 Messages Policies
drop policy if exists "messages_all" on public.messages;
create policy "admin_all_messages" on public.messages for all 
  using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com') 
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');
create policy "client_chat_access" on public.messages for all
  using (
    exists (
      select 1 from public.tickets
      where id = public.messages.ticket_id
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.tickets
      where id = public.messages.ticket_id
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 📋 Ticket Events (Service Log)
create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  event_type text not null,
  note text not null
);

create index if not exists ticket_events_ticket_id_idx on public.ticket_events (ticket_id);
alter table public.ticket_events enable row level security;

drop policy if exists "admin_all_ticket_events" on public.ticket_events;
create policy "admin_all_ticket_events" on public.ticket_events for all 
  using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com')
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

drop policy if exists "client_view_ticket_events" on public.ticket_events;
create policy "client_view_ticket_events" on public.ticket_events for select
  using (
    exists (
      select 1 from public.tickets
      where id = public.ticket_events.ticket_id
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 📋 Ticket Files (Attachments & Documents)
create table if not exists public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  file_name text not null,
  storage_path text not null
);

create index if not exists ticket_files_ticket_id_idx on public.ticket_files (ticket_id);
alter table public.ticket_files enable row level security;

drop policy if exists "admin_all_ticket_files" on public.ticket_files;
create policy "admin_all_ticket_files" on public.ticket_files for all 
  using (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com')
  with check (auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

drop policy if exists "client_view_ticket_files" on public.ticket_files;
create policy "client_view_ticket_files" on public.ticket_files for select
  using (
    exists (
      select 1 from public.tickets
      where id = public.ticket_files.ticket_id
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 🗄️ Storage Buckets
insert into storage.buckets (id, name, public) 
values ('ticket-attachments', 'ticket-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Public access to ticket attachments" on storage.objects;
create policy "Public access to ticket attachments" on storage.objects
  for select using (bucket_id = 'ticket-attachments');

drop policy if exists "Allow upload to ticket attachments" on storage.objects;
create policy "Allow upload to ticket attachments" on storage.objects
  for insert with check (bucket_id = 'ticket-attachments');

drop policy if exists "Admin full control of ticket attachments" on storage.objects;
create policy "Admin full control of ticket attachments" on storage.objects
  for all using (bucket_id = 'ticket-attachments' and auth.jwt() ->> 'email' = 'jmcc5271@gmail.com');

-- Realtime: broadcast inserts/updates/deletes to subscribed clients.
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.quotes;
do $$
begin
  begin
    alter publication supabase_realtime add table public.ticket_events;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.ticket_files;
  exception when duplicate_object then null; end;
end $$;
