import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getDatabase } from "@/server/db/mongodb";
import { clearAllPrivateProductFiles } from "@/server/storage/private-files";
import { recordAuditLog } from "@/server/admin/audit";

export async function POST() {
  try {
    const admin = await requireAdmin();
    const database = await getDatabase();

    const configuredEmails = (process.env.ADMIN_DEFAULT_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (admin.email) {
      const currentEmail = admin.email.trim().toLowerCase();
      if (!configuredEmails.includes(currentEmail)) {
        configuredEmails.push(currentEmail);
      }
    }

    const adminUsers = await database
      .collection("users")
      .find({ email: { $in: configuredEmails } }, { projection: { id: 1 } })
      .toArray();

    const adminUserIds = adminUsers.map((u) => u.id as string).filter(Boolean);
    if (admin.id && !adminUserIds.includes(admin.id)) {
      adminUserIds.push(admin.id);
    }

    await Promise.all([
      database.collection("products").deleteMany({}),
      database.collection("orders").deleteMany({}),
      database.collection("order_events").deleteMany({}),
      database.collection("order_messages").deleteMany({}),
      database.collection("notification_reads").deleteMany({}),
      database.collection("server_subscriptions").deleteMany({}),
      database.collection("users").deleteMany({ email: { $nin: configuredEmails } }),
      database.collection("sessions").deleteMany({ userId: { $nin: adminUserIds } }),
      database.collection("audit_logs").deleteMany({}),
      clearAllPrivateProductFiles(),
    ]);

    await recordAuditLog({
      action: "SYSTEM_EVENT",
      actorId: admin.id,
      actorEmail: admin.email,
      targetType: "system",
      details: `All data cleared except admin login (${admin.email}).`,
    });

    return NextResponse.json({
      ok: true,
      message: "All store data cleared successfully. Admin login preserved.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear store data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
