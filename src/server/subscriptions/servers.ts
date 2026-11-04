import { randomBytes } from "node:crypto";
import { sendServerRenewalReminderEmail } from "@/server/auth/mail";
import { recordAuditLog } from "@/server/admin/audit";
import { getPaymentsLkClient, getPaymentsReturnUrl } from "@/server/payments/payments-lk";
import { getAppUrl } from "@/lib/env";
import { getSupabaseAdmin } from "@/server/db/supabase";

export type ServerSubscriptionStatus = "active" | "expiring_soon" | "expired" | "cancelled";

export type ServerSubscription = {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  productId: string;
  serverName: string;
  monthlyPrice: number;
  status: ServerSubscriptionStatus;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  reminderSentAt?: Date | null;
  renewalHistory?: {
    orderId: string;
    paymentId?: string;
    amount: number;
    renewedAt: Date;
    periodEnd: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export type ServerSubscriptionWithTiming = ServerSubscription & {
  daysElapsed: number;
  daysRemaining: number;
  isDay25OrLater: boolean;
  isExpired: boolean;
  formattedExpiry: string;
  formattedRenewalPrice: string;
};

const CYCLE_DAYS = 30;
const CYCLE_MS = CYCLE_DAYS * 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseSubscription(row: any): ServerSubscription {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    userEmail: row.user_email,
    productId: row.product_id,
    serverName: row.server_name,
    monthlyPrice: Number(row.monthly_price),
    status: row.status as ServerSubscriptionStatus,
    startDate: new Date(row.start_date),
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
    renewalHistory: Array.isArray(row.renewal_history) ? row.renewal_history : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function calculateSubscriptionTiming(
  sub: ServerSubscription,
  now = new Date(),
): ServerSubscriptionWithTiming {
  const nowMs = now.getTime();
  const startMs = new Date(sub.currentPeriodStart).getTime();
  const endMs = new Date(sub.currentPeriodEnd).getTime();

  const elapsedMs = Math.max(0, nowMs - startMs);
  const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  const remainingMs = endMs - nowMs;
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

  const isDay25OrLater = daysElapsed >= 25;
  const isExpired = nowMs >= endMs;

  const formattedExpiry = new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedRenewalPrice = `Rs. ${sub.monthlyPrice.toLocaleString()}`;

  return {
    ...sub,
    daysElapsed,
    daysRemaining,
    isDay25OrLater,
    isExpired,
    formattedExpiry,
    formattedRenewalPrice,
  };
}

export async function activateOrExtendServerSubscription(params: {
  orderId: string;
  userId: string;
  userEmail: string;
  productId: string;
  serverName: string;
  monthlyPrice: number;
  paymentId?: string;
  subscriptionId?: string;
}): Promise<ServerSubscription> {
  const now = new Date();
  const supabase = getSupabaseAdmin();

  let existingSub: ServerSubscription | null = null;
  if (params.subscriptionId) {
    const { data } = await supabase
      .from("server_subscriptions")
      .select("*")
      .eq("id", params.subscriptionId)
      .maybeSingle();
    if (data) existingSub = mapSupabaseSubscription(data);
  }
  if (!existingSub) {
    const { data } = await supabase
      .from("server_subscriptions")
      .select("*")
      .eq("user_id", params.userId)
      .eq("product_id", params.productId)
      .in("status", ["active", "expiring_soon", "expired"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingSub = mapSupabaseSubscription(data);
  }

  if (existingSub) {
    const currentEndMs = new Date(existingSub.currentPeriodEnd).getTime();
    const baseMs = currentEndMs > now.getTime() ? currentEndMs : now.getTime();
    const newPeriodEnd = new Date(baseMs + CYCLE_MS);

    const renewalEntry = {
      orderId: params.orderId,
      paymentId: params.paymentId,
      amount: params.monthlyPrice,
      renewedAt: now.toISOString(),
      periodEnd: newPeriodEnd.toISOString(),
    };

    const updatedHistory = [...(existingSub.renewalHistory || []), renewalEntry];

    await supabase
      .from("server_subscriptions")
      .update({
        order_id: params.orderId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: newPeriodEnd.toISOString(),
        reminder_sent_at: null,
        renewal_history: updatedHistory,
        updated_at: now.toISOString(),
      })
      .eq("id", existingSub.id);

    await recordAuditLog({
      action: "SERVER_SUBSCRIPTION_RENEWED",
      actorId: params.userId,
      actorEmail: params.userEmail,
      targetType: "server",
      targetId: existingSub.id,
      targetName: existingSub.serverName,
      details: `Renewed monthly server subscription until ${newPeriodEnd.toISOString().split("T")[0]} (Payment: ${params.paymentId || "recorded"})`,
    });

    return {
      ...existingSub,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      reminderSentAt: null,
      renewalHistory: updatedHistory as unknown as ServerSubscription["renewalHistory"],
      updatedAt: now,
    };
  }

    const newPeriodEnd = new Date(now.getTime() + CYCLE_MS);
  const newSub: ServerSubscription = {
    id: `srv_${randomBytes(8).toString("hex")}`,
    orderId: params.orderId,
    userId: params.userId,
    userEmail: params.userEmail,
    productId: params.productId,
    serverName: params.serverName,
    monthlyPrice: params.monthlyPrice,
    status: "active",
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: newPeriodEnd,
    reminderSentAt: null,
    renewalHistory: [
      {
        orderId: params.orderId,
        paymentId: params.paymentId,
        amount: params.monthlyPrice,
        renewedAt: now,
        periodEnd: newPeriodEnd,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await supabase.from("server_subscriptions").insert({
    id: newSub.id,
    order_id: newSub.orderId,
    user_id: newSub.userId,
    user_email: newSub.userEmail,
    product_id: newSub.productId,
    server_name: newSub.serverName,
    monthly_price: newSub.monthlyPrice,
    status: newSub.status,
    start_date: newSub.startDate.toISOString(),
    current_period_start: newSub.currentPeriodStart.toISOString(),
    current_period_end: newSub.currentPeriodEnd.toISOString(),
    reminder_sent_at: null,
    renewal_history: newSub.renewalHistory,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  await recordAuditLog({
    action: "SERVER_SUBSCRIPTION_CREATED",
    actorId: params.userId,
    actorEmail: params.userEmail,
    targetType: "server",
    targetId: newSub.id,
    targetName: newSub.serverName,
    details: `Created new monthly server subscription valid for 30 days until ${newPeriodEnd.toISOString().split("T")[0]}`,
  });

  return newSub;
}

export async function listSubscriptionsForUser(
  userId: string,
): Promise<ServerSubscriptionWithTiming[]> {
  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("server_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false });

    if (data && !error) {
      return data.map((row) => calculateSubscriptionTiming(mapSupabaseSubscription(row), now));
    }
  } catch (err) {
    console.warn("Supabase listSubscriptionsForUser error:", err);
  }
  return [];
}

export async function listAllServerSubscriptions(): Promise<ServerSubscriptionWithTiming[]> {
  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("server_subscriptions")
      .select("*")
      .order("current_period_end", { ascending: false });

    if (data && !error) {
      return data.map((row) => calculateSubscriptionTiming(mapSupabaseSubscription(row), now));
    }
  } catch (err) {
    console.warn("Supabase listAllServerSubscriptions error:", err);
  }
  return [];
}

export type ReminderCheckResult = {
  totalChecked: number;
  remindersSent: number;
  expiredMarked: number;
  details: {
    subscriptionId: string;
    serverName: string;
    userEmail: string;
    action: "reminder_sent" | "already_reminded" | "expired_marked" | "skipped";
    daysRemaining: number;
    error?: string;
  }[];
};

export async function checkAndSendServerReminders(): Promise<ReminderCheckResult> {
  const now = new Date();
  const appUrl = getAppUrl();
  let subscriptions: ServerSubscription[] = [];

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("server_subscriptions")
      .select("*")
      .neq("status", "cancelled");

    if (data) subscriptions = data.map(mapSupabaseSubscription);
  } catch (err) {
    console.warn("Supabase checkAndSendServerReminders error:", err);
  }

  let remindersSent = 0;
  let expiredMarked = 0;
  const details: ReminderCheckResult["details"] = [];

  for (const sub of subscriptions) {
    const timing = calculateSubscriptionTiming(sub, now);

    if (timing.isExpired) {
      if (sub.status !== "expired") {
        try {
          const supabase = getSupabaseAdmin();
          await supabase
            .from("server_subscriptions")
            .update({ status: "expired", updated_at: now.toISOString() })
            .eq("id", sub.id);
        } catch {}

        expiredMarked++;
        details.push({
          subscriptionId: sub.id,
          serverName: sub.serverName,
          userEmail: sub.userEmail,
          action: "expired_marked",
          daysRemaining: 0,
        });
      }
      continue;
    }

    if (timing.isDay25OrLater) {
      const lastReminderTime = sub.reminderSentAt ? new Date(sub.reminderSentAt).getTime() : 0;
      const periodStartTime = new Date(sub.currentPeriodStart).getTime();
      const alreadySentThisCycle = lastReminderTime >= periodStartTime;

      if (!alreadySentThisCycle) {
        try {
          const renewalUrl = `${appUrl}/dashboard?renewServer=${encodeURIComponent(sub.id)}`;

          await sendServerRenewalReminderEmail({
            email: sub.userEmail,
            serverName: sub.serverName,
            daysRemaining: timing.daysRemaining,
            expirationDate: timing.formattedExpiry,
            monthlyPrice: sub.monthlyPrice,
            renewalUrl,
          });

          try {
            const supabase = getSupabaseAdmin();
            await supabase
              .from("server_subscriptions")
              .update({
                status: "expiring_soon",
                reminder_sent_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", sub.id);
          } catch {}

          await recordAuditLog({
            action: "SERVER_REMINDER_SENT",
            actorId: "system",
            actorEmail: "automation@ceylonhosting",
            targetType: "server",
            targetId: sub.id,
            targetName: sub.serverName,
            details: `Sent Day 25 renewal reminder email to ${sub.userEmail} (${timing.daysRemaining} days left until ${timing.formattedExpiry})`,
          });

          remindersSent++;
          details.push({
            subscriptionId: sub.id,
            serverName: sub.serverName,
            userEmail: sub.userEmail,
            action: "reminder_sent",
            daysRemaining: timing.daysRemaining,
          });
        } catch (emailErr) {
          console.error(`Failed to send renewal reminder email to ${sub.userEmail}`, emailErr);
          details.push({
            subscriptionId: sub.id,
            serverName: sub.serverName,
            userEmail: sub.userEmail,
            action: "skipped",
            daysRemaining: timing.daysRemaining,
            error: emailErr instanceof Error ? emailErr.message : "Email delivery error",
          });
        }
      } else {
        details.push({
          subscriptionId: sub.id,
          serverName: sub.serverName,
          userEmail: sub.userEmail,
          action: "already_reminded",
          daysRemaining: timing.daysRemaining,
        });
      }
    } else {
      details.push({
        subscriptionId: sub.id,
        serverName: sub.serverName,
        userEmail: sub.userEmail,
        action: "skipped",
        daysRemaining: timing.daysRemaining,
      });
    }
  }

  return {
    totalChecked: subscriptions.length,
    remindersSent,
    expiredMarked,
    details,
  };
}

export async function createServerRenewalCheckout(params: {
  subscriptionId: string;
  userId: string;
  userEmail: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  let sub: ServerSubscription | null = null;
  const supabase = getSupabaseAdmin();

  try {
    const { data } = await supabase
      .from("server_subscriptions")
      .select("*")
      .eq("id", params.subscriptionId)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (data) sub = mapSupabaseSubscription(data);
  } catch {}

  if (!sub) {
    throw new Error("Server subscription not found or not owned by user.");
  }

  const renewalOrderId = `renew-${sub.id.replace("srv_", "")}-${Date.now().toString(36)}`;
  const now = new Date();

  await supabase.from("orders").insert({
    id: renewalOrderId,
    user_id: params.userId,
    email: params.userEmail,
    items: [
      {
        productId: sub.productId,
        name: `${sub.serverName} (Monthly Renewal)`,
        type: "server",
        quantity: 1,
        unitPrice: sub.monthlyPrice,
      },
    ],
    status: "accepted",
    payment_status: "pending",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  const checkout = await getPaymentsLkClient().checkouts.create(
    {
      lineItems: [
        {
          name: `${sub.serverName.slice(0, 60)} (Monthly Renewal)`,
          unitAmountCents: Math.round(sub.monthlyPrice * 100),
          quantity: 1,
        },
      ],
      reference: renewalOrderId,
      successUrl: getPaymentsReturnUrl(
        `${process.env.PAYMENTS_LK_SUCCESS_PATH ?? "/checkout/success"}?order=${renewalOrderId}`,
      ),
      cancelUrl: getPaymentsReturnUrl("/dashboard"),
    },
    { idempotencyKey: `renewal-${renewalOrderId}` },
  );

  return {
    checkoutUrl: checkout.url,
    orderId: renewalOrderId,
  };
}

export async function syncExistingPaidServers(): Promise<number> {
  return 0;
}
