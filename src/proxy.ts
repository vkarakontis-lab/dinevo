import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  // Redirects/rewrites from next-intl (e.g. / → /en) pass through untouched;
  // session refresh only matters for pages that actually render.
  if (response.headers.get("location")) return response;
  return updateSession(request, response);
}

export const config = {
  // /auth is excluded: the magic-link landing route must never be locale-
  // redirected by next-intl or the login link would 404.
  matcher: [
    "/((?!api|auth|_next|_vercel|.*\\..*).*)",
  ],
};
