import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { isUserAdmin } from "@/server/auth/admin";
import { createOrder } from "@/server/orders/orders";
import { getStoreSettings } from "@/server/settings/settings";
import { enforceRateLimit } from "@/server/rate-limit";

type OrderRequest = {
  orderId?: string;
  items?: {
    productId?: unknown;
    quantity?: unknown;
    serverName?: unknown;
    serverLocation?: unknown;
    serverPassword?: unknown;
    rconPassword?: unknown;
    extraSlots?: unknown;
  }[];
};

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "orders-create", { limit: 30, windowMs: 5 * 60_000 });
  if (limited) return limited;

  const settings = await getStoreSettings();
  if (!settings.sandboxEnabled) {
    return NextResponse.json(
      {
        error:
          "Online checkout is currently disabled. Please contact us directly on WhatsApp to place your order with no login required.",
      },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in before requesting a server." }, { status: 401 });

  if (isUserAdmin(user))
    return NextResponse.json(
      { error: "Admins cannot place orders or purchase items." },
      { status: 403 },
    );

  const body = (await request.json().catch(() => null)) as OrderRequest | null;
  const orderId = body?.orderId?.trim();
  if (!orderId || !/^[a-zA-Z0-9_-]{3,80}$/.test(orderId))
    return NextResponse.json({ error: "A valid orderId is required." }, { status: 400 });
  if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 10)
    return NextResponse.json({ error: "Provide between 1 and 10 request items." }, { status: 400 });

  const items = body.items.map((item) => ({
    productId: typeof item.productId === "string" ? item.productId : "",
    quantity: typeof item.quantity === "number" ? item.quantity : 1,
    serverName: typeof item.serverName === "string" ? item.serverName.trim().slice(0, 100) : undefined,
    serverLocation: typeof item.serverLocation === "string" ? item.serverLocation.trim().slice(0, 100) : undefined,
    serverPassword: typeof item.serverPassword === "string" ? item.serverPassword.trim().slice(0, 100) : undefined,
    rconPassword: typeof item.rconPassword === "string" ? item.rconPassword.trim().slice(0, 100) : undefined,
    extraSlots:
      typeof item.extraSlots === "number"
        ? Math.min(12, Math.max(0, Math.round(item.extraSlots / 4) * 4))
        : item.extraSlots === true
        ? 4
        : undefined,
  }));
  if (
    items.some(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99,
    )
  )
    return NextResponse.json({ error: "One or more request items are invalid." }, { status: 400 });

  try {
    const order = await createOrder(user, { orderId, items });
    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("Order request creation failed", error);
    return NextResponse.json({ error: "Unable to submit the server request." }, { status: 400 });
  }
}
