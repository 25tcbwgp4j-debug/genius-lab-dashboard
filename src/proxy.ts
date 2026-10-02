import { NextRequest, NextResponse } from "next/server";

// 02/10/2026 — DASHBOARD DISMESSA. Le schede Genius vivono nel «Genius Lab Gestionale»
// (https://genius-lab-gestionale.vercel.app/assistenza). Questo proxy (Next.js 16, ex middleware):
//  - /track/<token> e /estimate/<token> (link pubblici mandati ai clienti) → la pagina pubblica della stessa
//    scheda nel nuovo backend: le schede del gestionale hanno preso il token dei ticket di questa dashboard
//    (TARATURE/backend/scripts/assistenza/allinea_token_vecchia_dashboard.py);
//  - tutte le altre pagine → /assistenza del gestionale;
//  - le rotte /api/* restano come prima (webhook, documenti, cron): non sono pagine.

const GESTIONALE = "https://genius-lab-gestionale.vercel.app/assistenza";
const PAGINA_PUBBLICA = "https://tarature-api-production.up.railway.app/api/assistenza/pubblico";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const link = pathname.match(/^\/(?:track|estimate)\/([^/]+)\/?$/);
  if (link) {
    // token della vecchia dashboard: 32 caratteri esadecimali (quelli del bot, non esadecimali, non esistono nel gestionale)
    const token = /^[a-f0-9]{32}$/.test(link[1]) ? link[1] : "0".repeat(32);
    return NextResponse.redirect(`${PAGINA_PUBBLICA}/${token}/pagina`, 307);
  }

  return NextResponse.redirect(GESTIONALE, 307);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
