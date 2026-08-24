import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Renombrado de middleware.ts a proxy.ts: requerido desde Next.js 16
// (ver node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
