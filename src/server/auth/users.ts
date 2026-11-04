import { promisify } from "node:util";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/server/db/supabase";

const scrypt = promisify(scryptCallback);
const verificationLifetimeMs = 24 * 60 * 60 * 1000;

export type UserRecord = {
  id: string;
  email: string;
  firstName?: string;
  country?: string;
  whatsapp?: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationTokenHash?: string;
  verificationTokenExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = Pick<UserRecord, "id" | "email" | "firstName" | "whatsapp" | "emailVerified">;

export type AdminUser = Pick<
  UserRecord,
  "id" | "email" | "firstName" | "country" | "whatsapp" | "emailVerified" | "createdAt" | "updatedAt"
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseUser(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name || undefined,
    country: row.country || undefined,
    whatsapp: row.whatsapp || undefined,
    passwordHash: row.password_hash,
    emailVerified: Boolean(row.email_verified),
    verificationTokenHash: row.verification_token_hash || undefined,
    verificationTokenExpiresAt: row.verification_token_expires_at
      ? new Date(row.verification_token_expires_at)
      : undefined,
    passwordResetTokenHash: row.password_reset_token_hash || undefined,
    passwordResetTokenExpiresAt: row.password_reset_token_expires_at
      ? new Date(row.password_reset_token_expires_at)
      : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function createVerificationToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = normalizeEmail(email);
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle();

    if (data && !error) {
      return mapSupabaseUser(data);
    }
  } catch (err) {
    console.warn("Supabase findUserByEmail error:", err);
  }
  return null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data && !error) {
      return mapSupabaseUser(data);
    }
  } catch (err) {
    console.warn("Supabase findUserById error:", err);
  }
  return null;
}

export async function findUsersByIds(ids: string[]): Promise<UserRecord[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("id", ids);

    if (data && !error) {
      return data.map(mapSupabaseUser);
    }
  } catch (err) {
    console.warn("Supabase findUsersByIds error:", err);
  }
  return [];
}

export async function updateUserProfile(
  id: string,
  input: { firstName?: string; country?: string; whatsapp?: string },
) {
  const firstName = input.firstName?.trim().slice(0, 80) || undefined;
  const country = input.country?.trim().slice(0, 80) || undefined;
  const whatsapp = input.whatsapp?.trim().slice(0, 30) || undefined;
  const now = new Date();

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        first_name: firstName ?? null,
        country: country ?? null,
        whatsapp: whatsapp ?? null,
        updated_at: now.toISOString(),
      })
      .eq("id", id);
  } catch (err) {
    console.warn("Supabase updateUserProfile error:", err);
  }

  return findUserById(id);
}

async function ensureDefaultAdmin(email: string, password: string) {
  const configuredEmail = normalizeEmail(process.env.ADMIN_DEFAULT_EMAIL ?? "");
  const configuredPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  if (
    !configuredEmail ||
    !configuredPassword ||
    email !== configuredEmail ||
    password !== configuredPassword
  )
    return null;

  const now = new Date();
  const passwordHash = await hashPassword(password);

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", configuredEmail)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("users")
        .update({
          password_hash: passwordHash,
          email_verified: true,
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);
      return findUserById(existing.id);
    }

    const adminId = randomBytes(16).toString("hex");
    await supabase.from("users").insert({
      id: adminId,
      email: configuredEmail,
      first_name: "Admin",
      password_hash: passwordHash,
      email_verified: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    return findUserById(adminId);
  } catch (err) {
    console.warn("Supabase ensureDefaultAdmin error:", err);
    return null;
  }
}

export async function changeUserPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await findUserById(id);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  const newHash = await hashPassword(newPassword);
  const now = new Date();

  try {
    const supabase = getSupabaseAdmin();
    await Promise.all([
      supabase
        .from("users")
        .update({ password_hash: newHash, updated_at: now.toISOString() })
        .eq("id", id),
      supabase.from("sessions").delete().eq("user_id", id),
    ]);
    return true;
  } catch (err) {
    console.warn("Supabase changeUserPassword error:", err);
    return false;
  }
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, first_name, country, whatsapp, email_verified, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (data && !error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name || undefined,
        country: u.country || undefined,
        whatsapp: u.whatsapp || undefined,
        emailVerified: Boolean(u.email_verified),
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at),
      }));
    }
  } catch (err) {
    console.warn("Supabase listAdminUsers error:", err);
  }
  return [];
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    await Promise.all([
      supabase.from("sessions").delete().eq("user_id", id),
      supabase.from("users").delete().eq("id", id),
    ]);
    return true;
  } catch (err) {
    console.warn("Supabase deleteUser error:", err);
    return false;
  }
}

