-- Cub Progress security v2.
-- Run after supabase/phase2.sql and supabase/security.sql.
-- Safe to run more than once. This file does not delete rows,
-- does not drop tables, and does not make badge-evidence public.
-- If phase2.sql is run again later, run this file again afterwards.
-- phase2.sql recreates a few wide policies, and this file closes them.

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_pack_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pack_name from public.profiles where id = auth.uid();
$$;

create or replace function public.pack_of(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pack_name from public.profiles where id = target;
$$;

create or replace function public.safe_pack_of(folder text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  begin
    uid := folder::uuid;
  exception when others then
    return null;
  end;
  return public.pack_of(uid);
end;
$$;


create or replace function public.safe_pack_uuid(raw text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if raw is null or raw = '' then
    return null;
  end if;
  begin
    return raw::uuid;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function public.event_pack(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pack_name from public.pack_events where id = target;
$$;

create or replace function public.kit_item_pack(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.pack_name
  from public.kit_items i
  join public.kit_lists l on l.id = i.list_id
  where i.id = target;
$$;

-- A parent can ask to be linked. Only a leader of that pack, or an admin,
-- can attach a cub and approve the link. Existing approved rows are not edited.
create or replace function public.protect_parent_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := coalesce(public.my_role(), '');
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and actor not in ('leader', 'admin') then
    new.parent_id := auth.uid();
    new.status := 'pending';
    new.cub_id := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and actor not in ('leader', 'admin') then
    raise exception 'Only a leader can approve a parent link';
  end if;

  if actor = 'leader' then
    if tg_op = 'UPDATE' and old.pack_name is distinct from public.my_pack_name() then
      raise exception 'That parent link is not in your pack';
    end if;
    if new.pack_name is distinct from public.my_pack_name() then
      raise exception 'You cannot move a parent link to another pack';
    end if;
    if new.cub_id is not null and public.pack_of(new.cub_id) is distinct from public.my_pack_name() then
      raise exception 'That cub is not in your pack';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_parent_link_trigger on public.parent_links;
create trigger protect_parent_link_trigger
before insert or update on public.parent_links
for each row execute function public.protect_parent_link();

-- Assessment rows can be added, not edited or removed, by normal users.
create or replace function public.protect_assessment_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := coalesce(public.my_role(), '');
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Assessment history cannot be deleted';
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'Assessment history cannot be changed';
  end if;

  if actor = 'admin' then
    return new;
  end if;

  if actor = 'leader' and public.pack_of(new.user_id) = public.my_pack_name() then
    return new;
  end if;

  raise exception 'You cannot write assessment history for that cub';
end;
$$;

drop trigger if exists protect_assessment_history_trigger on public.assessment_history;
create trigger protect_assessment_history_trigger
before insert or update or delete on public.assessment_history
for each row execute function public.protect_assessment_history();

create or replace function public.protect_parent_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := coalesce(public.my_role(), '');
begin
  if auth.uid() is null or actor = 'admin' then
    return new;
  end if;
  if actor = 'leader' and new.pack_name = public.my_pack_name() then
    return new;
  end if;
  raise exception 'You cannot post for another pack';
end;
$$;

drop trigger if exists protect_parent_post_trigger on public.parent_posts;
create trigger protect_parent_post_trigger
before insert on public.parent_posts
for each row execute function public.protect_parent_post();

-- Parent links. Drop the wide insert/update policies, then add a tight
-- policy and a restrictive guard. The guard still applies if a wide policy
-- is created again.
drop policy if exists parent_links_insert on public.parent_links;
create policy parent_links_insert on public.parent_links
for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    parent_id = auth.uid()
    and status = 'pending'
    and cub_id is null
  )
);

drop policy if exists parent_links_insert_guard on public.parent_links;
create policy parent_links_insert_guard on public.parent_links
as restrictive for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    parent_id = auth.uid()
    and status = 'pending'
    and cub_id is null
  )
);

drop policy if exists parent_links_update on public.parent_links;
create policy parent_links_update on public.parent_links
for update to authenticated
using (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
)
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and pack_name = public.my_pack_name()
    and (cub_id is null or public.pack_of(cub_id) = public.my_pack_name())
  )
);

