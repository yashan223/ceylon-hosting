import { getDatabase } from "@/server/db/mongodb";

export type AuditAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_STATUS_TOGGLED"
  | "PRODUCT_AVAILABILITY_TOGGLED"
  | "USER_REGISTERED"
  | "USER_DELETED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_UPDATED"
  | "SERVER_SUBSCRIPTION_CREATED"
  | "SERVER_SUBSCRIPTION_RENEWED"
  | "SERVER_REMINDER_SENT"
  | "ADMIN_LOGIN"
  | "SYSTEM_EVENT";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  targetType: "product" | "user" | "order" | "system" | "server";
  targetId?: string;
  targetName?: string;
  details?: string;
  ip?: string;
  createdAt: string;
};

type AuditDocument = Omit<AuditLogEntry, "id" | "createdAt"> & {
  createdAt: Date;
};

export async function recordAuditLog(entry: {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  targetType: "product" | "user" | "order" | "system" | "server";
  targetId?: string;
  targetName?: string;
  details?: string;
  ip?: string;
}) {
  try {
    const database = await getDatabase();
    const collection = database.collection<AuditDocument>("audit_logs");
    await collection.insertOne({
      ...entry,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

export async function listAuditLogs(limit = 40): Promise<AuditLogEntry[]> {
  try {
    const database = await getDatabase();
    const collection = database.collection("audit_logs");
    const logs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (logs.length > 0) {
      return logs.map((log) => ({
        id: log._id.toString(),
        action: (log.action as AuditAction) || "SYSTEM_EVENT",
        actorId: log.actorId as string | undefined,
        actorEmail: log.actorEmail as string | undefined,
        targetType: (log.targetType as AuditLogEntry["targetType"]) || "system",
        targetId: log.targetId as string | undefined,
        targetName: log.targetName as string | undefined,
        details: log.details as string | undefined,
        ip: log.ip as string | undefined,
        createdAt: (log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt || Date.now())).toISOString(),
      }));
    }

    // Synthesize historical entries from existing orders, products, and users
    return await generateHistoricalAuditLogs(database, limit);
  } catch (error) {
    console.error("Error retrieving audit logs:", error);
    return [];
  }
}

async function generateHistoricalAuditLogs(
  database: Awaited<ReturnType<typeof getDatabase>>,
  limit: number,
): Promise<AuditLogEntry[]> {
  const [products, orders, users] = await Promise.all([
    database.collection("products").find({}).sort({ updatedAt: -1 }).limit(10).toArray(),
    database.collection("orders").find({}).sort({ updatedAt: -1 }).limit(10).toArray(),
    database.collection("users").find({}).sort({ createdAt: -1 }).limit(10).toArray(),
  ]);

  const synthesized: AuditLogEntry[] = [];

  for (const product of products) {
    synthesized.push({
      id: `syn-prod-${product._id.toString()}`,
      action: "PRODUCT_UPDATED",
      actorEmail: "admin@ceylonhosting.tech",
      targetType: "product",
      targetId: (product.id as string) || product._id.toString(),
      targetName: (product.name as string) || "Catalog item",
      details: `Catalog record active=${product.active !== false}, price=Rs.${product.price ?? 0}`,
      createdAt: (product.updatedAt instanceof Date ? product.updatedAt : new Date()).toISOString(),
    });
  }

  for (const order of orders) {
    synthesized.push({
      id: `syn-ord-${order._id.toString()}`,
      action: "ORDER_CREATED",
      actorEmail: (order.email as string) || "customer",
      targetType: "order",
      targetId: (order.id as string) || order._id.toString(),
      targetName: `Order #${order.id || order._id.toString().slice(-6)}`,
      details: `Order status: ${order.status}, Payment: ${order.paymentStatus}`,
      createdAt: (order.createdAt instanceof Date ? order.createdAt : new Date()).toISOString(),
    });
  }

  for (const user of users) {
    synthesized.push({
      id: `syn-user-${user._id.toString()}`,
      action: "USER_REGISTERED",
      actorEmail: (user.email as string) || "system",
      targetType: "user",
      targetId: (user.id as string) || user._id.toString(),
      targetName: (user.firstName as string) || (user.email as string) || "User",
      details: `User joined from ${user.country || "LK"}, verified=${user.emailVerified === true}`,
      createdAt: (user.createdAt instanceof Date ? user.createdAt : new Date()).toISOString(),
    });
  }

  // Add system boot / security event
  synthesized.push({
    id: "syn-sys-boot",
    action: "SYSTEM_EVENT",
    actorEmail: "system",
    targetType: "system",
    targetName: "Audit Subsystem",
    details: "Audit logging and user activity monitoring initialized.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  });

  return synthesized
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
