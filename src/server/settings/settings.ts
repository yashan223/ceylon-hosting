import { getDatabase } from "@/server/db/mongodb";

export type StoreSettings = {
  taxEnabled: boolean;
  taxRate: number;
  updatedAt: Date;
};

const DEFAULT_SETTINGS: StoreSettings = {
  taxEnabled: true,
  taxRate: 2.27,
  updatedAt: new Date(),
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const db = await getDatabase();
    const doc = await db.collection("settings").findOne({ _id: "store_settings" as unknown as import("mongodb").ObjectId });
    if (!doc) return DEFAULT_SETTINGS;
    return {
      taxEnabled: doc.taxEnabled !== false,
      taxRate: typeof doc.taxRate === "number" && !isNaN(doc.taxRate) ? doc.taxRate : 2.27,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : new Date(),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
  const db = await getDatabase();
  const current = await getStoreSettings();
  const taxEnabled = updates.taxEnabled !== undefined ? Boolean(updates.taxEnabled) : current.taxEnabled;
  const taxRate = typeof updates.taxRate === "number" && !isNaN(updates.taxRate) && updates.taxRate >= 0 ? updates.taxRate : current.taxRate;

  const updated: StoreSettings = {
    taxEnabled,
    taxRate,
    updatedAt: new Date(),
  };

  await db.collection("settings").updateOne(
    { _id: "store_settings" as unknown as import("mongodb").ObjectId },
    { $set: updated },
    { upsert: true },
  );

  return updated;
}
