#!/usr/bin/env node
// Upsert countries/regions/areas/cuisines/features from src/config/*.json into Supabase.
// Safe to re-run any time the config changes (new area, new cuisine, new country).
//   node scripts/seed-config.mjs
import { loadConfig, supabaseAdmin, fail, log } from './lib.mjs';

const config = loadConfig();
const sb = await supabaseAdmin();
const must = (res, what) => { if (res.error) fail(`${what}: ${res.error.message}`); return res.data; };

for (const c of config.countries) {
  must(await sb.from('countries').upsert({
    code: c.code, slug: c.slug, name: c.name, currency: c.currency, timezone: c.timezone, phone_code: c.phone_code,
    locales: c.locales, default_locale: c.default_locale, bbox: c.bbox ?? null, is_active: c.is_active ?? true,
  }, { onConflict: 'code' }), `country ${c.code}`);

  for (const [ri, r] of c.regions.entries()) {
    const region = must(await sb.from('regions').upsert(
      { country_code: c.code, slug: r.slug, name: r.name, sort_order: ri }, { onConflict: 'country_code,slug' },
    ).select('id').single(), `region ${r.slug}`);
    for (const [ai, a] of (r.areas ?? []).entries()) {
      must(await sb.from('areas').upsert(
        { region_id: region.id, slug: a.slug, name: a.name, lat: a.lat ?? null, lng: a.lng ?? null, sort_order: ai }, { onConflict: 'region_id,slug' },
      ), `area ${a.slug}`);
    }
  }
  log(`${c.code}: ${c.regions.length} regions, ${c.regions.reduce((n, r) => n + (r.areas?.length ?? 0), 0)} areas`);
}

must(await sb.from('cuisines').upsert(config.cuisines.map((x, i) => ({ slug: x.slug, name: x.name, sort_order: i })), { onConflict: 'slug' }), 'cuisines');
must(await sb.from('features').upsert(config.features.map((x) => ({ slug: x.slug, name: x.name, icon: x.icon ?? null })), { onConflict: 'slug' }), 'features');
log(`${config.cuisines.length} cuisines, ${config.features.length} features seeded`);
