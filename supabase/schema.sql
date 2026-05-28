-- Collaborative Study Room Platform database schema
-- Run this in the Supabase SQL Editor before using signup/login flows.

create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  is_public boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  started_by uuid references profiles(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int
);

create table if not exists session_participants (
  session_id uuid references study_sessions(id) on delete cascade,
  user_id uuid references profiles(id),
  primary key (session_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
