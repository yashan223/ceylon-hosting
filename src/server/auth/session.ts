import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { findUserById, type AuthUser } from "@/server/auth/users";
import { getSupabaseAdmin } from "@/server/db/supabase";

const cookieName = "ceylonhosting_session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const temporarySessionLifetimeMs = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, rememberMe = false) {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (rememberMe ? sessionLifetimeMs : temporarySessionLifetimeMs),
  );

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("sessions").insert({
      token_hash: hashToken(token),
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    });
  } catch (err) {
    console.warn("Supabase createSession error:", err);
  }

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(rememberMe ? { expires: expiresAt } : {}),
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("sessions").delete().eq("token_hash", hashToken(token));
    } catch (err) {
      console.warn("Supabase clearSession error:", err);
    }
  }
  cookieStore.delete(cookieName);
}

export async function getCurrentSession(): Promise<{ user: AuthUser; rememberMe: boolean } | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const tHash = hashToken(token);

  try {
    const supabase = getSupabaseAdmin();
    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token_hash", tHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (session && !error) {
      const user = await findUserById(session.user_id);
      if (!user || !user.emailVerified) return null;
      const createdAtTime = new Date(session.created_at).getTime();
      const expiresAtTime = new Date(session.expires_at).getTime();
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          whatsapp: user.whatsapp,
          emailVerified: user.emailVerified,
        },
        rememberMe: expiresAtTime - createdAtTime > temporarySessionLifetimeMs,
      };
    }
  } catch (err) {
    console.warn("Supabase getCurrentSession error:", err);
  }

  return null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser(returnTo = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  return user;
}
