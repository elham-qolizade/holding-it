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

-- Facts for the "Pee News" window, all from the last 24 hours. Read-only.
create or replace function public.news()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with day as (
    select * from public.events where created_at > now() - interval '24 hours'
  ), who as (   -- each browser's latest name and country
    select session,
           (array_agg(name order by id desc) filter (where name is not null))[1] as name,
           (array_agg(country order by id desc) filter (where country is not null))[1] as country
    from day group by session
  ), latest as (
    select distinct on (session) session, type, created_at from day
    where created_at > now() - interval '3 hours'
    order by session, id desc
  )
  select json_build_object(
    'today',   (select count(*) from day where type = 'go'),
    -- longest hold that ended in a trip
    'record',  (select json_build_object('name', d.name, 'country', d.country, 'mins', d.held_mins)
                from day d where d.type = 'go' and d.held_mins > 0
                order by d.held_mins desc, d.id limit 1),
    -- whoever has been holding the longest right now
    'holding', (select json_build_object('name', w.name, 'country', w.country,
                                         'mins', floor(extract(epoch from now() - l.created_at) / 60)::int)
                from latest l join who w using (session)
                where l.type = 'hold' order by l.created_at limit 1),
    'busiest', (select json_build_object('name', w.name, 'country', w.country, 'n', c.n)
                from (select session, count(*) as n from day where type = 'go'
                      group by session order by count(*) desc, min(id) limit 1) c
                join who w using (session)),
    'country', (select json_build_object('country', country, 'n', count(*))
                from day where type = 'go' and country is not null
                group by country order by count(*) desc, country limit 1)
  );
$$;

revoke all on function public.news() from public;
grant execute on function public.news() to anon, authenticated;

-- Community toilets: places that visitors add from the emergency window. Shown to everyone nearby.
-- Same design as events: the table is closed, the browser can only call the functions below.
-- ponytail: confirmations count sessions, so someone with many browsers can inflate them; moderation is
-- three reports from different browsers hiding a place, and deleting rows by hand in the dashboard.
create table if not exists public.places (
  id          bigint generated always as identity primary key,
  lat         double precision not null check (lat between -90 and 90),
  lon         double precision not null check (lon between -180 and 180),
  fee         text not null default 'unknown' check (fee in ('free', 'paid', 'unknown')),
  note        text,
  country     text,
  by_sessions uuid[] not null,                 -- browsers that added or confirmed it; the first one added it
  reported_by uuid[] not null default '{}',
  hidden      boolean not null default false,  -- three different reports hide a place
  ip_hash     text not null,                   -- salted and changes daily; used only for rate limits
  created_at  timestamptz not null default now()
);
create index if not exists places_pos_idx on public.places (lat, lon);
alter table public.places enable row level security;
revoke all on table public.places from anon, authenticated;

create or replace function public.add_place(p_session uuid, p_lat double precision, p_lon double precision,
                                            p_fee text default 'unknown', p_note text default null)
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
  v_lat     double precision;
  v_lon     double precision;
  v_note    text := nullif(left(btrim(regexp_replace(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g')), 60), '');
  v_near    public.places%rowtype;
  v_id      bigint;
begin
  if p_session is null or p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then
    raise exception 'bad position';
  end if;
  if p_fee not in ('free', 'paid', 'unknown') then
    raise exception 'bad fee';
  end if;
  if v_country !~ '^[A-Z]{2}$' or v_country in ('XX', 'T1') then
    v_country := null;
  end if;
  v_lat := round(p_lat::numeric, 4);   -- about 11 m: enough to find the place, not to pin down a person
  v_lon := round(p_lon::numeric, 4);
  select md5(v_ip || current_date::text || salt) into v_hash from private.settings;

  -- Limits: 5 new places a day per browser, 10 per network address.
  if (select count(*) from public.places where by_sessions[1] = p_session and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily limit';
  end if;
  if v_ip <> '' and (select count(*) from public.places where ip_hash = v_hash and created_at > now() - interval '1 day') >= 10 then
    raise exception 'daily limit';
  end if;

  -- Something is already listed within about 40 m: confirm it instead of adding a duplicate.
  select * into v_near from public.places
  where lat between v_lat - 0.0005 and v_lat + 0.0005
    and lon between v_lon - 0.0005 / greatest(cos(radians(v_lat)), 0.05) and v_lon + 0.0005 / greatest(cos(radians(v_lat)), 0.05)
    and 111320 * sqrt(power(lat - v_lat, 2) + power((lon - v_lon) * cos(radians(v_lat)), 2)) <= 40
  order by id limit 1;
  if found then
    if v_near.hidden then raise exception 'hidden'; end if;
    if p_session = any(v_near.by_sessions) then raise exception 'already'; end if;
    update public.places set by_sessions = by_sessions || p_session,
                             fee = case when fee = 'unknown' then p_fee else fee end,
                             note = coalesce(note, v_note)
    where id = v_near.id;
    return v_near.id;
  end if;

  insert into public.places (lat, lon, fee, note, country, by_sessions, ip_hash)
  values (v_lat, v_lon, p_fee, v_note, v_country, array[p_session], v_hash)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.places_near(p_lat double precision, p_lon double precision, p_radius int default 5000)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x.dist), '[]'::json) from (
    select p.id, p.lat, p.lon, p.fee, p.note, cardinality(p.by_sessions) as confirms, d.dist
    from public.places p
    cross join lateral (select 111320 * sqrt(power(p.lat - p_lat, 2) + power((p.lon - p_lon) * cos(radians(p_lat)), 2)) as dist) d
    where not p.hidden
      and p.lat between p_lat - 0.15 and p_lat + 0.15
      and p.lon between p_lon - 0.3 and p_lon + 0.3
      and d.dist <= least(greatest(coalesce(p_radius, 5000), 100), 15000)
    order by d.dist
    limit 20
  ) x;
$$;

create or replace function public.report_place(p_session uuid, p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.places
  set reported_by = reported_by || p_session,
      hidden = hidden or cardinality(reported_by) + 1 >= 3
  where id = p_id and p_session is not null and not (p_session = any(reported_by));
$$;

revoke all on function public.add_place(uuid, double precision, double precision, text, text) from public;
revoke all on function public.places_near(double precision, double precision, int) from public;
revoke all on function public.report_place(uuid, bigint) from public;
grant execute on function public.add_place(uuid, double precision, double precision, text, text) to anon, authenticated;
grant execute on function public.places_near(double precision, double precision, int) to anon, authenticated;
grant execute on function public.report_place(uuid, bigint) to anon, authenticated;
