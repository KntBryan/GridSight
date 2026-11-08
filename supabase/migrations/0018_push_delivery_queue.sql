alter table public.notifications
  add column if not exists push_attempts integer not null default 0,
  add column if not exists push_processing_at timestamptz,
  add column if not exists push_next_attempt_at timestamptz,
  add column if not exists push_last_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_push_attempts_nonnegative'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_push_attempts_nonnegative
      check (push_attempts >= 0);
  end if;
end;
$$;

create index if not exists notifications_push_queue_idx
  on public.notifications (created_at)
  where delivered_at is null and push_attempts < 5;

create or replace function public.claim_push_notifications(p_limit integer default 100)
returns table (id uuid, user_id uuid, message text, kind public.notification_kind)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  return query
  with candidates as (
    select n.id
    from public.notifications n
    where n.delivered_at is null
      and n.push_attempts < 5
      and (n.push_next_attempt_at is null or n.push_next_attempt_at <= now())
      and (n.push_processing_at is null or n.push_processing_at < now() - interval '5 minutes')
    order by n.created_at
    limit greatest(1, least(coalesce(p_limit, 100), 100))
    for update skip locked
  )
  update public.notifications n
  set push_processing_at = now(),
      push_attempts = n.push_attempts + 1
  from candidates
  where n.id = candidates.id
  returning n.id, n.user_id, n.message, n.kind;
end;
$$;

create or replace function public.finish_push_notification(
  p_notification_id uuid,
  p_delivered boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  update public.notifications n
  set delivered_at = case when p_delivered then now() else n.delivered_at end,
      push_processing_at = null,
      push_next_attempt_at = case
        when p_delivered or n.push_attempts >= 5 then null
        else now() + make_interval(secs => least(
          3600,
          (60 * power(2, least(greatest(n.push_attempts - 1, 0), 6)))::integer
        ))
      end,
      push_last_error = case when p_delivered then null else left(coalesce(p_error, 'Push delivery failed.'), 500) end
  where n.id = p_notification_id
    and n.push_processing_at is not null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Notification was not claimed for delivery.';
  end if;
end;
$$;

revoke all on function public.claim_push_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;
revoke all on function public.finish_push_notification(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_push_notification(uuid, boolean, text) to service_role;
