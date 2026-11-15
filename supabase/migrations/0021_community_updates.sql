create table if not exists public.community_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) >= 3),
  message text not null check (char_length(trim(message)) >= 3),
  category text not null default 'investigation' check (category in ('investigation', 'restoration_work', 'power_restored', 'scheduled_maintenance', 'advisory', 'outage_reported')),
  audience text not null default 'All communities',
  outage_id uuid references public.outages(id) on delete set null,
  estimated_time text,
  next_update_time text,
  state text not null default 'published' check (state in ('published', 'withdrawn')),
  correction_note text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  author_role text default 'City Staff',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index if not exists community_updates_published_idx on public.community_updates (published_at desc);
create index if not exists community_updates_state_idx on public.community_updates (state, audience);

alter table public.community_updates enable row level security;

-- Drop previous policies if re-run
drop policy if exists "Anyone can read published updates" on public.community_updates;
drop policy if exists "Admins can insert updates" on public.community_updates;
drop policy if exists "Admins can update updates" on public.community_updates;

-- Anyone (including guests) can read published updates; admins can also read withdrawn ones
create policy "Anyone can read published updates"
on public.community_updates
for select
using (state = 'published' or (select public.is_admin()));

-- Only admins can insert updates
create policy "Admins can insert updates"
on public.community_updates
for insert
to authenticated
with check ((select public.is_admin()));

-- Only admins can update (withdraw) updates
create policy "Admins can update updates"
on public.community_updates
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select on public.community_updates to anon, authenticated;
grant insert, update on public.community_updates to authenticated;
