#!/usr/bin/env node
// Get lat/lng for an address, or extract them from a Google Maps link.
//   node scripts/geocode.mjs "Protaras Ave 12, Protaras, Cyprus"
//   node scripts/geocode.mjs "https://www.google.com/maps/place/.../@35.0091,34.0604,17z/..."
// Uses OpenStreetMap Nominatim (free; 1 request/sec; a User-Agent is mandatory).
// Always sanity-check the result against the country bbox — the validator does this too.
import { parseArgs, fail, log } from './lib.mjs';

export function coordsFromMapsUrl(url) {
  const s = decodeURIComponent(String(url));
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,            // place pin (most precise)
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,                // viewport centre (fallback)
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

export async function geocode(query, { countryCode = 'cy' } = {}) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '3');
  url.searchParams.set('countrycodes', countryCode.toLowerCase());
  const res = await fetch(url, { headers: { 'User-Agent': 'restaurant-booking-builder/1.0 (intake script)' } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const results = await res.json();
  return results.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name, type: r.type }));
}

if (process.argv[1] && process.argv[1].endsWith('geocode.mjs')) {
  const args = parseArgs(process.argv.slice(2));
  const q = args._.join(' ');
  if (!q) fail('usage: node scripts/geocode.mjs "<address>" | "<google maps url>" [--country CY]');
  if (/^https?:\/\//.test(q)) {
    const c = coordsFromMapsUrl(q);
    if (!c) {
      if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(q)) {
        const r = await fetch(q, { redirect: 'follow' }); // short links redirect to the full URL
        const c2 = coordsFromMapsUrl(r.url);
        if (c2) { log(`lat: ${c2.lat}  lng: ${c2.lng}  (from expanded short link)`); process.exit(0); }
      }
      fail('no coordinates found in that link — open it in a browser, copy the full URL from the address bar and retry');
    }
    log(`lat: ${c.lat}  lng: ${c.lng}`);
  } else {
    const results = await geocode(q, { countryCode: args.country ?? 'cy' });
    if (!results.length) fail('no match — try adding the town and "Cyprus", or paste a Google Maps link instead');
    for (const r of results) console.log(`${r.lat}, ${r.lng}  —  ${r.label} (${r.type})`);
    log('use the first result unless the label looks wrong; the validator rejects coordinates outside the country');
  }
}
