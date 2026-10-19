"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  MessageSquare,
  Package,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderItem = {
  productId: string;
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
  serverName?: string;
  serverLocation?: string;
  serverPassword?: string;
  rconPassword?: string;
};

type OrderMessage = {
  id: string;
  senderRole: "customer" | "admin";
  body: string;
  createdAt: string | Date;
};

type Order = {
  id: string;
  email: string;
  status: string;
  paymentStatus: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  items: OrderItem[];
  messages: OrderMessage[];
};

type OrderChatProps = {
  order: Order;
  admin?: boolean;
};

function getLocationDetails(locationStr?: string) {
  if (!locationStr) return null;
  const loc = locationStr.toLowerCase();
  if (loc.includes("singapore")) {
    return { name: "Singapore", flag: "🇸🇬", region: "Asia-Pacific", latency: "Ultra-low latency" };
  }
  if (loc.includes("germany") || loc.includes("frankfurt")) {
    return { name: "Germany", flag: "🇩🇪", region: "Europe Central", latency: "Central Europe" };
  }
  return { name: locationStr, flag: "🌐", region: "Global Data Center", latency: "Standard route" };
}

function formatOrderDate(dateVal?: string | Date) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatMessageTime(dateVal: string | Date) {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

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
    <form className="order-product-file-upload" onSubmit={upload}>
      <input name="file" type="file" />
      <Button size="sm" type="submit">
        Upload file
      </Button>
      {status && <small>{status}</small>}
    </form>
  );
}

const quickPrompts = [
  "When will my server be online?",
  "How do I connect using developer console?",
  "Can you help install custom plugins / configs?",
];

