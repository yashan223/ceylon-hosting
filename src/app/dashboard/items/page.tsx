import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  FileText,
  HardDrive,
  LayoutDashboard,
  MessageCircle,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getProductsByIds } from "@/server/catalog/products";
import { listOrdersForUser } from "@/server/orders/orders";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardItemsPage() {
  const user = await requireUser("/dashboard/items");
  const orders = await listOrdersForUser(user.id);

  const purchasedItemIds = Array.from(
    new Set(orders.flatMap((order) => order.items.map((item) => item.productId))),
  );
  const purchasedProducts = await getProductsByIds(purchasedItemIds);
  const productsById = new Map(purchasedProducts.map((p) => [p.id, p]));

  const paidDownloads = orders
    .filter((order) => order.paymentStatus === "paid")
    .flatMap((order) =>
      order.items
        .map((item) => {
          const prod = productsById.get(item.productId);
          return {
            ...item,
            orderId: order.id,
            orderCreatedAt: order.createdAt,
            product: prod,
          };
        })
        .filter((item) => Boolean(item.product?.downloadKey || item.type === "mod")),
    );

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href="/">
          <span className="brand-mark">C</span>
          <span>
            <strong>CeylonHosting</strong>
            <small>CLIENT WORKSPACE</small>
          </span>
        </Link>
        <nav className="dashboard-nav" aria-label="Account navigation">
          <Link href="/dashboard">
            <LayoutDashboard size={16} /> Overview
          </Link>
          <Link className="active" href="/dashboard/items">
            <ShoppingBag size={16} /> Items & Files
          </Link>
          <Link href="/dashboard/messages">
            <MessageCircle size={16} /> Messages
          </Link>
          <Link href="/profile">
            <UserRound size={16} /> Profile
          </Link>
        </nav>
        <Link className="dashboard-store-link" href="/">
          Back to store <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="section-kicker">Client workspace</span>
            <strong>Library & Items</strong>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="dashboard-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </header>

        <section className="dashboard-panel dashboard-items-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="section-kicker">Digital Downloads</span>
              <h2>My Purchased Mods & Files</h2>
            </div>
            <span className="profile-count">{paidDownloads.length} downloads</span>
          </div>

          {paidDownloads.length === 0 ? (
            <div className="dashboard-empty">
              <HardDrive size={24} />
              <h3>No digital downloads unlocked yet</h3>
              <p>
                When you purchase mods, tools, or server files and your payment is confirmed,
                your 1-click downloads will appear here.
              </p>
              <Link className="profile-order-link" href="/#catalog">
                Browse catalog for mods
              </Link>
            </div>
          ) : (
            <div className="dashboard-library-grid">
              {paidDownloads.map((item) => (
                <article
                  className="dashboard-library-card"
                  key={`${item.orderId}-${item.productId}`}
                >
                  <div className="dashboard-library-card-art">
                    <FileText size={28} />
                    <span className="dashboard-library-card-type">
                      {item.type === "mod" ? "MOD FILE" : "ATTACHED FILE"}
                    </span>
                  </div>
                  <div className="dashboard-library-card-body">
                    <div>
                      <span className="profile-order-id">
                        Order #{item.orderId} •{" "}
                        {new Date(item.orderCreatedAt).toLocaleDateString("en-LK", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <h3>{item.name}</h3>
                      {item.product?.downloadName ? (
                        <p className="dashboard-library-file-meta">
                          <strong>{item.product.downloadName}</strong>
                          {item.product.downloadSize && (
                            <small>({formatBytes(item.product.downloadSize)})</small>
                          )}
                        </p>
                      ) : (
                        <p className="dashboard-library-file-meta">
                          <small>File being prepared by admin</small>
                        </p>
                      )}
                    </div>
                    <div className="dashboard-library-card-actions">
                      {item.product?.downloadKey ? (
                        <a
                          className="dashboard-download-action-btn"
                          href={`/api/downloads/${item.productId}`}
                          download={item.product.downloadName}
                        >
                          <Download size={14} /> Download File
                        </a>
                      ) : (
                        <span className="dashboard-file-badge info">
                          Preparing file
                        </span>
                      )}
                      <Link
                        className="profile-order-link"
                        href={`/orders/${item.orderId}`}
                      >
                        Order details
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
