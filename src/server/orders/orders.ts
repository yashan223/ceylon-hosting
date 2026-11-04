import { randomBytes } from "node:crypto";
import { getActiveProductsByIds } from "@/server/catalog/products";
import { getStoreSettings } from "@/server/settings/settings";
import type { AuthUser } from "@/server/auth/users";
import { getSupabaseAdmin } from "@/server/db/supabase";

export type OrderStatus = "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

export type OrderItem = {
  productId: string;
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
  serverName?: string;
  serverLocation?: string;
  serverPassword?: string;
  rconPassword?: string;
  extraSlots?: number | boolean;
};

export type OrderRecord = {
  id: string;
  userId: string;
  email: string;
  whatsapp?: string;
  items: OrderItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderEvent = {
  orderId: string;
  type: string;
  actorId: string;
  details?: string;
  createdAt: Date;
};

export type OrderMessage = {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: "customer" | "admin";
  body: string;
  createdAt: Date;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseOrder(row: any): OrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    whatsapp: row.whatsapp || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal != null ? Number(row.subtotal) : undefined,
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
    taxAmount: row.tax_amount != null ? Number(row.tax_amount) : undefined,
    total: row.total != null ? Number(row.total) : undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentId: row.payment_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseMessage(row: any): OrderMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: new Date(row.created_at),
  };
}

export async function recordOrderEvent(
  orderId: string,
  type: string,
  actorId: string,
  details?: string,
) {
  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("order_events").insert({
      order_id: orderId,
      type,
      actor_id: actorId,
      details: details ?? null,
      created_at: now.toISOString(),
    });
  } catch (err) {
    console.warn("Supabase recordOrderEvent error:", err);
  }
}

