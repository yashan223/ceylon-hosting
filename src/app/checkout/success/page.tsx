import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Download,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderForUser, markOrderPaid } from "@/server/orders/orders";
import { getPaymentsLkClient } from "@/server/payments/payments-lk";
import { StorePageHeader } from "@/components/store/store-page-header";

type PageProps = {
  searchParams: Promise<{ order?: string; checkout?: string; status?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { order, checkout, status } = await searchParams;
  const user = await getCurrentUser();
  let paymentConfirmed = false;
  let orderData = null;

  if (user && order) {
    orderData = await getOrderForUser(order, user.id);
    if (orderData) {
      if (orderData.paymentStatus === "paid") {
        paymentConfirmed = true;
      } else if (checkout && status === "succeeded") {
        try {
          const checkoutRecord = await getPaymentsLkClient().checkouts.retrieve(checkout);
          const payment = checkoutRecord.payment;
          const expectedAmountCents = orderData.items.reduce(
            (total, item) => total + Math.round(item.unitPrice * 100) * item.quantity,
            0,
          );
          if (
            payment.status === "succeeded" &&
            payment.reference === order &&
            payment.amountCents === expectedAmountCents
          ) {
            paymentConfirmed = await markOrderPaid(order, payment.id, payment.amountCents);
            if (paymentConfirmed) {
              orderData = await getOrderForUser(order, user.id);
            }
          }
        } catch (error) {
          console.error("Unable to confirm Payments.lk checkout", error);
        }
      }
    }
  }

  const isFailed = status === "failed" || status === "canceled" || status === "expired";
  const hasDownloads = orderData?.items.some((item) => item.type === "mod") ?? false;
  const totalAmount = orderData
    ? orderData.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    : 0;

  return (
    <div className="checkout-success-page">
      <StorePageHeader
        backHref={order ? `/orders/${encodeURIComponent(order)}` : "/"}
        backLabel={order ? "Open order chat" : "Back to store"}
      />
      <main className="checkout-success-main">
        <div className="checkout-success-card">
          <div
            className={`checkout-success-icon-wrap ${
              paymentConfirmed ? "is-success" : isFailed ? "is-failed" : "is-pending"
            }`}
          >
            {paymentConfirmed ? (
              <CheckCircle2 size={34} />
            ) : isFailed ? (
              <AlertCircle size={34} />
            ) : (
              <Clock size={34} />
            )}
          </div>

          <span className={`checkout-success-badge ${paymentConfirmed ? "is-success" : ""}`}>
            {paymentConfirmed
              ? "Payment Received"
              : isFailed
                ? "Payment Unsuccessful"
                : "Awaiting Confirmation"}
          </span>

          <h1>
            {paymentConfirmed
              ? "Payment confirmed."
              : isFailed
                ? "Payment was not completed."
                : "Payment is being confirmed."}
          </h1>

          <p className="checkout-success-subtitle">
            {paymentConfirmed
              ? "Thank you for your purchase! Your payment is confirmed and your order is ready for delivery."
              : isFailed
                ? "Your payment could not be processed or was cancelled. You can review your cart and try again."
                : "We are waiting for payment confirmation from Payments.lk. Your order status will update shortly."}
          </p>

          {orderData && (
            <div className="checkout-order-box">
              <div className="checkout-order-header">
                <div>
                  <span className="checkout-order-label">Order Reference</span>
                  <strong className="checkout-order-id">#{orderData.id}</strong>
                </div>
                <span
                  className={`checkout-status-pill ${
                    orderData.paymentStatus === "paid" ? "is-paid" : "is-pending"
                  }`}
                >
                  {orderData.paymentStatus.toUpperCase()}
                </span>
              </div>

              <div className="checkout-order-items">
                {orderData.items.map((item) => (
                  <div className="checkout-order-item" key={item.productId}>
                    <div>
                      <span className="checkout-item-name">{item.name}</span>
                      <span className="checkout-item-meta">
                        {item.type === "server"
                          ? "Game server"
                          : item.type === "service"
                            ? "Setup service"
                            : "Downloadable mod"}{" "}
                        &times; {item.quantity}
                      </span>
                    </div>
                    <span className="checkout-item-price">
                      Rs. {(item.unitPrice * item.quantity).toLocaleString("en-LK")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="checkout-order-total">
                <span>Total Paid</span>
                <strong>Rs. {totalAmount.toLocaleString("en-LK")}</strong>
              </div>
            </div>
          )}

          {paymentConfirmed && (
            <div className="checkout-next-steps">
              <div className="checkout-step-item">
                <MessageSquare size={18} />
                <div>
                  <strong>Order chat & delivery coordination</strong>
                  <p>Our operator is standing by in your dedicated order chat to proceed with setup.</p>
                </div>
              </div>
              {hasDownloads && (
                <div className="checkout-step-item">
                  <Download size={18} />
                  <div>
                    <strong>Instant mod downloads</strong>
                    <p>Your purchased tools and mods are unlocked and available to download immediately.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="checkout-success-actions">
            {order && paymentConfirmed && (
              <Link
                className="checkout-primary-btn"
                href={`/orders/${encodeURIComponent(order)}`}
              >
                <MessageSquare size={16} /> Open Order Chat <ArrowRight size={16} />
              </Link>
            )}

            <div className="checkout-secondary-actions">
              {hasDownloads && order && paymentConfirmed && (
                <Link
                  className="ui-button ui-button-outline"
                  href={`/orders/${encodeURIComponent(order)}/downloads`}
                >
                  <Download size={15} /> Download Files
                </Link>
              )}
              {user ? (
                <Link className="ui-button ui-button-ghost" href="/dashboard">
                  View in Dashboard
                </Link>
              ) : (
                <Link className="ui-button ui-button-ghost" href="/#catalog">
                  <ShoppingBag size={15} /> Continue Shopping
                </Link>
              )}
              {isFailed && (
                <Link className="checkout-primary-btn" href="/?cart=1#catalog">
                  Return to Cart
                </Link>
              )}
            </div>
          </div>

          <p className="checkout-support-hint">
            Questions or need urgent assistance? Reach our team anytime through your order chat.
          </p>
        </div>
      </main>
    </div>
  );
}
