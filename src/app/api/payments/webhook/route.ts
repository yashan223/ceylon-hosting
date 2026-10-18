import { NextResponse } from "next/server";
import { getPaymentsLkClient } from "@/server/payments/payments-lk";
import { markOrderPaid } from "@/server/orders/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMENTS_LK_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret === "whsec_replace_me") {
    return NextResponse.json({ error: "Payments webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("payments-signature");
  const rawBody = new Uint8Array(await request.arrayBuffer());

  try {
    const event = getPaymentsLkClient().webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "test.ping") {
      return NextResponse.json({ received: true, ping: true });
    }

    if (event.type === "payment.succeeded") {
      if (event.data.reference)
        await markOrderPaid(event.data.reference, event.data.id, event.data.amountCents);
      console.info("Payments.lk payment succeeded", {
        paymentId: event.data.id,
        orderId: event.data.reference,
        amountCents: event.data.amountCents,
      });
    }

    if (event.type === "payment.failed") {
      console.warn("Payments.lk payment failed", {
        paymentId: event.data.id,
        orderId: event.data.reference,
        reason: event.data.failureMessage,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payments.lk webhook verification failed", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
}
