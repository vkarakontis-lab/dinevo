-- ============================================================================
-- 0001_init.sql — restaurant discovery + instant booking platform
-- Cyprus first, multi-country by design. Apply with `supabase db push` or the
-- SQL editor. Idempotent enough to re-run on a fresh project; on an existing
-- project write a new numbered migration instead of editing this one.
-- Weekday convention everywhere: ISO 1 = Monday … 7 = Sunday.
-- ============================================================================

create extension if not exists btree_gist;   -- needed for the no-double-booking constraint
create extension if not exists pg_trgm;      -- fuzzy restaurant-name search

-- ---------------------------------------------------------------- enums ----
do $$ begin
  create type restaurant_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_mode as enum ('instant', 'request', 'phone_only');
exception when duplicate_object then null; end $$;

do $$ begin
  -- pending is only used by booking_mode = 'request'; instant bookings are born confirmed
  create type booking_status as enum ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_source as enum ('web', 'dashboard', 'phone', 'walk_in');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ geography ----
-- One row per launch country. Everything locale/currency/timezone-specific
-- hangs off this table so adding a country is data, not code.
create table if not exists countries (
  code           char(2) primary key,                 -- ISO 3166-1 alpha-2
  slug           text not null unique,                -- 'cyprus'
  name           jsonb not null,                      -- {"en":"Cyprus","el":"Κύπρος"}
  currency       char(3) not null default 'EUR',
  timezone       text not null,                       -- IANA, e.g. 'Asia/Nicosia'
  phone_code     text not null,                       -- '+357'
  locales        text[] not null default '{en,el}',
  default_locale text not null default 'en',
  bbox           jsonb,                               -- {"minLat","maxLat","minLng","maxLng"} for validation
  is_active      boolean not null default true
);

create table if not exists regions (
  id           uuid primary key default gen_random_uuid(),
  country_code char(2) not null references countries(code),
  slug         text not null,
  name         jsonb not null,
  sort_order   int not null default 0,
  unique (country_code, slug)
);

create table if not exists areas (
  id         uuid primary key default gen_random_uuid(),
  region_id  uuid not null references regions(id) on delete cascade,
  slug       text not null,
  name       jsonb not null,
  lat        double precision,
  lng        double precision,
  sort_order int not null default 0,
  unique (region_id, slug)
);

create table if not exists cuisines (
  slug       text primary key,
  name       jsonb not null,
  sort_order int not null default 0
);

create table if not exists features (
  slug text primary key,
  name jsonb not null,
  icon text                                            -- lucide icon name, optional
);

-- ------------------------------------------------------------ restaurants --
create table if not exists restaurants (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  country_code          char(2) not null references countries(code),
  region_id             uuid not null references regions(id),
  area_id               uuid references areas(id),
  status                restaurant_status not null default 'draft',
  booking_mode          booking_mode not null default 'instant',
  price_band            smallint not null check (price_band between 1 and 4),
  phone                 text,
  whatsapp              text,
  email                 text,
  website               text,
  instagram             text,
  menu_url              text,
  google_maps_url       text,
  address_line          text,
  postcode              text,
  lat                   double precision not null,
  lng                   double precision not null,
  timezone              text not null default 'Asia/Nicosia',
  min_party             smallint not null default 1,
  max_party             smallint not null default 8,
  lead_time_minutes     int not null default 60,       -- minimum notice for an online booking
  max_advance_days      int not null default 60,
  turn_minutes          int not null default 90,       -- default table occupancy per booking
  slot_interval_minutes int not null default 30,
  features              text[] not null default '{}',
  is_featured           boolean not null default false,
  tables_are_placeholder boolean not null default false, -- true until the owner confirms real table inventory
  owner_notes           text,                          -- internal, never rendered publicly
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (min_party >= 1 and max_party >= min_party),
  check (turn_minutes between 15 and 600),
  check (slot_interval_minutes in (15, 30, 60))
);
create index if not exists restaurants_region_idx on restaurants (region_id) where status = 'published';
create index if not exists restaurants_area_idx   on restaurants (area_id)   where status = 'published';
create index if not exists restaurants_features_idx on restaurants using gin (features);

