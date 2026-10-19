"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Server, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVER_LOCATIONS } from "@/lib/datacenters";
import { parseProductFeatures } from "@/lib/products";
import type { Product } from "@/types/product";

export type ServerConfig = {
  serverName: string;
  serverLocation: string;
  serverPassword: string;
  rconPassword: string;
};

type CartItem = {
  productId: string;
  quantity: number;
  serverName?: string;
  serverLocation?: string;
  serverPassword?: string;
  rconPassword?: string;
};

type ServerConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (config: ServerConfig) => void;
  products?: Product[];
};

const cartStorageKey = "ceylonhosting-cart";
const cartUpdatedEvent = "ceylonhosting-cart-updated";

function subscribeToCart(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(cartUpdatedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(cartUpdatedEvent, callback);
  };
}

function getCartSnapshot(): string {
  try {
    return window.localStorage.getItem(cartStorageKey) ?? "[]";
  } catch {
    return "[]";
  }
}

function getCartServerSnapshot(): string {
  return "[]";
}

function formatPrice(price: number) {
  return `Rs. ${price.toLocaleString("en-LK")}`;
}

function createOrderReference() {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `loadout-${unique}`;
}

function emptySubscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function parseServerPoints(product: Product): string[] {
  const parsed = parseProductFeatures(product);
  if (parsed.length > 0) return parsed;

  const raw = (product.description || "").trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^(?:[-*•+✓✔]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const delimited = raw
    .split(/[·•|;]|\s+[/]\s+|\s{2,}/)
    .map((p) => p.replace(/^(?:[-*•+✓✔]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  if (delimited.length > 1) return delimited;

  if (raw.includes(",")) {
    const commaParts = raw
      .split(",")
      .map((p) => p.replace(/^(?:[-*•+✓✔]|\d+[.)])\s*/, "").trim())
      .filter(Boolean);
    if (commaParts.length > 1) return commaParts;
  }

  const spaceTokens = raw.split(/\s+/).filter(Boolean);
  if (spaceTokens.length >= 4 && spaceTokens.length <= 8) {
    const candidateChunks: string[] = [];
    let cur = "";
    for (const tok of spaceTokens) {
      if (!cur) {
        cur = tok;
      } else if (tok.match(/^[0-9]+$/) || (cur.match(/^[0-9]+$/) && !tok.match(/^[0-9]+$/))) {
        cur += ` ${tok}`;
        candidateChunks.push(cur);
        cur = "";
      } else if (tok === "SS" || tok === "Site" || tok === "Rcon" || tok === "Slots") {
        if (cur.match(/^[0-9]+\s+Slots$/i)) {
          candidateChunks.push(cur);
          cur = tok;
        } else if (cur === "SS" && tok === "Site") {
          cur = "SS Site";
          candidateChunks.push(cur);
          cur = "";
        } else {
          candidateChunks.push(cur);
          cur = tok;
        }
      } else {
        cur += ` ${tok}`;
      }
    }
    if (cur) candidateChunks.push(cur);
    if (candidateChunks.length > 1) return candidateChunks;
  }

  return [raw];
}

function ServerConfigDialog({
  onClose,
  product,
  onConfirm,
  products = [],
}: {
  onClose: () => void;
  product: Product;
  onConfirm: (config: ServerConfig) => void;
  products?: Product[];
}) {
  const router = useRouter();
  const [serverName, setServerName] = useState("");
  const availableLocations = useMemo(() => {
    if (product.locations && product.locations.length > 0) {
      return product.locations.map((locName) => {
        const clean = locName.trim();
        const found = SERVER_LOCATIONS.find(
          (sl) => sl.label.toLowerCase() === clean.toLowerCase(),
        );
        return (
          found ?? {
            id: clean.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            city: clean,
            country: "",
            label: clean,
            flag: "📍",
          }
        );
      });
    }

    if (product.location && product.location.trim()) {
      const clean = product.location.trim();
      const found = SERVER_LOCATIONS.find(
        (sl) => sl.label.toLowerCase() === clean.toLowerCase(),
      );
      if (found) return [found];
      return [
        {
          id: "product-loc",
          city: clean,
          country: "",
          label: clean,
          flag: "📍",
        },
      ];
    }

    return SERVER_LOCATIONS;
  }, [product.locations, product.location]);

  const [serverLocation, setServerLocation] = useState(() => {
    if (product.locations && product.locations.length === 1) {
      return product.locations[0].trim();
    }
    if (product.location && product.location.trim()) {
      const clean = product.location.trim();
      if (!product.locations || product.locations.length === 0 || product.locations.includes(clean)) {
        return clean;
      }
    }
    return "";
  });
  const [serverPassword, setServerPassword] = useState("");
  const [rconPassword, setRconPassword] = useState("");
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);

  const points = useMemo(() => parseServerPoints(product), [product]);

  const cartRaw = useSyncExternalStore(subscribeToCart, getCartSnapshot, getCartServerSnapshot);

  const cartItems = useMemo(() => {
    try {
      const parsed = JSON.parse(cartRaw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is CartItem =>
          typeof item === "object" &&
          item !== null &&
          typeof item.productId === "string" &&
          item.quantity === 1,
      );
    } catch {
      return [];
    }
  }, [cartRaw]);

  useEffect(() => {
    if (products.length > 0) return;
    let active = true;
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: Product[] } | null) => {
        if (active && data?.products) {
          setFetchedProducts(data.products);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [products.length]);

  const catalogProducts = products.length > 0 ? products : fetchedProducts;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  function removeFromCart(productId: string) {
    if (productId === product.id) {
      onClose();
      return;
    }
    const updated = cartItems.filter((item) => item.productId !== productId);
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new Event(cartUpdatedEvent));
  }

  const otherCartItems = useMemo(
    () => cartItems.filter((item) => item.productId !== product.id),
    [cartItems, product.id],
  );

  const otherItemsTotal = useMemo(() => {
    return otherCartItems.reduce((acc, item) => {
      const found = catalogProducts.find((p) => p.id === item.productId);
      return acc + (found ? found.price : 0);
    }, 0);
  }, [otherCartItems, catalogProducts]);

  const cartTotal = otherItemsTotal + product.price;

  function validateConfig(): ServerConfig | null {
    const cleanName = serverName.trim();
    const cleanLocation = serverLocation.trim();
    const cleanPass = serverPassword.trim();
    const cleanRcon = rconPassword.trim();

    if (!cleanName) {
      setError("Please enter a server name.");
      document.getElementById("server-config-name")?.focus();
      return null;
    }
    if (!cleanLocation) {
      setError("Please select a server location.");
      document.getElementById("server-config-location")?.focus();
      return null;
    }
    if (!cleanPass) {
      setError("Please enter a server password.");
      document.getElementById("server-config-pass")?.focus();
      return null;
    }
    if (!cleanRcon) {
      setError("Please enter an RCON password for server management.");
      document.getElementById("server-config-rcon")?.focus();
      return null;
    }

    return {
      serverName: cleanName,
      serverLocation: cleanLocation,
      serverPassword: cleanPass,
      rconPassword: cleanRcon,
    };
  }

  function handleAddToCartOnly() {
    const config = validateConfig();
    if (!config) return;
    onConfirm(config);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handlePayNow();
  }

  async function handlePayNow() {
    const config = validateConfig();
    if (!config) return;

    let currentCart: CartItem[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        currentCart = stored.filter(
          (item): item is CartItem =>
            typeof item === "object" &&
            item !== null &&
            typeof item.productId === "string" &&
            item.quantity === 1,
        );
      }
    } catch {}

    const existingIndex = currentCart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      currentCart[existingIndex] = { ...currentCart[existingIndex], ...config };
    } else {
      currentCart.push({ productId: product.id, quantity: 1, ...config });
    }

    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(currentCart));
    } catch {}
    window.dispatchEvent(new Event(cartUpdatedEvent));

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const itemsToOrder = currentCart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.serverName ? { serverName: item.serverName } : {}),
        ...(item.serverLocation ? { serverLocation: item.serverLocation } : {}),
        ...(item.serverPassword ? { serverPassword: item.serverPassword } : {}),
        ...(item.rconPassword ? { rconPassword: item.rconPassword } : {}),
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createOrderReference(),
          items: itemsToOrder,
        }),
      });

      if (response.status === 401) {
        const returnUrl = typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
        return;
      }

      const result = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !result.orderId) {
        throw new Error(result.error ?? "Order request failed.");
      }

      const paymentResponse = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId }),
      });

      const paymentResult = (await paymentResponse.json()) as { url?: string; error?: string };
      if (!paymentResponse.ok || !paymentResult.url) {
        throw new Error(paymentResult.error ?? "Unable to open payment.");
      }

      try {
        window.localStorage.removeItem(cartStorageKey);
      } catch {}
      window.dispatchEvent(new Event(cartUpdatedEvent));
      window.location.assign(paymentResult.url);
    } catch (err) {
      setCheckoutLoading(false);
      setCheckoutError(err instanceof Error ? err.message : "Unable to initiate payment.");
    }
  }

  return (
    <div className="server-split-overlay" role="dialog" aria-modal="true" aria-label="Configure Server and Cart">
      <div className="server-split-topbar">
        <button
          type="button"
          className="server-split-back"
          onClick={onClose}
          aria-label="Back to store"
        >
          <ArrowLeft size={16} />
          <span>Back to store</span>
        </button>
        <button
          type="button"
          className="server-split-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="server-split-body">
        <div className="server-split-left">
          <div className="server-split-left-inner">
            <div className="server-split-header">
              <div className="server-split-icon">
                <Server size={24} />
              </div>
              <div>
                <h2>Configure Server</h2>
                <p>Enter the details for {product.name} to continue.</p>
              </div>
            </div>

            <div className="server-split-product-card">
              <div className="server-split-product-info">
                <strong>{product.name}</strong>
                {points.length > 0 ? (
                  <ul className="server-split-points">
                    {points.map((point, index) => (
                      <li key={index} className="server-split-point">
                        <Check size={14} className="server-split-point-check" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>{product.description || "High-performance game server hosting"}</span>
                )}
              </div>
              <div className="server-split-product-price">
                {formatPrice(product.price)}
              </div>
            </div>

            <form className="server-split-form" onSubmit={handleSubmit}>
              {error && <div className="server-split-error">{error}</div>}

              <div className="server-split-field">
                <label className="server-split-label" htmlFor="server-config-name">
                  Server Name <span className="server-split-req">*</span>
                </label>
                <input
                  id="server-config-name"
                  className="server-split-input"
                  value={serverName}
                  onChange={(e) => {
                    setServerName(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={80}
                  autoFocus
                  required
                />
              </div>

              <div className="server-split-field">
                <label className="server-split-label" htmlFor="server-config-location">
                  Server Location <span className="server-split-req">*</span>
                </label>
                <select
                  id="server-config-location"
                  className="server-split-input server-split-select"
                  value={serverLocation}
                  onChange={(e) => {
                    setServerLocation(e.target.value);
                    if (error) setError("");
                  }}
                  required
                >
                  <option value="">Select server location...</option>
                  {availableLocations.map((loc) => (
                    <option key={loc.id} value={loc.label}>
                      {loc.flag} {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="server-split-field">
                <label className="server-split-label" htmlFor="server-config-pass">
                  Server Password <span className="server-split-req">*</span>
                </label>
                <input
                  id="server-config-pass"
                  className="server-split-input"
                  value={serverPassword}
                  onChange={(e) => {
                    setServerPassword(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={50}
                  required
                />
              </div>

              <div className="server-split-field">
                <label className="server-split-label" htmlFor="server-config-rcon">
                  RCON Password <span className="server-split-req">*</span>
                </label>
                <input
                  id="server-config-rcon"
                  className="server-split-input"
                  value={rconPassword}
                  onChange={(e) => {
                    setRconPassword(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={50}
                  required
                />
              </div>

            </form>
          </div>
        </div>

        <aside className="server-split-right">
          <div className="server-split-right-inner">
            <div className="server-split-cart-title">
              <p className="section-kicker">Your selection</p>
              <h3>Shopping cart</h3>
            </div>

            <div className="server-split-cart-items">
              <div className="server-split-cart-item">
                <div className="server-split-item-details">
                  <strong>{product.name}</strong>
                  <span className="server-split-item-badge">Game server</span>
                  <span className="server-split-item-server">
                    Server: <strong>{serverName.trim() || "Configuring..."}</strong>
                  </span>
                  <span className="server-split-item-server">
                    Location: <strong>{serverLocation.trim() || "Select location..."}</strong>
                  </span>
                  <span className="server-split-item-server">
                    Password: <code>{serverPassword.trim() ? "••••••••" : "Required"}</code>
                  </span>
                  <span className="server-split-item-server">
                    RCON: <code>{rconPassword.trim() ? "••••••••" : "Required"}</code>
                  </span>
                </div>
                <div className="server-split-item-actions">
                  <b>{formatPrice(product.price)}</b>
                </div>
              </div>

              {otherCartItems.map((item) => {
                const itemProduct = catalogProducts.find((p) => p.id === item.productId);
                return (
                  <div className="server-split-cart-item" key={item.productId}>
                    <div className="server-split-item-details">
                      <strong>{itemProduct ? itemProduct.name : item.productId}</strong>
                      <span className="server-split-item-badge">
                        {item.serverName ? "Server" : itemProduct?.type ?? "Item"}
                      </span>
                      {item.serverName ? (
                        <span className="server-split-item-server">
                          Server: <strong>{item.serverName}</strong>
                        </span>
                      ) : null}
                      {item.serverLocation ? (
                        <span className="server-split-item-server">
                          Location: <strong>{item.serverLocation}</strong>
                        </span>
                      ) : null}
                    </div>
                    <div className="server-split-item-actions">
                      <b>{itemProduct ? formatPrice(itemProduct.price) : "—"}</b>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.productId)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="server-split-cart-footer">
              <div className="server-split-total-row">
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <div className="server-split-cart-actions">
                <Button
                  className="checkout-button server-split-checkout-btn"
                  disabled={checkoutLoading}
                  onClick={handlePayNow}
                >
                  {checkoutLoading ? "Opening payment..." : "Pay now"}
                  <ArrowRight size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="server-split-add-btn"
                  disabled={checkoutLoading}
                  onClick={handleAddToCartOnly}
                >
                  Add to cart
                </Button>
              </div>
              <small className="server-split-note">
                {checkoutError || "You will continue to secure payment."}
              </small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ServerConfigModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  products = [],
}: ServerConfigModalProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!isOpen || !product || !isMounted) return null;

  return createPortal(
    <ServerConfigDialog
      key={product.id}
      onClose={onClose}
      product={product}
      onConfirm={onConfirm}
      products={products}
    />,
    document.body,
  );
}
