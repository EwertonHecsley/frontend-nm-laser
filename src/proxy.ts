import { NextResponse, type NextRequest } from "next/server";

import {
  FORBIDDEN_PATH,
  LOGIN_PATH,
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
} from "@/lib/auth/constants";
import { decodeAccessToken, isAccessTokenFresh } from "@/lib/auth/jwt";
import { getAllowedRoles } from "@/lib/auth/route-access";

function clearSession(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(SESSION_HINT_COOKIE);

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeAccessToken(token) : null;

  if (pathname === LOGIN_PATH) {
    if (session && isAccessTokenFresh(session)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return token ? clearSession(NextResponse.next()) : NextResponse.next();
  }

  if (!session || !isAccessTokenFresh(session)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return clearSession(NextResponse.redirect(loginUrl));
  }

  const allowedRoles = getAllowedRoles(pathname);

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.redirect(new URL(FORBIDDEN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