export async function createUser(input: {
  email: string;
  password: string;
  firstName?: string;
  country?: string;
  whatsapp?: string;
}) {
  const now = new Date();
  const verificationToken = createVerificationToken();
  const user: UserRecord = {
    id: randomBytes(16).toString("hex"),
    email: normalizeEmail(input.email),
    firstName: input.firstName?.trim() || undefined,
    country: input.country?.trim() || undefined,
    whatsapp: input.whatsapp?.trim().slice(0, 30) || undefined,
    passwordHash: await hashPassword(input.password),
    emailVerified: false,
    verificationTokenHash: hashToken(verificationToken),
    verificationTokenExpiresAt: new Date(now.getTime() + verificationLifetimeMs),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      first_name: user.firstName ?? null,
      country: user.country ?? null,
      whatsapp: user.whatsapp ?? null,
      password_hash: user.passwordHash,
      email_verified: false,
      verification_token_hash: user.verificationTokenHash,
      verification_token_expires_at: user.verificationTokenExpiresAt?.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  } catch (err) {
    console.warn("Supabase createUser error:", err);
  }

  return { user, verificationToken };
}

export async function updateVerificationToken(userId: string) {
  const verificationToken = createVerificationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + verificationLifetimeMs);

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        verification_token_hash: hashToken(verificationToken),
        verification_token_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", userId);
  } catch (err) {
    console.warn("Supabase updateVerificationToken error:", err);
  }

  return verificationToken;
}

export async function verifyEmail(token: string) {
  if (!token || typeof token !== "string") return false;
  const tokenHash = hashToken(token);
  const now = new Date();

  try {
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email_verified", false)
      .eq("verification_token_hash", tokenHash)
      .gt("verification_token_expires_at", now.toISOString())
      .maybeSingle();

    if (user) {
      await supabase
        .from("users")
        .update({
          email_verified: true,
          verification_token_hash: null,
          verification_token_expires_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", user.id);
      return true;
    }
  } catch (err) {
    console.warn("Supabase verifyEmail error:", err);
  }

  return false;
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user =
    (await ensureDefaultAdmin(normalizedEmail, password)) ??
    (await findUserByEmail(normalizedEmail));
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}

export async function createPasswordResetToken(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const token = createVerificationToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const now = new Date();

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        password_reset_token_hash: hashToken(token),
        password_reset_token_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", user.id);
    return { user, token };
  } catch (err) {
    console.warn("Supabase createPasswordResetToken error:", err);
    return null;
  }
}

export async function resetPassword(token: string, password: string) {
  if (!token || typeof token !== "string") return false;
  const tokenHash = hashToken(token);
  const now = new Date();
  const passwordHash = await hashPassword(password);

  try {
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("password_reset_token_hash", tokenHash)
      .gt("password_reset_token_expires_at", now.toISOString())
      .maybeSingle();

    if (user) {
      await Promise.all([
        supabase
          .from("users")
          .update({
            password_hash: passwordHash,
            password_reset_token_hash: null,
            password_reset_token_expires_at: null,
            updated_at: now.toISOString(),
          })
          .eq("id", user.id),
        supabase.from("sessions").delete().eq("user_id", user.id),
      ]);
      return true;
    }
  } catch (err) {
    console.warn("Supabase resetPassword error:", err);
  }

  return false;
}
