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

## Deploying

`main` is connected to Vercel: **push to `main` and it deploys itself**. Pull requests get their
own preview URL, so you can look at a change before it reaches the demo domain.

- Production: https://dinevo-wine.vercel.app
- Project: `dinevo` under `vkarakontis-9369s-projects`

Nothing needs deploying by hand. If you ever do need to, `npx vercel --prod` works — but stop
`npm run dev` first: `next build` and `next dev` share the `.next` directory, and building while
the dev server is running corrupts its chunks and produces confusing MIME-type errors in the
browser. `rm -rf .next` clears it.

**Environment variables live in Vercel, not in the repo.** `.env.local` is git-ignored and is
never needed to work on the site — with no Supabase keys the app runs in demo mode. The only
variable currently set in production is `NEXT_PUBLIC_SITE_URL`; without it, canonical URLs,
JSON-LD and the sitemap all fall back to `localhost`.

## Working on this together

- Branch off `main`, open a PR, let the preview build check it.
- Before pushing: `npm run typecheck && npm run lint && npm run build`.
- After touching anything under `supabase/` or the booking SQL:
  `node scripts/test-booking-engine.mjs` — it exercises the double-booking guarantee.
- Read `CLAUDE.md` before your first change. It records the conventions and, more usefully, the
  handful of mistakes that have already been made once (ISR vs. `searchParams`, the cookieless
  Supabase client, emails needing `after()`) so they don't get made twice.
- `DESIGN.md` is the design contract — colour roles, type, motion, layout. Use the tokens in
  `src/app/globals.css`; never hardcode a hex, or dark mode and future re-themes break.
- Every user-facing string goes in **both** `messages/en.json` and `messages/el.json`, in the
  same change. The build does not catch a missing Greek key — the page renders the key name.

## Renaming the product

Edit `name` and `wordmark` in `src/config/brand.ts`. Nothing else hardcodes the name — the header,
footer, page titles, emails and the calendar export all read it from there.