create table if not exists restaurant_translations (
  restaurant_id         uuid not null references restaurants(id) on delete cascade,
  locale                text not null,
  name                  text not null,
  tagline               text,
  description           text,
  is_machine_translated boolean not null default false, -- surfaced in the dashboard as "please review"
  primary key (restaurant_id, locale)
);
create index if not exists restaurant_translations_name_trgm on restaurant_translations using gin (name gin_trgm_ops);

create table if not exists restaurant_cuisines (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  cuisine_slug  text not null references cuisines(slug),
  is_primary    boolean not null default false,
  primary key (restaurant_id, cuisine_slug)
);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  storage_path  text not null,      -- base path without size suffix: '<restaurant_id>/<slug>-01'
  width         int,
  height        int,
  blur_data_url text,               -- tiny base64 placeholder for next/image
  alt           jsonb,              -- {"en":"…","el":"…"}
  sort_order    int not null default 0,
  is_cover      boolean not null default false,
  unique (restaurant_id, storage_path)
);
create index if not exists photos_restaurant_idx on photos (restaurant_id, sort_order);

-- Display hours ("open now", the hours block). Not used for availability.
create table if not exists opening_hours (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7),
  opens         time not null,
  closes        time not null      -- closes <= opens means "closes after midnight"
);
create index if not exists opening_hours_restaurant_idx on opening_hours (restaurant_id, weekday);

-- Bookable windows. Slots are generated from first_seating to last_seating
-- every slot_interval. A restaurant usually has 1–2 (lunch, dinner).
create table if not exists service_periods (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references restaurants(id) on delete cascade,
  name                  jsonb not null,                -- {"en":"Dinner","el":"Δείπνο"}
  weekdays              smallint[] not null,           -- ISO 1..7
  first_seating         time not null,
  last_seating          time not null,
  slot_interval_minutes int,                           -- override restaurant default
  turn_minutes          int,                           -- override restaurant default
  max_covers_per_slot   int,                           -- pacing; null = unlimited
  is_active             boolean not null default true,
  check (last_seating >= first_seating)
);
create index if not exists service_periods_restaurant_idx on service_periods (restaurant_id);

-- Table inventory. A booking occupies exactly one table for turn_minutes.
create table if not exists dining_tables (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  label              text not null,
  min_party          smallint not null default 1,
  max_party          smallint not null,
  is_online_bookable boolean not null default true,
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  check (max_party >= min_party and min_party >= 1)
);
create index if not exists dining_tables_restaurant_idx on dining_tables (restaurant_id);

-- Holidays, private events, renovation. Blocks online availability for the window.
create table if not exists closures (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  reason        text,
  check (ends_at > starts_at)
);
create index if not exists closures_restaurant_idx on closures (restaurant_id, starts_at);

-- ---------------------------------------------------------------- bookings --
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id),
  table_id          uuid references dining_tables(id),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  party_size        smallint not null check (party_size > 0),
  status            booking_status not null default 'confirmed',
  source            booking_source not null default 'web',
  guest_name        text not null,
  guest_email       text,
  guest_phone       text,
  guest_locale      text not null default 'en',
  special_requests  text,
  confirmation_code text not null unique,              -- short human code shown to the guest
  manage_token      uuid not null unique default gen_random_uuid(), -- secret link to view/cancel
  confirmed_at      timestamptz,
  cancelled_at      timestamptz,
  cancelled_by      text,                              -- 'guest' | 'restaurant' | 'admin'
  reminder_sent_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at),
  -- THE invariant. Two live bookings can never overlap on the same table,
  -- whatever the application code does. Cancelled/no-show rows free the table.
  constraint bookings_no_double_booking exclude using gist (
    table_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (table_id is not null and status in ('pending', 'confirmed', 'seated'))
);
create index if not exists bookings_restaurant_time_idx on bookings (restaurant_id, starts_at);
create index if not exists bookings_table_time_idx on bookings (table_id, starts_at);

