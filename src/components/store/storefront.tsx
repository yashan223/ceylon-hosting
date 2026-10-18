"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  Search,
  Server,
  ShoppingBag,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PixelBlast from "@/components/PixelBlast";
import { LatencyGlobe } from "@/components/store/latency-globe";
import { cn } from "@/lib/utils";
import { parseProductFeatures } from "@/lib/products";
import type { Product } from "@/types/product";

const categories = [
  { id: "all", label: "All products" },
  { id: "server", label: "Game servers" },
  { id: "mod", label: "Mods & tools" },
  { id: "service", label: "Services" },
];

const faqItems = [
  {
    question: "How quickly will my server be ready?",
    answer:
      "Most server plans are prepared within one business day. Your operator will send the connection details and next steps after checkout.",
  },
  {
    question: "Are the mod packs compatible with my server?",
    answer:
      "Each product lists its version and client requirements. If you are unsure, contact support before purchasing and we will help you choose.",
  },
  {
    question: "How does payment work?",
    answer:
      "Checkout is handled securely by Payments.lk in Sri Lankan rupees. We never store your card details.",
  },
  {
    question: "Can I get help after purchasing?",
    answer:
      "Yes. Every purchase includes operator support for setup, configuration, and getting your community online.",
  },
];

type CartItem = { productId: string; quantity: number };
const cartStorageKey = "ceylonhosting-cart";

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

