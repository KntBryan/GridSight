alter table public.areas
  add column if not exists area_type text not null default 'municipality',
  add column if not exists psgc_code text,
  add column if not exists boundary extensions.geometry(MultiPolygon, 4326);

alter table public.areas
  add constraint areas_area_type_check
  check (area_type in ('municipality', 'city', 'barangay'));

update public.areas
set area_type = 'city'
where slug = 'surigao-city';

create unique index if not exists areas_psgc_code_unique_idx
  on public.areas (psgc_code) where psgc_code is not null;
create index if not exists areas_boundary_gix
  on public.areas using gist (boundary);

create or replace function public.find_barangay_at_location(
  p_latitude double precision,
  p_longitude double precision
)
returns table (slug text, name text, city text, province text, psgc_code text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select a.slug, a.name, a.city, a.province, a.psgc_code
  from public.areas a
  where a.area_type = 'barangay'
    and a.boundary is not null
    and extensions.st_covers(
      a.boundary,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)
    )
  order by a.psgc_code
  limit 1;
$$;

revoke all on function public.find_barangay_at_location(double precision, double precision) from public;
grant execute on function public.find_barangay_at_location(double precision, double precision) to anon, authenticated;

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
  v_point extensions.geometry(point, 4326);
  v_recent_report_count integer;
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
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180) then
    raise exception 'Coordinates are outside the valid range.';
  end if;

  if p_request_id is not null then
    select id into v_report_id from public.reports
    where user_id = v_user_id and client_request_id = p_request_id;
    if v_report_id is not null then return v_report_id; end if;
  end if;

  select * into v_area from public.areas
  where slug = p_area_slug and area_type = 'barangay';
  if not found or v_area.boundary is null then
    raise exception 'Unknown Surigao City barangay.';
  end if;

  if p_latitude is not null then
    v_point := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326);
    if not extensions.st_covers(v_area.boundary, v_point) then
      raise exception 'Report coordinates must be inside the selected barangay.';
    end if;
    v_location := v_point::extensions.geography;
  else
    v_location := v_area.location;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  if p_request_id is not null then
    select id into v_report_id from public.reports
    where user_id = v_user_id and client_request_id = p_request_id;
    if v_report_id is not null then return v_report_id; end if;
  end if;

  select count(*) into v_recent_report_count
  from public.reports
  where user_id = v_user_id and created_at > now() - interval '1 hour';
  if v_recent_report_count >= 6 then
    raise exception 'Hourly report limit reached. Please try again later.';
  end if;

  if exists (
    select 1 from public.reports
    where user_id = v_user_id and area_id = v_area.id
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Cooldown: please wait before reporting this area again.';
  end if;

  insert into public.reports (user_id, area_id, status, notes, location, client_request_id)
  values (v_user_id, v_area.id, p_status, nullif(btrim(p_notes), ''), v_location, p_request_id)
  returning id into v_report_id;
  return v_report_id;
end;
$$;

revoke all on function public.submit_outage_report(text, public.report_status, text, double precision, double precision, uuid) from public;
grant execute on function public.submit_outage_report(text, public.report_status, text, double precision, double precision, uuid) to authenticated;

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
  where public.is_admin() and a.area_type = 'barangay'
  group by a.id, a.name, a.city
  order by count(o.id) filter (where o.first_reported_at >= now() - interval '30 days') desc, a.name;
$$;

create or replace view public.outage_map with (security_invoker = true) as
select o.id, o.area_id, a.name as area_name, a.city, o.status, o.report_count,
       extensions.st_y(o.center::extensions.geometry) as latitude,
       extensions.st_x(o.center::extensions.geometry) as longitude,
       o.first_reported_at, o.restored_at, a.province, a.area_type, a.psgc_code
from public.outages o
join public.areas a on a.id = o.area_id;

grant select on public.outage_map to anon, authenticated;