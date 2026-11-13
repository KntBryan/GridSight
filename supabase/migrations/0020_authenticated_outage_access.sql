drop policy if exists "Outages are visible to everyone" on public.outages;
create policy "Outages are visible to signed-in users" on public.outages
for select to authenticated using (true);

revoke all on table public.outages from anon;
grant select on table public.outages to authenticated;

alter view public.outage_map set (security_invoker = true);
revoke all on table public.outage_map from anon;
grant select on table public.outage_map to authenticated;