export function OrderChat({ order: initialOrder, admin = false }: OrderChatProps) {
  const [order, setOrder] = useState(initialOrder);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(order.status);
  const [isSending, setIsSending] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [order.messages.length]);

  function handleCopy(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  }

  function toggleShow(key: string) {
    setShowPasswords((curr) => ({ ...curr, [key]: !curr[key] }));
  }

  async function refreshOrder() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const endpoint = admin ? `/api/admin/orders/${order.id}` : `/api/orders/${order.id}/messages`;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.ok) {
        const result = (await response.json()) as { order?: Order };
        if (result.order) {
          setOrder(result.order);
          setStatus(result.order.status);
        }
      }
    } catch {
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }

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
      if (result.message) {
        setOrder((current) => ({ ...current, messages: [...current.messages, result.message!] }));
      }
      setMessage("");
    }
    setIsSending(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (message.trim() && !isSending) {
        const form = event.currentTarget.form;
        if (form) form.requestSubmit();
      }
    }
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

  const isPaid = order.paymentStatus === "paid";
  const isFailed = order.paymentStatus === "failed";
  const isProvisioned = status === "completed";
  const isProvisioning = ["in_progress", "accepted"].includes(status);
  const isCancelled = status === "cancelled";

  const timelineSteps = [
    {
      id: "placed",
      title: "Order Placed",
      status: "completed" as const,
      desc: "Order registered",
      icon: Package,
    },
    {
      id: "payment",
      title: "Payment",
      status: isPaid ? ("completed" as const) : isFailed ? ("error" as const) : ("current" as const),
      desc: isPaid ? "Payment received" : isFailed ? "Payment failed" : "Awaiting payment",
      icon: CreditCard,
    },
    {
      id: "provision",
      title: "Provisioning",
      status: isCancelled
        ? ("error" as const)
        : isProvisioned
        ? ("completed" as const)
        : isProvisioning
        ? ("current" as const)
        : ("upcoming" as const),
      desc: isProvisioned
        ? "Configured"
        : isProvisioning
        ? "Setting up instance"
        : isCancelled
        ? "Cancelled"
        : "In queue",
      icon: Server,
    },
    {
      id: "active",
      title: "Active & Ready",
      status: isProvisioned ? ("completed" as const) : ("upcoming" as const),
      desc: isProvisioned ? "Credentials issued" : "Ready to play",
      icon: ShieldCheck,
    },
  ];

  const totalAmount = order.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const serverItems = order.items.filter(
    (it) => it.type === "server" || it.serverName || it.serverLocation
  );
  const hasModItems = order.items.some((it) => it.type === "mod");

  return (
    <div className="order-dashboard">
      <div className="order-hero">
        <div className="order-hero-main">
          <div className="order-hero-topline">
            <div className="order-id-pill">
              <span className="order-id-label">ORDER</span>
              <strong className="order-id-value">{order.id}</strong>
              <button
                type="button"
                className="order-copy-btn"
                onClick={() => handleCopy(order.id, "order_id")}
                title="Copy Order ID"
              >
                {copiedKey === "order_id" ? (
                  <Check size={12} className="copied" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
            {order.createdAt && (
              <span className="order-date-text" suppressHydrationWarning>
                Placed {formatOrderDate(order.createdAt)}
              </span>
            )}
          </div>
          <h1 className="order-hero-heading">
            {admin ? `Order for ${order.email}` : "Order Details & Setup"}
          </h1>
        </div>

        <div className="order-hero-actions">
          <div className="order-badges-group">
            {isPaid ? (
              <span className="order-badge order-badge-paid">
                <CheckCircle2 size={13} /> Paid
              </span>
            ) : isFailed ? (
              <span className="order-badge order-badge-failed">
                <ShieldAlert size={13} /> Payment Failed
              </span>
            ) : (
              <span className="order-badge order-badge-pending">
                <Clock size={13} /> Payment Pending
              </span>
            )}

            {status === "completed" ? (
              <span className="order-badge order-badge-completed">
                <ShieldCheck size={13} /> Active & Ready
              </span>
            ) : status === "in_progress" ? (
              <span className="order-badge order-badge-progress">
                <span className="order-pulse-dot" /> Provisioning
              </span>
            ) : status === "accepted" ? (
              <span className="order-badge order-badge-accepted">
                <CheckCircle2 size={13} /> Accepted
              </span>
            ) : status === "cancelled" ? (
              <span className="order-badge order-badge-cancelled">Cancelled</span>
            ) : (
              <span className="order-badge order-badge-requested">
                <Clock size={13} /> In Queue
              </span>
            )}
          </div>

          <button
            type="button"
            className={`order-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={refreshOrder}
            title="Refresh order status"
          >
            <RefreshCw size={13} className={isRefreshing ? "spinning" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Live"}</span>
          </button>
        </div>
      </div>

      <div className="order-stepper">
        {timelineSteps.map((step, idx) => {
          const IconComp = step.icon;
          const isCompleted = step.status === "completed";

          return (
            <div key={step.id} className={`order-step ${step.status}`}>
              <div className="order-step-indicator">
                <div className="order-step-icon-wrap">
                  {isCompleted ? <Check size={14} /> : <IconComp size={14} />}
                </div>
                {idx < timelineSteps.length - 1 && (
                  <div className={`order-step-line ${isCompleted ? "completed" : ""}`} />
                )}
              </div>
              <div className="order-step-content">
                <strong className="order-step-title">{step.title}</strong>
                <span className="order-step-desc">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="order-layout-grid">
        <div className="order-main-col">
          {serverItems.map((item, idx) => {
            const loc = getLocationDetails(item.serverLocation);
            const passKey = `pass_${idx}`;
            const rconKey = `rcon_${idx}`;
            const hasPass = Boolean(item.serverPassword);
            const hasRcon = Boolean(item.rconPassword);

            return (
              <div key={item.productId || idx} className="order-card order-server-card">
                <div className="order-card-header">
                  <div className="order-card-title-group">
                    <div className="order-card-icon-badge">
                      <Server size={18} />
                    </div>
                    <div>
                      <h3>Server Configuration</h3>
                      <span className="order-card-subtitle">{item.name}</span>
                    </div>
                  </div>
                  {loc && (
                    <div className="order-location-pill">
                      <span className="order-flag">{loc.flag}</span>
                      <span className="order-location-name">{loc.name}</span>
                      <span className="order-location-dot" />
                    </div>
                  )}
                </div>

                {status === "completed" ? (
                  <div className="order-notice-banner success">
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>Server is Live & Operational</strong>
                      <p>
                        Your game server is deployed. Review the support thread on the right for
                        your live server connection string and console setup details.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="order-notice-banner info">
                    <Clock size={16} />
                    <div>
                      <strong>Deployment in Progress</strong>
                      <p>
                        Our engineers are provisioning your game server node. Dedicated IP, Port,
                        and live connection keys will be delivered in the support thread.
                      </p>
                    </div>
                  </div>
                )}

                <div className="order-cred-grid">
                  <div className="order-cred-tile">
                    <span className="order-cred-label">Server Hostname</span>
                    <div className="order-cred-value-wrap">
                      <strong className="order-cred-value">{item.serverName || item.name}</strong>
                      <button
                        type="button"
                        className="order-icon-btn"
                        onClick={() => handleCopy(item.serverName || item.name, `srv_${idx}`)}
                        title="Copy server name"
                      >
                        {copiedKey === `srv_${idx}` ? (
                          <Check size={13} className="copied" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="order-cred-tile">
                    <span className="order-cred-label">Datacenter Location</span>
                    <div className="order-cred-value-wrap">
                      <strong className="order-cred-value">
                        {loc ? `${loc.flag} ${loc.name}` : item.serverLocation || "Auto-assigned"}
                      </strong>
                    </div>
                    <span className="order-cred-meta">{loc?.region || "Low Latency Route"}</span>
                  </div>

                  <div className="order-cred-tile">
                    <span className="order-cred-label">Server Password</span>
                    <div className="order-cred-value-wrap">
                      <strong className="order-cred-value mono">
                        {hasPass
                          ? showPasswords[passKey]
                            ? item.serverPassword
                            : "••••••••"
                          : "(None - Public)"}
                      </strong>
                      {hasPass && (
                        <div className="order-cred-btn-group">
                          <button
                            type="button"
                            className="order-icon-btn"
                            onClick={() => toggleShow(passKey)}
                            title={showPasswords[passKey] ? "Hide password" : "Show password"}
                          >
                            {showPasswords[passKey] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            className="order-icon-btn"
                            onClick={() => handleCopy(item.serverPassword || "", passKey)}
                            title="Copy password"
                          >
                            {copiedKey === passKey ? (
                              <Check size={13} className="copied" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="order-cred-tile">
                    <span className="order-cred-label">RCON Admin Key</span>
                    <div className="order-cred-value-wrap">
                      <strong className="order-cred-value mono">
                        {hasRcon
                          ? showPasswords[rconKey]
                            ? item.rconPassword
                            : "••••••••"
                          : "(Not configured)"}
                      </strong>
                      {hasRcon && (
                        <div className="order-cred-btn-group">
                          <button
                            type="button"
                            className="order-icon-btn"
                            onClick={() => toggleShow(rconKey)}
                            title={showPasswords[rconKey] ? "Hide RCON" : "Show RCON"}
                          >
                            {showPasswords[rconKey] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            className="order-icon-btn"
                            onClick={() => handleCopy(item.rconPassword || "", rconKey)}
                            title="Copy RCON"
                          >
                            {copiedKey === rconKey ? (
                              <Check size={13} className="copied" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="order-connect-box">
                  <div className="order-connect-head">
                    <Terminal size={14} />
                    <span>Developer Console Command</span>
                  </div>
                  <div className="order-connect-body">
                    <code>
                      connect &lt;SERVER_IP&gt;:&lt;PORT&gt;
                      {hasPass ? `; password ${item.serverPassword}` : ""}
                    </code>
                    <button
                      type="button"
                      className="order-icon-btn"
                      onClick={() =>
                        handleCopy(
                          `connect <SERVER_IP>:<PORT>${hasPass ? `; password ${item.serverPassword}` : ""}`,
                          `cmd_${idx}`
                        )
                      }
                      title="Copy command format"
                    >
                      {copiedKey === `cmd_${idx}` ? (
                        <Check size={13} className="copied" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                  <small>Paste into Counter-Strike 2 console (~ key) once IP is posted in chat.</small>
                </div>
              </div>
            );
          })}

          {!admin && ["requested", "accepted"].includes(status) && order.paymentStatus === "pending" && (
            <div className="order-card order-payment-callout-card">
              <div className="order-payment-content">
                <div className="order-payment-icon-badge">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h4>Payment Required</h4>
                  <p>
                    Complete your checkout to trigger automated server deployment and assign your node
                    to the priority fulfillment queue.
                  </p>
                </div>
              </div>
              <div className="order-payment-action">
                <Button
                  className="order-pay-btn"
                  onClick={startPayment}
                  disabled={isPaying}
                >
                  <span>
                    {isPaying
                      ? "Opening checkout..."
                      : `Pay Now • Rs. ${totalAmount.toLocaleString("en-LK")}`}
                  </span>
                  <ArrowRight size={15} />
                </Button>
                {paymentError && <p className="order-payment-error">{paymentError}</p>}
              </div>
            </div>
          )}

          {!admin && order.paymentStatus === "paid" && hasModItems && (
            <div className="order-card order-download-card">
              <div className="order-download-content">
                <div className="order-download-icon-badge">
                  <Download size={20} />
                </div>
                <div>
                  <h4>Digital Downloads Unlocked</h4>
                  <p>Your purchased mod files and private configurations are available for download.</p>
                </div>
              </div>
              <Link
                className="order-download-btn ui-button ui-button-default"
                href={`/orders/${order.id}/downloads`}
              >
                <Download size={14} /> Open Download Center
              </Link>
            </div>
          )}

          <div className="order-card order-summary-card">
            <div className="order-card-header">
              <div className="order-card-title-group">
                <div className="order-card-icon-badge">
                  <Package size={17} />
                </div>
                <div>
                  <h3>Order Items & Summary</h3>
                  <span className="order-card-subtitle">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="order-items-list">
              {order.items.map((item) => (
                <div key={item.productId} className="order-item-row">
                  <div className="order-item-info">
                    <strong className="order-item-name">{item.name}</strong>
                    <div className="order-item-meta">
                      <span className="order-type-badge">{item.type}</span>
                      <span>
                        {item.quantity} x Rs. {item.unitPrice.toLocaleString("en-LK")}
                      </span>
                    </div>
                    {admin && <ProductFileUpload productId={item.productId} />}
                  </div>
                  <div className="order-item-total">
                    Rs. {(item.quantity * item.unitPrice).toLocaleString("en-LK")}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-summary-breakdown">
              <div className="order-summary-line">
                <span>Subtotal</span>
                <span>Rs. {totalAmount.toLocaleString("en-LK")}</span>
              </div>
              <div className="order-summary-line">
                <span>DDoS Shield & Deployment</span>
                <span className="free-tag">Included (Free)</span>
              </div>
              <div className="order-summary-line total">
                <strong>Total Amount</strong>
                <strong className="total-val">Rs. {totalAmount.toLocaleString("en-LK")}</strong>
              </div>
              <div className="order-summary-line customer">
                <span>Customer Email</span>
                <span className="customer-email">{order.email}</span>
              </div>
            </div>
          </div>

          {admin && (
            <div className="order-card order-admin-card">
              <div className="order-card-header">
                <div className="order-card-title-group">
                  <div className="order-card-icon-badge admin">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3>Admin Fulfillment Controls</h3>
                    <span className="order-card-subtitle">Manage order lifecycle and status</span>
                  </div>
                </div>
              </div>
              <div className="order-admin-body">
                <label className="order-admin-label">Change Status</label>
                <div className="order-admin-status-grid">
                  {(["requested", "accepted", "in_progress", "completed", "cancelled"] as const).map(
                    (option) => (
                      <Button
                        key={option}
                        variant={status === option ? "default" : "outline"}
                        size="sm"
                        className={status === option ? "active" : ""}
                        onClick={() => changeStatus(option)}
                      >
                        {option.replace("_", " ")}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="order-side-col">
          <div className="order-card order-chat-card">
            <div className="order-chat-card-header">
              <div className="order-chat-title-group">
                <div className="order-chat-avatar">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3>Deployment & Support Console</h3>
                  <span className="order-chat-sub">Direct channel with CeylonHosting</span>
                </div>
              </div>
              <div className="order-chat-live-badge">
                <span className="order-pulse-dot online" />
                <span>Live</span>
              </div>
            </div>

            <div className="order-chat-messages">
              {order.messages.length === 0 ? (
                <div className="order-empty-chat">
                  <div className="order-empty-icon-wrap">
                    <MessageSquare size={30} />
                  </div>
                  <h4>Fulfillment Thread Ready</h4>
                  <p>
                    Our operations team will post your dedicated server IP address, port, and
                    console connect details right here.
                  </p>
                  {!admin && (
                    <div className="order-suggestions">
                      <span className="order-suggestions-title">Quick questions:</span>
                      <div className="order-suggestions-list">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="order-suggestion-chip"
                            onClick={() => setMessage(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                order.messages.map((item) => {
                  const isMine = item.senderRole === (admin ? "admin" : "customer");
                  const isAdminMsg = item.senderRole === "admin";
                  return (
                    <div
                      key={item.id}
                      className={`order-msg-bubble ${isMine ? "mine" : "theirs"} ${
                        isAdminMsg ? "admin-sender" : "customer-sender"
                      }`}
                    >
                      <div className="order-msg-meta">
                        <span className="order-msg-author">
                          {isAdminMsg ? "🛡️ CeylonHosting Ops" : admin ? "Customer" : "You"}
                        </span>
                        <span className="order-msg-time" suppressHydrationWarning>
                          {formatMessageTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="order-msg-body">{item.body}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="order-chat-form" onSubmit={sendMessage}>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  admin
                    ? "Send server IP, port, or setup details to customer..."
                    : "Ask a question about your order or server setup..."
                }
                maxLength={2000}
                rows={3}
              />
              <div className="order-chat-form-footer">
                <span className="order-chat-tip">Enter to send • Shift+Enter for newline</span>
                <Button type="submit" size="sm" disabled={isSending || !message.trim()}>
                  <Send size={14} />
                  <span>{isSending ? "Sending..." : "Send"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
