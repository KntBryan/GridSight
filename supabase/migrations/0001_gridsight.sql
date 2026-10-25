create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('user', 'admin');
create type public.report_status as enum ('no_power', 'flickering', 'restored');
create type public.outage_status as enum ('unconfirmed', 'active', 'restored');
create type public.report_review_status as enum ('pending', 'verified', 'dismissed');
create type public.admin_action_type as enum ('verified', 'dismissed');
create type public.notification_kind as enum ('outage_reported', 'outage_restored');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  email text not null,
  phone text check (phone is null or char_length(phone) <= 30),
  role public.app_role not null default 'user',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  province text not null default 'Surigao del Norte',
  region text not null default 'Region 13',
  location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

create table public.outages (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete restrict,
  status public.outage_status not null default 'unconfirmed',
  center extensions.geography(point, 4326) not null,
  report_count integer not null default 0 check (report_count >= 0),
  first_reported_at timestamptz not null default now(),
  restored_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint restored_time_matches_status check ((status = 'restored') = (restored_at is not null))
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  area_id uuid not null references public.areas(id) on delete restrict,
  outage_id uuid references public.outages(id) on delete set null,
  status public.report_status not null,
  verification_status public.report_review_status not null default 'pending',
  photo_path text,
  notes text check (char_length(notes) <= 500),
  location extensions.geography(point, 4326),
  client_request_id uuid,
  created_at timestamptz not null default now(),
  constraint report_request_id_owner_unique unique (user_id, client_request_id)
);

