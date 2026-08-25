import { formatInTimeZone } from "date-fns-tz";
import { fromZonedTime } from "date-fns-tz";
import manifest from "../../../public/demo/manifest.json";
import type {
  RestaurantListItem,
  RestaurantProfile,
  PhotoData,
} from "@/lib/data/restaurants";
import type {
  AvailabilitySlot,
  BookingByToken,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// DEMO MODE — active ONLY while Supabase is not configured (placeholder keys).
// Lets the site be browsed and the booking flow be tried end to end before the
// real database exists. The moment .env.local has real Supabase values, all of
// this is dead code: the data layer goes straight to Postgres.
// Demo slots/bookings live here and are NOT the availability engine — the real
// rules run in Postgres (get_availability / create_booking).
// ---------------------------------------------------------------------------

export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

type ManifestEntry = { base: string; width: number; height: number; blurDataURL: string };
const photosFor = (slug: string): PhotoData[] =>
  ((manifest as Record<string, ManifestEntry[]>)[slug] ?? []).map((m, i) => ({
    storage_path: m.base,
    blur_data_url: m.blurDataURL,
    alt: null,
    sort_order: i,
    is_cover: i === 0,
  }));

const TZ = "Asia/Nicosia";

const base = {
  booking_mode: "instant",
  timezone: TZ,
  is_featured: true,
  country_code: "CY",
  phone: "+357 99 123456",
  whatsapp: "+357 99 123456",
  website: null,
  instagram: null,
  menu_url: null,
  google_maps_url: null,
  postcode: null,
  min_party: 1,
  max_party: 8,
  max_advance_days: 60,
  updated_at: "2026-08-01T00:00:00Z",
};

const HOURS_EVENING = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "18:00",
  closes: "23:30",
}));
const HOURS_ALL_DAY = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) => [
  { weekday, opens: "12:00", closes: "15:30" },
  { weekday, opens: "18:00", closes: "23:00" },
]);

