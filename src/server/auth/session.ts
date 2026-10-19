import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "@/server/db/mongodb";
import { findUserById, type AuthUser } from "@/server/auth/users";

const cookieName = "ceylonhosting_session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const temporarySessionLifetimeMs = 24 * 60 * 60 * 1000;

type SessionRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

let indexesPromise: Promise<void> | undefined;

function ensureIndexes() {
  indexesPromise ??= (async () => {
    const collection = (await getDatabase()).collection<SessionRecord>("sessions");
    await collection.createIndex({ tokenHash: 1 }, { unique: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  })().catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  return indexesPromise;
}

async function sessionsCollection() {
  const database = await getDatabase();
  await ensureIndexes();
  return database.collection<SessionRecord>("sessions");
}

export async function createSession(userId: string, rememberMe = false) {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (rememberMe ? sessionLifetimeMs : temporarySessionLifetimeMs),
  );
  const collection = await sessionsCollection();
  await collection.insertOne({ tokenHash: hashToken(token), userId, expiresAt, createdAt: now });
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
    const collection = await sessionsCollection();
    await collection.deleteOne({ tokenHash: hashToken(token) });
  }
  cookieStore.delete(cookieName);
}

export async function getCurrentSession(): Promise<{ user: AuthUser; rememberMe: boolean } | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const collection = await sessionsCollection();
  const session = await collection.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || !user.emailVerified) return null;
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      whatsapp: user.whatsapp,
      emailVerified: user.emailVerified,
    },
    rememberMe:
      session.expiresAt.getTime() - session.createdAt.getTime() > temporarySessionLifetimeMs,
  };
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