export async function createOrder(
  user: AuthUser,
  input: {
    orderId: string;
    items: {
      productId: string;
      quantity: number;
      serverName?: string;
      serverLocation?: string;
      serverPassword?: string;
      rconPassword?: string;
      extraSlots?: number | boolean;
    }[];
  },
) {
  const settings = await getStoreSettings();
  const products = await getActiveProductsByIds([
    ...new Set(input.items.map((item) => item.productId)),
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items: OrderItem[] = input.items.map(
    ({ productId, quantity, serverName, serverLocation, serverPassword, rconPassword, extraSlots }) => {
      const product = productsById.get(productId);
      if (!product) throw new Error("One or more products are unavailable.");
      if (product.type === "server" && product.available === false)
        throw new Error("One or more products are not available to order.");
      const slotsCount =
        product.type === "server"
          ? typeof extraSlots === "number"
            ? Math.min(12, Math.max(0, Math.round(extraSlots / 4) * 4))
            : extraSlots
            ? 4
            : 0
          : 0;
      const slotsCost = Math.round((slotsCount / 4) * 100);
      const unitPrice = product.price + slotsCost;
      return {
        productId,
        name: slotsCount > 0 ? `${product.name} (+${slotsCount} Slots)` : product.name,
        type: product.type,
        quantity,
        unitPrice,
        ...(serverName ? { serverName } : {}),
        ...(serverLocation ? { serverLocation } : {}),
        ...(serverPassword ? { serverPassword } : {}),
        ...(rconPassword ? { rconPassword } : {}),
        ...(slotsCount > 0 ? { extraSlots: slotsCount } : {}),
      };
    },
  );
  const now = new Date();
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxRate = settings.taxEnabled ? settings.taxRate : 0;
  const taxAmount = settings.taxEnabled ? Math.round(subtotal * (settings.taxRate / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const order: OrderRecord = {
    id: input.orderId,
    userId: user.id,
    email: user.email,
    ...(user.whatsapp ? { whatsapp: user.whatsapp } : {}),
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status: "requested",
    paymentStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getSupabaseAdmin();
  await supabase.from("orders").insert({
    id: order.id,
    user_id: order.userId,
    email: order.email,
    whatsapp: order.whatsapp ?? null,
    items: order.items,
    subtotal: order.subtotal,
    tax_rate: order.taxRate,
    tax_amount: order.taxAmount,
    total: order.total,
    status: order.status,
    payment_status: order.paymentStatus,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  await recordOrderEvent(order.id, "order.requested", user.id, "Customer submitted an order request.");
  return order;
}

export async function markOrderPaid(orderId: string, paymentId: string, amountCents: number) {
  const now = new Date();
  const supabase = getSupabaseAdmin();
  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .in("status", ["requested", "accepted"])
    .neq("payment_status", "paid")
    .maybeSingle();

  if (!orderData) return false;

  const order = mapSupabaseOrder(orderData);
  const settings = await getStoreSettings();
  const subtotalCents = order.items.reduce(
    (sum, it) => sum + Math.round(it.unitPrice * 100) * it.quantity,
    0,
  );
  const taxCents =
    order.taxAmount !== undefined
      ? Math.round(order.taxAmount * 100)
      : settings.taxEnabled
        ? Math.round(subtotalCents * (settings.taxRate / 100))
        : 0;
  const expectedCents = subtotalCents + taxCents;

  if (Math.abs(amountCents - expectedCents) > 1) return false;

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      payment_id: paymentId,
      updated_at: now.toISOString(),
    })
    .eq("id", orderId);

  await recordOrderEvent(orderId, "payment.succeeded", "payments.lk", paymentId);
  await handlePaidOrderSideEffects(order, paymentId, amountCents, now);
  return true;
}

async function handlePaidOrderSideEffects(
  order: OrderRecord,
  paymentId: string,
  amountCents: number,
  now: Date,
) {
  const serverItems = order.items.filter((item) => item.type === "server");
  if (serverItems.length > 0) {
    try {
      const { activateOrExtendServerSubscription } = await import(
        "@/server/subscriptions/servers"
      );
      for (const item of serverItems) {
        await activateOrExtendServerSubscription({
          orderId: order.id,
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
      orderId: order.id,
      customerEmail: order.email,
      customerName: user?.firstName,
      customerCountry: user?.country,
      customerWhatsapp: user?.whatsapp || order.whatsapp,
      paymentId,
      amountCents,
      items: order.items,
      paidAt: now,
    });
  } catch (emailErr) {
    console.error("Failed to send admin order notification email", emailErr);
  }
}

export async function getOrderForUser(orderId: string, userId: string) {
  const rawId = orderId.trim();
  const cleanId = rawId.replace(/^(loadout|ord)[-_]/i, "");
  const searchIds = [
    rawId,
    `loadout-${cleanId}`,
    `loadout-${cleanId.toLowerCase()}`,
    `ORD-${cleanId.toUpperCase()}`,
    cleanId,
  ];

  try {
    const supabase = getSupabaseAdmin();
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("*")
      .in("id", searchIds)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderData && !error) {
      const order = mapSupabaseOrder(orderData);
      const { data: msgData } = await supabase
        .from("order_messages")
        .select("*")
        .in("order_id", [order.id, rawId])
        .order("created_at", { ascending: true });

      const messages = (msgData || []).map(mapSupabaseMessage);
      return { ...order, messages };
    }
  } catch (err) {
    console.warn("Supabase getOrderForUser error:", err);
  }
  return null;
}

export async function listOrdersForUser(userId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: orderRows, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (orderRows && !error) {
      return Promise.all(
        orderRows.map(async (row) => {
          const order = mapSupabaseOrder(row);
          const { data: latestMsg } = await supabase
            .from("order_messages")
            .select("body, created_at")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...order,
            latestMessage: latestMsg
              ? { body: latestMsg.body, createdAt: new Date(latestMsg.created_at) }
              : null,
          };
        }),
      );
    }
  } catch (err) {
    console.warn("Supabase listOrdersForUser error:", err);
  }
  return [];
}

export async function getOrderForAdmin(orderId: string) {
  const rawId = orderId.trim();
  const cleanId = rawId.replace(/^(loadout|ord)[-_]/i, "");
  const searchIds = [
    rawId,
    `loadout-${cleanId}`,
    `loadout-${cleanId.toLowerCase()}`,
    `ORD-${cleanId.toUpperCase()}`,
    cleanId,
  ];

  try {
    const supabase = getSupabaseAdmin();
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("*")
      .in("id", searchIds)
      .maybeSingle();

    if (orderData && !error) {
      const order = mapSupabaseOrder(orderData);
      if (!order.whatsapp) {
        const { findUserById } = await import("@/server/auth/users");
        const user = await findUserById(order.userId);
        if (user?.whatsapp) order.whatsapp = user.whatsapp;
      }

      const { data: msgData } = await supabase
        .from("order_messages")
        .select("*")
        .in("order_id", [order.id, rawId])
        .order("created_at", { ascending: true });

      const messages = (msgData || []).map(mapSupabaseMessage);
      return { ...order, messages };
    }
  } catch (err) {
    console.warn("Supabase getOrderForAdmin error:", err);
  }
  return null;
}

export async function canDownloadProduct(orderId: string, userId: string, productId: string) {
  const order = await getOrderForUser(orderId, userId);
  if (!order || order.paymentStatus !== "paid") return false;
  return order.items.some((item) => item.productId === productId);
}

export async function getPaidOrderForProduct(userId: string, productId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("payment_status", "paid");

    if (rows) {
      for (const row of rows) {
        const order = mapSupabaseOrder(row);
        if (order.items.some((it) => it.productId === productId)) {
          return order;
        }
      }
    }
  } catch (err) {
    console.warn("Supabase getPaidOrderForProduct error:", err);
  }
  return null;
}

export async function listOrders(): Promise<OrderRecord[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("orders")
      .select("*")
      .order("updated_at", { ascending: false });

    if (rows && !error) {
      const list = rows.map(mapSupabaseOrder);
      const missingUserIds = [...new Set(list.filter((o) => !o.whatsapp).map((o) => o.userId))];
      const userMap = new Map<string, string>();
      if (missingUserIds.length > 0) {
        const { findUsersByIds } = await import("@/server/auth/users");
        const users = await findUsersByIds(missingUserIds);
        for (const u of users) {
          if (u.whatsapp) userMap.set(u.id, u.whatsapp);
        }
      }
      return list.map((order) => {
        if (!order.whatsapp && userMap.has(order.userId)) {
          order.whatsapp = userMap.get(order.userId);
        }
        return order;
      });
    }
  } catch (err) {
    console.warn("Supabase listOrders error:", err);
  }
  return [];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, actorId: string) {
  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: now.toISOString() })
      .eq("id", orderId);

    if (!error) {
      await recordOrderEvent(orderId, `order.${status}`, actorId);
      return true;
    }
  } catch (err) {
    console.warn("Supabase updateOrderStatus error:", err);
  }
  return false;
}

