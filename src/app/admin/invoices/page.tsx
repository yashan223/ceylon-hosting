import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminProducts } from "@/server/admin/overview";
import { getStoreSettings } from "@/server/settings/settings";
import { InvoiceGenerator } from "@/components/admin/invoice-generator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bill & Invoice Generator | Admin",
  robots: { index: false, follow: false },
};

export default async function AdminInvoicesPage() {
  await requireAdmin();

  const [products, storeSettings] = await Promise.all([
    getAdminProducts(),
    getStoreSettings(),
  ]);

  return (
    <main className="admin-page">
      <InvoiceGenerator products={products} storeSettings={storeSettings} />
    </main>
  );
}