create table public.user_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete restrict,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint user_areas_user_area_unique unique (user_id, area_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  outage_id uuid references public.outages(id) on delete set null,
  kind public.notification_kind not null,
  message text not null,
  is_read boolean not null default false,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_user_outage_kind_unique unique (user_id, outage_id, kind)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (
    char_length(endpoint) <= 2048 and
    endpoint ~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|notify\.windows\.com)(/|$)'
  ),
  subscription jsonb not null check (
    jsonb_typeof(subscription) = 'object' and subscription ->> 'endpoint' = endpoint
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  action public.admin_action_type not null,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

create index areas_location_gix on public.areas using gist (location);
create index outages_center_gix on public.outages using gist (center);
create index outages_area_first_reported_idx on public.outages (area_id, first_reported_at desc);
create index outages_status_updated_idx on public.outages (status, updated_at desc);
create index reports_location_gix on public.reports using gist (location);
create index reports_area_created_idx on public.reports (area_id, created_at desc);
create index reports_user_created_idx on public.reports (user_id, created_at desc);
create index reports_unclustered_created_idx on public.reports (created_at) where outage_id is null;
create index user_areas_area_user_idx on public.user_areas (area_id, user_id);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index admin_actions_report_created_idx on public.admin_actions (report_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger outages_set_updated_at before update on public.outages
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

create trigger auth_user_profile_created after insert on auth.users
for each row execute function public.create_profile_for_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator can change account roles.';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create or replace function public.prevent_report_review_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status and not public.is_admin() then
    raise exception 'Only an administrator can review reports.';
  end if;
  if new.photo_path is distinct from old.photo_path and new.photo_path is not null
     and not public.is_admin() and split_part(new.photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Report photos must belong to the reporting user.';
  end if;
  return new;
end;
$$;

create trigger reports_review_guard before update of verification_status, photo_path on public.reports
for each row execute function public.prevent_report_review_escalation();

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.outages enable row level security;
alter table public.reports enable row level security;
alter table public.user_areas enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.admin_actions enable row level security;

create policy "Profiles visible to owner and admins" on public.profiles
for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users update their own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Areas are visible to everyone" on public.areas
for select to anon, authenticated using (true);
create policy "Admins manage areas" on public.areas
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Outages are visible to everyone" on public.outages
for select to anon, authenticated using (true);
create policy "Admins update outages" on public.outages
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Reports visible to owner and admins" on public.reports
for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Report owners update permitted columns" on public.reports
for update to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()))
with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Users manage their followed areas" on public.user_areas
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users read their notifications" on public.notifications
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users mark their notifications read" on public.notifications
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their push subscriptions" on public.push_subscriptions
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Admins inspect action history" on public.admin_actions
for select to authenticated using ((select public.is_admin()));
create policy "Admins log moderation actions" on public.admin_actions
for insert to authenticated with check (admin_id = (select auth.uid()) and (select public.is_admin()));

grant select on public.areas, public.outages to anon, authenticated;
grant insert, update, delete on public.areas to authenticated;
grant select on public.profiles, public.reports, public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant update (name, phone, notifications_enabled) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_areas to authenticated;
grant update (status, restored_at) on public.outages to authenticated;
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.admin_actions to authenticated;

revoke update on public.reports from authenticated;
revoke update (verification_status) on public.reports from authenticated;
grant update (photo_path) on public.reports to authenticated;

create or replace function public.submit_outage_report(
  p_area_slug text,
  p_status public.report_status,
  p_notes text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_area public.areas%rowtype;
  v_report_id uuid;
  v_location extensions.geography(point, 4326);
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'Report notes are too long.';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together.';
  end if;

  if p_request_id is not null then
    select id into v_report_id from public.reports
    where user_id = v_user_id and client_request_id = p_request_id;
    if v_report_id is not null then return v_report_id; end if;
  end if;

  select * into v_area from public.areas where slug = p_area_slug;
  if not found then raise exception 'Unknown area.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(v_area.id::text));
  if p_request_id is not null then
    select id into v_report_id from public.reports
    where user_id = v_user_id and client_request_id = p_request_id;
    if v_report_id is not null then return v_report_id; end if;
  end if;
  if exists (
    select 1 from public.reports
    where user_id = v_user_id and area_id = v_area.id
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Cooldown: please wait before reporting this area again.';
  end if;

  v_location := case
    when p_latitude is not null then extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
    else v_area.location
  end;

  insert into public.reports (user_id, area_id, status, notes, location, client_request_id)
  values (v_user_id, v_area.id, p_status, nullif(btrim(p_notes), ''), v_location, p_request_id)
  returning id into v_report_id;
  return v_report_id;
end;
$$;

create or replace function public.cluster_recent_reports()
returns integer
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_report record;
  v_center extensions.geography(point, 4326);
  v_outage_id uuid;
  v_attached integer := 0;
  v_report_count integer;
  v_recent_count integer;
  v_restored_count integer;
  v_previous_status public.outage_status;
  v_next_status public.outage_status;
begin
  perform pg_advisory_xact_lock(hashtext('gridsight-cluster-reports'));

  for v_report in
        select r.id, r.user_id, r.area_id, r.status, r.location, r.created_at,
          a.location as area_location, a.name as area_name
    from public.reports r
    join public.areas a on a.id = r.area_id
    where r.outage_id is null and r.created_at >= now() - interval '15 minutes'
      and r.verification_status <> 'dismissed'
    order by r.created_at asc
    for update of r skip locked
  loop
    v_center := coalesce(v_report.location, v_report.area_location);
    v_outage_id := null;

    select o.id, o.status into v_outage_id, v_previous_status
    from public.outages o
    where o.area_id = v_report.area_id
      and o.status in ('unconfirmed', 'active')
      and o.first_reported_at >= now() - interval '15 minutes'
      and extensions.st_dwithin(o.center, v_center, 500)
    order by o.center <-> v_center
    limit 1
    for update;

    if v_outage_id is null then
      insert into public.outages (area_id, center, status, report_count, first_reported_at)
      values (v_report.area_id, v_center, 'unconfirmed', 0, v_report.created_at)
      returning id into v_outage_id;
      v_previous_status := 'unconfirmed';

      insert into public.notifications (user_id, outage_id, kind, message)
      select ua.user_id, v_outage_id, 'outage_reported', 'A new outage report was received in ' || v_report.area_name || '.'
      from public.user_areas ua
      join public.profiles p on p.id = ua.user_id
      where ua.area_id = v_report.area_id and ua.notifications_enabled and p.notifications_enabled
      on conflict (user_id, outage_id, kind) do nothing;
    end if;

    update public.reports set outage_id = v_outage_id where id = v_report.id and outage_id is null;
    if not found then continue; end if;

    select count(*) into v_report_count from public.reports
    where outage_id = v_outage_id and verification_status <> 'dismissed';
    select count(*), count(*) filter (where status = 'restored')
      into v_recent_count, v_restored_count
    from public.reports
    where outage_id = v_outage_id and verification_status <> 'dismissed'
      and created_at >= now() - interval '60 minutes';

    v_next_status := case
      when v_recent_count >= 3 and v_restored_count::numeric / nullif(v_recent_count, 0) >= 0.6 then 'restored'::public.outage_status
      when v_report_count >= 3 then 'active'::public.outage_status
      else v_previous_status
    end;

    update public.outages
    set report_count = v_report_count,
        status = v_next_status,
        restored_at = case when v_next_status = 'restored' then coalesce(restored_at, now()) else null end
    where id = v_outage_id;

    if v_next_status = 'restored' and v_previous_status <> 'restored' then
      insert into public.notifications (user_id, outage_id, kind, message)
      select ua.user_id, v_outage_id, 'outage_restored', 'Power appears to be restored in ' || v_report.area_name || '.'
      from public.user_areas ua
      join public.profiles p on p.id = ua.user_id
      where ua.area_id = v_report.area_id and ua.notifications_enabled and p.notifications_enabled
      on conflict (user_id, outage_id, kind) do nothing;
    end if;

    v_attached := v_attached + 1;
  end loop;

  return v_attached;
end;
$$;

create or replace function public.moderate_report(
  p_report_id uuid,
  p_action public.admin_action_type,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_id uuid := auth.uid();
  v_outage_id uuid;
  v_report_count integer;
  v_recent_count integer;
  v_restored_count integer;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception 'Reason is too long.';
  end if;

  update public.reports
  set verification_status = p_action::text::public.report_review_status
  where id = p_report_id;
  if not found then raise exception 'Report not found.'; end if;

  select outage_id into v_outage_id from public.reports where id = p_report_id;
  if v_outage_id is not null then
    select count(*) into v_report_count from public.reports
    where outage_id = v_outage_id and verification_status <> 'dismissed';
    select count(*), count(*) filter (where status = 'restored')
      into v_recent_count, v_restored_count
    from public.reports
    where outage_id = v_outage_id and verification_status <> 'dismissed'
      and created_at >= now() - interval '60 minutes';

    update public.outages
    set report_count = v_report_count,
        status = case
          when v_recent_count >= 3 and v_restored_count::numeric / nullif(v_recent_count, 0) >= 0.6 then 'restored'::public.outage_status
          when v_report_count >= 3 then 'active'::public.outage_status
          else 'unconfirmed'::public.outage_status
        end,
        restored_at = case
          when v_recent_count >= 3 and v_restored_count::numeric / nullif(v_recent_count, 0) >= 0.6 then coalesce(restored_at, now())
          else null
        end
    where id = v_outage_id;
  end if;

  insert into public.admin_actions (admin_id, report_id, action, reason)
  values (v_admin_id, p_report_id, p_action, nullif(btrim(p_reason), ''));
end;
$$;

create or replace function public.admin_area_analytics()
returns table (
  area_id uuid,
  area_name text,
  city text,
  outages_last_30_days bigint,
  total_outages bigint,
  active_outages bigint,
  average_restoration_minutes numeric
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select a.id,
         a.name,
         a.city,
         count(o.id) filter (where o.first_reported_at >= now() - interval '30 days'),
         count(o.id),
         count(o.id) filter (where o.status = 'active'),
         avg(extract(epoch from (o.restored_at - o.first_reported_at)) / 60)
           filter (where o.restored_at is not null)
  from public.areas a
  left join public.outages o on o.area_id = a.id
  where public.is_admin()
  group by a.id, a.name, a.city
  order by count(o.id) filter (where o.first_reported_at >= now() - interval '30 days') desc, a.name;
$$;

revoke all on function public.submit_outage_report(text, public.report_status, text, double precision, double precision, uuid) from public;
grant execute on function public.submit_outage_report(text, public.report_status, text, double precision, double precision, uuid) to authenticated;
revoke all on function public.cluster_recent_reports() from public, anon, authenticated;
grant execute on function public.cluster_recent_reports() to service_role;
revoke all on function public.moderate_report(uuid, public.admin_action_type, text) from public;
grant execute on function public.moderate_report(uuid, public.admin_action_type, text) to authenticated;
revoke all on function public.admin_area_analytics() from public;
grant execute on function public.admin_area_analytics() to authenticated;

create or replace view public.outage_map with (security_invoker = true) as
select o.id, o.area_id, a.name as area_name, a.city, o.status, o.report_count,
       extensions.st_y(o.center::extensions.geometry) as latitude,
       extensions.st_x(o.center::extensions.geometry) as longitude,
       o.first_reported_at, o.restored_at, a.province
from public.outages o
join public.areas a on a.id = o.area_id;

grant select on public.outage_map to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users upload their own report photos" on storage.objects
for insert to authenticated with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users view their own report photos" on storage.objects
for select to authenticated using (bucket_id = 'report-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "Users remove their own report photos" on storage.objects
for delete to authenticated using (bucket_id = 'report-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

insert into public.areas (slug, name, city, province, region, location) values
  ('surigao-city', 'Surigao City', 'Surigao City', 'Surigao del Norte', 'Region XIII (Caraga)', extensions.st_setsrid(extensions.st_makepoint(125.4916, 9.7878), 4326)::extensions.geography)
on conflict (slug) do nothing;

-- Enable Realtime for outage and notification changes in the Supabase dashboard if not already added.
