-- SAYODA | CYBER FORCE
-- Login + profile storage fix

-- Make sure the login fields exist.
alter table public.users add column if not exists username text;
alter table public.users add column if not exists password text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists active boolean default true;
alter table public.users add column if not exists views jsonb default '{}'::jsonb;
alter table public.users add column if not exists ratings jsonb default '{}'::jsonb;
alter table public.users add column if not exists video_progress jsonb default '{}'::jsonb;

-- One username = one account.
create unique index if not exists users_username_unique_idx
on public.users (username);

-- Required for the frontend publishable key.
alter table public.users enable row level security;
drop policy if exists sayoda_users_login_select on public.users;
create policy sayoda_users_login_select
on public.users
for select
to anon, authenticated
using (true);

-- Keep profile fields writable for the current client-side app.
drop policy if exists sayoda_users_profile_update on public.users;
create policy sayoda_users_profile_update
on public.users
for update
to anon, authenticated
using (true)
with check (true);

select username, role, active from public.users order by created_at desc nulls last;
