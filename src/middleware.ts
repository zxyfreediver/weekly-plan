import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "wj_session_user";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }
  const userId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!api|_next|favicon|manifest|icons).*)"],
};
