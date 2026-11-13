-- Smart Civic Connect Database Schema (Supabase / PostgreSQL)
-- United Nations SDG 11: Sustainable Cities & Communities
-- Compatible with initial CivicLoop records and extended for enterprise civic operations.

create table if not exists public.reports (
  id text primary key,
  major_category text not null,
  subcategory text not null,
  category text not null, -- legacy compatibility
  title text not null check (char_length(title) between 3 and 140),
  location text not null check (char_length(location) between 3 and 220),
  landmark text default '',
  latitude double precision,
  longitude double precision,
  description text not null default '' check (char_length(description) <= 3000),
  department text not null default 'General Administration',
  status text not null default 'Open' check (status in ('Open','Verified','Assigned','In progress','Resolved','Citizen Verification','Closed','Rejected','Duplicate Linked')),
  priority text not null default 'Normal' check (priority in ('Normal','High','Urgent')),
  csi_score integer not null default 30 check (csi_score between 0 and 100),
  escalation_level integer not null default 0 check (escalation_level between 0 and 4),
  author text not null default 'Anonymous' check (char_length(author) <= 80),
  phone text default '',
  votes integer not null default 0 check (votes >= 0),
  resolution_verified_count integer not null default 0,
  dispute_count integer not null default 0,
  resolution_notes text default '',
  resolution_photo_url text,
  status_history jsonb not null default '[]'::jsonb,
  is_flagged boolean not null default false,
  photo_url text,
  voice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id text primary key,
  name text not null,
  sla_hours integer not null default 48,
  active boolean not null default true
);

create table if not exists public.civic_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  department_id text references public.departments(id),
  role text not null default 'officer' check (role in ('officer','supervisor','admin')),
  added_at timestamptz not null default now()
);

create table if not exists public.community_support_votes (
  id bigserial primary key,
  report_id text not null references public.reports(id) on delete cascade,
  voter_identifier text not null,
  created_at timestamptz not null default now(),
  unique(report_id, voter_identifier)
);

create table if not exists public.resolution_verifications (
  id bigserial primary key,
  report_id text not null references public.reports(id) on delete cascade,
  verifier_identifier text not null,
  outcome text not null check (outcome in ('confirmed', 'disputed')),
  notes text default '',
  created_at timestamptz not null default now(),
  unique(report_id, verifier_identifier)
);

create table if not exists public.civic_rewards_log (
  id bigserial primary key,
  user_identifier text not null,
  points_awarded integer not null check (points_awarded > 0),
  activity_type text not null,
  report_id text references public.reports(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.reports enable row level security;
alter table public.departments enable row level security;
alter table public.civic_staff enable row level security;
alter table public.community_support_votes enable row level security;
alter table public.resolution_verifications enable row level security;
alter table public.civic_rewards_log enable row level security;

-- Basic Policies
create policy "Public can read all reports" on public.reports for select to anon, authenticated using (true);
create policy "Public can submit complaints" on public.reports for insert to anon, authenticated with check (true);
create policy "Public can read departments" on public.departments for select to anon, authenticated using (true);
create policy "Public can insert votes" on public.community_support_votes for insert to anon, authenticated with check (true);
create policy "Public can read votes" on public.community_support_votes for select to anon, authenticated using (true);
create policy "Public can insert verifications" on public.resolution_verifications for insert to anon, authenticated with check (true);
create policy "Public can read verifications" on public.resolution_verifications for select to anon, authenticated using (true);
