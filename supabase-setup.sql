-- ===========================================
-- ETA Deal Pipeline — Supabase Table Setup
-- ===========================================
-- Run this in your Supabase SQL Editor (see setup guide)

-- 1. Create the deals table
create table if not exists deals (
  id text primary key,
  company text not null default '',
  sector text default 'B2B Services',
  location text default '',
  source text default 'Broker',
  stage text default 'identified',
  revenue numeric default 0,
  ebitda numeric default 0,
  asking_price numeric default 0,
  multiple text default '',
  ebitda_margin text default '',
  contact_name text default '',
  contact_email text default '',
  contact_phone text default '',
  broker text default '',
  notes text default '',
  next_step text default '',
  next_step_date date,
  rating integer default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (required by Supabase)
alter table deals enable row level security;

-- 3. Create a policy that allows all operations (single-user app)
--    If you later want auth, replace this with user-specific policies
create policy "Allow all access" on deals
  for all
  using (true)
  with check (true);

-- 4. Create an index for faster stage-based queries
create index if not exists idx_deals_stage on deals(stage);

-- Done! Your database is ready.
