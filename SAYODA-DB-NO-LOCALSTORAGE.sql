create extension if not exists pgcrypto;

alter table public.users add column if not exists views jsonb default '{}'::jsonb;
alter table public.users add column if not exists ratings jsonb default '{}'::jsonb;
alter table public.users add column if not exists video_progress jsonb default '{}'::jsonb;

alter table public.videos add column if not exists youtube_id text;

update public.videos
set youtube_id = coalesce(youtube_id,
  case
    when youtube_url ~* 'youtu\\.be/' then substring(youtube_url from 'youtu\\.be/([^?&/]+)')
    when youtube_url ~* '[?&]v=' then substring(youtube_url from '[?&]v=([^&]+)')
    when youtube_url ~* '/shorts/' then substring(youtube_url from '/shorts/([^?&/]+)')
    when youtube_url ~* '/embed/' then substring(youtube_url from '/embed/([^?&/]+)')
    else trim(youtube_url)
  end
)
where coalesce(youtube_url,'') <> '';

create table if not exists public.notification_reads (
 notification_id uuid not null references public.notifications(id) on delete cascade,
 username text not null,
 read_at timestamptz default now(),
 primary key(notification_id,username)
);

alter table public.notification_reads enable row level security;
drop policy if exists sayoda_notification_reads_select on public.notification_reads;
drop policy if exists sayoda_notification_reads_insert on public.notification_reads;
create policy sayoda_notification_reads_select on public.notification_reads for select to anon,authenticated using(true);
create policy sayoda_notification_reads_insert on public.notification_reads for insert to anon,authenticated with check(true);

create or replace function public.admin_add_video(
 p_username text,p_password text,p_title text,p_description text,
 p_youtube_url text,p_category text,p_thumbnail text
) returns uuid language plpgsql security definer set search_path=public as $$
declare x uuid; vid text;
begin
 if not exists(select 1 from public.users where username=p_username and password=p_password and role='admin' and coalesce(active,true)=true) then raise exception 'admin only'; end if;
 vid := case
   when p_youtube_url ~* 'youtu\\.be/' then substring(p_youtube_url from 'youtu\\.be/([^?&/]+)')
   when p_youtube_url ~* '[?&]v=' then substring(p_youtube_url from '[?&]v=([^&]+)')
   when p_youtube_url ~* '/shorts/' then substring(p_youtube_url from '/shorts/([^?&/]+)')
   when p_youtube_url ~* '/embed/' then substring(p_youtube_url from '/embed/([^?&/]+)')
   else trim(p_youtube_url)
 end;
 insert into public.videos(title,description,youtube_url,youtube_id,category,thumbnail,published,locked,sort_order,created_by)
 values(trim(p_title),coalesce(p_description,''),trim(p_youtube_url),vid,coalesce(nullif(trim(p_category),''),'Cybersecurity'),coalesce(nullif(trim(p_thumbnail),''),'sayed.png'),true,true,extract(epoch from clock_timestamp())::bigint,p_username)
 returning id into x;
 return x;
end$$;

grant execute on function public.admin_add_video(text,text,text,text,text,text,text) to anon,authenticated;
