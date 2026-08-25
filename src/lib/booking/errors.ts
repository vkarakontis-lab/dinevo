// Stable error tokens raised by the create_booking / cancel_booking_by_token
// RPCs, mapped to booking.errors.* message keys. Anything unknown → generic.
const KNOWN = [
  "no_availability",
  "slot_full",
  "too_soon",
  "too_far_ahead",
  "outside_service_hours",
  "closed",
  "party_size_out_of_range",
  "restaurant_not_bookable",
  "guest_name_required",
  "cannot_cancel",
] as const;

// invalid_email is raised by input validation (client and server), not the RPC.
export type BookingErrorCode =
  | (typeof KNOWN)[number]
  | "invalid_email"
  | "generic";

export const mapBookingError = (msg: string): BookingErrorCode =>
  KNOWN.find((k) => msg.includes(k)) ?? "generic";
