import { NextResponse } from "next/server";
import { getStoreSettings } from "@/server/settings/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json({
    taxEnabled: settings.taxEnabled,
    taxRate: settings.taxRate,
    sandboxEnabled: settings.sandboxEnabled,
    whatsappNumber: settings.whatsappNumber,
  });
}
