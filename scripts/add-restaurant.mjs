#!/usr/bin/env node
// Add or update one restaurant from an intake folder. Idempotent by slug.
//   node scripts/add-restaurant.mjs intake/<slug>            # folder holds restaurant.json + photos
//   node scripts/add-restaurant.mjs --json x.json --images dir
// Flags: --dry-run (validate + process images, touch nothing remote)
//        --draft (force status draft)   --replace-photos   --replace-tables   --keep-tmp
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local (service role bypasses RLS).
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, findCountry, parseArgs, fail, log, placeholderTables, supabaseAdmin, stripHelp, loadEnv } from './lib.mjs';
import { validateRestaurant } from './validate-restaurant.mjs';
import { processImages } from './process-images.mjs';

const BUCKET = 'restaurant-photos';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const intakeDir = args._[0] ? path.resolve(args._[0]) : null;
  const jsonPath = args.json ? path.resolve(args.json) : intakeDir ? path.join(intakeDir, 'restaurant.json') : null;
  const imagesDir = args.images ? path.resolve(args.images) : intakeDir;
  if (!jsonPath || !fs.existsSync(jsonPath)) fail('usage: node scripts/add-restaurant.mjs <intake-dir> | --json <file> --images <dir>  (restaurant.json not found)');

  const config = loadConfig();
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const v = validateRestaurant(raw, { config, imagesDir });
  for (const w of v.warnings) console.warn(`⚠ ${w}`);
  if (!v.ok) {
    for (const e of v.errors) console.error(`✖ ${e}`);
    fail('fix the intake JSON and re-run');
  }
  const d = v.data;
  const country = findCountry(config, d.country);
  if (args.draft) d.status = 'draft';

  // Tables: real inventory or a flagged placeholder set.
  let tables = d.tables;
  let placeholder = d.tables_are_placeholder;
  if (tables.length === 0) {
    tables = placeholderTables(d.capacity_covers);
    placeholder = true;
    log(`no tables given — seeding ${tables.length} placeholder tables (${tables.reduce((s, t) => s + t.max_party, 0)} covers). Owner must confirm in the dashboard.`);
  }

  // Images → variants
  const tmpDir = path.resolve('.tmp', d.slug);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const manifest = await processImages(v.images, { slug: d.slug, outDir: tmpDir });
  const photoMeta = (i) => d.photos[i] ?? {};
  const photoRows = manifest.map((m, i) => ({
    storage_path_base: m.base,
    width: m.width,
    height: m.height,
    blur_data_url: m.blurDataURL,
    alt: photoMeta(i).alt ?? Object.fromEntries(country.locales.map((l) => [l, `${d.translations[l].name} – ${l === 'el' ? 'φωτογραφία' : 'photo'} ${i + 1}`])),
    sort_order: i,
    is_cover: d.photos.length ? Boolean(photoMeta(i).is_cover) : i === 0,
    files: m.files,
  }));
  if (d.photos.length && !photoRows.some((p) => p.is_cover)) photoRows[0].is_cover = true;

  if (args['dry-run']) {
    log(`DRY RUN — would upsert '${d.slug}' (${d.status}) in ${d.region}/${d.area ?? '-'} with ${photoRows.length} photos, ${tables.length} tables${placeholder ? ' (placeholder)' : ''}, ${d.service_periods.length} service periods`);
    log(`processed images are in ${tmpDir}`);
    return;
  }

  const sb = await supabaseAdmin();
  const must = (res, what) => {
    if (res.error) fail(`${what}: ${res.error.message}`);
    return res.data;
  };

  // Geography ids (seeded from config by scripts/seed-config.mjs)
  const region = must(await sb.from('regions').select('id').eq('country_code', d.country).eq('slug', d.region).maybeSingle(), 'region lookup');
  if (!region) fail(`region '${d.region}' is not in the database — run: node scripts/seed-config.mjs`);
  let areaId = null;
  if (d.area) {
    const area = must(await sb.from('areas').select('id').eq('region_id', region.id).eq('slug', d.area).maybeSingle(), 'area lookup');
    if (!area) fail(`area '${d.area}' is not in the database — run: node scripts/seed-config.mjs`);
    areaId = area.id;
  }

  // Restaurant row
  const existing = must(await sb.from('restaurants').select('id, status').eq('slug', d.slug).maybeSingle(), 'restaurant lookup');
  const row = {
    slug: d.slug,
    country_code: d.country,
    region_id: region.id,
    area_id: areaId,
    status: d.status,
    booking_mode: d.booking_mode,
    price_band: d.price_band,
    phone: d.contact.phone ?? null,
    whatsapp: d.contact.whatsapp ?? null,
    email: d.contact.email ?? null,
    website: d.contact.website ?? null,
    instagram: d.contact.instagram ?? null,
    menu_url: d.contact.menu_url ?? null,
    google_maps_url: d.contact.google_maps_url ?? null,
    address_line: d.location.address_line ?? null,
    postcode: d.location.postcode ?? null,
    lat: d.location.lat,
    lng: d.location.lng,
    timezone: country.timezone,
    min_party: d.booking_rules.min_party,
    max_party: d.booking_rules.max_party,
    lead_time_minutes: d.booking_rules.lead_time_minutes,
    max_advance_days: d.booking_rules.max_advance_days,
    turn_minutes: d.booking_rules.turn_minutes,
    slot_interval_minutes: d.booking_rules.slot_interval_minutes,
    features: d.features,
    is_featured: d.is_featured,
    tables_are_placeholder: placeholder,
    owner_notes: d.owner_notes ?? null,
  };
  let restaurantId;
  if (existing) {
    must(await sb.from('restaurants').update(row).eq('id', existing.id), 'restaurant update');
    restaurantId = existing.id;
    log(`updated restaurant ${d.slug} (${restaurantId})`);
  } else {
    const inserted = must(await sb.from('restaurants').insert(row).select('id').single(), 'restaurant insert');
    restaurantId = inserted.id;
    log(`created restaurant ${d.slug} (${restaurantId})`);
  }

  // Translations
  must(await sb.from('restaurant_translations').upsert(
    country.locales.map((l) => ({
      restaurant_id: restaurantId,
      locale: l,
      name: d.translations[l].name,
      tagline: d.translations[l].tagline ?? null,
      description: d.translations[l].description ?? null,
      is_machine_translated: d.translations[l].is_machine_translated,
    })),
    { onConflict: 'restaurant_id,locale' },
  ), 'translations');

  // Cuisines (replace)
  must(await sb.from('restaurant_cuisines').delete().eq('restaurant_id', restaurantId), 'cuisines clear');
  must(await sb.from('restaurant_cuisines').insert(d.cuisines.map((c, i) => ({ restaurant_id: restaurantId, cuisine_slug: c, is_primary: i === 0 }))), 'cuisines');

  // Opening hours (replace, expanded per weekday)
  must(await sb.from('opening_hours').delete().eq('restaurant_id', restaurantId), 'hours clear');
  const hourRows = d.opening_hours.flatMap((h) => h.weekdays.map((wd) => ({ restaurant_id: restaurantId, weekday: wd, opens: h.opens, closes: h.closes })));
  if (hourRows.length) must(await sb.from('opening_hours').insert(hourRows), 'hours');

  // Service periods (replace)
  must(await sb.from('service_periods').delete().eq('restaurant_id', restaurantId), 'service periods clear');
  if (d.service_periods.length) {
    must(await sb.from('service_periods').insert(d.service_periods.map((sp) => ({
      restaurant_id: restaurantId,
      name: sp.name,
      weekdays: sp.weekdays,
      first_seating: sp.first_seating,
      last_seating: sp.last_seating,
      slot_interval_minutes: sp.slot_interval_minutes ?? null,
      turn_minutes: sp.turn_minutes ?? null,
      max_covers_per_slot: sp.max_covers_per_slot ?? null,
    }))), 'service periods');
  }

  // Tables: never silently overwrite what an owner may have edited in the dashboard.
  const existingTables = must(await sb.from('dining_tables').select('id').eq('restaurant_id', restaurantId), 'tables lookup');
  if (existingTables.length && !args['replace-tables']) {
    log(`tables unchanged (${existingTables.length} exist) — pass --replace-tables to swap them`);
  } else {
    if (existingTables.length) {
      // Bookings reference tables, so deactivate instead of deleting.
      must(await sb.from('dining_tables').update({ is_active: false, is_online_bookable: false }).eq('restaurant_id', restaurantId), 'tables deactivate');
    }
    must(await sb.from('dining_tables').insert(tables.map((t, i) => ({
      restaurant_id: restaurantId,
      label: t.label,
      min_party: t.min_party ?? 1,
      max_party: t.max_party,
      is_online_bookable: t.is_online_bookable ?? true,
      sort_order: i,
    }))), 'tables');
    log(`tables: ${tables.length} inserted${placeholder ? ' (placeholder — flagged for owner review)' : ''}`);
  }

  // Photos
  const existingPhotos = must(await sb.from('photos').select('id, storage_path').eq('restaurant_id', restaurantId), 'photos lookup');
  if (existingPhotos.length && !args['replace-photos']) {
    log(`photos unchanged (${existingPhotos.length} exist) — pass --replace-photos to re-upload`);
  } else {
    if (existingPhotos.length) {
      const { data: objects } = await sb.storage.from(BUCKET).list(restaurantId, { limit: 1000 });
      if (objects?.length) must(await sb.storage.from(BUCKET).remove(objects.map((o) => `${restaurantId}/${o.name}`)), 'storage cleanup');
      must(await sb.from('photos').delete().eq('restaurant_id', restaurantId), 'photos clear');
    }
    for (const p of photoRows) {
      for (const f of p.files) {
        const objectPath = `${restaurantId}/${path.basename(f.path)}`;
        must(await sb.storage.from(BUCKET).upload(objectPath, fs.readFileSync(f.path), { contentType: 'image/webp', upsert: true, cacheControl: '31536000' }), `upload ${objectPath}`);
      }
    }
    must(await sb.from('photos').insert(photoRows.map((p) => ({
      restaurant_id: restaurantId,
      storage_path: `${restaurantId}/${p.storage_path_base}`,
      width: p.width,
      height: p.height,
      blur_data_url: p.blur_data_url,
      alt: p.alt,
      sort_order: p.sort_order,
      is_cover: p.is_cover,
    }))), 'photos');
    log(`photos: ${photoRows.length} uploaded (${photoRows.length * 3} files)`);
  }

  // Audit copy in the repo so the intake can be re-run or diffed later.
  const auditDir = path.resolve('data/restaurants');
  fs.mkdirSync(auditDir, { recursive: true });
  fs.writeFileSync(path.join(auditDir, `${d.slug}.json`), JSON.stringify({ ...stripHelp(raw), _restaurant_id: restaurantId, _last_synced: new Date().toISOString() }, null, 2));

  if (!args['keep-tmp']) fs.rmSync(tmpDir, { recursive: true, force: true });

  loadEnv();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  console.log('');
  log(`DONE — ${d.translations[country.default_locale].name} is ${d.status}`);
  for (const l of country.locales) log(`  ${site}/${l}/restaurant/${d.slug}`);
  const followUps = [];
  if (placeholder) followUps.push('table inventory is a placeholder — owner should confirm tables in the dashboard');
  for (const l of country.locales) if (d.translations[l].is_machine_translated) followUps.push(`${l} text was machine-written — flagged for review in the dashboard`);
  if (!d.contact.phone) followUps.push('no phone number — guests have no fallback if online booking fails');
  if (followUps.length) {
    console.log('');
    log('needs a human:');
    for (const f of followUps) console.log(`   • ${f}`);
  }
}

main().catch((err) => fail(err.stack ?? String(err)));
