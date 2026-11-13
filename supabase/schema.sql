-- Holding It: database setup. Paste the whole file into Supabase > SQL Editor and press Run.
-- Safe to run more than once.
--
-- Design: the browser never touches the table. It can only call two functions:
--   log_event(session, type, held_mins)  -> records "holding" or "went"
--   pulse()                              -> live counters + the latest feed lines
-- The table has row level security on and no policies, so direct reads/writes are refused.

-- A schema the Data API does not expose, for the secret salt.
create schema if not exists private;

create table if not exists private.settings (
  id   boolean primary key default true check (id),   -- single row
  salt text not null default gen_random_uuid()::text
);
insert into private.settings default values on conflict do nothing;

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  session    uuid not null,                              -- random id made in the visitor's browser
  type       text not null check (type in ('hold', 'go')),
  held_mins  int check (held_mins between 0 and 180),    -- for 'go': how long they held it
  nth        int,                                        -- for 'go': which trip of the day
  country    text,                                       -- 2-letter code from the CDN header
  ip_hash    text not null,                              -- salted, changes daily; the IP itself is never stored
  created_at timestamptz not null default now()
);
-- Optional nickname the visitor chose (added after launch, so it is a separate statement).
alter table public.events add column if not exists name text;
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_session_idx on public.events (session, created_at desc);
create index if not exists events_ip_idx      on public.events (ip_hash, created_at);

alter table public.events enable row level security;
revoke all on table public.events from anon, authenticated;

-- The nickname parameter was added later; drop the old 3-argument version so calls are not ambiguous.
drop function if exists public.log_event(uuid, text, int);
create or replace function public.log_event(p_session uuid, p_type text, p_held_mins int default 0, p_name text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  h         json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip      text := trim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', h->>'x-forwarded-for', ''), ',', 1));
  v_country text := upper(coalesce(h->>'cf-ipcountry', ''));
  v_hash    text;
  v_nth     int;
  v_id      bigint;
  -- Nickname: no control characters, single spaces, at most 16 characters, empty means none.
  v_name    text := nullif(left(btrim(regexp_replace(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g')), 16), '');
begin
  if p_type not in ('hold', 'go') then
    raise exception 'bad type';
  end if;
  if v_country !~ '^[A-Z]{2}$' or v_country in ('XX', 'T1') then
    v_country := null;
  end if;
  select md5(v_ip || current_date::text || salt) into v_hash from private.settings;

  -- Abuse limits. Per browser: no repeating the same button within 20 seconds. Only the latest
  -- event counts, so a real go -> hold -> go sequence is never refused (a refused 'go' would
  -- leave the visitor counted as holding).
  if exists (select 1 from (select type, created_at from public.events
                            where session = p_session order by id desc limit 1) latest
             where latest.type = p_type and latest.created_at > now() - interval '20 seconds') then
    raise exception 'too fast';
  end if;
  -- Per network address (skipped if the address header is missing, so one bad header cannot lock everyone out).
  if v_ip <> '' then
    if (select count(*) from public.events
        where ip_hash = v_hash and created_at > now() - interval '1 minute') >= 10 then
      raise exception 'too fast';
    end if;
    if (select count(*) from public.events
        where ip_hash = v_hash and created_at > now() - interval '1 day') >= 300 then
      raise exception 'daily limit';
    end if;
  end if;

  if p_type = 'go' then
    select count(*) + 1 into v_nth from public.events
    where session = p_session and type = 'go' and created_at > now() - interval '18 hours';
  end if;

  insert into public.events (session, type, held_mins, nth, country, ip_hash, name)
  values (p_session, p_type,
          case when p_type = 'go' then greatest(0, least(coalesce(p_held_mins, 0), 180)) end,
          v_nth, v_country, v_hash, v_name)
  returning id into v_id;

  -- Housekeeping: now and then, drop rows older than a week.
  if random() < 0.01 then
    delete from public.events where created_at < now() - interval '7 days';
  end if;

  return v_id;
end $$;

create or replace function public.pulse()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    -- "in the bathroom right now": went in the last 10 minutes
    'in_toilet', (select count(distinct session) from public.events
                  where type = 'go' and created_at > now() - interval '10 minutes'),
    -- "holding right now": the browser's latest event in the last 3 hours is a hold
    'holding',   (select count(*) from (
                    select distinct on (session) type from public.events
                    where created_at > now() - interval '3 hours'
                    order by session, created_at desc) latest
                  where type = 'hold'),
    'today',     (select count(*) from public.events
                  where type = 'go' and created_at > now() - interval '24 hours'),
    'feed',      (select coalesce(json_agg(f), '[]'::json) from (
                    select id, type, held_mins, nth, country, name from public.events
                    order by id desc limit 8) f)
  );
$$;

revoke all on function public.log_event(uuid, text, int, text) from public;
revoke all on function public.pulse() from public;
grant execute on function public.log_event(uuid, text, int, text) to anon, authenticated;
grant execute on function public.pulse() to anon, authenticated;