export function Storefront({
  products,
  currentUser,
  isAdmin = false,
}: {
  products: Product[];
  currentUser: { email: string; firstName?: string } | null;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (["home", "catalog", "faq"].includes(hash)) return hash;
    }
    return "home";
  });
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [isCartHydrated, setIsCartHydrated] = useState(false);

  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimeoutRef = useRef<number | null>(null);

  const scrollTo = (id: string, newActiveSection?: string) => {
    const el = document.getElementById(id);
    if (el) {
      isProgrammaticScrollRef.current = true;
      if (programmaticTimeoutRef.current) {
        window.clearTimeout(programmaticTimeoutRef.current);
      }
      programmaticTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 850);

      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (newActiveSection) {
      setActiveSection(newActiveSection);
    }
  };

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setIsScrolled(scrollY > 24);

          if (!isProgrammaticScrollRef.current) {
            const catalogEl = document.getElementById("catalog");
            const faqEl = document.getElementById("faq");

            const scrollBottom = window.innerHeight + scrollY;
            const docHeight = document.documentElement.scrollHeight;

            const threshold = 180;

            if (scrollBottom >= docHeight - 70) {
              setActiveSection("faq");
            } else if (faqEl && faqEl.getBoundingClientRect().top <= threshold) {
              setActiveSection("faq");
            } else if (catalogEl && catalogEl.getBoundingClientRect().top <= threshold) {
              setActiveSection("catalog");
            } else {
              setActiveSection("home");
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      if (programmaticTimeoutRef.current) {
        window.clearTimeout(programmaticTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedCart = JSON.parse(
          window.localStorage.getItem(cartStorageKey) ?? "null",
        ) as unknown;
        if (Array.isArray(storedCart)) {
          setCart(
            storedCart.filter((item): item is CartItem => {
              if (
                typeof item !== "object" ||
                item === null ||
                typeof item.productId !== "string" ||
                item.quantity !== 1
              )
                return false;
              const product = products.find((candidate) => candidate.id === item.productId);
              return Boolean(
                product && !(product.type === "server" && product.available === false),
              );
            }),
          );
        }
      } catch {
        window.localStorage.removeItem(cartStorageKey);
      }
      setIsCartHydrated(true);
    });
    return () => window.clearTimeout(timeoutId);
  }, [products]);

  useEffect(() => {
    if (isAdmin) {
      window.setTimeout(() => setCart([]));
      try {
        window.localStorage.removeItem(cartStorageKey);
      } catch {}
      return;
    }
    if (new URLSearchParams(window.location.search).get("cart") !== "1") return;
    const timeoutId = window.setTimeout(() => setIsCartOpen(true));
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin]);

  useEffect(() => {
    if (isCartHydrated && !isAdmin)
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, isCartHydrated, isAdmin]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.type === category;
      const matchesQuery =
        !normalizedQuery ||
        `${product.name} ${product.description} ${product.location ?? ""} ${product.meta ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  const cartProducts = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product && !(product.type === "server" && product.available === false)
      ? [{ product, quantity: item.quantity }]
      : [];
  });
  const cartTotal = cartProducts.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const cartQuantity = cartProducts.reduce((total, item) => total + item.quantity, 0);

  function addToCart(productId: string) {
    if (isAdmin) return;
    const product = products.find((item) => item.id === productId);
    if (product?.type === "server" && product.available === false) return;
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === productId);
      return existing ? currentCart : [...currentCart, { productId, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
  }

  async function startCheckout() {
    if (isAdmin) {
      setCheckoutState("error");
      setCheckoutError("Admins cannot purchase items.");
      return;
    }
    if (cartProducts.length === 0 || checkoutState === "loading") return;
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createOrderReference(),
          items: cartProducts.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      if (response.status === 401) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/#catalog")}`);
        return;
      }
      const result = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !result.orderId) throw new Error(result.error ?? "Request unavailable");
      const paymentResponse = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId }),
      });
      const paymentResult = (await paymentResponse.json()) as { url?: string; error?: string };
      if (!paymentResponse.ok || !paymentResult.url)
        throw new Error(paymentResult.error ?? "Unable to open payment.");
      window.localStorage.removeItem(cartStorageKey);
      window.location.assign(paymentResult.url);
    } catch (error) {
      setCheckoutState("error");
      setCheckoutError(error instanceof Error ? error.message : "Unable to open payment.");
    }
  }

  return (
    <main className="store-shell">
      <header className={cn("site-header", isScrolled && "site-header-scrolled")} id="storefront">
        <a
          className="brand"
          href="#home"
          aria-label="CeylonHosting home"
          onClick={(event) => {
            event.preventDefault();
            scrollTo("home", "home");
          }}
        >
          <Image
            src="/logo.png"
            alt="CeylonHosting"
            className="brand-logo"
            width={120}
            height={30}
            style={{ height: "auto" }}
          />
        </a>
        <nav className={cn("site-nav", isMenuOpen && "site-nav-open")} aria-label="Main navigation">
          <a
            className={cn(activeSection === "home" && "active")}
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              scrollTo("home", "home");
              setIsMenuOpen(false);
            }}
          >
            Home
          </a>
          <a
            className={cn(activeSection === "catalog" && "active")}
            href="#catalog"
            onClick={(event) => {
              event.preventDefault();
              scrollTo("catalog", "catalog");
              setIsMenuOpen(false);
            }}
          >
            Shop
          </a>
          <a
            className={cn(activeSection === "faq" && "active")}
            href="#faq"
            onClick={(event) => {
              event.preventDefault();
              scrollTo("faq", "faq");
              setIsMenuOpen(false);
            }}
          >
            FAQ
          </a>
          <div className="mobile-nav-auth">
            {currentUser ? (
              <>
                <Link
                  className="mobile-nav-link"
                  href={isAdmin ? "/admin" : "/dashboard"}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={15} />
                  <span>{isAdmin ? "Admin" : "Dashboard"}</span>
                </Link>
                <form
                  action="/api/auth/sign-out"
                  method="post"
                  className="mobile-nav-signout-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch("/api/auth/sign-out", { method: "POST" });
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <button className="mobile-nav-link mobile-nav-signout-btn" type="submit">
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                className="mobile-nav-link mobile-nav-signin-btn"
                href="/sign-in"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn size={15} />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {currentUser ? (
            <Link
              className="ui-button ui-button-ghost sign-in-button"
              href={isAdmin ? "/admin" : "/dashboard"}
            >
              {isAdmin ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <Link className="ui-button ui-button-ghost sign-in-button" href="/sign-in">
              Sign in
            </Link>
          )}
          {!isAdmin && (
            <Button variant="outline" className="cart-button" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={17} /> Cart <span>{cartQuantity}</span>
            </Button>
          )}
          {currentUser && (
            <form
              action="/api/auth/sign-out"
              method="post"
              className="desktop-sign-out-form"
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch("/api/auth/sign-out", { method: "POST" });
                router.push("/");
                router.refresh();
              }}
            >
              <button className="ui-button ui-button-ghost sign-in-button" type="submit">
                Sign out
              </button>
            </form>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="menu-button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </header>

      <section className="brand-intro" id="home" aria-label="Welcome to CeylonHosting">
        <div className="intro-pixel-blast" aria-hidden="true">
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#000000"
            patternScale={2}
            patternDensity={1}
            enableRipples
            rippleSpeed={0.3}
            rippleThickness={0.1}
            rippleIntensityScale={1}
            speed={0.5}
            transparent
            edgeFade={0.5}
            autoPauseOffscreen
          />
        </div>
        <div className="brand-intro-content brand-intro-split">
          <div className="brand-intro-left">
            <Image
              src="/logo.png"
              alt="CeylonHosting"
              className="intro-logo"
              width={560}
              height={150}
              priority
              style={{ height: "auto" }}
            />
            <p>
              Build your ideal COD4 experience with reliable servers, mods, and support that keeps
              your community in the game.
            </p>
            <div className="intro-actions">
              <a
                className="intro-enter"
                href="#catalog"
                onClick={(event) => {
                  event.preventDefault();
                  scrollTo("catalog", "catalog");
                }}
              >
                Explore the store <ArrowRight size={16} />
              </a>
              <a
                className="intro-secondary-btn"
                href="#catalog"
                onClick={(event) => {
                  event.preventDefault();
                  setCategory("server");
                  scrollTo("catalog", "catalog");
                }}
              >
                <Server size={15} /> Game servers
              </a>
              <a
                className="intro-discord-btn"
                href="https://discord.gg/ceylonhosting"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join Discord
              </a>
            </div>
          </div>

          <div className="brand-intro-right">
            <LatencyGlobe />
          </div>
        </div>
        <span className="intro-corner intro-corner-left">
          BUILT IN SRI LANKA / FOR PLAYERS EVERYWHERE
        </span>
        <span className="intro-corner intro-corner-right">SERVERS / MODS / SUPPORT</span>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Shop the collection</p>
            <h2>Find your Products</h2>
          </div>
        </div>
        <div className="catalog-toolbar">
          <div className="category-tabs" role="tablist" aria-label="Product categories">
            {categories.map((item) => (
              <button
                className={cn(category === item.id && "selected")}
                key={item.id}
                onClick={() => setCategory(item.id)}
                role="tab"
                aria-selected={category === item.id}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={16} />
            <Input
              type="search"
              placeholder="Search products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product) => {
            const inCart = cart.some((item) => item.productId === product.id);
            const isService = product.type === "service";
            const isAvailable = product.type !== "server" || product.available !== false;
            const features = parseProductFeatures(product);
            return (
              <Card
                className="product-card"
                key={product.id}
                onClick={() => router.push(`/products/${product.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    router.push(`/products/${product.id}`);
                }}
                role="link"
                tabIndex={0}
              >
                <div
                  className={cn(
                    "product-art",
                    `product-art-${product.accent}`,
                    (product.imageUrl || product.images?.[0]) && "has-image",
                  )}
                >
                  {product.imageUrl || product.images?.[0] ? (
                    <Image
                      src={product.imageUrl || product.images![0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="product-art-image"
                      priority={false}
                    />
                  ) : (
                    <div className="product-art-symbol">
                      {product.type === "server" ? (
                        <Server size={42} strokeWidth={1.4} />
                      ) : product.type === "service" ? (
                        <Wrench size={42} strokeWidth={1.4} />
                      ) : (
                        <PackageCheck size={42} strokeWidth={1.4} />
                      )}
                    </div>
                  )}
                  <span className="product-art-label">
                    {product.type === "server"
                      ? "SERVER"
                      : product.type === "service"
                        ? "SERVICE"
                        : "MOD PACK"}
                  </span>
                  {product.type === "server" && (
                    <span
                      className={cn(
                        "product-availability",
                        isAvailable ? "available" : "unavailable",
                      )}
                    >
                      {isAvailable ? "Available" : "Unavailable"}
                    </span>
                  )}
                  {product.type !== "server" && product.tag && <Badge>{product.tag}</Badge>}
                </div>
                <CardContent>
                  <div className="product-info">
                    <div>
                      <h3>{product.name}</h3>
                      {product.type === "server" && product.location && (
                        <div className="product-location-badge">
                          <MapPin size={11} />
                          <span>{product.location}</span>
                        </div>
                      )}
                      <p>{product.description}</p>
                      {product.type === "server" && features.length > 0 && (
                        <ul className="product-feature-points" aria-label="Server features">
                          {features.map((feature, idx) => (
                            <li key={idx} className="product-feature-point">
                              <Check size={12} className="product-feature-icon" strokeWidth={2.5} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="product-meta">
                      <strong>
                        {formatPrice(product.price)}
                        <small>
                          {product.type === "server"
                            ? " / month"
                            : isService
                              ? " one-time setup"
                              : " one-time"}
                        </small>
                      </strong>
                    </div>
                  </div>
                  {product.type === "server" && !isAvailable ? (
                    <Button variant="outline" className="add-button" disabled>
                      Unavailable
                    </Button>
                  ) : isAdmin ? (
                    <Button
                      variant="outline"
                      className="add-button"
                      disabled
                      title="Admins cannot purchase items"
                    >
                      Admin view (disabled)
                    </Button>
                  ) : (
                    <Button
                      variant={inCart ? "secondary" : "outline"}
                      className="add-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product.id);
                      }}
                    >
                      {inCart ? (
                        <>
                          <Check size={15} /> Added
                        </>
                      ) : (
                        <>
                          Add to cart <ArrowRight size={15} />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {visibleProducts.length === 0 && (
          <p className="empty-state">No products match your search.</p>
        )}
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-heading">
          <p className="section-kicker">Quick answers</p>
          <h2>
            Everything you need
            <br />
            before game time.
          </h2>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <span>+</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="footer-top">
          <div className="footer-brand">
            <Image
              src="/logo.png"
              alt="CeylonHosting"
              className="footer-logo"
              width={160}
              height={34}
              style={{ height: "auto" }}
            />
          </div>
        </div>
        <div className="footer-links">
          <div>
            <span>Store</span>
            <a
              href="#catalog"
              onClick={(event) => {
                event.preventDefault();
                setCategory("all");
                scrollTo("catalog", "catalog");
              }}
            >
              All products
            </a>
            <a
              href="#catalog"
              onClick={(event) => {
                event.preventDefault();
                setCategory("server");
                scrollTo("catalog", "catalog");
              }}
            >
              Game servers
            </a>
            <a
              href="#catalog"
              onClick={(event) => {
                event.preventDefault();
                setCategory("mod");
                scrollTo("catalog", "catalog");
              }}
            >
              Mods & tools
            </a>
          </div>
          <div>
            <span>Company</span>
            <a
              href="#faq"
              onClick={(event) => {
                event.preventDefault();
                scrollTo("faq", "faq");
              }}
            >
              FAQ
            </a>
            <a
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                scrollTo("contact");
              }}
            >
              Contact
            </a>
          </div>
          <div>
            <span>Legal</span>
            <Link href="/terms">Terms & Conditions</Link>
            <Link href="/refund-policy">No Refund Policy</Link>
          </div>
          <div>
            <span>Contact</span>
            <a href="mailto:support@ceylonhosting.tech">support@ceylonhosting.tech</a>
            <a href="https://wa.me/94771234567" target="_blank" rel="noreferrer">
              WhatsApp: +94 77 123 4567
            </a>
            <small>Response within one business day.</small>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CeylonHosting. Built for better game nights.</span>
          <span className="footer-code">SERVERS / MODS / SUPPORT</span>
        </div>
      </footer>

      {isCartOpen && (
        <div className="cart-overlay" role="presentation" onClick={() => setIsCartOpen(false)}>
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
                onClick={() => setIsCartOpen(false)}
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
                {cartProducts.map(({ product }) => (
                  <div className="drawer-item" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>
                        {product.type === "server"
                          ? "Game server"
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
        </div>
      )}
    </main>
  );
}
