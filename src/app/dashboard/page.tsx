import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/orders";
import { listSubscriptionsForUser, syncExistingPaidServers } from "@/server/subscriptions/servers";
import { ServerSubscriptionsCard } from "@/components/dashboard/server-subscriptions-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  await syncExistingPaidServers().catch(() => {});
  const [orders, subscriptions] = await Promise.all([
    listOrdersForUser(user.id),
    listSubscriptionsForUser(user.id),
  ]);

  const openOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  ).length;
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid").length;
  const chats = orders.filter((order) => order.latestMessage).length;
  const purchasedItems = orders.flatMap((order) =>
    order.items.map((item) => ({ ...item, orderId: order.id, orderStatus: order.status })),
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
          <Link className="active" href="/dashboard">
            <LayoutDashboard size={16} /> Overview
          </Link>
          <Link href="/dashboard/items">
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
            <strong>{user.email}</strong>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="dashboard-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </header>
        <section className="dashboard-stats">
          <div>
            <span>
              <ShoppingBag size={15} /> Total orders
            </span>
            <strong>{orders.length}</strong>
            <small>All your purchases</small>
          </div>
          <div>
            <span>
              <Clock3 size={15} /> Open requests
            </span>
            <strong>{openOrders}</strong>
            <small>Currently in progress</small>
          </div>
          <div>
            <span>
              <MessageCircle size={15} /> Active chats
            </span>
            <strong>{chats}</strong>
            <small>Conversations with support</small>
          </div>
          <div>
            <span>
              <LifeBuoy size={15} /> Paid orders
            </span>
            <strong>{paidOrders}</strong>
            <small>Ready for delivery</small>
          </div>
        </section>

        <ServerSubscriptionsCard subscriptions={subscriptions} />

        <section className="dashboard-panel dashboard-items-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="section-kicker">Your library</span>
              <h2>Purchased items</h2>
            </div>
            <span className="profile-count">{purchasedItems.length} items</span>
          </div>
          {purchasedItems.length === 0 ? (
            <div className="dashboard-empty">
              <ShoppingBag size={24} />
              <h3>No purchased items yet</h3>
              <p>Your purchased servers, mods, and services will appear here.</p>
              <Link className="profile-order-link" href="/#catalog">
                Browse the store
              </Link>
            </div>
          ) : (
            <div className="dashboard-items">
              {purchasedItems.map((item) => (
                <article className="dashboard-item" key={`${item.orderId}-${item.productId}`}>
                  <div>
                    <span className="profile-order-id">
                      {item.type.toUpperCase()} / {item.orderId}
                    </span>
                    <h3>{item.name}</h3>
                    <p>
                      {item.quantity} x Rs. {item.unitPrice.toLocaleString("en-LK")}
                    </p>
                  </div>
                  <div className="dashboard-item-side">
                    <span className="order-status">{item.orderStatus.replace("_", " ")}</span>
                    <Link className="profile-order-link" href={`/orders/${item.orderId}`}>
                      View order
                    </Link>
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
