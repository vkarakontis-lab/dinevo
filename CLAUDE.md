# CLAUDE.md — project conventions (from the restaurant-booking-builder skill; keep it current)

## What this is
**Dinevo** — restaurant discovery + instant table booking for tourists and locals. Cyprus first; multi-country by config.
Forked from the earlier `~/kratisi` build (which is left untouched and still runs on port 3050) to carry a
ground-up hyper-modern redesign. Dev server: `npm run dev` → **port 3100**.
Tech: Next.js 16 (App Router, `src/`, `proxy.ts` not middleware), TypeScript, Tailwind v4 + shadcn/ui (new-york/Radix), Supabase (Postgres/Auth/Storage), next-intl v4 (`en`, `el`), Vercel.

## Brand name lives in ONE place
`src/config/brand.ts` (`BRAND.name`, `BRAND.wordmark`, `BRAND.domain`). Renaming the product is a one-line
change there. There is no `common.siteName` message key any more — message strings that mention the brand
take a `{brand}` placeholder and are fed `BRAND.name` at the call site (`seo.defaultTitle`,
`forRestaurants.subtitle`). Never hardcode the name in a component, an email or a page title.

## Design system
`DESIGN.md` is the contract; `src/app/globals.css` is the implementation. Six brand hues, each with one
job — coral (brand + primary actions), grape (gradient partner, secondary emphasis), sea (wayfinding:
areas/map/location), mint (availability/open/confirmed), sun (featured/ratings), pink (energy accent).
Gradient signatures (`.bg-gradient-brand`, `-sea`, `-sun`, `-dusk`), glass surfaces (`.glass`,
`.glass-dark`), coloured glows, `.mesh-aurora`, `.lift`, `.ring-gradient`, `.scroll-x`, `.section`,
`.stagger`. **Never hardcode a hex** — use tokens so dark mode and future re-themes keep working.
Type: Manrope 800 display (all headings, via `--font-display`) + Inter body, both with the Greek subset.

## Demo mode
While `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is the placeholder value, `src/lib/demo/data.ts`
serves 3 sample restaurants (photos in `public/demo/`, CC-licensed — see `public/demo/CREDITS.txt`)
and simulates availability + bookings so the whole site works without a database. Real Supabase keys
switch everything to Postgres automatically. The same 3 restaurants are staged in `intake/<slug>/`
— seed them for real with `node scripts/add-restaurant.mjs intake/<slug>` once keys exist, then
delete or unpublish them before launch (their `owner_notes` say DEMO).

## Greek grammar in templates
Place names inflect in Greek. `countries.json` carries `name_locative` (el: "Κύπρο") used via
`localizedLocative()` for "στην {country}" phrases; region/area templates use colon-style phrasing
so nominative names stay correct. Don't reintroduce "σε {region}" templates.

## Dashboard roles
RLS treats all members alike; roles (staff < manager < owner) are enforced at the top of every
server action in `src/app/[locale]/dashboard/actions.ts` and mirrored in the UI.

## Gotchas that were bugs once — don't reintroduce
- `src/proxy.ts` matcher excludes `/auth` — locale-redirecting `/auth/confirm` breaks magic links.
- Restaurant pages never read `searchParams` server-side; the BookingWidget reads ?date/party/time
  client-side (keyed remount) so the route stays static/ISR.
- Public reads use the cookieless `createPublicClient` — the cookie-bound client silently makes
  ISR pages dynamic and its try/catch swallows Next's bailout into empty data.
- Emails from server actions go through `after()` — plain fire-and-forget gets dropped on Vercel.
- Restaurant-staff emails use `countries.json → staff_locale` (el for CY), guests get `guest_locale`.
- The reminder cron logic assumes an HOURLY schedule (20–28h window). `vercel.json` currently says
  daily `0 0 * * *` (Vercel Hobby limit?) — with a daily run most reminders are missed; either use
  an hourly cron (Pro) or widen the window in `/api/cron/reminders`.

## Commands
- `npm run dev` (port 3100) · `npm run build` · `npm run lint` · `npm run typecheck`
- `node scripts/test-booking-engine.mjs` — run after ANY change to SQL functions / bookings table
- `node scripts/seed-config.mjs` — after editing `src/config/*.json`
- `node scripts/add-restaurant.mjs intake/<slug>` — add/update a restaurant (idempotent by slug)
- `node scripts/validate-restaurant.mjs intake/<slug>/restaurant.json` — check an intake file
- `node scripts/geocode.mjs "<address or Google Maps URL>"` — coordinates
- `node scripts/invite-owner.mjs <slug> <email> [owner|manager|staff]` — dashboard access
- `supabase db push` — apply migrations in `supabase/migrations/`

## Non-negotiables
1. Bookings are created ONLY through the `create_booking` RPC. Never insert into `bookings` from app code.
2. Availability comes ONLY from the `get_availability` RPC. Never recompute slots in TypeScript.
3. Every user-facing string lives in `messages/{en,el}.json`. No hardcoded English *or Greek* in components.
4. No Cyprus-specific code paths: read `src/config/countries.json`. Cyprus is just the first entry.
5. `service_role` key is used only by `scripts/` and server-only code — never in anything shipped to the browser.
6. Public pages never read `bookings` or `dining_tables` directly; RLS blocks it anyway.

## Layout
- `src/app/[locale]/` — routes. Public: `page.tsx`, `[country]/[region]/…`, `restaurant/[slug]`, `booking/[token]`. Auth: `dashboard/…`, `admin/…`
- `src/components/` — UI. `src/lib/supabase/` — clients (`server.ts`, `client.ts`, `proxy.ts`). `src/lib/booking/` — RPC wrappers + error mapping. `src/i18n/` — routing/request config.
- `src/config/` — countries/cuisines/features JSON (source of truth, seeded to DB) + `brand.ts`.
- `supabase/migrations/` — SQL. `scripts/` — ops scripts. `intake/` — dropped restaurant folders (git-ignored). `data/restaurants/` — audit copies of intake JSON (committed).

## Adding a restaurant (short version)
1. `intake/<slug>/restaurant.json` from `assets` template + photos in the same folder.
2. `node scripts/validate-restaurant.mjs …` → fix → `node scripts/add-restaurant.mjs intake/<slug>`.
3. Check `/en/restaurant/<slug>` and `/el/restaurant/<slug>` (photos, pin, booking slots). Commit `data/restaurants/<slug>.json`.
