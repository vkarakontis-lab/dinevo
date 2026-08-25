import { createPublicClient } from "@/lib/supabase/public";
import type { AvailabilitySlot } from "@/lib/supabase/database.types";

// The ONLY slot source. Never recompute slots in TypeScript — they would
// drift from what create_booking accepts.
export async function getAvailability(
  restaurantId: string,
  date: string, // yyyy-MM-dd in the restaurant's local time zone
  party: number,
): Promise<AvailabilitySlot[]> {
  const sb = createPublicClient();
  const { data, error } = await sb.rpc("get_availability", {
    p_restaurant_id: restaurantId,
    p_date: date,
    p_party_size: party,
  });
  if (error) throw error;
  return data ?? [];
}

// Cheap "next available day" hint: walk forward up to `days` days.
export async function findNextAvailableDay(
  restaurantId: string,
  fromDate: string,
  party: number,
  days = 7,
): Promise<string | null> {
  const start = new Date(`${fromDate}T00:00:00Z`);
  for (let i = 1; i <= days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    try {
      const slots = await getAvailability(restaurantId, iso, party);
      if (slots.some((s) => s.available)) return iso;
    } catch {
      return null;
    }
  }
  return null;
}
