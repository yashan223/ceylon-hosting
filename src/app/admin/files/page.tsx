import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminProducts } from "@/server/admin/overview";
import { FileManager } from "@/components/admin/file-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Files & Storage | Admin Console",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminFilesPage() {
  await requireAdmin();
  const products = await getAdminProducts();

  return (
    <main className="admin-page">
      <FileManager products={products} />
    </main>
  );
}
