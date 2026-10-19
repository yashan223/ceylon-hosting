import { randomBytes } from "node:crypto";
import { getDatabase } from "@/server/db/mongodb";
import { getActiveProductsByIds } from "@/server/catalog/products";
import type { AuthUser } from "@/server/auth/users";

type OrderStatus = "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

type OrderItem = {
  productId: string;
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
  serverName?: string;
  serverPassword?: string;
  rconPassword?: string;
};

type OrderRecord = {
  id: string;
  userId: string;
  email: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed";
  createdAt: Date;
  updatedAt: Date;
};

type OrderEvent = {
  orderId: string;
  type: string;
  actorId: string;
  details?: string;
  createdAt: Date;
};

type OrderMessage = {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: "customer" | "admin";
  body: string;
  createdAt: Date;
};

type NotificationRecord = {
  key: string;
  userId: string;
  readAt: Date;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let indexesPromise: Promise<void> | undefined;

function ensureIndexes() {
  indexesPromise ??= (async () => {
    const database = await getDatabase();
    await Promise.all([
      database.collection<OrderRecord>("orders").createIndex({ id: 1 }, { unique: true }),
      database.collection<OrderRecord>("orders").createIndex({ userId: 1, createdAt: -1 }),
      database.collection<OrderEvent>("order_events").createIndex({ orderId: 1, createdAt: 1 }),
      database.collection<OrderMessage>("order_messages").createIndex({ orderId: 1, createdAt: 1 }),
      database
        .collection<OrderMessage>("order_messages")
        .createIndex({ senderRole: 1, createdAt: -1 }),
      database
        .collection<NotificationRecord>("notification_reads")
        .createIndex({ key: 1 }, { unique: true }),
    ]);
  })().catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  return indexesPromise;
}

async function collections() {
  const database = await getDatabase();
  await ensureIndexes();
  return {
    orders: database.collection<OrderRecord>("orders"),
    events: database.collection<OrderEvent>("order_events"),
    messages: database.collection<OrderMessage>("order_messages"),
    reads: database.collection<NotificationRecord>("notification_reads"),
  };
}

export async function recordOrderEvent(
  orderId: string,
  type: string,
  actorId: string,
  details?: string,
) {
  const { events } = await collections();
  await events.insertOne({ orderId, type, actorId, details, createdAt: new Date() });
}

export async function createOrder(
  user: AuthUser,
  input: {
    orderId: string;
    items: {
      productId: string;
      quantity: number;
      serverName?: string;
      serverPassword?: string;
      rconPassword?: string;
    }[];
  },
) {
  const products = await getActiveProductsByIds([
    ...new Set(input.items.map((item) => item.productId)),
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items: OrderItem[] = input.items.map(
    ({ productId, quantity, serverName, serverPassword, rconPassword }) => {
      const product = productsById.get(productId);
      if (!product) throw new Error("One or more products are unavailable.");
      if (product.type === "server" && product.available === false)
        throw new Error("One or more products are not available to order.");
      return {
        productId,
        name: product.name,
        type: product.type,
        quantity,
        unitPrice: product.price,
        ...(serverName ? { serverName } : {}),
        ...(serverPassword ? { serverPassword } : {}),
        ...(rconPassword ? { rconPassword } : {}),
      };
    },
  );
  const now = new Date();
  const { orders, events } = await collections();
  const order: OrderRecord = {
    id: input.orderId,
    userId: user.id,
    email: user.email,
    items,
    status: "requested",
    paymentStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await orders.insertOne(order);
  await events.insertOne({
    orderId: order.id,
    type: "order.requested",
    actorId: user.id,
    details: "Customer submitted an order request.",
    createdAt: now,
  });
  return order;
}

export async function markOrderPaid(orderId: string, paymentId: string, amountCents: number) {
  const { orders, events } = await collections();
  const now = new Date();
  const order = await orders.findOne({
    id: orderId,
    status: { $in: ["requested", "accepted"] },
    paymentStatus: { $ne: "paid" },
  });
  if (!order) return false;
  const expectedAmountCents = order.items.reduce(
    (total, item) => total + Math.round(item.unitPrice * 100) * item.quantity,
    0,
  );
  if (amountCents !== expectedAmountCents) return false;
  const result = await orders.updateOne(
    { id: orderId, status: { $in: ["requested", "accepted"] }, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", updatedAt: now } },
  );
  if (result.matchedCount === 0) return false;
  await events.insertOne({
    orderId,
    type: "payment.succeeded",
    actorId: "payments.lk",
    details: paymentId,
    createdAt: now,
  });

  // Activate or extend monthly server subscriptions for any server items
  const serverItems = order.items.filter((item) => item.type === "server");
  if (serverItems.length > 0) {
    try {
      const { activateOrExtendServerSubscription } = await import(
        "@/server/subscriptions/servers"
      );
      for (const item of serverItems) {
        await activateOrExtendServerSubscription({
          orderId,
          userId: order.userId,
          userEmail: order.email,
          productId: item.productId,
          serverName: item.serverName || item.name,
          monthlyPrice: item.unitPrice,
          paymentId,
          subscriptionId: (order as { subscriptionId?: string }).subscriptionId,
        });
      }
    } catch (subErr) {
      console.error("Failed to activate server subscription on payment", subErr);
    }
  }

  try {
    const { findUserById } = await import("@/server/auth/users");
    const user = await findUserById(order.userId);
    const { sendOrderPaidAdminNotificationEmail } = await import("@/server/auth/mail");
    await sendOrderPaidAdminNotificationEmail({
      orderId,
      customerEmail: order.email,
      customerName: user?.firstName,
      customerCountry: user?.country,
      paymentId,
      amountCents,
      items: order.items,
      paidAt: now,
    });
  } catch (emailErr) {
    console.error("Failed to send admin order notification email", emailErr);
  }

  return true;
}

export async function getOrderForUser(orderId: string, userId: string) {
  const { orders, messages } = await collections();
  const order = await orders.findOne({ id: orderId, userId });
  if (!order) return null;
  const orderMessages = await messages.find({ orderId }).sort({ createdAt: 1 }).toArray();
  return { ...order, messages: orderMessages };
}

export async function listOrdersForUser(userId: string) {
  const { orders, messages } = await collections();
  const userOrders = await orders
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();
  return Promise.all(
    userOrders.map(async (order) => {
      const [latestMessage] = await messages
        .find({ orderId: order.id })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      return {
        ...order,
        latestMessage: latestMessage
          ? { body: latestMessage.body, createdAt: latestMessage.createdAt }
          : null,
      };
    }),
  );
}

export async function getOrderForAdmin(orderId: string) {
  const { orders, messages } = await collections();
  const order = await orders.findOne({ id: orderId });
  if (!order) return null;
  const orderMessages = await messages.find({ orderId }).sort({ createdAt: 1 }).toArray();
  return { ...order, messages: orderMessages };
}

export async function canDownloadProduct(orderId: string, userId: string, productId: string) {
  const { orders } = await collections();
  const order = await orders.findOne({
    id: orderId,
    userId,
    paymentStatus: "paid",
    items: { $elemMatch: { productId } },
  });
  return Boolean(order);
}

export async function getPaidOrderForProduct(userId: string, productId: string) {
  const { orders } = await collections();
  return orders.findOne({
    userId,
    paymentStatus: "paid",
    items: { $elemMatch: { productId } },
  });
}

export async function listOrders() {
  const { orders } = await collections();
  return orders.find({}).sort({ updatedAt: -1 }).toArray();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, actorId: string) {
  const { orders, events } = await collections();
  const now = new Date();
  const result = await orders.updateOne({ id: orderId }, { $set: { status, updatedAt: now } });
  if (result.matchedCount === 0) return false;
  await events.insertOne({ orderId, type: `order.${status}`, actorId, createdAt: now });
  return true;
}

export async function listMessageNotifications(input: { userId: string; isAdmin: boolean }) {
  const { orders, messages, reads } = await collections();
  const orderIds = input.isAdmin
    ? (await orders.find({}, { projection: { id: 1 } }).toArray()).map((order) => order.id)
    : (await orders.find({ userId: input.userId }, { projection: { id: 1 } }).toArray()).map(
        (order) => order.id,
      );
  if (orderIds.length === 0) return [];

  const keyPrefix = input.isAdmin ? "a:" : `u:${input.userId}:`;
  const [relevantMessages, readKeys] = await Promise.all([
    messages
      .find({
        orderId: { $in: orderIds },
        senderRole: input.isAdmin ? "customer" : "admin",
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray(),
    reads
      .find({
        key: new RegExp(
          `^${escapeRegExp(keyPrefix)}(?:${orderIds.map(escapeRegExp).join("|")})[:.]`,
        ),
      })
      .toArray()
      .catch(() => [] as NotificationRecord[]),
  ]);

  const latestByOrder = new Map<string, OrderMessage>();
  for (const message of relevantMessages) {
    if (!latestByOrder.has(message.orderId)) latestByOrder.set(message.orderId, message);
  }
  return [...latestByOrder.values()].slice(0, 30).map((message) => ({
    id: message.id,
    orderId: message.orderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    read: readKeys.some((record) => record.key === `${keyPrefix}${message.orderId}:${message.id}`),
  }));
}

export async function markMessageNotificationsRead(input: {
  userId: string;
  isAdmin: boolean;
  keys: string[];
}) {
  if (input.keys.length === 0) return;
  const { reads } = await collections();
  const keyPrefix = input.isAdmin ? "a:" : `u:${input.userId}:`;
  const readAt = new Date();
  await Promise.all(
    input.keys
      .filter((key) => /^[\w-]+:[a-f0-9]{32}$/.test(key))
      .map((key) =>
        reads.updateOne(
          { key: `${keyPrefix}${key}` },
          { $setOnInsert: { key: `${keyPrefix}${key}`, userId: input.userId, readAt } },
          { upsert: true },
        ),
      ),
  );
}

export async function listAdminMessageThreads() {
  const { orders, messages, reads } = await collections();
  const adminOrders = await orders
    .find({}, { projection: { id: 1, email: 1, status: 1, paymentStatus: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  if (adminOrders.length === 0) return [];

  const orderIds = adminOrders.map((order) => order.id);
  const keyPrefix = "a:";
  const [relevantMessages, readKeys] = await Promise.all([
    messages
      .find({ orderId: { $in: orderIds }, senderRole: "customer" })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray(),
    reads
      .find({
        key: new RegExp(
          `^${escapeRegExp(keyPrefix)}(?:${orderIds.map(escapeRegExp).join("|")})[:.]`,
        ),
      })
      .toArray()
      .catch(() => [] as NotificationRecord[]),
  ]);

  const readKeySet = new Set(readKeys.map((record) => record.key));
  const threads = adminOrders.map((order) => {
    const orderMessages = relevantMessages
      .filter((message) => message.orderId === order.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = orderMessages[0];
    const unreadCount = orderMessages.filter(
      (message) => !readKeySet.has(`${keyPrefix}${order.id}:${message.id}`),
    ).length;
    return {
      orderId: order.id,
      email: order.email,
      status: order.status,
      paymentStatus: order.paymentStatus,
      updatedAt: order.updatedAt.toISOString(),
      latestMessage: latest
        ? {
            id: latest.id,
            body: latest.body,
            senderRole: latest.senderRole,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
      unreadCount,
    };
  });
  return threads;
}

export async function addOrderMessage(
  orderId: string,
  senderId: string,
  senderRole: "customer" | "admin",
  body: string,
) {
  const { orders, messages, events } = await collections();
  const order = await orders.findOne({ id: orderId });
  if (!order) return null;
  const message: OrderMessage = {
    id: randomBytes(16).toString("hex"),
    orderId,
    senderId,
    senderRole,
    body: body.trim(),
    createdAt: new Date(),
  };
  await messages.insertOne(message);
  await events.insertOne({
    orderId,
    type: "message.created",
    actorId: senderId,
    details: senderRole,
    createdAt: message.createdAt,
  });
  await orders.updateOne({ id: orderId }, { $set: { updatedAt: message.createdAt } });
  return message;
}
