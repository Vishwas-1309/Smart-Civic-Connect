-- ============================================================================
-- Smart Civic Connect — Supabase / PostgreSQL Migration v2
-- Upgrade script from CivicLoop to Smart Civic Connect (SDG 11 Platform)
-- Preserves existing tables and adds enterprise civic management capabilities.
-- ============================================================================

-- 1. Upgrade reports table to support 9 categories, subcategories, GPS coordinates,
--    Community Severity Index (CSI), SLA escalations, citizen verification, and audit history.

-- Relax legacy check constraints safely
alter table public.reports drop constraint if exists reports_category_check;
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports drop constraint if exists reports_priority_check;

-- Add new columns with safe defaults
alter table public.reports add column if not exists major_category text;
alter table public.reports add column if not exists subcategory text;
alter table public.reports add column if not exists department text;
alter table public.reports add column if not exists latitude double precision;
alter table public.reports add column if not exists longitude double precision;
alter table public.reports add column if not exists landmark text default '';
alter table public.reports add column if not exists phone text default '';
alter table public.reports add column if not exists csi_score integer default 30;
alter table public.reports add column if not exists escalation_level integer default 0; -- 0: Normal, 1: 24h Reminder, 2: 3d Zonal, 3: 7d Supervisor, 4: 15d Critical
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.reports add column if not exists duplicate_of_id text references public.reports(id) on delete set null;
alter table public.reports add column if not exists resolution_notes text default '';
alter table public.reports add column if not exists resolution_photo_url text;
alter table public.reports add column if not exists resolution_verified_count integer default 0;
alter table public.reports add column if not exists dispute_count integer default 0;
alter table public.reports add column if not exists status_history jsonb not null default '[]'::jsonb;
alter table public.reports add column if not exists is_flagged boolean not null default false;

-- Backfill legacy records to valid major_category & department
update public.reports
set major_category = case 
      when category = 'Roads' then 'public-infra'
      when category = 'Waste' then 'sanitation'
      when category = 'Lighting' then 'street-lighting'
      when category = 'Water' then 'water-drainage'
      when category = 'Parks' then 'property-damage'
      else 'public-infra'
    end,
    subcategory = coalesce(subcategory, category),
    department = coalesce(department, case 
      when category = 'Roads' then 'Roads & Municipal Engineering Dept'
      when category = 'Waste' then 'Sanitation & Solid Waste Management'
      when category = 'Lighting' then 'Electrical & Power Department'
      when category = 'Water' then 'Water Supply & Sewerage Board'
      when category = 'Parks' then 'Municipal Asset Maintenance'
      else 'General Municipal Administration'
    end)
where major_category is null;

-- Add updated status check
alter table public.reports add constraint reports_status_v2_check 
check (status in ('Open', 'Verified', 'Assigned', 'In progress', 'Resolved', 'Citizen Verification', 'Closed', 'Rejected', 'Duplicate Linked'));

-- 2. Departments Table
create table if not exists public.departments (
  id text primary key,
  name text not null,
  contact_email text,
  escalation_contact text,
  sla_hours integer not null default 72,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed core municipal departments
insert into public.departments (id, name, sla_hours) values
  ('roads', 'Roads & Municipal Engineering Dept', 48),
  ('electrical', 'Electrical & Power Department', 24),
  ('water', 'Water Supply & Sewerage Board', 36),
  ('sanitation', 'Sanitation & Solid Waste Management', 24),
  ('traffic', 'Traffic Police & Transport Authority', 24),
  ('accessibility', 'Accessibility & Public Works Dept', 48),
  ('environment', 'Environmental Protection Dept', 72),
  ('planning', 'Town Planning & Enforcement Squad', 96),
  ('assets', 'Municipal Asset Maintenance Division', 72)
on conflict (id) do nothing;

-- 3. Category & Routing Configuration Table
create table if not exists public.category_configs (
  id serial primary key,
  major_key text not null,
  major_name text not null,
  subcategory text not null,
  department_id text references public.departments(id),
  base_severity integer not null default 25,
  is_active boolean not null default true,
  unique(major_key, subcategory)
);

-- 4. Community Support Votes Table (Prevents double voting per user/client)
create table if not exists public.community_support_votes (
  id bigserial primary key,
  report_id text not null references public.reports(id) on delete cascade,
  voter_identifier text not null, -- user_id if authenticated or client hash
  created_at timestamptz not null default now(),
  unique(report_id, voter_identifier)
);

-- 5. Resolution Verifications Table (Citizen ground-truth verification)
create table if not exists public.resolution_verifications (
  id bigserial primary key,
  report_id text not null references public.reports(id) on delete cascade,
  verifier_identifier text not null,
  outcome text not null check (outcome in ('confirmed', 'disputed')),
  notes text default '',
  evidence_photo_url text,
  created_at timestamptz not null default now(),
  unique(report_id, verifier_identifier)
);

-- 6. Civic Points & Rewards Activity Log
create table if not exists public.civic_rewards_log (
  id bigserial primary key,
  user_identifier text not null,
  points_awarded integer not null check (points_awarded > 0),
  activity_type text not null check (activity_type in ('new_report', 'duplicate_support', 'verify_repair', 'safety_alert', 'sdg_action')),
  report_id text references public.reports(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. System Settings Table (Escalation timers, helpline info)
create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (setting_key, setting_value) values
  ('helpline_phone', '"1800-425-CIVIC"'),
  ('duplicate_radius_meters', '150'),
  ('escalation_thresholds_hours', '{"reminder": 24, "zonal": 72, "supervisor": 168, "commissioner": 360}')
on conflict (setting_key) do nothing;

-- 8. Row Level Security & Access Policies
alter table public.departments enable row level security;
alter table public.category_configs enable row level security;
alter table public.community_support_votes enable row level security;
alter table public.resolution_verifications enable row level security;
alter table public.civic_rewards_log enable row level security;
alter table public.system_settings enable row level security;

-- Public read permissions
create policy "Allow public read on departments" on public.departments for select using (true);
create policy "Allow public read on category_configs" on public.category_configs for select using (true);
create policy "Allow public read on system_settings" on public.system_settings for select using (true);

-- Community votes & verifications insert policy
create policy "Anyone can register support vote" on public.community_support_votes for insert with check (true);
create policy "Anyone can submit verification" on public.resolution_verifications for insert with check (true);
create policy "Anyone can read support votes" on public.community_support_votes for select using (true);
create policy "Anyone can read verifications" on public.resolution_verifications for select using (true);

-- Indexes for performance
create index if not exists idx_reports_major_cat on public.reports(major_category);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_created on public.reports(created_at desc);
create index if not exists idx_reports_coords on public.reports(latitude, longitude);