-- --------------------------------------------------------------- people ----
create table if not exists restaurant_members (
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  role          member_role not null default 'staff',
  primary key (user_id, restaurant_id)
);

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ------------------------------------------------------------- triggers ----
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists restaurants_set_updated_at on restaurants;
create trigger restaurants_set_updated_at before update on restaurants
  for each row execute function set_updated_at();

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at before update on bookings
  for each row execute function set_updated_at();

-- -------------------------------------------------------- auth helpers -----
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function is_restaurant_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restaurant_members where user_id = auth.uid() and restaurant_id = rid)
      or exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------- confirmation code ----
-- 6 chars, no 0/O/1/I ambiguity, prefixed with country code: 'CY-7K3Q9M'.
create or replace function generate_confirmation_code(p_country char(2)) returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := p_country || '-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from bookings where confirmation_code = code);
  end loop;
  return code;
end $$;

-- ---------------------------------------------------------- availability ---
-- Returns every slot of the day for a party size, with an availability flag,
-- so the UI can render greyed-out slots instead of a bare "nothing available".
-- Slots respect: service periods, lead time, max advance, closures, table fit,
-- existing live bookings and optional pacing.
create or replace function get_availability(
  p_restaurant_id uuid,
  p_date          date,
  p_party_size    int
) returns table (
  slot              timestamptz,
  slot_local        time,
  service_period_id uuid,
  service_name      jsonb,
  available         boolean,
  reason            text          -- null when available; otherwise a short machine-readable reason
)
language plpgsql stable security definer set search_path = public as $$
declare
  r          restaurants%rowtype;
  sp         service_periods%rowtype;
  v_interval int;
  v_turn     int;
  v_local    timestamp;
  v_end      timestamptz;
  v_today    date;
  v_reason   text;
begin
  select * into r from restaurants where id = p_restaurant_id and status = 'published';
  if not found or r.booking_mode <> 'instant' then return; end if;

  v_today := (now() at time zone r.timezone)::date;

  for sp in
    select * from service_periods s
    where s.restaurant_id = r.id and s.is_active
      and extract(isodow from p_date)::int = any (s.weekdays)
    order by s.first_seating
  loop
    v_interval := coalesce(sp.slot_interval_minutes, r.slot_interval_minutes);
    v_turn     := coalesce(sp.turn_minutes, r.turn_minutes);
    v_local    := p_date + sp.first_seating;

    while v_local::time <= sp.last_seating loop
      slot              := v_local at time zone r.timezone;
      slot_local        := v_local::time;
      service_period_id := sp.id;
      service_name      := sp.name;
      v_end             := slot + make_interval(mins => v_turn);
      v_reason          := null;

      if p_party_size < r.min_party or p_party_size > r.max_party then
        v_reason := 'party_size';
      elsif slot < now() + make_interval(mins => r.lead_time_minutes) then
        v_reason := 'too_soon';
      elsif p_date > v_today + r.max_advance_days then
        v_reason := 'too_far_ahead';
      elsif exists (
        select 1 from closures c
        where c.restaurant_id = r.id
          and tstzrange(c.starts_at, c.ends_at) && tstzrange(slot, v_end)
      ) then
        v_reason := 'closed';
      elsif sp.max_covers_per_slot is not null and (
        select coalesce(sum(b.party_size), 0) from bookings b
        where b.restaurant_id = r.id and b.starts_at = slot
          and b.status in ('pending', 'confirmed', 'seated')
      ) + p_party_size > sp.max_covers_per_slot then
        v_reason := 'slot_full';
      elsif not exists (
        select 1 from dining_tables t
        where t.restaurant_id = r.id and t.is_active and t.is_online_bookable
          and p_party_size between t.min_party and t.max_party
          and not exists (
            select 1 from bookings b
            where b.table_id = t.id
              and b.status in ('pending', 'confirmed', 'seated')
              and tstzrange(b.starts_at, b.ends_at) && tstzrange(slot, v_end)
          )
      ) then
        v_reason := 'no_table';
      end if;

      available := v_reason is null;
      reason    := v_reason;
      return next;

      v_local := v_local + make_interval(mins => v_interval);
    end loop;
  end loop;
