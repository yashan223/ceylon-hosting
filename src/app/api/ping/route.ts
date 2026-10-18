import { NextResponse, NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cfLat = request.headers.get("cf-iplatitude");
  const cfLng = request.headers.get("cf-iplongitude");
  const cfCity = request.headers.get("cf-ipcity");
  const cfCountry = request.headers.get("cf-ipcountry");

  return NextResponse.json(
    {
      ok: true,
      timestamp: Date.now(),
      geo:
        cfLat && cfLng
          ? {
              lat: parseFloat(cfLat),
              lng: parseFloat(cfLng),
              city: cfCity || undefined,
              country: cfCountry || undefined,
            }
          : null,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
