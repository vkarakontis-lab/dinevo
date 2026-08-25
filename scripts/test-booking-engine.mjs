#!/usr/bin/env node
// Booking-engine regression test. Runs supabase/migrations/0001_init.sql in an
// in-process Postgres (PGlite), then asserts every availability/booking rule.
//   npm i -D @electric-sql/pglite      (once)
//   node scripts/test-booking-engine.mjs [path/to/0001_init.sql]
// Run this after ANY change to the SQL functions or the bookings table.
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const MIGRATION = process.argv[2] ?? ['supabase/migrations/0001_init.sql', 'assets/supabase/0001_init.sql'].find((p) => fs.existsSync(p));
if (!MIGRATION) { console.error('✖ cannot find 0001_init.sql'); process.exit(1); }

const db = new PGlite({ extensions: { btree_gist, pg_trgm } });
const q = (sql, params) => db.query(sql, params);
let passed = 0; let failed = 0;
const ok = (cond, label, extra = '') => { if (cond) { passed++; console.log(`  ✓ ${label}`); } else { failed++; console.log(`  ✗ ${label} ${extra}`); } };
const errOf = async (p) => { try { await p; return null; } catch (e) { return e.message.split('\n')[0]; } };

// --- Supabase stubs (auth schema, roles, default grants) ------------------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);
await db.exec(fs.readFileSync(path.resolve(MIGRATION), 'utf8'));
console.log(`migration ${MIGRATION} applied`);

// --- Fixture: one restaurant, dinner 18:00–21:30, 120-min turn, pacing 6 covers/slot, tables 2/4/6
const R = '00000000-0000-0000-0000-00000000000a';
const OWNER = '00000000-0000-0000-0000-0000000000ee';
await db.exec(`
  insert into countries (code, slug, name, timezone, phone_code) values ('CY','cyprus','{"en":"Cyprus","el":"Κύπρος"}','Asia/Nicosia','+357');
  insert into regions (id, country_code, slug, name) values ('00000000-0000-0000-0000-000000000001','CY','famagusta','{"en":"Famagusta","el":"Αμμόχωστος"}');
  insert into restaurants (id, slug, country_code, region_id, status, price_band, lat, lng, max_party, lead_time_minutes, turn_minutes, slot_interval_minutes)
    values ('${R}','thalassa','CY','00000000-0000-0000-0000-000000000001','published',2,35.0,34.0,10,60,90,30);
  insert into restaurant_translations values ('${R}','en','Thalassa',null,null,false),('${R}','el','Θάλασσα',null,null,true);
  insert into service_periods (restaurant_id, name, weekdays, first_seating, last_seating, turn_minutes, max_covers_per_slot)
    values ('${R}','{"en":"Dinner","el":"Δείπνο"}','{1,2,3,4,5,6,7}','18:00','21:30',120,6);
  insert into dining_tables (restaurant_id, label, min_party, max_party) values ('${R}','T1',1,2),('${R}','T2',2,4),('${R}','T3',4,6);
  insert into auth.users (id) values ('${OWNER}');
  insert into restaurant_members (user_id, restaurant_id, role) values ('${OWNER}','${R}','owner');
`);
const { rows: [{ d }] } = await q(`select ((now() at time zone 'Asia/Nicosia')::date + 10)::text as d`);
const ts = (time) => `('${d} ${time}')::timestamp at time zone 'Asia/Nicosia'`;
const avail = async (party) => (await q(`select slot_local::text as t, available, reason from get_availability($1, $2::date, $3) order by slot`, [R, d, party])).rows;
const book = (time, party, name, extra = '') => q(`select * from create_booking($1, ${ts(time)}, $2, $3, 'g@example.com', '+35799000000', 'en', null ${extra})`, [R, party, name]);

console.log('\navailability');
const a2 = await avail(2);
ok(a2.length === 8 && a2.every((s) => s.available), '8 dinner slots 18:00–21:30, all available for 2');
ok(a2[0].t.startsWith('18:00') && a2[7].t.startsWith('21:30'), 'first/last slot match service period');
ok((await avail(12)).every((s) => !s.available && s.reason === 'party_size'), 'party above max_party → party_size reason');
ok((await q(`select count(*)::int as n from get_availability($1, ($2::date + 400)::date, 2) where available`, [R, d])).rows[0].n === 0, 'beyond max_advance_days → nothing available');

