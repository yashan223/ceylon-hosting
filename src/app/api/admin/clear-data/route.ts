import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getSupabaseAdmin } from "@/server/db/supabase";
import { clearAllPrivateProductFiles } from "@/server/storage/private-files";
import { recordAuditLog } from "@/server/admin/audit";

export async function POST() {
  try {
    const admin = await requireAdmin();

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

    const supabase = getSupabaseAdmin();
    const { data: adminUsers } = await supabase
      .from("users")
      .select("id, email")
      .in("email", configuredEmails);

    const adminUserIds = (adminUsers || []).map((u) => u.id);
    if (admin.id && !adminUserIds.includes(admin.id)) {
      adminUserIds.push(admin.id);
    }

    await Promise.all([
      supabase.from("order_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("order_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("notification_reads").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("server_subscriptions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("products").delete().neq("id", "__keep_none__"),
      supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);

    if (adminUserIds.length > 0) {
      await supabase
        .from("sessions")
        .delete()
        .not("user_id", "in", `(${adminUserIds.map((id) => `"${id}"`).join(",")})`);
      await supabase
        .from("users")
        .delete()
        .not("id", "in", `(${adminUserIds.map((id) => `"${id}"`).join(",")})`);
    } else {
      await supabase.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    await clearAllPrivateProductFiles();

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
