import "server-only";
import { Resend } from "resend";
import { BookingEmail } from "./templates";
import { emailTranslator, emailLocale } from "./translator";
import { formatBookingDay, formatBookingTime } from "@/lib/dates";
import { BRAND } from "@/config/brand";

// Email must NEVER block or fail a booking — the row is already committed.
// Missing key → log and skip (dev); failures are logged for later replay.

export type BookingEmailData = {
  guestName: string;
  guestEmail: string | null;
  guestLocale: string;
  partySize: number;
  startsAt: string;
  confirmationCode: string;
  manageToken: string;
  status: string;
  restaurantName: string;
  restaurantEmail: string | null;
  restaurantTimezone: string;
  restaurantAddress: string | null;
  // Language for restaurant-facing emails, from the country's staff_locale.
  staffLocale?: string;
};

async function deliver(to: string, subject: string, react: React.ReactElement) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" → ${to}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${BRAND.name} <onboarding@resend.dev>`,
      to,
      subject,
      react,
    });
    if (error) console.error(`[email] send failed "${subject}" → ${to}:`, error);
  } catch (err) {
    console.error(`[email] send threw "${subject}" → ${to}:`, err);
  }
}

function lines(d: BookingEmailData, locale: string) {
  const t = emailTranslator(locale);
  const day = formatBookingDay(d.startsAt, d.restaurantTimezone, locale);
  const time = formatBookingTime(d.startsAt, d.restaurantTimezone);
  return {
    t,
    day,
    time,
    dateLine: `${day} · ${time}`,
    partyLine: t("common.people", { count: d.partySize }),
    manageUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${emailLocale(locale)}/booking/${d.manageToken}`,
  };
}

export async function sendGuestConfirmation(d: BookingEmailData) {
  if (!d.guestEmail) return;
  const { t, day, time, dateLine, partyLine, manageUrl } = lines(d, d.guestLocale);
  const pending = d.status === "pending";
  const subject = t("email.confirmationSubject", {
    restaurant: d.restaurantName,
    date: day,
    time,
  });
  await deliver(
    d.guestEmail,
    subject,
    <BookingEmail
      siteName={BRAND.name}
      preview={subject}
      heading={pending ? t("booking.pendingTitle") : t("booking.confirmedTitle")}
      intro={
        pending
          ? t("booking.pendingSubtitle")
          : t("email.confirmationIntro", { name: d.guestName })
      }
      restaurantName={d.restaurantName}
      dateLine={dateLine}
      partyLine={partyLine}
      address={d.restaurantAddress}
      confirmationCodeLabel={t("booking.confirmationCode")}
      confirmationCode={d.confirmationCode}
      ctaLabel={t("email.manageYourBooking")}
      ctaUrl={manageUrl}
      footer={t("email.seeYouThere")}
    />,
  );
}

export async function sendRestaurantNotification(d: BookingEmailData) {
  if (!d.restaurantEmail) return;
  const staff = d.staffLocale ?? "en";
  const { t, day, time, dateLine, partyLine } = lines(d, staff);
  const subject = t("email.restaurantNewBookingSubject", {
    count: d.partySize,
    date: day,
    time,
  });
  await deliver(
    d.restaurantEmail,
    subject,
    <BookingEmail
      siteName={BRAND.name}
      preview={subject}
      heading={subject}
      intro={d.guestName}
      restaurantName={d.restaurantName}
      dateLine={dateLine}
      partyLine={partyLine}
      confirmationCodeLabel={t("booking.confirmationCode")}
      confirmationCode={d.confirmationCode}
      ctaLabel={t("nav.dashboard")}
      ctaUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/${emailLocale(staff)}/dashboard`}
      footer=""
    />,
  );
}

export async function sendGuestCancellation(d: BookingEmailData) {
  if (!d.guestEmail) return;
  const { t, dateLine, partyLine } = lines(d, d.guestLocale);
  const subject = t("email.cancellationSubject", { restaurant: d.restaurantName });
  await deliver(
    d.guestEmail,
    subject,
    <BookingEmail
      siteName={BRAND.name}
      preview={subject}
      heading={t("booking.cancelledTitle")}
      intro={t("booking.cancelledSubtitle")}
      restaurantName={d.restaurantName}
      dateLine={dateLine}
      partyLine={partyLine}
      footer=""
    />,
  );
}

export async function sendRestaurantCancellation(d: BookingEmailData) {
  if (!d.restaurantEmail) return;
  const { t, dateLine, partyLine } = lines(d, d.staffLocale ?? "en");
  const subject = t("email.cancellationSubject", { restaurant: d.restaurantName });
  await deliver(
    d.restaurantEmail,
    subject,
    <BookingEmail
      siteName={BRAND.name}
      preview={subject}
      heading={subject}
      intro={d.guestName}
      restaurantName={d.restaurantName}
      dateLine={dateLine}
      partyLine={partyLine}
      confirmationCodeLabel={t("booking.confirmationCode")}
      confirmationCode={d.confirmationCode}
      footer=""
    />,
  );
}

export async function sendGuestReminder(d: BookingEmailData) {
  if (!d.guestEmail) return;
  const { t, time, dateLine, partyLine, manageUrl } = lines(d, d.guestLocale);
  const subject = t("email.reminderSubject", {
    restaurant: d.restaurantName,
    time,
  });
  await deliver(
    d.guestEmail,
    subject,
    <BookingEmail
      siteName={BRAND.name}
      preview={subject}
      heading={subject}
      intro={t("email.confirmationIntro", { name: d.guestName })}
      restaurantName={d.restaurantName}
      dateLine={dateLine}
      partyLine={partyLine}
      address={d.restaurantAddress}
      confirmationCodeLabel={t("booking.confirmationCode")}
      confirmationCode={d.confirmationCode}
      ctaLabel={t("email.manageYourBooking")}
      ctaUrl={manageUrl}
      footer={t("email.seeYouThere")}
    />,
  );
}
