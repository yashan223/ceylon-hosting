import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listOrders } from "@/server/orders/orders";
import { formatOrderReference } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await listOrders();

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">Fulfillment queue</span>
            <h2>Customer orders</h2>
          </div>
          <span className="admin-panel-meta">{orders.length} total orders</span>
        </div>

        <div className="admin-orders-cards">
          {orders.map((order) => {
            const formattedRef = formatOrderReference(order.id);
            const dateStr = new Date(order.updatedAt).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const totalAmount =
              order.total ||
              order.subtotal ||
              order.items.reduce(
                (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1),
                0
              );

            return (
              <article key={order.id} className="admin-order-card">
                <header className="admin-order-card-header">
                  <div className="admin-order-card-id-wrap">
                    <span className="admin-order-card-kicker">Order</span>
                    <Link
                      className="admin-order-link admin-order-card-id"
                      href={`/admin/orders/${order.id}`}
                    >
                      {formattedRef}
                    </Link>
                  </div>
                  <div className="admin-order-card-badges">
                    <span
                      className={`admin-status ${
                        order.paymentStatus === "paid" ? "active" : ""
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                    <span className="admin-status active">
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                </header>

                <div className="admin-order-card-meta-row">
                  <div className="admin-order-card-meta-col">
                    <span className="admin-order-meta-label">Customer</span>
                    <span className="admin-order-meta-value customer-email">
                      {order.email}
                    </span>
                    {order.whatsapp && (
                      <a
                        href={`https://wa.me/${order.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-order-whatsapp-chip"
                      >
                        💬 {order.whatsapp}
                      </a>
                    )}
                  </div>

                  <div className="admin-order-card-meta-col">
                    <span className="admin-order-meta-label">Payment ID</span>
                    <span className="admin-order-meta-value admin-payment-id">
                      {order.paymentId ? `ID: ${order.paymentId}` : "—"}
                    </span>
                  </div>

                  <div className="admin-order-card-meta-col">
                    <span className="admin-order-meta-label">Last Updated</span>
                    <span className="admin-order-meta-value">{dateStr}</span>
                  </div>

                  {totalAmount > 0 && (
                    <div className="admin-order-card-meta-col">
                      <span className="admin-order-meta-label">Total</span>
                      <span className="admin-order-meta-value admin-order-total-value">
                        Rs. {totalAmount.toLocaleString("en-LK")}.00
                      </span>
                    </div>
                  )}
                </div>

                <div className="admin-order-card-items-wrap">
                  <span className="admin-order-meta-label">Items & Configuration</span>
                  <div className="admin-order-card-items-list">
                    {order.items.map((item) => (
                      <div key={item.productId} className="admin-order-card-item">
                        <div className="admin-order-card-item-title-bar">
                          <span className="admin-order-card-item-name">
                            {item.name}{" "}
                            <span className="admin-order-card-qty">×{item.quantity}</span>
                          </span>
                          {typeof item.unitPrice === "number" && item.unitPrice > 0 && (
                            <span className="admin-order-card-item-price">
                              Rs. {(item.unitPrice * item.quantity).toLocaleString("en-LK")}.00
                            </span>
                          )}
                        </div>
                        {(item.serverName || item.serverLocation || item.extraSlots) && (
                          <div className="admin-order-server-badge">
                            {item.serverLocation && (
                              <span className="admin-server-loc-chip">
                                {item.serverLocation.toLowerCase().includes("singapore")
                                  ? "🇸🇬 Singapore"
                                  : item.serverLocation.toLowerCase().includes("germany")
                                  ? "🇩🇪 Germany"
                                  : `🌐 ${item.serverLocation}`}
                              </span>
                            )}
                            {item.serverName ? (
                              <span className="admin-server-name-chip">
                                Host: <strong>{item.serverName}</strong>
                              </span>
                            ) : null}
                            {item.serverPassword ? (
                              <span className="admin-server-pass-chip">
                                Pass: <code>{item.serverPassword}</code>
                              </span>
                            ) : (
                              <span className="admin-server-pass-chip public">Public</span>
                            )}
                            {item.rconPassword ? (
                              <span className="admin-server-pass-chip rcon">
                                RCON: <code>{item.rconPassword}</code>
                              </span>
                            ) : null}
                            {item.extraSlots ? (
                              <span className="admin-server-pass-chip slots">
                                +{typeof item.extraSlots === "number" ? item.extraSlots : 4} Slots
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <footer className="admin-order-card-footer">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="admin-order-card-action-btn"
                  >
                    View order console &rarr;
                  </Link>
                </footer>
              </article>
            );
          })}
          {orders.length === 0 && (
            <p className="admin-empty">No customer orders yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