drop policy if exists parent_links_update_guard on public.parent_links;
create policy parent_links_update_guard on public.parent_links
as restrictive for update to authenticated
using (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
)
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and pack_name = public.my_pack_name()
    and (cub_id is null or public.pack_of(cub_id) = public.my_pack_name())
  )
);

-- Assessment history stays append-only. No update or delete policy is added.
drop policy if exists history_write on public.assessment_history;
create policy history_write on public.assessment_history
for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.pack_of(user_id) = public.my_pack_name()
  )
);

drop policy if exists history_insert_guard on public.assessment_history;
create policy history_insert_guard on public.assessment_history
as restrictive for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.pack_of(user_id) = public.my_pack_name()
  )
);

-- Private notices have a user_id. Pack notices have no user_id.
-- A pack-wide rule must not reveal a private badge note.
drop policy if exists notes_select on public.app_notifications;
create policy notes_select on public.app_notifications
for select to authenticated
using (
  public.my_role() = 'admin'
  or user_id = auth.uid()
  or (
    user_id is null
    and pack_name = public.my_pack_name()
  )
  or exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid()
      and pl.status = 'approved'
      and pl.cub_id = app_notifications.user_id
  )
);

drop policy if exists notes_select_guard on public.app_notifications;
create policy notes_select_guard on public.app_notifications
as restrictive for select to authenticated
using (
  public.my_role() = 'admin'
  or user_id = auth.uid()
  or (
    user_id is null
    and pack_name = public.my_pack_name()
  )
  or exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid()
      and pl.status = 'approved'
      and pl.cub_id = app_notifications.user_id
  )
);

drop policy if exists notes_insert on public.app_notifications;
create policy notes_insert on public.app_notifications
for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and (
      (
        user_id is null
        and pack_name = public.my_pack_name()
      )
      or (
        user_id is not null
        and public.pack_of(user_id) = public.my_pack_name()
        and (pack_name is null or pack_name = public.my_pack_name())
      )
    )
  )
);

drop policy if exists notes_insert_guard on public.app_notifications;
create policy notes_insert_guard on public.app_notifications
as restrictive for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and (
      (
        user_id is null
        and pack_name = public.my_pack_name()
      )
      or (
        user_id is not null
        and public.pack_of(user_id) = public.my_pack_name()
        and (pack_name is null or pack_name = public.my_pack_name())
      )
    )
  )
);

drop policy if exists notes_update_guard on public.app_notifications;
create policy notes_update_guard on public.app_notifications
as restrictive for update to authenticated
using (public.my_role() = 'admin' or user_id = auth.uid())
with check (public.my_role() = 'admin' or user_id = auth.uid());

