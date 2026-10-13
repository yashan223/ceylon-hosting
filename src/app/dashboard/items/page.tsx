import Link from "next/link";
import { ArrowUpRight, LayoutDashboard, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getActiveProducts } from "@/server/catalog/products";

export const dynamic = "force-dynamic";

export default async function DashboardItemsPage() {
  await requireUser("/dashboard/items");
  const products = await getActiveProducts();

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
            <ShoppingBag size={16} /> Items
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
            <strong>Available products</strong>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="dashboard-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </header>
        <div className="dashboard-items-content">
          <section className="dashboard-catalog-grid">
            {products.map((product) => (
              <article className="dashboard-catalog-card" key={product.id}>
                <div className={`dashboard-catalog-art product-art-${product.accent}`}>
                  <span>
                    {product.type === "server"
                      ? "SERVER"
                      : product.type === "service"
                        ? "SERVICE"
                        : "MOD / TOOL"}
                  </span>
                </div>
                <div className="dashboard-catalog-copy">
                  <span className="profile-order-id">{product.type}</span>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <div>
                    <strong>Rs. {product.price.toLocaleString("en-LK")}</strong>
                    <Link className="profile-order-link" href={`/products/${product.id}`}>
                      View item <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
          {products.length === 0 && (
            <p className="profile-empty">No purchasable items are available right now.</p>
          )}
        </div>
      </div>
    </main>
  );
}
