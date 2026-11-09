create table public.admin_account_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_label text check (actor_label is null or char_length(actor_label) <= 100),
  target_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('invite', 'promote', 'demote', 'bootstrap')),
  created_at timestamptz not null default now(),
  check ((actor_id is not null) <> (actor_label is not null))
);

alter table public.admin_account_audit enable row level security;

create policy "Admins inspect account audit" on public.admin_account_audit
for select to authenticated using ((select public.is_admin()));

revoke all on public.admin_account_audit from public, anon, authenticated;
grant select on public.admin_account_audit to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists (
      select 1
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = (select auth.uid())
        and p.role = 'admin'
        and u.email_confirmed_at is not null
    );
$$;

create or replace function public.admin_set_account_role(
  p_target_id uuid,
  p_role public.app_role
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_current_role public.app_role;
  v_confirmed_at timestamptz;
  v_admin_count integer;
begin
  if v_actor_id is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'A verified administrator session with MFA is required.';
  end if;
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  perform pg_advisory_xact_lock(77123, 1);
  select p.role, u.email_confirmed_at
    into v_current_role, v_confirmed_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_target_id
  for update of p;

  if not found then
    raise exception 'Account not found.';
  end if;
  if v_confirmed_at is null then
    raise exception 'The account email must be confirmed before changing its role.';
  end if;
  if p_role = v_current_role then
    return 'unchanged';
  end if;

  if p_role = 'user' and v_current_role = 'admin' then
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'The last administrator cannot be demoted.';
    end if;
  end if;

  update public.profiles set role = p_role, updated_at = now()
  where id = p_target_id;

  insert into public.admin_account_audit (actor_id, target_id, action)
  values (v_actor_id, p_target_id, case when p_role = 'admin' then 'promote' else 'demote' end);

  return 'updated';
end;
$$;

revoke all on function public.admin_set_account_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_account_role(uuid, public.app_role) to authenticated;

create or replace function public.admin_record_account_invitation(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'A verified administrator session with MFA is required.';
  end if;
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;
  if not exists (select 1 from public.profiles where id = p_target_id) then
    raise exception 'Invited account profile was not created.';
  end if;

  insert into public.admin_account_audit (actor_id, target_id, action)
  values (v_actor_id, p_target_id, 'invite');
end;
$$;

revoke all on function public.admin_record_account_invitation(uuid) from public, anon;
grant execute on function public.admin_record_account_invitation(uuid) to authenticated;

create or replace function public.bootstrap_first_admin(
  p_target_id uuid,
  p_actor_label text
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_admin_count integer;
  v_target_role public.app_role;
  v_confirmed_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'This function is only available to the server-side bootstrap utility.';
  end if;
  if p_actor_label is null or char_length(btrim(p_actor_label)) not between 1 and 100 then
    raise exception 'A bootstrap operator label of 1 to 100 characters is required.';
  end if;

  perform pg_advisory_xact_lock(77123, 1);
  select p.role, u.email_confirmed_at
    into v_target_role, v_confirmed_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_target_id
  for update of p;
  if not found then
    raise exception 'Target profile does not exist.';
  end if;
  if v_confirmed_at is null then
    raise exception 'Target account email is not confirmed.';
  end if;

  select count(*) into v_admin_count from public.profiles where role = 'admin';
  if exists (
    select 1 from public.admin_account_audit
    where action = 'bootstrap' and target_id = p_target_id
  ) then
    if v_target_role = 'admin' then
      return 'already_bootstrapped';
    end if;
    raise exception 'Bootstrap already ran for this account; use normal administrator management for later role changes.';
  end if;
  if v_admin_count > 0 then
    raise exception 'An administrator already exists; bootstrap is first-admin only.';
  end if;

  update public.profiles set role = 'admin', updated_at = now()
  where id = p_target_id;
  insert into public.admin_account_audit (actor_label, target_id, action)
  values (btrim(p_actor_label), p_target_id, 'bootstrap');

  return 'bootstrapped';
end;
$$;

revoke all on function public.bootstrap_first_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid, text) to service_role;