export const demoRestaurants: RestaurantProfile[] = [
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000001",
    slug: "to-limanaki",
    price_band: 3,
    lat: 34.6702,
    lng: 33.0398,
    address_line: "Limassol Marina, Old Port Walk 12",
    rating: 4.7,
    review_count: 284,
    features: ["sea-view", "outdoor-seating", "romantic", "card-payment"],
    restaurant_translations: [
      {
        locale: "en",
        name: "To Limanaki",
        tagline: "Fish straight off the boats, tables a step from the water.",
        description:
          "A family fish taverna on the old harbour since 1989. The catch comes in each morning — sea bream, red mullet, octopus dried in the sun the old way — and goes straight to the charcoal. Order the grilled octopus with lemon and village olive oil, a cold carafe of local white, and watch the boats come in.",
        is_machine_translated: false,
      },
      {
        locale: "el",
        name: "Το Λιμανάκι",
        tagline: "Ψάρι κατευθείαν από τις βάρκες, τραπέζια δίπλα στο κύμα.",
        description:
          "Οικογενειακή ψαροταβέρνα στο παλιό λιμάνι από το 1989. Η ψαριά έρχεται κάθε πρωί — τσιπούρα, μπαρμπούνι, χταπόδι λιασμένο στον ήλιο όπως παλιά — και πάει κατευθείαν στα κάρβουνα. Παραγγείλτε χταπόδι σχάρας με λεμόνι και χωριάτικο ελαιόλαδο, μια παγωμένη καράφα ντόπιο λευκό, και δείτε τις βάρκες να γυρίζουν.",
        is_machine_translated: false,
      },
    ],
    photos: photosFor("to-limanaki"),
    restaurant_cuisines: [
      { cuisine_slug: "seafood", is_primary: true },
      { cuisine_slug: "taverna", is_primary: false },
    ],
    opening_hours: HOURS_ALL_DAY,
    regions: { slug: "limassol" },
    areas: { slug: "limassol-marina" },
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    slug: "anogi-meze-house",
    price_band: 2,
    lat: 35.1731,
    lng: 33.3635,
    address_line: "Onasagorou 71, Old Nicosia",
    rating: 4.5,
    review_count: 167,
    features: ["outdoor-seating", "groups", "traditional-village", "vegan-options"],
    restaurant_translations: [
      {
        locale: "en",
        name: "Anogi Meze House",
        tagline: "Eighteen small plates, one shaded courtyard in old Nicosia.",
        description:
          "Hidden in a restored sandstone house within the Venetian walls, Anogi serves meze the way Cypriot grandmothers do: no menu decisions, just wave after wave of small plates. Halloumi seared on the flame, slow braises, wild greens, warm bread — and always something sweet with mountain tea to finish. Come hungry, stay long.",
        is_machine_translated: false,
      },
      {
        locale: "el",
        name: "Ανώγι Μεζέ",
        tagline: "Δεκαοκτώ πιατάκια, μια δροσερή αυλή στην παλιά Λευκωσία.",
        description:
          "Κρυμμένο σε ένα αναπαλαιωμένο πετρόχτιστο σπίτι μέσα στα ενετικά τείχη, το Ανώγι σερβίρει μεζέ όπως οι Κύπριες γιαγιάδες: χωρίς αποφάσεις από μενού, μόνο κύματα από πιατάκια. Χαλλούμι στη φλόγα, σιγομαγειρεμένα φαγητά, άγρια χόρτα, ζεστό ψωμί — και πάντα κάτι γλυκό με τσάι του βουνού στο τέλος. Ελάτε πεινασμένοι, μείνετε ώρες.",
        is_machine_translated: false,
      },
    ],
    photos: photosFor("anogi-meze-house"),
    restaurant_cuisines: [
      { cuisine_slug: "cypriot-meze", is_primary: true },
      { cuisine_slug: "taverna", is_primary: false },
    ],
    opening_hours: HOURS_EVENING,
    regions: { slug: "nicosia" },
    areas: { slug: "nicosia-old-town" },
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000003",
    slug: "elia-thymari",
    price_band: 3,
    lat: 35.0125,
    lng: 34.0583,
    address_line: "Cavo Greko Avenue 8, Protaras",
    rating: 4.8,
    review_count: 341,
    features: ["sunset-view", "outdoor-seating", "romantic", "kid-friendly"],
    restaurant_translations: [
      {
        locale: "en",
        name: "Elia & Thymari",
        tagline: "Modern Cypriot cooking on a terrace facing the sunset.",
        description:
          "Elia & Thymari takes the island's classics and lightens them: kleftiko falls off the bone after nine slow hours, the Greek salad comes with barrel-aged feta and mountain oregano, and the moussaka is baked to order in clay. The terrace looks west over Fig Tree Bay — book the 19:30 seating for the full sunset show.",
        is_machine_translated: false,
      },
      {
        locale: "el",
        name: "Ελιά & Θυμάρι",
        tagline: "Σύγχρονη κυπριακή κουζίνα σε βεράντα με θέα το ηλιοβασίλεμα.",
        description:
          "Το Ελιά & Θυμάρι παίρνει τα κλασικά του νησιού και τα ελαφραίνει: το κλέφτικο λιώνει μετά από εννιά ώρες σιγανό ψήσιμο, η χωριάτικη έρχεται με φέτα βαρελίσια και ρίγανη του βουνού, και ο μουσακάς ψήνεται στη στιγμή σε πήλινο. Η βεράντα βλέπει δυτικά προς το Fig Tree Bay — κλείστε το τραπέζι των 19:30 για ολόκληρο το ηλιοβασίλεμα.",
        is_machine_translated: false,
      },
    ],
    photos: photosFor("elia-thymari"),
    restaurant_cuisines: [
      { cuisine_slug: "greek", is_primary: true },
      { cuisine_slug: "mediterranean", is_primary: false },
    ],
    opening_hours: HOURS_EVENING,
    regions: { slug: "famagusta" },
    areas: { slug: "protaras" },
  },
];

// ---- listings ----

export function demoList(filters: {
  regionSlug?: string;
  areaSlug?: string;
  cuisineSlug?: string;
  priceBands?: number[];
  features?: string[];
}): RestaurantListItem[] {
  return demoRestaurants.filter((r) => {
    if (filters.regionSlug && r.regions?.slug !== filters.regionSlug) return false;
    if (filters.areaSlug && r.areas?.slug !== filters.areaSlug) return false;
    if (
      filters.cuisineSlug &&
      !r.restaurant_cuisines.some((c) => c.cuisine_slug === filters.cuisineSlug)
    )
      return false;
    if (filters.priceBands?.length && !filters.priceBands.includes(r.price_band))
      return false;
    if (
      filters.features?.length &&
      !filters.features.every((f) => r.features.includes(f))
    )
      return false;
    return true;
  });
}

export function demoBySlug(slug: string): RestaurantProfile | null {
  return demoRestaurants.find((r) => r.slug === slug) ?? null;
}

