import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  // Use exact-or-slash-boundary match so "/log" doesn't accidentally claim "/login".
  const matches = (p: string) => url.pathname === p || url.pathname.startsWith(p + "/");
  const isAuthRoute = matches("/login") || matches("/signup");
  const protectedPaths = ["/log", "/profile", "/recommendations"];
  const needsAuth = protectedPaths.some(matches);

  // eslint-disable-next-line no-console
  console.log(
    `[mw] ${request.method} ${url.pathname}${url.search} · user=${user?.id ?? "null"}` +
      (authError ? ` · authErr=${authError.message}` : "") +
      ` · isAuth=${isAuthRoute} · needsAuth=${needsAuth}`,
  );

  // When middleware redirects, we MUST copy cookies that supabase.auth.getUser() refreshed
  // into the local `response` — otherwise the browser keeps replaying stale tokens and we
  // can loop between /login and the protected page until the browser gives up.
  function redirectTo(pathname: string, withNext?: string) {
    const target = url.clone();
    target.pathname = pathname;
    if (withNext) target.searchParams.set("next", withNext);
    else target.searchParams.delete("next");
    const out = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  }

  if (!user && needsAuth) {
    // eslint-disable-next-line no-console
    console.log(`[mw]  → redirect /login?next=${url.pathname}`);
    return redirectTo("/login", url.pathname);
  }

  if (user && isAuthRoute) {
    // eslint-disable-next-line no-console
    console.log(`[mw]  → redirect /`);
    return redirectTo("/");
  }

  return response;
}
