import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? "b2lead-secret-key-must-be-32-chars-long!!",
  cookieName: "b2lead-session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true },
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return response;
  }

  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.userId && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.userId && pathname === "/login") {
    const dest = session.role === "operator" ? "/operator/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (session.userId && pathname.startsWith("/operator") && session.role !== "operator") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