// ---- availability (plausible, deterministic per restaurant+date) ----

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function demoAvailability(
  restaurantId: string,
  date: string,
  party: number,
): AvailabilitySlot[] {
  const r = demoRestaurants.find((x) => x.id === restaurantId);
  if (!r) return [];
  const slots: AvailabilitySlot[] = [];
  const lunch = r.opening_hours.some((h) => h.opens < "16:00");
  const periods = [
    ...(lunch
      ? [{ id: "demo-lunch", name: { en: "Lunch", el: "Μεσημέρι" }, from: 12 * 60, to: 14 * 60 + 30 }]
      : []),
    { id: "demo-dinner", name: { en: "Dinner", el: "Βράδυ" }, from: 18 * 60, to: 21 * 60 + 30 },
  ];
  const now = new Date();
  const seed = hash(`${restaurantId}:${date}:${party}`);
  let i = 0;
  for (const p of periods) {
    for (let m = p.from; m <= p.to; m += 30) {
      const hhmm = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const slotUtc = fromZonedTime(`${date}T${hhmm}:00`, r.timezone);
      const tooSoon = slotUtc.getTime() < now.getTime() + 60 * 60_000;
      // ~1 in 4 slots "taken", stable for a given day.
      const taken = (seed >> i % 28) % 4 === 0;
      const reason = tooSoon ? "too_soon" : taken ? "no_table" : null;
      slots.push({
        slot: slotUtc.toISOString(),
        slot_local: `${hhmm}:00`,
        service_period_id: p.id,
        service_name: p.name,
        available: reason === null,
        reason,
      });
      i++;
    }
  }
  return slots;
}

// ---- simulated bookings ----
// Primary store is a cookie set by the server action (survives serverless
// process hops); the in-memory Map is only a same-process fast path.

export type DemoBooking = BookingByToken & { guest_locale: string };
const demoBookings = new Map<string, DemoBooking>();

export const DEMO_BOOKING_COOKIE = "kratisi_demo_booking";

export function parseDemoBookingCookie(
  value: string | undefined,
  token: string,
): DemoBooking | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DemoBooking & { manage_token?: string };
    if (parsed.manage_token !== token) return null;
    if (typeof parsed.confirmation_code !== "string" || !parsed.starts_at)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createDemoBooking(input: {
  restaurantId: string;
  startsAt: string;
  party: number;
  name: string;
  requests?: string;
  locale: string;
}): {
  manageToken: string;
  confirmationCode: string;
  status: string;
  record: DemoBooking & { manage_token: string };
} | null {
  const r = demoRestaurants.find((x) => x.id === input.restaurantId);
  if (!r) return null;
  const token = crypto.randomUUID();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code =
    "CY-" +
    Array.from({ length: 6 }, () =>
      alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
    ).join("");
  const starts = new Date(input.startsAt);
  const ends = new Date(starts.getTime() + 90 * 60_000);
  const record: DemoBooking & { manage_token: string } = {
    id: crypto.randomUUID(),
    manage_token: token,
    confirmation_code: code,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    party_size: input.party,
    status: "confirmed",
    guest_name: input.name,
    special_requests: input.requests || null,
    restaurant_id: r.id,
    restaurant_slug: r.slug,
    restaurant_timezone: r.timezone,
    restaurant_phone: r.phone,
    restaurant_address: r.address_line,
    restaurant_lat: r.lat,
    restaurant_lng: r.lng,
    guest_locale: input.locale,
  };
  demoBookings.set(token, record);
  return { manageToken: token, confirmationCode: code, status: "confirmed", record };
}

export function getDemoBookingByToken(
  token: string,
  cookieValue?: string,
): DemoBooking | null {
  return demoBookings.get(token) ?? parseDemoBookingCookie(cookieValue, token);
}

export function cancelDemoBooking(
  token: string,
  cookieValue?: string,
): DemoBooking | null {
  const b = getDemoBookingByToken(token, cookieValue);
  if (!b || (b.status !== "confirmed" && b.status !== "pending")) return null;
  const cancelled = { ...b, status: "cancelled" as const };
  demoBookings.set(token, cancelled);
  return cancelled;
}

export function demoNameFor(restaurantId: string, locale: string): string | null {
  const r = demoRestaurants.find((x) => x.id === restaurantId);
  if (!r) return null;
  return (
    r.restaurant_translations.find((t) => t.locale === locale)?.name ??
    r.restaurant_translations[0]?.name ??
    null
  );
}

const today = () => formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
void today; // (kept for future demo seeding helpers)
