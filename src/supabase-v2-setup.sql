-- ===========================================
-- ETA Deal Pipeline — V2 Tables: Activities & Contacts
-- ===========================================
-- Run this in your Supabase SQL Editor

-- 1. Activities table (activity log per deal)
create table if not exists activities (
  id text primary key,
  deal_id text references deals(id) on delete cascade,
  activity_type text not null default 'note',
  description text default '',
  contact_name text default '',
  activity_date timestamptz default now(),
  created_at timestamptz default now()
);

alter table activities enable row level security;
create policy "Allow all access" on activities for all using (true) with check (true);
create index if not exists idx_activities_deal on activities(deal_id);

-- 2. Contacts table (standalone contacts database)
create table if not exists contacts (
  id text primary key,
  name text not null default '',
  company text default '',
  role text default 'Broker',
  email text default '',
  phone text default '',
  linkedin text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table contacts enable row level security;
create policy "Allow all access" on contacts for all using (true) with check (true);

-- 3. Deal-Contact junction table (link contacts to deals)
create table if not exists deal_contacts (
  deal_id text references deals(id) on delete cascade,
  contact_id text references contacts(id) on delete cascade,
  primary key (deal_id, contact_id)
);

alter table deal_contacts enable row level security;
create policy "Allow all access" on deal_contacts for all using (true) with check (true);

-- Done! Your V2 tables are ready.
