import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const nextAction = request.headers.get("next-action");

  // Drop automated bot probes attempting to fuzz the next-action header
  // (e.g. "0", "1", "action", "x"). Real Next.js server actions use 32-64 char cryptographic IDs.
  if (nextAction && (!/^[a-f0-9]{32,64}$/i.test(nextAction) || nextAction.length < 32)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
