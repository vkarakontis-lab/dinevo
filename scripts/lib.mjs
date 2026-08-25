// Shared helpers for the operational scripts. Copied into <project>/scripts/ on scaffold.
// Zero dependencies beyond what the project already installs (zod, sharp, @supabase/supabase-js).
import fs from 'node:fs';
import path from 'node:path';


/** Minimal .env parser so scripts work outside Next.js without adding dotenv. */
export function loadEnv(files = ['.env.local', '.env']) {
  for (const f of files) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
  return process.env;
}

export function requireEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}. Add them to .env.local (see .env.local.example).`);
  }
}

/** Config JSON lives in src/config (Next app) — allow override for tests. */
export function configDir() {
  const candidates = [process.env.CONFIG_DIR, 'src/config', 'config'].filter(Boolean);
  for (const c of candidates) {
    const p = path.resolve(process.cwd(), c);
    if (fs.existsSync(path.join(p, 'countries.json'))) return p;
  }
  throw new Error('Could not find config dir with countries.json (looked in src/config, config, $CONFIG_DIR).');
}

export function loadConfig() {
  const dir = configDir();
  const read = (n) => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
  const countries = read('countries.json').countries;
  const cuisines = read('cuisines.json').cuisines;
  const features = read('features.json').features;
  return { dir, countries, cuisines, features };
}

export function findCountry(config, code) {
  return config.countries.find((c) => c.code === code);
}

export function findRegion(country, slug) {
  return country?.regions?.find((r) => r.slug === slug);
}

export function findArea(region, slug) {
  return region?.areas?.find((a) => a.slug === slug);
}

/** Strip keys that start with '_' (template help text) recursively. */
export function stripHelp(value) {
  if (Array.isArray(value)) return value.map(stripHelp);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => [k, stripHelp(v)])
    );
  }
  return value;
}

const GREEK_MAP = {
  α: 'a', ά: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', έ: 'e', ζ: 'z', η: 'i', ή: 'i', θ: 'th', ι: 'i', ί: 'i', ϊ: 'i', ΐ: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', ό: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', ύ: 'y', ϋ: 'y', ΰ: 'y',
  φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o', ώ: 'o',
};

/** kebab-case ASCII slug; transliterates Greek so 'Ταβέρνα Ο Γιώργος' -> 'taverna-o-giorgos'. */
export function slugify(input) {
  const lower = String(input).toLowerCase();
  let out = '';
  for (const ch of lower) out += GREEK_MAP[ch] ?? ch;
  return out
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Placeholder table set from a covers figure (or a sensible default). Owner fixes in the dashboard. */
export function placeholderTables(capacityCovers) {
  const covers = Number(capacityCovers) || 36;
  const tables = [];
  let remaining = covers;
  let n = 1;
  // Roughly 40% twos, 40% fours, 20% sixes by covers — mirrors a typical small restaurant.
  const plan = [
    [Math.max(1, Math.round((covers * 0.4) / 2)), 1, 2],
    [Math.max(1, Math.round((covers * 0.4) / 4)), 2, 4],
    [Math.max(1, Math.round((covers * 0.2) / 6)), 4, 6],
  ];
  for (const [count, min, max] of plan) {
    for (let i = 0; i < count && remaining > 0; i++) {
      tables.push({ label: `T${n++}`, min_party: min, max_party: max, sort_order: n });
      remaining -= max;
    }
  }
  return tables;
}

export function log(msg, ...rest) {
  console.log(`▸ ${msg}`, ...rest);
}

export function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

export async function supabaseAdmin() {
  loadEnv();
  requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) args[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[k] = argv[++i];
      else args[k] = true;
    } else args._.push(a);
  }
  return args;
}