export async function listMessageNotifications(input: { userId: string; isAdmin: boolean }) {
  try {
    const supabase = getSupabaseAdmin();
    let orderIds: string[] = [];

    if (input.isAdmin) {
      const { data: ords } = await supabase.from("orders").select("id");
      orderIds = (ords || []).map((o) => o.id);
    } else {
      const { data: ords } = await supabase.from("orders").select("id").eq("user_id", input.userId);
      orderIds = (ords || []).map((o) => o.id);
    }

    if (orderIds.length === 0) return [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const targetRole = input.isAdmin ? "customer" : "admin";
    const keyPrefix = input.isAdmin ? "a:" : `u:${input.userId}:`;

    const [{ data: relevantMessages }, { data: readData }] = await Promise.all([
      supabase
        .from("order_messages")
        .select("*")
        .in("order_id", orderIds)
        .eq("sender_role", targetRole)
        .gt("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("notification_reads")
        .select("key")
        .like("key", `${keyPrefix}%`),
    ]);

    const readKeys = new Set((readData || []).map((r) => r.key));
    const latestByOrder = new Map<string, OrderMessage>();

    for (const raw of relevantMessages || []) {
      const msg = mapSupabaseMessage(raw);
      if (!latestByOrder.has(msg.orderId)) latestByOrder.set(msg.orderId, msg);
    }

    return [...latestByOrder.values()].slice(0, 30).map((message) => ({
      id: message.id,
      orderId: message.orderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      read: readKeys.has(`${keyPrefix}${message.orderId}:${message.id}`),
    }));
  } catch (err) {
    console.warn("Supabase listMessageNotifications error:", err);
    return [];
  }
}

export async function markMessageNotificationsRead(input: {
  userId: string;
  isAdmin: boolean;
  keys: string[];
}) {
  if (input.keys.length === 0) return;
  const keyPrefix = input.isAdmin ? "a:" : `u:${input.userId}:`;
  const validKeys = input.keys.filter((key) => /^[\w-]+:[a-f0-9]{32}$/.test(key));
  if (validKeys.length === 0) return;

  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    const rows = validKeys.map((key) => ({
      key: `${keyPrefix}${key}`,
      user_id: input.userId,
      read_at: now.toISOString(),
    }));
    await supabase.from("notification_reads").upsert(rows);
  } catch (err) {
    console.warn("Supabase markMessageNotificationsRead error:", err);
  }
}

export async function listAdminMessageThreads() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: adminOrders } = await supabase
      .from("orders")
      .select("id, email, status, payment_status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (!adminOrders || adminOrders.length === 0) return [];
    const orderIds = adminOrders.map((o) => o.id);
    const keyPrefix = "a:";

    const [{ data: relevantMessages }, { data: readData }] = await Promise.all([
      supabase
        .from("order_messages")
        .select("*")
        .in("order_id", orderIds)
        .eq("sender_role", "customer")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("notification_reads")
        .select("key")
        .like("key", `${keyPrefix}%`),
    ]);

    const readKeySet = new Set((readData || []).map((r) => r.key));
    const messages = (relevantMessages || []).map(mapSupabaseMessage);

    return adminOrders.map((order) => {
      const orderMessages = messages
        .filter((msg) => msg.orderId === order.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const latest = orderMessages[0];
      const unreadCount = orderMessages.filter(
        (msg) => !readKeySet.has(`${keyPrefix}${order.id}:${msg.id}`),
      ).length;

      return {
        orderId: order.id,
        email: order.email,
        status: order.status as OrderStatus,
        paymentStatus: order.payment_status as "pending" | "paid" | "failed",
        updatedAt: new Date(order.updated_at).toISOString(),
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
  } catch (err) {
    console.warn("Supabase listAdminMessageThreads error:", err);
    return [];
  }
}

export async function addOrderMessage(
  orderId: string,
  senderId: string,
  senderRole: "customer" | "admin",
  body: string,
) {
  const message: OrderMessage = {
    id: randomBytes(16).toString("hex"),
    orderId,
    senderId,
    senderRole,
    body: body.trim(),
    createdAt: new Date(),
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("order_messages").insert({
      id: message.id,
      order_id: orderId,
      sender_id: senderId,
      sender_role: senderRole,
      body: message.body,
      created_at: message.createdAt.toISOString(),
    });
    await recordOrderEvent(orderId, "message.created", senderId, senderRole);
    await supabase
      .from("orders")
      .update({ updated_at: message.createdAt.toISOString() })
      .eq("id", orderId);
    return message;
  } catch (err) {
    console.warn("Supabase addOrderMessage error:", err);
    return message;
  }
}
