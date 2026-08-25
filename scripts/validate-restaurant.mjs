#!/usr/bin/env node
// Validate a restaurant intake JSON against the schema and the config taxonomy.
//   node scripts/validate-restaurant.mjs intake/<slug>/restaurant.json [--images intake/<slug>]
// Exit 0 = valid (warnings may print), exit 1 = errors listed. Also exported for add-restaurant.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  loadConfig, findCountry, findRegion, findArea, stripHelp, SLUG_RE, TIME_RE, minutesOf, parseArgs, fail, log,
} from './lib.mjs';

const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;
const Hhmm = z.string().regex(TIME_RE, 'expected HH:MM (24h)');
const Weekdays = z.array(z.number().int().min(1).max(7)).min(1);
const Localized = (locales) =>
  z.record(z.string(), z.string().min(1)).refine((o) => locales.every((l) => o[l]), {
    message: `needs every locale: ${locales.join(', ')}`,
  });

function buildSchema(locales) {
  const Translation = z.object({
    name: z.string().min(2).max(120),
    tagline: z.string().max(140).nullish(),
    description: z.string().min(40, 'description should be at least ~40 chars — tourists read this').max(2500).nullish(),
    is_machine_translated: z.boolean().default(false),
  });
  return z.object({
    slug: z.string().regex(SLUG_RE, 'slug must be kebab-case ASCII (transliterate Greek)'),
    country: z.string().length(2),
    region: z.string().min(1),
    area: z.string().nullish(),
    status: z.enum(['draft', 'published', 'archived']).default('published'),
    booking_mode: z.enum(['instant', 'request', 'phone_only']).default('instant'),
    price_band: z.number().int().min(1).max(4),
    translations: z.record(z.string(), Translation).refine((t) => locales.every((l) => t[l]), {
      message: `translations needed for every locale: ${locales.join(', ')}`,
    }),
    cuisines: z.array(z.string()).min(1).max(3),
    features: z.array(z.string()).default([]),
    contact: z.object({
      phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164, e.g. +35725123456').nullish(),
      whatsapp: z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164').nullish(),
      email: z.string().email().nullish(),
      website: z.string().url().nullish(),
      instagram: z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'handle without @').nullish(),
      menu_url: z.string().url().nullish(),
      google_maps_url: z.string().url().nullish(),
    }).default({}),
    location: z.object({
      address_line: z.string().min(3).nullish(),
      postcode: z.string().nullish(),
      lat: z.number(),
      lng: z.number(),
    }),
    opening_hours: z.array(z.object({ weekdays: Weekdays, opens: Hhmm, closes: Hhmm })).default([]),
    service_periods: z.array(z.object({
      name: Localized(locales),
      weekdays: Weekdays,
      first_seating: Hhmm,
      last_seating: Hhmm,
      slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).nullish(),
      turn_minutes: z.number().int().min(15).max(600).nullish(),
      max_covers_per_slot: z.number().int().min(1).nullish(),
    })),
    booking_rules: z.object({
      min_party: z.number().int().min(1).default(1),
      max_party: z.number().int().min(1).default(8),
      lead_time_minutes: z.number().int().min(0).default(60),
      max_advance_days: z.number().int().min(1).max(365).default(60),
      turn_minutes: z.number().int().min(15).max(600).default(90),
      slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(30),
    }).default({}),
    tables: z.array(z.object({
      label: z.string().min(1),
      min_party: z.number().int().min(1).default(1),
      max_party: z.number().int().min(1),
      is_online_bookable: z.boolean().default(true),
    })).default([]),
    tables_are_placeholder: z.boolean().default(true),
    capacity_covers: z.number().int().min(1).nullish(),
    photos: z.array(z.object({
      file: z.string().min(1),
      alt: z.record(z.string(), z.string()).nullish(),
      is_cover: z.boolean().default(false),
    })).default([]),
    is_featured: z.boolean().default(false),
    owner_notes: z.string().nullish(),
  });
}

/**
 * @returns {{ ok: boolean, errors: string[], warnings: string[], data: object|null, images: string[] }}
 */
