import { z } from "zod";

export const bookingInputSchema = z.object({
  restaurantId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  party: z.number().int().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  requests: z.string().trim().max(500).optional().or(z.literal("")),
  locale: z.string().max(5),
  // Honeypot — a filled value means "probably a bot", but it must never make
  // the whole parse fail: browser autofill/password managers can stuff hidden
  // fields, and that used to surface as a generic error for real guests.
  website: z.string().max(500).optional().or(z.literal("")),
  turnstileToken: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
