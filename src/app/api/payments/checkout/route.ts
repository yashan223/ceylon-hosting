import type { CreateCheckoutParams } from "@payments-lk/node";
import { NextResponse } from "next/server";
import { getPaymentsLkClient, getPaymentsReturnUrl } from "@/server/payments/payments-lk";
import { getCurrentUser } from "@/server/auth/session";
import { isUserAdmin } from "@/server/auth/admin";
import { getOrderForUser } from "@/server/orders/orders";
import { enforceRateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

type CheckoutRequest = {
  orderId?: string;
};

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "payments-checkout", {
    limit: 20,
    windowMs: 5 * 60_000,
  });
  if (limited) return limited;

  let body: CheckoutRequest;

  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();

  if (!orderId || !/^[a-zA-Z0-9_-]{3,80}$/.test(orderId)) {
    return NextResponse.json({ error: "A valid orderId is required." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in before placing an order." }, { status: 401 });
  if (isUserAdmin(user))
    return NextResponse.json({ error: "Admins cannot purchase items." }, { status: 403 });
  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["requested", "accepted"].includes(order.status))
    return NextResponse.json(
      { error: "This order is no longer available for payment." },
      { status: 409 },
    );
  if (order.paymentStatus === "paid")
    return NextResponse.json({ error: "This order has already been paid." }, { status: 409 });

  try {
    const totalCents = order.items.reduce(
      (total, item) => total + Math.round(item.unitPrice * 100) * item.quantity,
      0,
    );

    if (totalCents < 1000) {
      return NextResponse.json(
        { error: "Order total must be at least Rs. 10.00 to process payment." },
        { status: 400 },
      );
    }

    const customerName = user.firstName?.trim() || user.email.split("@")[0] || "Customer";
    const customer = {
      name: customerName,
      email: user.email,
    };

    const baseParams = {
      reference: orderId,
      customer,
      successUrl: getPaymentsReturnUrl(
        `${process.env.PAYMENTS_LK_SUCCESS_PATH ?? "/checkout/success"}?order=${orderId}`,
      ),
      cancelUrl: getPaymentsReturnUrl(process.env.PAYMENTS_LK_CANCEL_PATH ?? "/"),
    };

    const canUseLineItems =
      order.items.length >= 1 &&
      order.items.length <= 10 &&
      order.items.every(
        ({ name, quantity, unitPrice }) =>
          name.trim().length > 0 &&
          quantity >= 1 &&
          quantity <= 99 &&
          Math.round(unitPrice * 100) >= 100,
      );

    const checkoutParams: CreateCheckoutParams = canUseLineItems
      ? {
          ...baseParams,
          lineItems: order.items.map(({ name, quantity, unitPrice }) => ({
            name: name.slice(0, 80),
            unitAmountCents: Math.round(unitPrice * 100),
            quantity,
          })),
        }
      : {
          ...baseParams,
          amountCents: totalCents,
          description: `Order #${orderId}`,
        };

    const checkout = await getPaymentsLkClient().checkouts.create(checkoutParams, {
      idempotencyKey: `order-${orderId}`,
    });

    return NextResponse.json({ checkoutId: checkout.id, url: checkout.url });
  } catch (error) {
    console.error("Payments.lk checkout creation failed", error);
    const providerError =
      error instanceof Error ? error.message : "Unable to create the payment checkout.";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? providerError
            : "Unable to create the payment checkout.",
      },
      { status: 502 },
    );
  }
}
