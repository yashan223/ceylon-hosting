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
            <ShoppingBag size={16} /> Items & Mods
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

        {subscriptions.length === 0 && (
          <section className="dashboard-panel dashboard-items-panel">
            <div className="dashboard-panel-heading">
              <div>
                <span className="section-kicker">Workspace</span>
                <h2>Account Overview</h2>
              </div>
            </div>
            <div className="dashboard-empty">
              <ShoppingBag size={24} />
              <h3>Your purchased items & mods</h3>
              <p>Manage your game servers, orders, and unlocked files in the Items & Mods section.</p>
              <Link className="profile-order-link" href="/dashboard/items">
                View items & mods <ArrowUpRight size={13} />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
