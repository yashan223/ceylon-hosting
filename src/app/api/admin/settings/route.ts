import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/admin";
import { getStoreSettings, updateStoreSettings } from "@/server/settings/settings";
import { recordAuditLog } from "@/server/admin/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  const body = (await request.json().catch(() => null)) as {
    taxEnabled?: unknown;
    taxRate?: unknown;
    sandboxEnabled?: unknown;
    whatsappNumber?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const taxEnabled = typeof body.taxEnabled === "boolean" ? body.taxEnabled : undefined;
  const taxRate =
    typeof body.taxRate === "number" && !isNaN(body.taxRate)
      ? Math.max(0, body.taxRate)
      : undefined;
  const sandboxEnabled = typeof body.sandboxEnabled === "boolean" ? body.sandboxEnabled : undefined;
  const whatsappNumber =
    typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : undefined;

  const updated = await updateStoreSettings({
    taxEnabled,
    taxRate,
    sandboxEnabled,
    whatsappNumber,
  });

  await recordAuditLog({
    action: "SYSTEM_EVENT",
    actorId: user.id,
    actorEmail: user.email,
    targetType: "system",
    targetId: "store_settings",
    targetName: "Store Settings",
    details: `Updated store settings: sandboxEnabled=${updated.sandboxEnabled}, taxEnabled=${updated.taxEnabled}, taxRate=${updated.taxRate}%, whatsappNumber=${updated.whatsappNumber}`,
  });

  revalidatePath("/", "layout");

  return NextResponse.json({ settings: updated });
}
