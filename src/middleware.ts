import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Session refresh + coarse redirect for protected areas.
 *
 * Next.js 16 renamed middleware to `proxy` (Node.js runtime). BridgeConnect
 * deploys to Cloudflare via OpenNext, where Node.js proxy support is
 * experimental while edge-runtime middleware is fully supported — so we keep the
 * `middleware` convention deliberately. Revisit when OpenNext marks Node
 * middleware stable.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
