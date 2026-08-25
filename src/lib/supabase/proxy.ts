import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and redirects
// unauthenticated /dashboard and /admin hits to the login page.
// Server components still re-check membership — never trust the proxy alone.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  // Not configured yet (fresh checkout without a Supabase project): skip
  // session handling so public pages still render.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — a subtle
  // session-refresh bug otherwise.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = /^\/(en|el)\/(dashboard|admin)(\/|$)/.test(pathname);
  const isLogin = /^\/(en|el)\/dashboard\/login(\/|$)/.test(pathname);

  if (!user && isProtected && !isLogin) {
    const url = request.nextUrl.clone();
    const locale = pathname.split("/")[1] || "en";
    url.pathname = `/${locale}/dashboard/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
