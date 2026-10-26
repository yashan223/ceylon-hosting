import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin console",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();

  return (
    <div className="admin-shell" data-lenis-prevent>
      <aside className="admin-sidebar" data-lenis-prevent>
        <div className="admin-sidebar-brand-row">
          <Link className="admin-brand" href="/admin">
            <span className="brand-mark">C</span>
            <span>
              <strong>CeylonHosting</strong>
              <small>ADMIN CONSOLE</small>
            </span>
          </Link>
          <div className="admin-sidebar-mobile-actions">
            <Link className="admin-mobile-quick-btn" href="/">
              Store ↗
            </Link>
            <form action="/api/auth/sign-out" method="post">
              <button className="admin-mobile-sign-out-btn" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
        <div className="admin-sidebar-footer">
          <Link className="admin-store-link" href="/">
            Back to store <span>↗</span>
          </Link>
          <form action="/api/auth/sign-out" method="post">
            <button className="admin-sign-out admin-sidebar-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-content" data-lenis-prevent>
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">Workspace</span>
            <strong>Store operations</strong>
          </div>
          <div className="admin-user">
            <span>{user.firstName ?? user.email}</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