console.log('\nbooking rules');
const A = (await book('20:00', 2, 'A')).rows[0];
ok(A.status === 'confirmed' && A.table_label === 'T1' && /^CY-[A-Z2-9]{6}$/.test(A.confirmation_code), 'instant booking is confirmed on smallest fitting table with CY- code');
const B = (await book('20:00', 2, 'B')).rows[0];
ok(B.table_label === 'T2', 'second 2-top goes to next smallest table');
ok((await errOf(book('20:00', 2, 'C'))) === 'no_availability', 'no fitting free table → no_availability');
ok((await errOf(book('20:00', 4, 'D'))) === 'slot_full', 'pacing: covers over max_covers_per_slot → slot_full');
ok((await book('21:00', 4, 'E')).rows[0].table_label === 'T3', 'overlapping window picks the free larger table');
ok((await errOf(book('20:15', 2, 'F'))) === 'outside_service_hours', 'misaligned slot rejected');
ok((await errOf(book('23:00', 2, 'G'))) === 'outside_service_hours', 'after last seating rejected');
const { rows: [{ soon }] } = await q(`select (now() + interval '10 minutes')::text as soon`);
ok((await errOf(q(`select * from create_booking($1, $2::timestamptz, 2, 'Late')`, [R, soon]))) === 'too_soon', 'lead time enforced');
ok((await errOf(book('19:00', 2, ''))) === 'guest_name_required', 'blank guest name rejected');
ok((await errOf(book('19:00', 2, 'X', ", 'dashboard', true"))) === 'not_allowed', 'non-member cannot use dashboard source / bypass');

console.log('\ndatabase invariant');
const { rows: [{ tid }] } = await q(`select id as tid from dining_tables where label='T1'`);
const direct = await errOf(q(`insert into bookings (restaurant_id, table_id, starts_at, ends_at, party_size, guest_name, confirmation_code)
  values ($1, $2, ${ts('21:00')}, ${ts('22:30')}, 2, 'Sneaky', 'CY-XXXXXX')`, [R, tid]));
ok(direct?.includes('bookings_no_double_booking'), 'exclusion constraint blocks overlapping insert even outside the RPC');
ok((await avail(2)).filter((s) => s.available).map((s) => s.t.slice(0, 5)).join(',') === '18:00', 'availability reflects live bookings (only 18:00 left for 2)');

console.log('\nguest self-service');
const { rows: [{ manage_token }] } = await q(`select manage_token from bookings where guest_name='A'`);
ok((await q(`select confirmation_code, status from get_booking_by_token($1)`, [manage_token])).rows[0].confirmation_code === A.confirmation_code, 'get_booking_by_token');
ok((await q(`select cancel_booking_by_token($1) as s`, [manage_token])).rows[0].s === 'cancelled', 'cancel by token');
ok((await errOf(q(`select cancel_booking_by_token($1)`, [manage_token]))) === 'cannot_cancel', 'double cancel rejected');
ok((await book('20:00', 2, 'H')).rows[0].table_label === 'T1', 'cancelled table is free again');
ok((await errOf(q(`select * from get_booking_by_token('00000000-0000-0000-0000-000000000000')`))) === null, 'unknown token returns no rows, no error');

console.log('\nrow level security');
await db.exec(`set role anon`);
ok((await q(`select count(*)::int as n from restaurants`)).rows[0].n === 1, 'anon sees published restaurant');
ok((await q(`select count(*)::int as n from bookings`)).rows[0].n === 0, 'anon cannot read bookings');
ok((await q(`select count(*)::int as n from dining_tables`)).rows[0].n === 0, 'anon cannot read table inventory');
ok((await q(`select count(*)::int as n from get_availability($1,$2::date,2)`, [R, d])).rows[0].n === 8, 'anon can call get_availability');
ok((await errOf(q(`update restaurants set price_band = 4 where id = $1`, [R]))) === null && (await q(`select price_band from restaurants where id=$1`, [R])).rows[0].price_band === 2, 'anon update is a silent no-op under RLS');
await db.exec(`reset role; set role authenticated; set test.uid = '${OWNER}'`);
ok((await q(`select count(*)::int as n from bookings`)).rows[0].n >= 4, 'member sees own restaurant bookings');
ok((await q(`select count(*)::int as n from dining_tables`)).rows[0].n === 3, 'member sees table inventory');
const phone = await q(`select table_label, status from create_booking($1, ${ts('18:15')}, 2, 'Phone guest', null, null, 'en', null, 'phone', true)`, [R]);
ok(phone.rows[0]?.status === 'confirmed', 'member can create off-grid phone booking with bypass');
ok((await q(`update bookings set status='no_show' where guest_name='B' returning status`)).rows[0]?.status === 'no_show', 'member can update booking status');
await db.exec(`reset role`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
