import { randomBytes } from "node:crypto";
import { getDatabase } from "@/server/db/mongodb";
import { sendServerRenewalReminderEmail } from "@/server/auth/mail";
import { recordAuditLog } from "@/server/admin/audit";
import { getPaymentsLkClient, getPaymentsReturnUrl } from "@/server/payments/payments-lk";
import { getAppUrl } from "@/lib/env";

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

let indexesPromise: Promise<void> | undefined;

function ensureSubscriptionIndexes() {
  indexesPromise ??= (async () => {
    const database = await getDatabase();
    const collection = database.collection<ServerSubscription>("server_subscriptions");
    await Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ userId: 1, currentPeriodEnd: -1 }),
      collection.createIndex({ status: 1, currentPeriodEnd: 1 }),
      collection.createIndex({ orderId: 1 }),
      collection.createIndex({ productId: 1, userId: 1 }),
    ]);
  })().catch((err) => {
    indexesPromise = undefined;
    throw err;
  });
  return indexesPromise;
}

async function getSubscriptionCollection() {
  const database = await getDatabase();
  await ensureSubscriptionIndexes();
  return database.collection<ServerSubscription>("server_subscriptions");
}

export function calculateSubscriptionTiming(
  sub: ServerSubscription,
  now = new Date(),
): ServerSubscriptionWithTiming {
  const nowMs = now.getTime();
  const startMs = new Date(sub.currentPeriodStart).getTime();
  const endMs = new Date(sub.currentPeriodEnd).getTime();

  const msRemaining = endMs - nowMs;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));

  const isExpired = nowMs >= endMs;
  const isDay25OrLater = daysElapsed >= 25 || daysRemaining <= 5;

  let computedStatus: ServerSubscriptionStatus = sub.status;
  if (sub.status !== "cancelled") {
    if (isExpired) {
      computedStatus = "expired";
    } else if (isDay25OrLater) {
      computedStatus = "expiring_soon";
    } else {
      computedStatus = "active";
    }
  }

  const formattedExpiry = new Date(sub.currentPeriodEnd).toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedRenewalPrice = `Rs. ${sub.monthlyPrice.toLocaleString("en-LK")}`;

  return {
    ...sub,
    status: computedStatus,
    daysElapsed,
    daysRemaining,
    isDay25OrLater,
    isExpired,
    formattedExpiry,
    formattedRenewalPrice,
  };
}

/**
 * Activates or extends a 30-day monthly server subscription upon successful payment.
 */
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
  const collection = await getSubscriptionCollection();
  const now = new Date();

  // Find existing subscription by explicit ID or by user & product
  let existing: ServerSubscription | null = null;
  if (params.subscriptionId) {
    existing = await collection.findOne({ id: params.subscriptionId });
  }
  if (!existing) {
    existing = await collection.findOne({
      userId: params.userId,
      productId: params.productId,
      status: { $in: ["active", "expiring_soon", "expired"] },
    });
  }

  if (existing) {
    // If renewing an existing server:
    // If currently active, extend from the current period end date.
    // If expired, start a fresh 30-day period from today.
    const currentEndMs = new Date(existing.currentPeriodEnd).getTime();
    const baseMs = currentEndMs > now.getTime() ? currentEndMs : now.getTime();
    const newPeriodEnd = new Date(baseMs + CYCLE_MS);

    const renewalEntry = {
      orderId: params.orderId,
      paymentId: params.paymentId,
      amount: params.monthlyPrice,
      renewedAt: now,
      periodEnd: newPeriodEnd,
    };

    await collection.updateOne(
      { id: existing.id },
      {
        $set: {
          orderId: params.orderId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          reminderSentAt: null, // Reset reminder flag for the new 30-day monthly cycle!
          updatedAt: now,
        },
        $push: {
          renewalHistory: renewalEntry,
        },
      },
    );

    await recordAuditLog({
      action: "SERVER_SUBSCRIPTION_RENEWED",
      actorId: params.userId,
      actorEmail: params.userEmail,
      targetType: "server",
      targetId: existing.id,
      targetName: existing.serverName,
      details: `Renewed monthly server subscription until ${newPeriodEnd.toISOString().split("T")[0]} (Payment: ${params.paymentId || "recorded"})`,
    });

    return {
      ...existing,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      reminderSentAt: null,
      updatedAt: now,
    };
  }

  // Create brand new 30-day server subscription
  const newPeriodEnd = new Date(now.getTime() + CYCLE_MS);
  const newSubscription: ServerSubscription = {
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

  await collection.insertOne(newSubscription);

  await recordAuditLog({
    action: "SERVER_SUBSCRIPTION_CREATED",
    actorId: params.userId,
    actorEmail: params.userEmail,
    targetType: "server",
    targetId: newSubscription.id,
    targetName: newSubscription.serverName,
    details: `Created new monthly server subscription valid for 30 days until ${newPeriodEnd.toISOString().split("T")[0]}`,
  });

  return newSubscription;
}

