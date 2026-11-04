import { NextResponse } from "next/server";
import {
  checkAndSendServerReminders,
  syncExistingPaidServers,
} from "@/server/subscriptions/servers";
import { isAdminUser } from "@/server/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");

  if (cronSecret && cronSecret !== "replace_me") {
    if (authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret) {
      return true;
    }
  }

  if (await isAdminUser()) {
    return true;
  }

  if (process.env.NODE_ENV === "development" && !cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
  }

  try {
    await syncExistingPaidServers().catch((err) =>
      console.error("Failed to sync existing servers", err),
    );

    const result = await checkAndSendServerReminders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Server reminders check failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error executing reminder checks",
      },
      { status: 500 },
    );
  }
}
