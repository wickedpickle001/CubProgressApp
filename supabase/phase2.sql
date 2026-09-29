-- Cub Progress phase 2. Run once in the Supabase SQL editor.
-- This adds columns and tables. It does not delete existing rows.

alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists six_name text;

alter table public.akela_notes add column if not exists expires_at date;
alter table public.weekly_challenges add column if not exists expires_at date;
alter table public.shoutouts add column if not exists expires_at date;

alter table public.pack_events add column if not exists start_time text;
alter table public.pack_events add column if not exists end_time text;
alter table public.pack_events add column if not exists location text;
alter table public.pack_events add column if not exists description text;
alter table public.pack_events add column if not exists bring text;
alter table public.pack_events add column if not exists parent_info text;
alter table public.pack_events add column if not exists status text default 'planned';
alter table public.pack_events add column if not exists kind text default 'meeting';

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  pack_name text,
  cub_name text,
  cub_id uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  pack_name text,
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  cub_id uuid not null,
  response text,
  updated_at timestamptz default now(),
  unique (event_id, cub_id)
);

create table if not exists public.badge_catalog (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  verified boolean default false,
  archived boolean default false,
  updated_at timestamptz default now()
);

create table if not exists public.badge_requirements (
  id uuid primary key default gen_random_uuid(),
  badge_name text not null,
  version int default 1,
  sort int default 1,
  requirement text not null,
  verified boolean default false
);

create table if not exists public.assessment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  badge_name text,
  status text,
  note text,
  assessor_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  needs_adult boolean default true,
  active boolean default true
);

create table if not exists public.kit_lists (
  id uuid primary key default gen_random_uuid(),
  pack_name text,
  title text not null,
  active boolean default true
);

create table if not exists public.kit_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  label text not null,
  sort int default 1
);

create table if not exists public.kit_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  user_id uuid not null,
  packed boolean default false,
  unique (item_id, user_id)
);

create table if not exists public.parent_posts (
  id uuid primary key default gen_random_uuid(),
  pack_name text,
  title text,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text,
  detail text,
  created_at timestamptz default now()
);

alter table public.parent_links enable row level security;
alter table public.app_notifications enable row level security;
alter table public.attendance enable row level security;
alter table public.badge_catalog enable row level security;
alter table public.badge_requirements enable row level security;
alter table public.assessment_history enable row level security;
alter table public.skills enable row level security;
alter table public.kit_lists enable row level security;
alter table public.kit_items enable row level security;
alter table public.kit_checks enable row level security;
alter table public.parent_posts enable row level security;
alter table public.audit_log enable row level security;

-- Helpers avoid policy recursion on profiles.
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_pack_name()
returns text language sql stable security definer set search_path = public as $$
  select pack_name from public.profiles where id = auth.uid();
$$;

drop policy if exists parent_links_select on public.parent_links;
create policy parent_links_select on public.parent_links for select to authenticated
using (
  parent_id = auth.uid()
  or public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists parent_links_insert on public.parent_links;
create policy parent_links_insert on public.parent_links for insert to authenticated
with check (parent_id = auth.uid());

drop policy if exists parent_links_update on public.parent_links;
create policy parent_links_update on public.parent_links for update to authenticated
using (public.my_role() in ('leader', 'admin'));

drop policy if exists notes_select on public.app_notifications;
create policy notes_select on public.app_notifications for select to authenticated
using (
  user_id = auth.uid()
  or pack_name = public.my_pack_name()
  or public.my_role() = 'admin'
);

drop policy if exists notes_insert on public.app_notifications;
create policy notes_insert on public.app_notifications for insert to authenticated
with check (public.my_role() in ('leader', 'admin') or user_id = auth.uid());

drop policy if exists notes_update on public.app_notifications;
create policy notes_update on public.app_notifications for update to authenticated
using (user_id = auth.uid() or user_id is null);

drop policy if exists attendance_all on public.attendance;
create policy attendance_all on public.attendance for all to authenticated
using (cub_id = auth.uid() or public.my_role() in ('leader', 'admin'))
with check (cub_id = auth.uid() or public.my_role() in ('leader', 'admin'));

drop policy if exists catalog_read on public.badge_catalog;
create policy catalog_read on public.badge_catalog for select to authenticated using (true);
drop policy if exists catalog_write on public.badge_catalog;
create policy catalog_write on public.badge_catalog for all to authenticated
using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists req_read on public.badge_requirements;
create policy req_read on public.badge_requirements for select to authenticated using (true);
drop policy if exists req_write on public.badge_requirements;
create policy req_write on public.badge_requirements for all to authenticated
using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists history_read on public.assessment_history;
create policy history_read on public.assessment_history for select to authenticated
using (
  user_id = auth.uid()
  or public.my_role() in ('leader', 'admin')
  or exists (
    select 1 from public.parent_links
    where parent_id = auth.uid() and cub_id = assessment_history.user_id and status = 'approved'
  )
);
drop policy if exists history_write on public.assessment_history;
create policy history_write on public.assessment_history for insert to authenticated
with check (public.my_role() in ('leader', 'admin'));

drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills for select to authenticated using (active = true or public.my_role() = 'admin');
drop policy if exists skills_write on public.skills;
create policy skills_write on public.skills for all to authenticated
using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists kit_lists_rw on public.kit_lists;
create policy kit_lists_rw on public.kit_lists for all to authenticated
using (pack_name = public.my_pack_name() or public.my_role() = 'admin')
with check (public.my_role() in ('leader', 'admin'));

drop policy if exists kit_items_rw on public.kit_items;
create policy kit_items_rw on public.kit_items for all to authenticated
using (true) with check (public.my_role() in ('leader', 'admin') or auth.uid() is not null);

drop policy if exists kit_checks_rw on public.kit_checks;
create policy kit_checks_rw on public.kit_checks for all to authenticated
using (user_id = auth.uid() or public.my_role() in ('leader', 'admin'))
with check (user_id = auth.uid() or public.my_role() in ('leader', 'admin'));

drop policy if exists posts_read on public.parent_posts;
create policy posts_read on public.parent_posts for select to authenticated
using (pack_name = public.my_pack_name() or public.my_role() = 'admin');
drop policy if exists posts_write on public.parent_posts;
create policy posts_write on public.parent_posts for insert to authenticated
with check (public.my_role() in ('leader', 'admin'));

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated
using (public.my_role() in ('leader', 'admin'));
drop policy if exists audit_write on public.audit_log;
create policy audit_write on public.audit_log for insert to authenticated
with check (actor_id = auth.uid());