-- Attendance. A leader can record only their own pack, and only for that pack's events.
drop policy if exists attendance_all on public.attendance;
create policy attendance_all on public.attendance
for all to authenticated
using (
  public.my_role() = 'admin'
  or (
    cub_id = auth.uid()
    and public.event_pack(event_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.event_pack(event_id) = public.my_pack_name()
    and public.pack_of(cub_id) = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    cub_id = auth.uid()
    and public.event_pack(event_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.event_pack(event_id) = public.my_pack_name()
    and public.pack_of(cub_id) = public.my_pack_name()
  )
);

drop policy if exists attendance_guard on public.attendance;
create policy attendance_guard on public.attendance
as restrictive for all to authenticated
using (
  public.my_role() = 'admin'
  or (
    cub_id = auth.uid()
    and public.event_pack(event_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.event_pack(event_id) = public.my_pack_name()
    and public.pack_of(cub_id) = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    cub_id = auth.uid()
    and public.event_pack(event_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.event_pack(event_id) = public.my_pack_name()
    and public.pack_of(cub_id) = public.my_pack_name()
  )
);

-- Camp kit stays inside one pack.
drop policy if exists kit_lists_rw on public.kit_lists;
create policy kit_lists_rw on public.kit_lists
for all to authenticated
using (public.my_role() = 'admin' or pack_name = public.my_pack_name())
with check (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists kit_lists_guard on public.kit_lists;
create policy kit_lists_guard on public.kit_lists
as restrictive for all to authenticated
using (public.my_role() = 'admin' or pack_name = public.my_pack_name())
with check (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists kit_items_rw on public.kit_items;
create policy kit_items_rw on public.kit_items
for all to authenticated
using (
  public.my_role() = 'admin'
  or exists (
    select 1 from public.kit_lists l
    where l.id = kit_items.list_id
      and l.pack_name = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and exists (
      select 1 from public.kit_lists l
      where l.id = kit_items.list_id
        and l.pack_name = public.my_pack_name()
    )
  )
);

drop policy if exists kit_items_guard on public.kit_items;
create policy kit_items_guard on public.kit_items
as restrictive for all to authenticated
using (
  public.my_role() = 'admin'
  or exists (
    select 1 from public.kit_lists l
    where l.id = kit_items.list_id
      and l.pack_name = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and exists (
      select 1 from public.kit_lists l
      where l.id = kit_items.list_id
        and l.pack_name = public.my_pack_name()
    )
  )
);

drop policy if exists kit_checks_rw on public.kit_checks;
create policy kit_checks_rw on public.kit_checks
for all to authenticated
using (
  public.my_role() = 'admin'
  or user_id = auth.uid()
  or (
    public.my_role() = 'leader'
    and public.kit_item_pack(item_id) = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    user_id = auth.uid()
    and public.kit_item_pack(item_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.kit_item_pack(item_id) = public.my_pack_name()
    and public.pack_of(user_id) = public.my_pack_name()
  )
);

drop policy if exists kit_checks_guard on public.kit_checks;
create policy kit_checks_guard on public.kit_checks
as restrictive for all to authenticated
using (
  public.my_role() = 'admin'
  or user_id = auth.uid()
  or (
    public.my_role() = 'leader'
    and public.kit_item_pack(item_id) = public.my_pack_name()
  )
)
with check (
  public.my_role() = 'admin'
  or (
    user_id = auth.uid()
    and public.kit_item_pack(item_id) = public.my_pack_name()
  )
  or (
    public.my_role() = 'leader'
    and public.kit_item_pack(item_id) = public.my_pack_name()
    and public.pack_of(user_id) = public.my_pack_name()
  )
);

-- Parent posts cannot be aimed at another pack by typing that pack's name.
drop policy if exists posts_write on public.parent_posts;
create policy posts_write on public.parent_posts
for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists posts_insert_guard on public.parent_posts;
create policy posts_insert_guard on public.parent_posts
as restrictive for insert to authenticated
with check (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists posts_select_guard on public.parent_posts;
create policy posts_select_guard on public.parent_posts
as restrictive for select to authenticated
using (
  public.my_role() = 'admin'
  or pack_name = public.my_pack_name()
);


-- Audit rows stay. A leader sees a row only when the actor or the cub
-- named in detail belongs to that leader's pack. Cubs and parents cannot read it.
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log
for select to authenticated
using (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and (
      public.pack_of(actor_id) = public.my_pack_name()
      or public.pack_of(public.safe_pack_uuid(detail)) = public.my_pack_name()
    )
  )
);

drop policy if exists audit_read_guard on public.audit_log;
create policy audit_read_guard on public.audit_log
as restrictive for select to authenticated
using (
  public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and (
      public.pack_of(actor_id) = public.my_pack_name()
      or public.pack_of(public.safe_pack_uuid(detail)) = public.my_pack_name()
    )
  )
);

drop policy if exists audit_write on public.audit_log;
create policy audit_write on public.audit_log
for insert to authenticated
with check (
  actor_id = auth.uid()
  and public.my_role() in ('leader', 'admin')
);

drop policy if exists audit_insert_guard on public.audit_log;
create policy audit_insert_guard on public.audit_log
as restrictive for insert to authenticated
with check (
  actor_id = auth.uid()
  and public.my_role() in ('leader', 'admin')
);

-- Storage. The bucket stays private. These rules cover read, add, change, and delete.
-- A restrictive rule still blocks another pack even if an older wide rule remains.
update storage.buckets
set public = false
where id = 'badge-evidence';

drop policy if exists badge_evidence_read on storage.objects;
create policy badge_evidence_read on storage.objects
for select to authenticated
using (
  bucket_id = 'badge-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.my_role() = 'admin'
    or (
      public.my_role() = 'leader'
      and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
    )
    or exists (
      select 1 from public.parent_links pl
      where pl.parent_id = auth.uid()
        and pl.status = 'approved'
        and pl.cub_id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists badge_evidence_guard on storage.objects;
create policy badge_evidence_guard on storage.objects
as restrictive for select to authenticated
using (
  bucket_id <> 'badge-evidence'
  or (storage.foldername(name))[1] = auth.uid()::text
  or public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
  )
  or exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid()
      and pl.status = 'approved'
      and pl.cub_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists badge_evidence_insert on storage.objects;
create policy badge_evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'badge-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.my_role() = 'admin'
  )
);

drop policy if exists badge_evidence_insert_guard on storage.objects;
create policy badge_evidence_insert_guard on storage.objects
as restrictive for insert to authenticated
with check (
  bucket_id <> 'badge-evidence'
  or (storage.foldername(name))[1] = auth.uid()::text
  or public.my_role() = 'admin'
);

drop policy if exists badge_evidence_update on storage.objects;
create policy badge_evidence_update on storage.objects
for update to authenticated
using (
  bucket_id = 'badge-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.my_role() = 'admin'
    or (
      public.my_role() = 'leader'
      and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
    )
  )
)
with check (
  bucket_id = 'badge-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.my_role() = 'admin'
    or (
      public.my_role() = 'leader'
      and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
    )
  )
);

drop policy if exists badge_evidence_update_guard on storage.objects;
create policy badge_evidence_update_guard on storage.objects
as restrictive for update to authenticated
using (
  bucket_id <> 'badge-evidence'
  or (storage.foldername(name))[1] = auth.uid()::text
  or public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
  )
)
with check (
  bucket_id <> 'badge-evidence'
  or (storage.foldername(name))[1] = auth.uid()::text
  or public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
  )
);

drop policy if exists badge_evidence_delete on storage.objects;
create policy badge_evidence_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'badge-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.my_role() = 'admin'
    or (
      public.my_role() = 'leader'
      and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
    )
  )
);

drop policy if exists badge_evidence_delete_guard on storage.objects;
create policy badge_evidence_delete_guard on storage.objects
as restrictive for delete to authenticated
using (
  bucket_id <> 'badge-evidence'
  or (storage.foldername(name))[1] = auth.uid()::text
  or public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and public.safe_pack_of((storage.foldername(name))[1]) = public.my_pack_name()
  )
);

-- Older tables were created in the Supabase website. Their policies are not in
-- GitHub, so this file does not turn Row Level Security on or off for them.
-- Turning it on without seeing the existing rules could lock the app.
-- The messages below only report the current switch. They do not change data.
do $$
declare
  rec record;
begin
  for rec in
    select c.relname, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'profiles',
        'badge_submissions',
        'badge_progress',
        'badge_files',
        'good_turns',
        'akela_notes',
        'weekly_challenges',
        'shoutouts',
        'pack_events'
      )
  loop
    raise notice 'Manual check: public.% Row Level Security is %',
      rec.relname,
      case when rec.relrowsecurity then 'ON' else 'OFF' end;
  end loop;
end $$;
