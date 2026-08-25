import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

// setRequestLocale here keeps the whole public segment statically renderable
// — without it, getTranslations() falls back to headers() and silently turns
// every ISR page dynamic.
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {/* flex-1 keeps the footer at the bottom on short pages (404, empty results) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
