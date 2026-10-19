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
      <section className="admin-panel order-table-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">Fulfillment queue</span>
            <h2>Customer orders</h2>
          </div>
          <span className="admin-panel-meta">{orders.length} total orders</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Order">
                    <div className="admin-cell-main">
                      <Link className="admin-order-link" href={`/admin/orders/${order.id}`}>
                        {formatOrderReference(order.id)}
                      </Link>
                      <small>
                        {order.items.map((item) => (
                          <span key={item.productId} className="admin-order-item-line">
                            <span>{item.name} x{item.quantity}</span>
                            {(item.serverName || item.serverLocation) && (
                              <span className="admin-order-server-badge">
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
                              </span>
                            )}
                          </span>
                        ))}
                      </small>
                    </div>
                  </td>
                  <td data-label="Customer">{order.email}</td>
                  <td data-label="Payment">
                    <div className="admin-payment-cell">
                      <span className={`admin-status ${order.paymentStatus === "paid" ? "active" : ""}`}>
                        {order.paymentStatus}
                      </span>
                      {order.paymentId && (
                        <small className="admin-payment-id" title={order.paymentId}>
                          ID: {order.paymentId}
                        </small>
                      )}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className="admin-status active">{order.status.replace("_", " ")}</span>
                  </td>
                  <td data-label="Updated">
                    {new Date(order.updatedAt).toLocaleDateString("en-LK")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="admin-empty">No customer orders yet.</p>}
        </div>
      </section>
    </main>
  );
}