end $$;

-- ------------------------------------------------------------- booking -----
-- The ONLY way a booking is created. Serialises per restaurant with an
-- advisory lock, re-checks every rule inside the transaction, picks the
-- smallest free table, and lets the exclusion constraint be the backstop.
-- Raises with a stable message the app can map to a translated error:
--   restaurant_not_bookable | party_size_out_of_range | too_soon | too_far_ahead
--   outside_service_hours | closed | slot_full | no_availability | not_allowed
create or replace function create_booking(
  p_restaurant_id    uuid,
  p_starts_at        timestamptz,
  p_party_size       int,
  p_guest_name       text,
  p_guest_email      text default null,
  p_guest_phone      text default null,
  p_locale           text default 'en',
  p_special_requests text default null,
  p_source           booking_source default 'web',
  p_bypass_rules     boolean default false   -- members only: phone bookings past the lead time etc.
) returns table (
  id                uuid,
  confirmation_code text,
  manage_token      uuid,
  starts_at         timestamptz,
  ends_at           timestamptz,
  party_size        int,
  status            booking_status,
  table_label       text
)
language plpgsql volatile security definer set search_path = public as $$
declare
  r        restaurants%rowtype;
  sp       service_periods%rowtype;
  v_local  timestamp;
  v_date   date;
  v_turn   int;
  v_end    timestamptz;
  v_table  uuid;
  v_id     uuid;
  v_member boolean;
