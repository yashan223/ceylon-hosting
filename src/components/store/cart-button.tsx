"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";

type CartItem = {
  productId: string;
  quantity: number;
  serverName?: string;
  serverLocation?: string;
  serverPassword?: string;
  rconPassword?: string;
};

const cartStorageKey = "ceylonhosting-cart";
const cartUpdatedEvent = "ceylonhosting-cart-updated";
const cartOpenEvent = "ceylonhosting-open-cart";

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
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  return `ORD-${unique}`;
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

export function CartButton({
  products: initialProducts = [],
}: {
  products?: Product[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [, startTransition] = useTransition();

  const cartRaw = useSyncExternalStore(subscribeToCart, getCartSnapshot, getCartServerSnapshot);

  const cart = useMemo(() => {
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
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(cartOpenEvent, handleOpen);
    return () => {
      window.removeEventListener(cartOpenEvent, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (initialProducts.length > 0) return;

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
  }, [initialProducts.length]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const products = initialProducts.length > 0 ? initialProducts : fetchedProducts;

  function removeFromCart(productId: string) {
    const updated = cart.filter((item) => item.productId !== productId);
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new Event(cartUpdatedEvent));
  }

  type CartProductEntry = {
    product: Product;
    quantity: number;
    serverName?: string;
    serverLocation?: string;
    serverPassword?: string;
    rconPassword?: string;
  };

  const cartProducts = cart.flatMap((item): CartProductEntry[] => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return [];
    return [
      {
        product,
        quantity: item.quantity,
        serverName: item.serverName,
        serverLocation: item.serverLocation,
        serverPassword: item.serverPassword,
        rconPassword: item.rconPassword,
      },
    ];
  });

  const cartTotal = cartProducts.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  async function startCheckout() {
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createOrderReference(),
          items: cartProducts.map(
            ({ product, quantity, serverName, serverLocation, serverPassword, rconPassword }) => ({
              productId: product.id,
              quantity,
              ...(serverName ? { serverName } : {}),
              ...(serverLocation ? { serverLocation } : {}),
              ...(serverPassword ? { serverPassword } : {}),
              ...(rconPassword ? { rconPassword } : {}),
            }),
          ),
        }),
      });
      if (response.status === 401) {
        const returnUrl = typeof window !== "undefined" ? window.location.pathname : "/";
        startTransition(() => {
          router.push(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
        });
        return;
      }
      const result = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !result.orderId) {
        throw new Error(result.error ?? "Request unavailable");
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
    } catch (error) {
      setCheckoutState("error");
      setCheckoutError(error instanceof Error ? error.message : "Unable to open payment.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="ui-button ui-button-outline cart-button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open shopping cart with ${cartCount} items`}
      >
        <ShoppingBag size={17} /> Cart <span>{cartCount}</span>
      </button>

      {isOpen &&
        isMounted &&
        createPortal(
          <div className="cart-overlay" role="presentation" onClick={() => setIsOpen(false)}>
            <aside
              className="cart-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Shopping cart"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="drawer-header">
                <div>
                  <p className="section-kicker">Your selection</p>
                  <h2>Shopping cart</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close shopping cart"
                >
                  <X size={20} />
                </Button>
              </div>
              {cartProducts.length === 0 ? (
                <div className="drawer-empty">
                  <ShoppingBag size={30} />
                  <p>Your cart is empty.</p>
                  <span>Add a server, tool, or service to get started.</span>
                </div>
              ) : (
                <div className="drawer-items">
                  {cartProducts.map(({ product, serverName, serverLocation }) => (
                    <div className="drawer-item" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {serverName
                            ? `Server: ${serverName}${serverLocation ? ` (${serverLocation})` : ""}`
                            : product.type === "server"
                              ? (serverLocation ? `Game server • ${serverLocation}` : "Game server")
                              : product.type === "service"
                                ? "Setup service"
                                : "Mod or tool"}
                        </span>
                      </div>
                      <div className="drawer-item-actions">
                        <b>{formatPrice(product.price)}</b>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="drawer-footer">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                <Button
                  className="checkout-button"
                  disabled={cartProducts.length === 0 || checkoutState === "loading"}
                  onClick={startCheckout}
                >
                  {checkoutState === "loading" ? "Opening payment..." : "Pay now"}
                  <ArrowRight size={16} />
                </Button>
                <small>
                  {checkoutState === "error" ? checkoutError : "You will continue to secure payment."}
                </small>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
