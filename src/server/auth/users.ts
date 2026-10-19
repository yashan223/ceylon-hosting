import { promisify } from "node:util";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/server/db/mongodb";

const scrypt = promisify(scryptCallback);
const verificationLifetimeMs = 24 * 60 * 60 * 1000;

type UserRecord = {
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

let indexesPromise: Promise<void> | undefined;

function ensureIndexes() {
  indexesPromise ??= (async () => {
    const collection = (await getDatabase()).collection<UserRecord>("users");
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ verificationTokenHash: 1 }, { sparse: true });
    await collection.createIndex({ passwordResetTokenHash: 1 }, { sparse: true });
  })().catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  return indexesPromise;
}

async function usersCollection() {
  const database = await getDatabase();
  await ensureIndexes();
  return database.collection<UserRecord>("users");
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

export async function findUserByEmail(email: string) {
  const collection = await usersCollection();
  return collection.findOne({ email: normalizeEmail(email) });
}

export async function findUserById(id: string) {
  const collection = await usersCollection();
  return collection.findOne({ id });
}

export async function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const collection = await usersCollection();
  return collection.find({ id: { $in: ids } }).toArray();
}

export async function updateUserProfile(
  id: string,
  input: { firstName?: string; country?: string; whatsapp?: string },
) {
  const collection = await usersCollection();
  const firstName = input.firstName?.trim().slice(0, 80) || undefined;
  const country = input.country?.trim().slice(0, 80) || undefined;
  const whatsapp = input.whatsapp?.trim().slice(0, 30) || undefined;
  await collection.updateOne(
    { id },
    { $set: { firstName, country, whatsapp, updatedAt: new Date() } },
  );
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

  const collection = await usersCollection();
  const now = new Date();
  const passwordHash = await hashPassword(password);
  const existing = await collection.findOne({ email: configuredEmail });
  if (existing) {
    await collection.updateOne(
      { id: existing.id },
      { $set: { passwordHash, emailVerified: true, updatedAt: now } },
    );
    return findUserById(existing.id);
  }

  const user: UserRecord = {
    id: randomBytes(16).toString("hex"),
    email: configuredEmail,
    firstName: "Admin",
    passwordHash,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(user);
  return user;
}

export async function changeUserPassword(id: string, currentPassword: string, newPassword: string) {
  const collection = await usersCollection();
  const user = await collection.findOne({ id });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  const database = await getDatabase();
  await Promise.all([
    collection.updateOne(
      { id },
      { $set: { passwordHash: await hashPassword(newPassword), updatedAt: new Date() } },
    ),
    database.collection("sessions").deleteMany({ userId: id }),
  ]);
  return true;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const collection = await usersCollection();
  const users = await collection
    .find(
      {},
      {
        projection: {
          passwordHash: 0,
          verificationTokenHash: 0,
          verificationTokenExpiresAt: 0,
          passwordResetTokenHash: 0,
          passwordResetTokenExpiresAt: 0,
        },
      },
    )
    .sort({ createdAt: -1 })
    .toArray();
  return users.map(
    ({ id, email, firstName, country, whatsapp, emailVerified, createdAt, updatedAt }) => ({
      id,
      email,
      firstName,
      country,
      whatsapp,
      emailVerified,
      createdAt,
      updatedAt,
    }),
  );
}

export async function deleteUser(id: string) {
  const database = await getDatabase();
  const result = await database.collection<UserRecord>("users").deleteOne({ id });
  if (result.deletedCount > 0) await database.collection("sessions").deleteMany({ userId: id });
  return result.deletedCount > 0;
}

export async function createUser(input: {
  email: string;
  password: string;
  firstName?: string;
  country?: string;
  whatsapp?: string;
}) {
  const collection = await usersCollection();

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

  await collection.insertOne(user);
  return { user, verificationToken };
}

export async function updateVerificationToken(userId: string) {
  const collection = await usersCollection();
  const verificationToken = createVerificationToken();
  const now = new Date();
  await collection.updateOne(
    { id: userId },
    {
      $set: {
        verificationTokenHash: hashToken(verificationToken),
        verificationTokenExpiresAt: new Date(now.getTime() + verificationLifetimeMs),
        updatedAt: now,
      },
    },
  );
  return verificationToken;
}

export async function verifyEmail(token: string) {
  if (!token || typeof token !== "string") return false;
  const collection = await usersCollection();
  const tokenHash = hashToken(token);
  const now = new Date();

  // Fast O(1) indexed lookup for SHA-256 hashed verification tokens
  const user = await collection.findOne({
    emailVerified: false,
    verificationTokenHash: tokenHash,
    verificationTokenExpiresAt: { $gt: now },
  });

  if (user) {
    await collection.updateOne(
      { id: user.id },
      {
        $set: { emailVerified: true, updatedAt: new Date() },
        $unset: { verificationTokenHash: "", verificationTokenExpiresAt: "" },
      },
    );
    return true;
  }

  // Fallback for any legacy scrypt verification tokens containing a salt delimiter ':'
  const legacyUsers = await collection
    .find({
      emailVerified: false,
      verificationTokenHash: { $regex: /^[^:]+:[^:]+$/ },
      verificationTokenExpiresAt: { $gt: now },
    })
    .limit(5)
    .toArray();

  for (const legacyUser of legacyUsers) {
    if (
      legacyUser.verificationTokenHash &&
      (await verifyPassword(token, legacyUser.verificationTokenHash))
    ) {
      await collection.updateOne(
        { id: legacyUser.id },
        {
          $set: { emailVerified: true, updatedAt: new Date() },
          $unset: { verificationTokenHash: "", verificationTokenExpiresAt: "" },
        },
      );
      return true;
    }
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
  const collection = await usersCollection();
  const user = await collection.findOne({ email: normalizeEmail(email) });
  if (!user) return null;
  const token = createVerificationToken();
  await collection.updateOne(
    { id: user.id },
    {
      $set: {
        passwordResetTokenHash: hashToken(token),
        passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    },
  );
  return { user, token };
}

export async function resetPassword(token: string, password: string) {
  if (!token || typeof token !== "string") return false;
  const collection = await usersCollection();
  const user = await collection.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetTokenExpiresAt: { $gt: new Date() },
  });
  if (!user) return false;
  const database = await getDatabase();
  await Promise.all([
    collection.updateOne(
      { id: user.id },
      {
        $set: { passwordHash: await hashPassword(password), updatedAt: new Date() },
        $unset: { passwordResetTokenHash: "", passwordResetTokenExpiresAt: "" },
      },
    ),
    database.collection("sessions").deleteMany({ userId: user.id }),
  ]);
  return true;
}