export function validateRestaurant(rawJson, { config = loadConfig(), imagesDir = null } = {}) {
  const errors = [];
  const warnings = [];
  const raw = stripHelp(rawJson);

  const country = findCountry(config, raw.country);
  if (!country) {
    return { ok: false, errors: [`unknown country '${raw.country}' — add it to config/countries.json first`], warnings, data: null, images: [] };
  }
  const locales = country.locales;
  const parsed = buildSchema(locales).safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`);
    return { ok: false, errors, warnings, data: null, images: [] };
  }
  const data = parsed.data;

  // --- geography
  const region = findRegion(country, data.region);
  if (!region) errors.push(`region '${data.region}' not in config for ${country.code}`);
  if (data.area) {
    if (region && !findArea(region, data.area)) errors.push(`area '${data.area}' not under region '${data.region}'`);
  } else {
    warnings.push('no area set — tourists filter by area; add one if the address makes it obvious');
  }
  const b = country.bbox;
  if (b && (data.location.lat < b.minLat || data.location.lat > b.maxLat || data.location.lng < b.minLng || data.location.lng > b.maxLng)) {
    errors.push(`lat/lng (${data.location.lat}, ${data.location.lng}) is outside ${country.name.en} — swapped coordinates or a geocoding miss?`);
  }

  // --- taxonomy
  const cuisineSlugs = new Set(config.cuisines.map((c) => c.slug));
  for (const c of data.cuisines) if (!cuisineSlugs.has(c)) errors.push(`cuisine '${c}' not in config/cuisines.json`);
  const featureSlugs = new Set(config.features.map((f) => f.slug));
  for (const f of data.features) if (!featureSlugs.has(f)) errors.push(`feature '${f}' not in config/features.json`);

  // --- translations
  for (const l of locales) {
    const t = data.translations[l];
    if (!t.description) warnings.push(`translations.${l}.description is empty`);
    if (!t.tagline) warnings.push(`translations.${l}.tagline is empty — cards look bare without one`);
  }

  // --- hours & service periods
  for (const [i, h] of data.opening_hours.entries()) {
    if (minutesOf(h.opens) === minutesOf(h.closes)) errors.push(`opening_hours[${i}]: opens and closes are equal`);
  }
  if (data.booking_mode === 'instant') {
    if (data.service_periods.length === 0) errors.push('instant booking needs at least one service period');
    const step = data.booking_rules.slot_interval_minutes;
    for (const [i, sp] of data.service_periods.entries()) {
      const first = minutesOf(sp.first_seating);
      const last = minutesOf(sp.last_seating);
      if (last < first) errors.push(`service_periods[${i}]: last_seating before first_seating`);
      const interval = sp.slot_interval_minutes ?? step;
      if (first % interval !== 0 || last % interval !== 0) {
        warnings.push(`service_periods[${i}]: seating times are not aligned to the ${interval}-minute slot interval (slots start at first_seating anyway)`);
      }
      const turn = sp.turn_minutes ?? data.booking_rules.turn_minutes;
      for (const h of data.opening_hours) {
        const overlapDays = sp.weekdays.some((d) => h.weekdays.includes(d));
        if (!overlapDays) continue;
        const closes = minutesOf(h.closes) <= minutesOf(h.opens) ? minutesOf(h.closes) + 1440 : minutesOf(h.closes);
        if (last + turn > closes + 15) {
          warnings.push(`service_periods[${i}]: last seating ${sp.last_seating} + ${turn}min turn runs past closing ${h.closes} — usually last_seating should be closing minus turn time`);
        }
      }
    }
    if (data.tables.length === 0 && !data.tables_are_placeholder) {
      errors.push('tables is empty but tables_are_placeholder is false — list tables or allow placeholders');
    }
    const maxTable = Math.max(0, ...data.tables.map((t) => t.max_party));
    if (data.tables.length && data.booking_rules.max_party > maxTable) {
      warnings.push(`booking_rules.max_party ${data.booking_rules.max_party} exceeds the largest table (${maxTable}) — big parties will never find availability`);
    }
    if (data.booking_rules.min_party > data.booking_rules.max_party) errors.push('booking_rules: min_party > max_party');
  }

  // --- photos / images on disk
  let images = [];
  if (imagesDir) {
    if (!fs.existsSync(imagesDir)) errors.push(`images dir not found: ${imagesDir}`);
    else {
      const onDisk = fs.readdirSync(imagesDir).filter((f) => IMAGE_RE.test(f)).sort();
      if (data.photos.length) {
        for (const p of data.photos) {
          if (!onDisk.includes(p.file)) errors.push(`photo '${p.file}' not found in ${imagesDir}`);
        }
        images = data.photos.map((p) => path.join(imagesDir, p.file));
        if (!data.photos.some((p) => p.is_cover)) warnings.push('no photo marked is_cover — first one will be used');
      } else {
        images = onDisk.map((f) => path.join(imagesDir, f));
      }
      if (images.length === 0) errors.push('no images — a listing without photos converts terribly; ask the user for at least 3');
      else if (images.length < 3) warnings.push(`only ${images.length} image(s) — 3–8 is the sweet spot`);
      for (const f of onDisk) if (/\.(heic|heif)$/i.test(f)) warnings.push(`${f} is HEIC — sharp may not decode it; convert to JPEG first (macOS: sips -s format jpeg "${f}" --out "${f.replace(/\.heic$/i, '.jpg')}")`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, data, images };
}

// ----------------------------------------------------------------- CLI ----
if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) fail('usage: node scripts/validate-restaurant.mjs <restaurant.json> [--images <dir>]');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const imagesDir = args.images ?? path.dirname(path.resolve(file));
  const result = validateRestaurant(raw, { imagesDir });
  for (const w of result.warnings) console.warn(`⚠ ${w}`);
  for (const e of result.errors) console.error(`✖ ${e}`);
  if (!result.ok) process.exit(1);
  log(`valid: ${result.data.slug} (${result.images.length} image(s))`);
}
