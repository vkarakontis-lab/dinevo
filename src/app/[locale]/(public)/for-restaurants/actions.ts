"use server";

import { z } from "zod";
import { Resend } from "resend";
import { BRAND } from "@/config/brand";

const schema = z.object({
  restaurantName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

// "List your restaurant" leads go to the platform admin by email — there is
// deliberately no self-signup for restaurants.
export async function submitListingRequest(
  raw: z.input<typeof schema>,
): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  if (parsed.data.website) return { ok: true }; // bot — pretend success

  const to = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !to) {
    console.warn("[for-restaurants] lead received but email not configured:", parsed.data);
    return { ok: true };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const d = parsed.data;
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${BRAND.name} <onboarding@resend.dev>`,
      to,
      subject: `Listing request: ${d.restaurantName}`,
      text: [
        `Restaurant: ${d.restaurantName}`,
        `Contact: ${d.contactName}`,
        `Email: ${d.email}`,
        `Phone: ${d.phone || "—"}`,
        "",
        d.message || "",
      ].join("\n"),
    });
  } catch (err) {
    console.error("[for-restaurants] failed to email lead:", err);
  }
  return { ok: true };
}
