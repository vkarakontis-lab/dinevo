import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, BookingSource } from "@/lib/supabase/database.types";

// Day windows are built from LOCAL calendar dates via fromZonedTime — never
// "start + 24h", which is wrong on DST transition days.
export function localDayStart(day: string, timezone: string): Date {
  return fromZonedTime(`${day}T00:00:00`, timezone);
}

export function addLocalDays(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DashboardBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  party_size: number;
  status: BookingStatus;
  source: BookingSource;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  confirmation_code: string;
  created_at: string;
  dining_tables: { label: string } | null;
};

const SELECT = `id, starts_at, ends_at, party_size, status, source, guest_name,
  guest_email, guest_phone, special_requests, confirmation_code, created_at,
  dining_tables(label)`;

export async function getBookingsForDay(
  restaurantId: string,
  timezone: string,
  date?: string, // yyyy-MM-dd in restaurant tz; default today
): Promise<DashboardBooking[]> {
  const sb = await createClient();
  const day = date ?? formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const start = localDayStart(day, timezone);
  const end = localDayStart(addLocalDays(day, 1), timezone);
  const { data } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  return (data ?? []) as unknown as DashboardBooking[];
}

export async function getUpcomingBookings(
  restaurantId: string,
  timezone: string,
  days = 14,
): Promise<DashboardBooking[]> {
  const sb = await createClient();
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const start = localDayStart(today, timezone);
  const end = localDayStart(addLocalDays(today, days), timezone);
  const { data } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  return (data ?? []) as unknown as DashboardBooking[];
}

export async function searchBookings(
  restaurantId: string,
  query: string,
): Promise<DashboardBooking[]> {
  const sb = await createClient();
  const q = query.trim();
  if (!q) return [];
  const { data } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
    .or(`guest_name.ilike.%${q.replace(/[%,()]/g, "")}%,confirmation_code.eq.${q.toUpperCase()}`)
    .order("starts_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as DashboardBooking[];
}
