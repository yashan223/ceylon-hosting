"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Order = {
  id: string;
  email: string;
  status: string;
  paymentStatus: string;
  items: {
    productId: string;
    name: string;
    type: string;
    quantity: number;
    unitPrice: number;
    serverName?: string;
    serverLocation?: string;
    serverPassword?: string;
    rconPassword?: string;
  }[];
  messages: {
    id: string;
    senderRole: "customer" | "admin";
    body: string;
    createdAt: string | Date;
  }[];
};

type OrderChatProps = { order: Order; admin?: boolean };

function ProductFileUpload({ productId }: { productId: string }) {
  const [status, setStatus] = useState("");
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return setStatus("Choose a file first.");
    const response = await fetch(`/api/admin/products/${productId}/file`, {
      method: "POST",
      body: formData,
    });
    setStatus(response.ok ? "Stored privately" : "Upload failed");
  }
  return (
    <form className="product-file-upload" onSubmit={upload}>
      <input name="file" type="file" />
      <Button size="sm" type="submit">
        Upload file
      </Button>
      {status && <small>{status}</small>}
    </form>
  );
}

export function OrderChat({ order: initialOrder, admin = false }: OrderChatProps) {
  const [order, setOrder] = useState(initialOrder);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(order.status);
  const [isSending, setIsSending] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const endpoint = admin ? `/api/admin/orders/${order.id}` : `/api/orders/${order.id}/messages`;
    const refresh = async () => {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { order?: Order };
      if (result.order) {
        setOrder(result.order);
        setStatus(result.order.status);
      }
    };
    const interval = window.setInterval(refresh, 4000);
    return () => window.clearInterval(interval);
  }, [admin, order.id]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || isSending) return;
    setIsSending(true);
    const endpoint = admin ? `/api/admin/orders/${order.id}` : `/api/orders/${order.id}/messages`;
    const response = await fetch(endpoint, {
      method: admin ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (response.ok) {
      const result = (await response.json()) as { message?: Order["messages"][number] };
      if (result.message)
        setOrder((current) => ({ ...current, messages: [...current.messages, result.message!] }));
      setMessage("");
    }
    setIsSending(false);
  }

  async function changeStatus(nextStatus: string) {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.ok) {
      setStatus(nextStatus);
      setOrder((current) => ({ ...current, status: nextStatus }));
    }
  }

  async function startPayment() {
    setIsPaying(true);
    setPaymentError("");
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    const result = (await response.json()) as { url?: string; error?: string };
    if (response.ok && result.url) window.location.assign(result.url);
    else {
      setPaymentError(result.error ?? "Unable to open payment.");
      setIsPaying(false);
    }
  }

  return (
    <section className="order-chat">
      <div className="order-chat-header">
        <div>
          <span className="admin-kicker">Order {order.id}</span>
          <h1>{admin ? order.email : "Your order"}</h1>
        </div>
        <span className="order-status">{status.replace("_", " ")}</span>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <div key={item.productId} className="order-item-entry">
            <div>
              <strong>{item.name}</strong>
              {(item.serverName || item.serverLocation) && (
                <div className="order-server-config-card">
                  <span className="order-server-config-title">Server Configuration</span>
                  <div className="order-server-config-grid">
                    {item.serverName && (
                      <div><span>Server Name:</span> <strong>{item.serverName}</strong></div>
                    )}
                    {item.serverLocation && (
                      <div><span>Location:</span> <strong>{item.serverLocation}</strong></div>
                    )}
                    <div><span>Password:</span> <strong>{item.serverPassword || "(None - Public)"}</strong></div>
                    <div><span>RCON:</span> <strong>{item.rconPassword || "(None)"}</strong></div>
                  </div>
                </div>
              )}
            </div>
            <span>
              {item.quantity} x Rs. {item.unitPrice.toLocaleString("en-LK")}
              {admin && <ProductFileUpload productId={item.productId} />}
            </span>
          </div>
        ))}
      </div>
      {!admin &&
        ["requested", "accepted"].includes(status) &&
        order.paymentStatus === "pending" && (
          <div className="order-payment-callout">
            <div>
              <strong>Complete your payment.</strong>
              <span>Payment will send your order to the admin delivery queue.</span>
            </div>
            <Button onClick={startPayment} disabled={isPaying}>
              {isPaying ? "Opening payment..." : "Pay now"}
              <ArrowRight size={15} />
            </Button>
            {paymentError && <small>{paymentError}</small>}
          </div>
        )}
      {!admin &&
        order.paymentStatus === "paid" &&
        order.items.some((item) => item.type === "server") && (
          <p className="order-delivery-note">
            Payment received. An admin will deliver your server details through this message thread.
          </p>
        )}
      {!admin &&
        order.paymentStatus === "paid" &&
        order.items.some((item) => item.type === "mod") && (
          <Link className="order-download-center" href={`/orders/${order.id}/downloads`}>
            Open download center
          </Link>
        )}
      {admin && (
        <div className="order-status-actions">
          {["requested", "accepted", "in_progress", "completed", "cancelled"].map((option) => (
            <Button
              key={option}
              variant={status === option ? "default" : "outline"}
              size="sm"
              onClick={() => changeStatus(option)}
            >
              {option.replace("_", " ")}
            </Button>
          ))}
        </div>
      )}
      <div className="order-messages">
        {order.messages.length === 0 ? (
          <p className="order-empty">No messages yet. Send the first update below.</p>
        ) : (
          order.messages.map((item) => (
            <div
              className={`order-message ${item.senderRole === (admin ? "admin" : "customer") ? "mine" : ""}`}
              key={item.id}
            >
              <span>{item.senderRole === "admin" ? "Admin" : "Customer"}</span>
              <p>{item.body}</p>
            </div>
          ))
        )}
      </div>
      <form className="order-message-form" onSubmit={sendMessage}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={
            admin ? "Send delivery instructions..." : "Ask a question about your order..."
          }
          maxLength={2000}
        />
        <Button type="submit" disabled={isSending || !message.trim()}>
          {isSending ? "Sending..." : "Send message"}
        </Button>
      </form>
    </section>
  );
}
