# Dinevo — design system ("Mediterranean Pop")

Hyper-modern restaurant booking. Think Resy/Airbnb-2026 energy: high-chroma colour used
systematically, gradient signatures, glass surfaces, big confident type, generous radii,
soft coloured elevation. **Never** grey shadcn defaults, never beige brochure.

Everything below is already defined in `src/app/globals.css`. **Use the tokens — never
hardcode a hex.** Brand name comes from `src/config/brand.ts` (`BRAND.name`), never a
literal string and never `t("common.siteName")` (that key is gone).

---

## 1. Colour — each hue has one job

| Token | Light | Job |
|---|---|---|
| `coral` | `#FF5636` | The brand. Every **primary action** (Book, Find a table, Confirm). |
| `grape` | `#7C4DFF` | Second half of the brand gradient. Secondary emphasis, filters. |
| `sea` | `#00A9C9` | **Wayfinding** — areas, regions, map, location, directions. |
| `mint` | `#00B473` | **Availability** — free slots, "Open now", confirmed bookings. |
| `sun` | `#FFAB00` | **Highlight** — featured, ratings, badges that mean "notable". |
| `pink` | `#FF2D84` | Energy accent — chips, promos, the middle of the brand gradient. |

Each has `-foreground` (text on a solid fill) and `-soft` (tinted fill for badges/chips):
`bg-coral text-coral-foreground`, `bg-mint-soft text-mint`, `border-sea/30`, etc.

Surfaces: `bg-background` (page), `bg-card` (cards), `bg-muted` / `bg-secondary` (insets),
`text-foreground` / `text-muted-foreground`, `border-border`.

**Colour is never the only signal.** A mint slot button also says the time; a "featured"
badge also says "Featured". Text contrast ≥ 4.5:1 — on `sun` use `text-sun-foreground`
(near-black), never white.

### Categorical rotation
When a list needs variety (cuisine chips, area tiles, "how it works" steps), rotate through
`[coral, sea, grape, sun, mint, pink]` by index — deterministically, so SSR and client match.

## 2. Gradient signatures

- `.bg-gradient-brand` coral → pink → grape. The wordmark, hero accents, key CTAs.
- `.bg-gradient-sea` sea → mint. Availability, maps, area tiles.
- `.bg-gradient-sun` sun → coral. Featured / ratings.
- `.bg-gradient-dusk` grape → pink → coral. Big banner sections.
- `.text-gradient-brand` / `.text-gradient-sea` — gradient text (already padded so
  descenders don't clip).

Use at most **one** gradient per viewport-height of page. Gradients are punctuation.

## 3. Type

- Display: **Manrope** via `var(--font-display)`. `h1`–`h4` and `.font-display` pick it up
  automatically at weight 800 with tight tracking. Greek subset ships.
- Body/UI: **Inter** via `font-sans`. Base 17px.
- Scale: h1 `text-[2.6rem] sm:text-6xl lg:text-7xl`, section h2 `text-3xl sm:text-4xl`,
  card title `text-lg sm:text-xl`. Use `text-balance` on headings, `text-pretty` on paragraphs.
- Eyebrow labels above section headings: `text-xs font-semibold uppercase tracking-[0.18em]`
  in a hue.
- `.font-heading` still works (alias of `.font-display`).

## 4. Shape & elevation

- `--radius` is `0.875rem`. Cards `rounded-2xl`/`rounded-3xl`; controls and chips
  `rounded-full`; hero panels `rounded-[2rem]`.
- Elevation: `shadow-soft` (resting), `shadow-lift` (hover), `shadow-float` (overlays).
  Coloured glows: `.glow-brand`, `.glow-sea`, `.glow-mint` on primary CTAs only.
- Borders are hairlines: `border border-border`. Premium cards add `.ring-gradient`
  (gradient hairline that fades in on hover).

## 5. Motion — subtle, never autoplaying content

`.lift` (hover raise + shadow), `.stagger` on a grid (children rise in sequence),
`animate-pop-in` (slot selection), `.mesh-aurora` (slow drifting colour mesh behind hero /
banner sections). All wrapped in `prefers-reduced-motion` already. No carousels that move
by themselves.

## 6. Utility classes available

`.glass` / `.glass-dark` (blurred translucent — sticky header, hero search panel,
photo overlays) · `.mesh-aurora` · `.bg-dotgrid` · `.lift` · `.ring-gradient` ·
`.scroll-x` (snap scroller, hidden scrollbar) · `.section` (vertical rhythm) · `.stagger`.

## 7. Layout rules

- Page container: `mx-auto w-full max-w-6xl px-4 sm:px-6` (set in the public layout).
  Full-bleed sections break out with `-mx-4 sm:-mx-6` + inner padding.
- Every section: `.section` for vertical rhythm, then eyebrow + h2 + optional lead
  paragraph + content.
- Mobile first. Horizontal scrollers (`.scroll-x`) on mobile become grids at `sm:`.
- Touch targets ≥ 44px. Sticky mobile "Book a table" bar on restaurant pages.

## 8. Non-negotiables carried over from the platform

1. Bookings only via the `create_booking` RPC; slots only from `get_availability`.
2. **No hardcoded user-facing English or Greek in components** — every string is a key in
   `messages/en.json` AND `messages/el.json`, added to both in the same change, same key
   order. Brand name is a `{brand}` placeholder fed from `BRAND.name`.
3. No Cyprus-specific branches — geography comes from `src/config/countries.json`.
4. Public pages never read `bookings`/`dining_tables`.
5. Restaurant pages never read `searchParams` server-side (keeps them static/ISR).
6. Accessibility: real `<button>`s with `aria-pressed` for slots/toggles, visible labels,
   `aria-live` for errors, focus managed in sheets/dialogs, decorative art `aria-hidden`.
7. Images: `next/image` with `sizes`, `priority` only on the LCP image, blur placeholders
   where a `blur_data_url` exists, aspect-ratio boxes so nothing shifts.

## 9. The five regions (already in `countries.json`)

Nicosia · Limassol · Larnaca · Paphos · Famagusta (labelled "Ayia Napa & Protaras").
These are the primary wayfinding surface — give them real presence on the home page.
Read them from config; never hardcode the list.