begin
  v_member := is_restaurant_member(p_restaurant_id);
  if (p_source <> 'web' or p_bypass_rules) and not v_member then
    raise exception 'not_allowed';
  end if;

  select * into r from restaurants where restaurants.id = p_restaurant_id;
  if not found or (r.status <> 'published' and not v_member) then
    raise exception 'restaurant_not_bookable';
  end if;
  if r.booking_mode <> 'instant' and not p_bypass_rules then
    raise exception 'restaurant_not_bookable';
  end if;
  if not p_bypass_rules and (p_party_size < r.min_party or p_party_size > r.max_party) then
    raise exception 'party_size_out_of_range';
  end if;
  if coalesce(btrim(p_guest_name), '') = '' then
    raise exception 'guest_name_required';
  end if;

  v_local := p_starts_at at time zone r.timezone;
  v_date  := v_local::date;

  if not p_bypass_rules then
    if p_starts_at < now() + make_interval(mins => r.lead_time_minutes) then
      raise exception 'too_soon';
    end if;
    if v_date > (now() at time zone r.timezone)::date + r.max_advance_days then
      raise exception 'too_far_ahead';
    end if;
  end if;

  -- Find the service period this slot belongs to, and check slot alignment.
  select * into sp from service_periods s
  where s.restaurant_id = r.id and s.is_active
    and extract(isodow from v_date)::int = any (s.weekdays)
    and v_local::time between s.first_seating and s.last_seating
    and mod(
      (extract(epoch from (v_local::time - s.first_seating)) / 60)::int,
      coalesce(s.slot_interval_minutes, r.slot_interval_minutes)
    ) = 0
  order by s.first_seating
  limit 1;

  if not found then
    if p_bypass_rules then
      v_turn := r.turn_minutes;          -- dashboard can book odd times; use the default turn
    else
      raise exception 'outside_service_hours';
    end if;
  else
    v_turn := coalesce(sp.turn_minutes, r.turn_minutes);
  end if;

  v_end := p_starts_at + make_interval(mins => v_turn);

  if not p_bypass_rules and exists (
    select 1 from closures c
    where c.restaurant_id = r.id
      and tstzrange(c.starts_at, c.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'closed';
  end if;

  -- Serialise concurrent attempts on this restaurant for the rest of the transaction.
  perform pg_advisory_xact_lock(hashtext(r.id::text));

  if sp.id is not null and sp.max_covers_per_slot is not null and (
    select coalesce(sum(b.party_size), 0) from bookings b
    where b.restaurant_id = r.id and b.starts_at = p_starts_at
      and b.status in ('pending', 'confirmed', 'seated')
  ) + p_party_size > sp.max_covers_per_slot then
    raise exception 'slot_full';
  end if;

  select t.id into v_table
  from dining_tables t
  where t.restaurant_id = r.id and t.is_active
    and (t.is_online_bookable or p_bypass_rules)
    and p_party_size between t.min_party and t.max_party
    and not exists (
      select 1 from bookings b
      where b.table_id = t.id
        and b.status in ('pending', 'confirmed', 'seated')
        and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
    )
  order by t.max_party asc, t.sort_order asc
  limit 1;

  if v_table is null then
    raise exception 'no_availability';
  end if;

  begin
    insert into bookings (
      restaurant_id, table_id, starts_at, ends_at, party_size, status, source,
      guest_name, guest_email, guest_phone, guest_locale, special_requests,
      confirmation_code, confirmed_at
    ) values (
      r.id, v_table, p_starts_at, v_end, p_party_size,
      case when r.booking_mode = 'request' then 'pending'::booking_status else 'confirmed'::booking_status end,
      p_source,
      btrim(p_guest_name), nullif(btrim(p_guest_email), ''), nullif(btrim(p_guest_phone), ''),
      coalesce(p_locale, 'en'), nullif(btrim(p_special_requests), ''),
      generate_confirmation_code(r.country_code),
      case when r.booking_mode = 'request' then null else now() end
    ) returning bookings.id into v_id;
  exception when exclusion_violation then
    raise exception 'no_availability';
  end;

  return query
    select b.id, b.confirmation_code, b.manage_token, b.starts_at, b.ends_at,
           b.party_size::int, b.status, t.label
    from bookings b join dining_tables t on t.id = b.table_id
    where b.id = v_id;
end $$;

-- ------------------------------------------------- guest self-service ------
-- Guests never get row access to bookings; they hold a manage_token instead.
create or replace function get_booking_by_token(p_token uuid)
returns table (
  id uuid, confirmation_code text, starts_at timestamptz, ends_at timestamptz,
  party_size int, status booking_status, guest_name text, special_requests text,
  restaurant_id uuid, restaurant_slug text, restaurant_timezone text,
  restaurant_phone text, restaurant_address text, restaurant_lat double precision, restaurant_lng double precision
)
language sql stable security definer set search_path = public as $$
  select b.id, b.confirmation_code, b.starts_at, b.ends_at, b.party_size::int, b.status,
         b.guest_name, b.special_requests,
         r.id, r.slug, r.timezone, r.phone, r.address_line, r.lat, r.lng
  from bookings b join restaurants r on r.id = b.restaurant_id
  where b.manage_token = p_token;
$$;

create or replace function cancel_booking_by_token(p_token uuid)
returns booking_status
language plpgsql volatile security definer set search_path = public as $$
declare v_status booking_status;
begin
  update bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'guest'
   where manage_token = p_token
     and status in ('pending', 'confirmed')
     and starts_at > now()
  returning status into v_status;
  if v_status is null then raise exception 'cannot_cancel'; end if;
  return v_status;
end $$;

-- ------------------------------------------------------------ grants -------
revoke all on function create_booking(uuid, timestamptz, int, text, text, text, text, text, booking_source, boolean) from public;
grant execute on function get_availability(uuid, date, int) to anon, authenticated;
grant execute on function create_booking(uuid, timestamptz, int, text, text, text, text, text, booking_source, boolean) to anon, authenticated;
grant execute on function get_booking_by_token(uuid) to anon, authenticated;
grant execute on function cancel_booking_by_token(uuid) to anon, authenticated;
grant execute on function is_platform_admin() to anon, authenticated;
grant execute on function is_restaurant_member(uuid) to anon, authenticated;

-- --------------------------------------------------------------- RLS -------
alter table countries               enable row level security;
alter table regions                 enable row level security;
alter table areas                   enable row level security;
alter table cuisines                enable row level security;
alter table features                enable row level security;
alter table restaurants             enable row level security;
alter table restaurant_translations enable row level security;
alter table restaurant_cuisines     enable row level security;
alter table photos                  enable row level security;
alter table opening_hours           enable row level security;
alter table service_periods         enable row level security;
alter table dining_tables           enable row level security;
alter table closures                enable row level security;
alter table bookings                enable row level security;
alter table restaurant_members      enable row level security;
alter table platform_admins         enable row level security;

-- Reference data: readable by everyone, writable by admins (the seed script uses the service role).
do $$ declare t text; begin
  foreach t in array array['countries', 'regions', 'areas', 'cuisines', 'features'] loop
    execute format('drop policy if exists %I on %I', t || '_public_read', t);
    execute format('create policy %I on %I for select using (true)', t || '_public_read', t);
    execute format('drop policy if exists %I on %I', t || '_admin_write', t);
    execute format('create policy %I on %I for all using (is_platform_admin()) with check (is_platform_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- Restaurants: public sees published; members see and edit their own; admins everything.
drop policy if exists restaurants_public_read on restaurants;
create policy restaurants_public_read on restaurants for select
  using (status = 'published' or is_restaurant_member(id));
drop policy if exists restaurants_member_update on restaurants;
create policy restaurants_member_update on restaurants for update
  using (is_restaurant_member(id)) with check (is_restaurant_member(id));
drop policy if exists restaurants_admin_all on restaurants;
create policy restaurants_admin_all on restaurants for all
  using (is_platform_admin()) with check (is_platform_admin());

-- Child content tables follow the parent restaurant's visibility.
do $$ declare t text; begin
  foreach t in array array['restaurant_translations', 'restaurant_cuisines', 'photos', 'opening_hours', 'service_periods'] loop
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format($p$create policy %I on %I for select using (
        exists (select 1 from restaurants r where r.id = %I.restaurant_id
                and (r.status = 'published' or is_restaurant_member(r.id))))$p$, t || '_read', t, t);
    execute format('drop policy if exists %I on %I', t || '_member_write', t);
    execute format('create policy %I on %I for all using (is_restaurant_member(restaurant_id)) with check (is_restaurant_member(restaurant_id))', t || '_member_write', t);
  end loop;
end $$;

-- Tables and closures are operational: members only. The public sees their effect via get_availability.
do $$ declare t text; begin
  foreach t in array array['dining_tables', 'closures'] loop
    execute format('drop policy if exists %I on %I', t || '_member_all', t);
    execute format('create policy %I on %I for all using (is_restaurant_member(restaurant_id)) with check (is_restaurant_member(restaurant_id))', t || '_member_all', t);
  end loop;
end $$;

-- Bookings: no direct public access at all. Guests use the token RPCs.
drop policy if exists bookings_member_read on bookings;
create policy bookings_member_read on bookings for select using (is_restaurant_member(restaurant_id));
drop policy if exists bookings_member_update on bookings;
create policy bookings_member_update on bookings for update
  using (is_restaurant_member(restaurant_id)) with check (is_restaurant_member(restaurant_id));

drop policy if exists restaurant_members_self_read on restaurant_members;
create policy restaurant_members_self_read on restaurant_members for select
  using (user_id = auth.uid() or is_platform_admin());
drop policy if exists restaurant_members_admin_write on restaurant_members;
create policy restaurant_members_admin_write on restaurant_members for all
  using (is_platform_admin()) with check (is_platform_admin());

drop policy if exists platform_admins_self_read on platform_admins;
create policy platform_admins_self_read on platform_admins for select using (user_id = auth.uid());
