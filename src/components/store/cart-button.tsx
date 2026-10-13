"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

const cartStorageKey = "ceylonhosting-cart";
const cartUpdatedEvent = "ceylonhosting-cart-updated";

function readCartCount() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(stored)) return 0;
    return stored.reduce((total, item) => {
      if (typeof item !== "object" || item === null) return total;
      const quantity = (item as { quantity?: unknown }).quantity;
      return total + (typeof quantity === "number" && quantity > 0 ? quantity : 0);
    }, 0);
  } catch {
    return 0;
  }
}

export function CartButton({ href = "/?cart=1#catalog" }: { href?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readCartCount());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(cartUpdatedEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(cartUpdatedEvent, sync);
    };
  }, []);

  return (
    <Link className="ui-button ui-button-outline cart-button" href={href}>
      <ShoppingBag size={17} /> Cart <span>{count}</span>
    </Link>
  );
}
