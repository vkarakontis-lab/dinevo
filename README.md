# Dinevo

Restaurant discovery and **instant table booking** for Cyprus — tourists and locals search by
area, cuisine, date and party size, see real availability, tap a time and get a confirmed table
with a code. Restaurant owners manage bookings, tables, service periods and closures from a
dashboard. English and Greek throughout.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/Radix, Supabase and next-intl,
deployed on Vercel.

## Run it

```bash
npm install
npm run dev      # http://localhost:3100
```

Without Supabase keys the app runs in **demo mode**: three sample restaurants with real photos and
simulated availability, so the whole booking flow works offline. Add the keys to `.env.local`
(see `.env.local.example`) and everything switches to Postgres automatically.

## The five regions

Nicosia · Limassol · Larnaca · Paphos · Ayia Napa & Protaras (Famagusta). Geography, cuisines and
features all come from `src/config/*.json` — adding an area or a country is data, not code.

## Where things live

| Path | What |
|---|---|
| `DESIGN.md` | The design system contract — colours, type, motion, layout rules |
| `CLAUDE.md` | Project conventions and the non-negotiables (booking RPCs, i18n, RLS) |
| `src/config/brand.ts` | **The brand name.** Change it here and nowhere else |
| `src/config/countries.json` | Regions, areas, timezone, currency, phone code, locales |
| `src/app/globals.css` | Design tokens and utility classes |
| `messages/{en,el}.json` | Every user-facing string, in both locales |
| `supabase/migrations/` | Schema, the booking engine RPCs, RLS policies |
| `scripts/` | Ops: add a restaurant, geocode, seed config, invite an owner, test the engine |

## Common commands

```bash
npm run typecheck && npm run lint && npm run build
```

```bash
node scripts/test-booking-engine.mjs
```

Run that after **any** change to the SQL functions or the bookings table — it exercises the
double-booking guarantee against an in-process Postgres, no Supabase needed.

```bash
node scripts/add-restaurant.mjs intake/<slug>
```

Adds or updates a restaurant from `intake/<slug>/` (photos + `restaurant.json`). Validate first
with `node scripts/validate-restaurant.mjs intake/<slug>/restaurant.json`.

## Renaming the product

Edit `name` and `wordmark` in `src/config/brand.ts`. Nothing else hardcodes the name — the header,
footer, page titles, emails and the calendar export all read it from there.
