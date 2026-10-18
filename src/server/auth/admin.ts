import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

function valuesFromEnv(value: string | undefined, lowercase = false) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => (lowercase ? item.trim().toLowerCase() : item.trim()))
      .filter(Boolean),
  );
}

export function isConfiguredAdminEmail(email: string) {
  const allowedEmails = valuesFromEnv(process.env.ADMIN_DEFAULT_EMAIL, true);
  return allowedEmails.has(email.trim().toLowerCase());
}

export function isUserAdmin(user: { id?: string; email: string } | null | undefined): boolean {
  if (!user?.email) return false;
  return isConfiguredAdminEmail(user.email);
}

export async function isAdminUser() {
  const user = await getCurrentUser();
  return isUserAdmin(user);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");

  if (!isUserAdmin(user)) redirect("/");
  return user;
}
