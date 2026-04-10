import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth-password";

// Proxy Next.js 16 (ex middleware): protegge tutte le route dashboard tranne
// login, home pubblica e rotte pubbliche (/track, /estimate).
// Verifica il token HMAC nel cookie httpOnly, redirige a /login se mancante o invalido.
// Stesso pattern della dashboard Tarature.

// Route pubbliche accessibili senza login
const PUBLIC_PATHS = ["/", "/login", "/track", "/estimate"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(p + "/");
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route pubbliche: nessuna verifica auth
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // API pubbliche del chatbot / webhook (esposte al backend)
  if (pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/documents/")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "";

  // Se l'auth non e' configurata sul deploy, blocca tutto per sicurezza
  if (!secret) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token, secret))) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Escludi asset statici e favicon dal proxy (non servono auth)
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
