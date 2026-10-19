import { requireAdmin } from "@/server/auth/admin";
import { getStoreSettings } from "@/server/settings/settings";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getStoreSettings();

  return (
    <main className="admin-page">
      <StoreSettingsForm initialSettings={settings} />
    </main>
  );
}
