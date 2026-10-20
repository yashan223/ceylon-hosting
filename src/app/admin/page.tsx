import Link from "next/link";
import {
  Package,
  Server,
  ShoppingCart,
  Wrench,
  Cable,
  Users,
  ArrowUpRight,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import { getAdminOverview } from "@/server/admin/overview";
import { listOrders } from "@/server/orders/orders";
import { formatOrderReference } from "@/lib/utils";
import { ClearDataButton } from "@/components/admin/clear-data-button";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [overview, orders] = await Promise.all([getAdminOverview(), listOrders()]);

  return (
    <main className="admin-page">
      <div className="admin-overview-top">
        <ClearDataButton />
      </div>

      <section className="admin-stat-grid admin-stat-grid-8">
        <Link href="/admin/orders" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <ShoppingCart size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Orders</span>
          <strong>{overview.totalOrders}</strong>
        </Link>
        <Link href="/admin/users" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <Users size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Registered users</span>
          <strong>{overview.totalUsers}</strong>
        </Link>
        <Link href="/admin/products" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <Package size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Active products</span>
          <strong>{overview.activeProducts}</strong>
        </Link>
        <Link href="/admin/products?type=server" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <Server size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Server plans</span>
          <strong>{overview.serverProducts}</strong>
        </Link>
        <Link href="/admin/subscriptions" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <RefreshCw size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Subscriptions</span>
          <strong>{overview.activeSubscriptions}</strong>
        </Link>
        <Link href="/admin/products?type=mod" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <Wrench size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Mods & tools</span>
          <strong>{overview.modProducts}</strong>
        </Link>
        <Link href="/admin/products?type=service" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <Cable size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Services</span>
          <strong>{overview.serviceProducts}</strong>
        </Link>
        <Link href="/admin/files" className="admin-stat admin-stat-link">
          <div className="admin-stat-header">
            <HardDrive size={18} />
            <ArrowUpRight size={14} className="admin-stat-corner-arrow" />
          </div>
          <span>Digital files</span>
          <strong>{overview.totalFiles}</strong>
        </Link>
      </section>

      <section className="admin-panel admin-activity-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">Customer activity</span>
            <h2>Recent orders</h2>
          </div>
          <div className="product-panel-actions">
            <span className="admin-panel-meta">{orders.length} total orders</span>
            <Link className="admin-store-link" href="/admin/orders">
              View all orders <span>↗</span>
            </Link>
          </div>
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
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td data-label="Order">
                    <div className="admin-cell-main">
                      <Link className="admin-order-link" href={`/admin/orders/${order.id}`}>
                        {formatOrderReference(order.id)}
                      </Link>
                      <small>
                        {order.items.map((item) => (
                          <span key={item.productId} className="admin-order-item-line">
                            <span className="admin-order-item-title">{item.name} ×{item.quantity}</span>
                          </span>
                        ))}
                      </small>
                    </div>
                  </td>
                  <td data-label="Customer">
                    <div>{order.email}</div>
                    {order.whatsapp && (
                      <small style={{ display: "block", color: "#16a34a", fontWeight: 500, marginTop: "2px" }}>
                        WA: {order.whatsapp}
                      </small>
                    )}
                  </td>
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
          {orders.length === 0 && <p className="admin-empty">No customer activity yet.</p>}
        </div>
      </section>
    </main>
  );
}