/**
 * List all active/expiring/expired server subscriptions for a specific user.
 */
export async function listSubscriptionsForUser(
  userId: string,
): Promise<ServerSubscriptionWithTiming[]> {
  const collection = await getSubscriptionCollection();
  const subs = await collection.find({ userId }).sort({ currentPeriodEnd: -1 }).toArray();
  const now = new Date();
  return subs.map((sub) => calculateSubscriptionTiming(sub, now));
}

/**
 * List all server subscriptions for admin console.
 */
export async function listAllServerSubscriptions(): Promise<ServerSubscriptionWithTiming[]> {
  const collection = await getSubscriptionCollection();
  const subs = await collection.find({}).sort({ currentPeriodEnd: -1 }).toArray();
  const now = new Date();
  return subs.map((sub) => calculateSubscriptionTiming(sub, now));
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

/**
 * Scans all servers and sends reminder emails to customers on Day 25 (5 days or less remaining)
 * for the current monthly cycle.
 */
export async function checkAndSendServerReminders(): Promise<ReminderCheckResult> {
  const collection = await getSubscriptionCollection();
  const now = new Date();
  const nowMs = now.getTime();

  // Find all subscriptions that are not cancelled
  const subscriptions = await collection.find({ status: { $ne: "cancelled" } }).toArray();

  let remindersSent = 0;
  let expiredMarked = 0;
  const details: ReminderCheckResult["details"] = [];

  const appUrl = getAppUrl();

  for (const sub of subscriptions) {
    const timing = calculateSubscriptionTiming(sub, now);

    // 1. Check if server has passed its expiration date
    if (timing.isExpired) {
      if (sub.status !== "expired") {
        await collection.updateOne(
          { id: sub.id },
          { $set: { status: "expired", updatedAt: now } },
        );
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

    // 2. Check if server is on Day 25 or later (5 days or less remaining in current 30-day period)
    if (timing.isDay25OrLater) {
      // Check if a reminder has already been sent for the current period
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

          await collection.updateOne(
            { id: sub.id },
            {
              $set: {
                status: "expiring_soon",
                reminderSentAt: now,
                updatedAt: now,
              },
            },
          );

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

/**
 * Initiates a renewal checkout session for an active or expired server subscription.
 */
export async function createServerRenewalCheckout(params: {
  subscriptionId: string;
  userId: string;
  userEmail: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  const collection = await getSubscriptionCollection();
  const sub = await collection.findOne({ id: params.subscriptionId, userId: params.userId });
  if (!sub) {
    throw new Error("Server subscription not found or not owned by user.");
  }

  const database = await getDatabase();
  const renewalOrderId = `renew-${sub.id.replace("srv_", "")}-${Date.now().toString(36)}`;
  const now = new Date();

  // Create an order record representing this renewal cycle
  const orderRecord = {
    id: renewalOrderId,
    userId: params.userId,
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
    status: "accepted" as const,
    paymentStatus: "pending" as const,
    subscriptionId: sub.id,
    createdAt: now,
    updatedAt: now,
  };

  await database.collection("orders").insertOne(orderRecord);

  // Create checkout session via Payments.lk
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

/**
 * Syncs any existing paid orders in the database into server_subscriptions
 * so past server orders automatically gain 30-day tracking and Day 25 reminders.
 */
export async function syncExistingPaidServers(): Promise<number> {
  const database = await getDatabase();
  const collection = await getSubscriptionCollection();

  const paidServerOrders = await database
    .collection("orders")
    .find({
      paymentStatus: "paid",
      "items.type": "server",
    })
    .toArray();

  let createdCount = 0;

  for (const order of paidServerOrders) {
    const serverItems = order.items.filter((item: { type: string }) => item.type === "server");
    for (const item of serverItems) {
      const existing = await collection.findOne({
        userId: order.userId,
        productId: item.productId,
      });

      if (!existing) {
        const orderDate = new Date(order.createdAt || order.updatedAt || Date.now());
        const periodEnd = new Date(orderDate.getTime() + CYCLE_MS);

        await collection.insertOne({
          id: `srv_${randomBytes(8).toString("hex")}`,
          orderId: order.id,
          userId: order.userId,
          userEmail: order.email,
          productId: item.productId,
          serverName: item.name,
          monthlyPrice: item.unitPrice,
          status: periodEnd.getTime() > Date.now() ? "active" : "expired",
          startDate: orderDate,
          currentPeriodStart: orderDate,
          currentPeriodEnd: periodEnd,
          reminderSentAt: null,
          renewalHistory: [
            {
              orderId: order.id,
              amount: item.unitPrice,
              renewedAt: orderDate,
              periodEnd,
            },
          ],
          createdAt: orderDate,
          updatedAt: new Date(),
        });
        createdCount++;
      }
    }
  }

  return createdCount;
}
