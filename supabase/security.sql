-- Cub Progress security pass.
-- Safe to run more than once. It does not delete rows.
-- Run this in the Supabase SQL editor after phase2.sql.

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_pack_name()
returns text language sql stable security definer set search_path = public as $$
  select pack_name from public.profiles where id = auth.uid();
$$;

create or replace function public.pack_of(target uuid)
returns text language sql stable security definer set search_path = public as $$
  select pack_name from public.profiles where id = target;
$$;

create or replace function public.safe_pack_of(folder text)
returns text language plpgsql stable security definer set search_path = public as $$
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

create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_role text;
  actor_pack text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role, pack_name into actor_role, actor_pack
  from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    if coalesce(actor_role, '') <> 'admin' then
      if new.role is null or new.role not in ('cub', 'parent') then
        new.role := 'cub';
      end if;
      new.pack_status := 'pending';
      new.active := true;
    end if;
    return new;
  end if;

  if coalesce(actor_role, '') = 'admin' then
    return new;
  end if;

  if old.id <> auth.uid() then
    if actor_role = 'leader' and old.pack_name is not distinct from actor_pack then
      if new.role is distinct from old.role or new.pack_name is distinct from old.pack_name then
        raise exception 'Only an administrator can change a role or move a cub to another pack';
      end if;
      return new;
    end if;
    raise exception 'You cannot edit this profile';
  end if;

  if new.role is distinct from old.role
     or new.pack_status is distinct from old.pack_status
     or new.active is distinct from old.active
     or new.pack_name is distinct from old.pack_name
     or new.six_name is distinct from old.six_name then
    raise exception 'You cannot change your own access';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_trigger on public.profiles;
create trigger protect_profile_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile();

create or replace function public.protect_badge_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_role text;
begin
  if auth.uid() is null then
    return new;
  end if;
  actor_role := coalesce(public.my_role(), 'cub');

  if tg_op = 'INSERT' then
    if actor_role not in ('leader', 'admin') then
      if new.user_id is distinct from auth.uid() then
        raise exception 'You can only submit your own badge';
      end if;
      if new.status = 'approved' then
        raise exception 'Only a leader can approve a badge';
      end if;
    end if;
    return new;
  end if;

  if actor_role not in ('leader', 'admin') then
    if old.user_id is distinct from auth.uid() then
      raise exception 'Not your badge';
    end if;
    if old.status = 'approved' then
      raise exception 'This badge is locked';
    end if;
    if new.status = 'approved' then
      raise exception 'Only a leader can approve a badge';
    end if;
  elsif actor_role = 'leader' and public.pack_of(old.user_id) is distinct from public.my_pack_name() then
    raise exception 'This cub is not in your pack';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_badge_submission_trigger on public.badge_submissions;
create trigger protect_badge_submission_trigger
before insert or update on public.badge_submissions
for each row execute function public.protect_badge_submission();

-- Tighten policies created in phase2. These names are ours.
drop policy if exists notes_insert on public.app_notifications;
create policy notes_insert on public.app_notifications for insert to authenticated
with check (public.my_role() in ('leader', 'admin'));

drop policy if exists notes_update on public.app_notifications;
create policy notes_update on public.app_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists parent_links_update on public.parent_links;
create policy parent_links_update on public.parent_links for update to authenticated
using (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
)
with check (
  public.my_role() = 'admin'
  or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
);

drop policy if exists attendance_all on public.attendance;
create policy attendance_all on public.attendance for all to authenticated
using (
  cub_id = auth.uid()
  or public.my_role() = 'admin'
  or (
    public.my_role() = 'leader'
    and exists (
      select 1 from public.pack_events e
      where e.id = attendance.event_id
        and e.pack_name = public.my_pack_name()
    )
  )
)
with check (
  cub_id = auth.uid()
  or public.my_role() = 'admin'
  or public.my_role() = 'leader'
);

drop policy if exists kit_items_rw on public.kit_items;
create policy kit_items_rw on public.kit_items for all to authenticated
using (
  public.my_role() = 'admin'
  or exists (
    select 1 from public.kit_lists l
    where l.id = kit_items.list_id
      and l.pack_name = public.my_pack_name()
  )
)
with check (public.my_role() in ('leader', 'admin'));

drop policy if exists history_read on public.assessment_history;
create policy history_read on public.assessment_history for select to authenticated
using (
  user_id = auth.uid()
  or public.my_role() = 'admin'
  or (public.my_role() = 'leader' and public.pack_of(user_id) = public.my_pack_name())
  or exists (
    select 1 from public.parent_links
    where parent_id = auth.uid()
      and cub_id = assessment_history.user_id
      and status = 'approved'
  )
);

-- If a table already has Row Level Security, add a restrictive rule.
-- This does not turn RLS on for a table that does not have it, because that could lock the app.
do $$
declare
  rec record;
begin
  for rec in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relrowsecurity
      and c.relname in (
        'profiles', 'badge_submissions', 'badge_progress', 'badge_files', 'good_turns',
        'akela_notes', 'weekly_challenges', 'shoutouts', 'pack_events'
      )
  loop
    execute format('drop policy if exists pack_guard_select on public.%I', rec.relname);
    if rec.relname = 'profiles' then
      execute $p$
        create policy pack_guard_select on public.profiles
        as restrictive for select to authenticated
        using (
          id = auth.uid()
          or public.my_role() = 'admin'
          or (public.my_role() = 'leader' and pack_name = public.my_pack_name())
          or (pack_name = public.my_pack_name() and pack_status = 'approved')
          or exists (
            select 1 from public.parent_links
            where parent_id = auth.uid() and cub_id = profiles.id and status = 'approved'
          )
        )
      $p$;
    elsif rec.relname in ('badge_submissions', 'badge_progress', 'badge_files', 'good_turns') then
      execute format($p$
        create policy pack_guard_select on public.%I
        as restrictive for select to authenticated
        using (
          user_id = auth.uid()
          or public.my_role() = 'admin'
          or (public.my_role() = 'leader' and public.pack_of(user_id) = public.my_pack_name())
          or exists (
            select 1 from public.parent_links
            where parent_id = auth.uid() and cub_id = %I.user_id and status = 'approved'
          )
        )
      $p$, rec.relname, rec.relname);
    else
      execute format($p$
        create policy pack_guard_select on public.%I
        as restrictive for select to authenticated
        using (
          pack_name = public.my_pack_name()
          or public.my_role() = 'admin'
        )
      $p$, rec.relname);
    end if;
  end loop;
end $$;

-- Badge evidence files are stored as cub-id/badge/file.
-- A private bucket plus these rules stops another pack opening the file.
update storage.buckets set public = false where id = 'badge-evidence';

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

drop policy if exists badge_evidence_insert on storage.objects;
create policy badge_evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'badge-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
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
