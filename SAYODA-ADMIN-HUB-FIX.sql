-- SAYODA | CYBER FORCE - COMPLETE ADMIN + USER NOTIFICATIONS
create extension if not exists pgcrypto;

create table if not exists public.users (
 id uuid primary key default gen_random_uuid(),
 username text unique not null,
 password text not null,
 role text default 'user',
 active boolean default true,
 created_at timestamptz default now()
);
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists active boolean default true;
alter table public.users add column if not exists created_at timestamptz default now();

create table if not exists public.videos (
 id uuid primary key default gen_random_uuid(), title text not null,
 description text default '', youtube_url text,
 category text default 'Cybersecurity', thumbnail text default 'sayed.png',
 published boolean default true, locked boolean default true,
 sort_order bigint default 0, created_by text, created_at timestamptz default now()
);
alter table public.videos add column if not exists description text default '';
alter table public.videos add column if not exists youtube_url text;
alter table public.videos add column if not exists category text default 'Cybersecurity';
alter table public.videos add column if not exists thumbnail text default 'sayed.png';
alter table public.videos add column if not exists published boolean default true;
alter table public.videos add column if not exists locked boolean default true;
alter table public.videos add column if not exists sort_order bigint default 0;
alter table public.videos add column if not exists created_by text;
alter table public.videos add column if not exists created_at timestamptz default now();

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), title text not null,
 body text not null, target text default 'all', created_by text not null,
 created_at timestamptz default now()
);
alter table public.notifications add column if not exists target text default 'all';
alter table public.notifications add column if not exists created_by text;
alter table public.notifications add column if not exists created_at timestamptz default now();

create table if not exists public.notification_reads (
 notification_id uuid not null references public.notifications(id) on delete cascade,
 username text not null,
 read_at timestamptz default now(),
 primary key(notification_id, username)
);

alter table public.videos enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists sayoda_public_videos on public.videos;
create policy sayoda_public_videos on public.videos for select to anon, authenticated
using(coalesce(published,true)=true);

drop policy if exists sayoda_public_notifications on public.notifications;
create policy sayoda_public_notifications on public.notifications for select to anon, authenticated
using(coalesce(target,'all')='all');

drop policy if exists public_read_notification_reads on public.notification_reads;
create policy public_read_notification_reads on public.notification_reads for select to anon, authenticated using(true);

drop policy if exists public_insert_notification_reads on public.notification_reads;
create policy public_insert_notification_reads on public.notification_reads for insert to anon, authenticated with check(true);

create or replace function public.admin_add_video(
 p_username text,p_password text,p_title text,p_description text,
 p_youtube_url text,p_category text,p_thumbnail text
) returns uuid language plpgsql security definer set search_path=public as $$
declare x uuid;
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 insert into public.videos(title,description,youtube_url,category,thumbnail,published,locked,sort_order,created_by)
 values(trim(p_title),coalesce(p_description,''),trim(p_youtube_url),coalesce(nullif(trim(p_category),''),'Cybersecurity'),coalesce(nullif(trim(p_thumbnail),''),'sayed.png'),true,true,extract(epoch from clock_timestamp())::bigint,p_username)
 returning id into x;
 return x;
end$$;

create or replace function public.admin_delete_video(p_username text,p_password text,p_video_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 delete from public.videos where id=p_video_id;
 return true;
end$$;

create or replace function public.admin_send_notification(
 p_username text,p_password text,p_title text,p_body text,p_target text default 'all'
) returns uuid language plpgsql security definer set search_path=public as $$
declare x uuid;
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 insert into public.notifications(title,body,target,created_by)
 values(trim(p_title),trim(p_body),coalesce(nullif(trim(p_target),''),'all'),p_username)
 returning id into x;
 return x;
end$$;

create or replace function public.admin_set_video_status(p_username text,p_password text,p_video_id uuid,p_published boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 update public.videos set published=p_published where id=p_video_id;
 return true;
end$$;

create or replace function public.admin_set_user_status(p_username text,p_password text,p_user_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 update public.users set active=p_active where id=p_user_id;
 return true;
end$$;

create or replace function public.admin_delete_user(p_username text,p_password text,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 if exists(select 1 from public.users where id=p_user_id and username=p_username) then raise exception 'cannot delete yourself'; end if;
 delete from public.users where id=p_user_id;
 return true;
end$$;

grant execute on function public.admin_add_video(text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.admin_delete_video(text,text,uuid) to anon,authenticated;
grant execute on function public.admin_send_notification(text,text,text,text,text) to anon,authenticated;
grant execute on function public.admin_set_video_status(text,text,uuid,boolean) to anon,authenticated;
grant execute on function public.admin_set_user_status(text,text,uuid,boolean) to anon,authenticated;
grant execute on function public.admin_delete_user(text,text,uuid) to anon,authenticated;

select 'SAYODA BACKEND READY - NOTIFICATIONS ENABLED' as status;
