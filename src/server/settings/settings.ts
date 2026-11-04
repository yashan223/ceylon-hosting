import { getSupabaseAdmin } from "@/server/db/supabase";

export type StoreSettings = {
  taxEnabled: boolean;
  taxRate: number;
  sandboxEnabled: boolean;
  whatsappNumber: string;
  updatedAt: Date;
};

const DEFAULT_SETTINGS: StoreSettings = {
  taxEnabled: true,
  taxRate: 2.29,
  sandboxEnabled: true,
  whatsappNumber: "+94 78 890 1407",
  updatedAt: new Date(),
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", "store_settings")
      .maybeSingle();

    if (data && !error) {
      return {
        taxEnabled: data.tax_enabled !== false,
        taxRate:
          typeof data.tax_rate === "number" && !isNaN(data.tax_rate)
            ? data.tax_rate
            : Number(data.tax_rate) || 2.29,
        sandboxEnabled: data.sandbox_enabled !== false,
        whatsappNumber:
          typeof data.whatsapp_number === "string" && data.whatsapp_number.trim()
            ? data.whatsapp_number.trim()
            : "+94 78 890 1407",
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };
    }
  } catch (err) {
    console.warn("Supabase getStoreSettings error:", err);
  }

  return DEFAULT_SETTINGS;
}

export async function updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getStoreSettings();
  const taxEnabled =
    updates.taxEnabled !== undefined ? Boolean(updates.taxEnabled) : current.taxEnabled;
  const taxRate =
    typeof updates.taxRate === "number" && !isNaN(updates.taxRate) && updates.taxRate >= 0
      ? updates.taxRate
      : current.taxRate;
  const sandboxEnabled =
    updates.sandboxEnabled !== undefined ? Boolean(updates.sandboxEnabled) : current.sandboxEnabled;
  const whatsappNumber =
    typeof updates.whatsappNumber === "string" && updates.whatsappNumber.trim()
      ? updates.whatsappNumber.trim()
      : current.whatsappNumber;

  const now = new Date();
  const updated: StoreSettings = {
    taxEnabled,
    taxRate,
    sandboxEnabled,
    whatsappNumber,
    updatedAt: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("settings").upsert({
      id: "store_settings",
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      sandbox_enabled: sandboxEnabled,
      whatsapp_number: whatsappNumber,
      updated_at: now.toISOString(),
    });
  } catch (err) {
    console.warn("Supabase updateStoreSettings error:", err);
  }

  return updated;
}
