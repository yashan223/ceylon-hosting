import { getSupabaseAdmin } from "@/server/db/supabase";

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
  const now = new Date();
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      target_name: entry.targetName ?? null,
      details: entry.details ?? null,
      ip: entry.ip ?? null,
      created_at: now.toISOString(),
    });
  } catch (err) {
    console.warn("Supabase recordAuditLog error:", err);
  }
}

export async function listAuditLogs(limit = 40): Promise<AuditLogEntry[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data && !error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((log: any) => ({
        id: String(log.id),
        action: (log.action as AuditAction) || "SYSTEM_EVENT",
        actorId: log.actor_id || undefined,
        actorEmail: log.actor_email || undefined,
        targetType: (log.target_type as AuditLogEntry["targetType"]) || "system",
        targetId: log.target_id || undefined,
        targetName: log.target_name || undefined,
        details: log.details || undefined,
        ip: log.ip || undefined,
        createdAt: new Date(log.created_at).toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Supabase listAuditLogs error:", err);
  }

  return [];
}
