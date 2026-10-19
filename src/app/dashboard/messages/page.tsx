import Link from "next/link";
import { ArrowUpRight, LayoutDashboard, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/orders";

export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage() {
  const user = await requireUser("/dashboard/messages");
  const messageOrders = (await listOrdersForUser(user.id)).filter((order) => order.latestMessage);

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
          <Link href="/dashboard/items">
            <ShoppingBag size={16} /> Items & Mods
          </Link>
          <Link className="active" href="/dashboard/messages">
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
        <div className="dashboard-messages-content">
          <section className="dashboard-panel dashboard-messages-panel">
            <div className="dashboard-panel-heading">
              <div>
                <span className="section-kicker">Conversations</span>
                <h2>Recent messages</h2>
              </div>
              <span className="profile-count">{messageOrders.length} conversations</span>
            </div>
            {messageOrders.length === 0 ? (
              <div className="dashboard-empty">
                <MessageCircle size={24} />
                <h3>No messages yet</h3>
                <p>Messages from operators will appear here when an order chat starts.</p>
              </div>
            ) : (
              <div className="dashboard-messages">
                {messageOrders.map((order) => (
                  <article className="dashboard-message" key={order.id}>
                    <div>
                      <span className="profile-order-id">{order.id}</span>
                      <p>{order.latestMessage?.body}</p>
                      <small>
                        {new Date(order.latestMessage!.createdAt).toLocaleDateString("en-LK")}
                      </small>
                    </div>
                    <Link className="profile-order-link" href={`/orders/${order.id}`}>
                      Open chat <ArrowUpRight size={13} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
