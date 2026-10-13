"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";

type CartItem = { productId: string; quantity: number };
const cartStorageKey = "ceylonhosting-cart";

export function ProductAddToCart({
  product,
  isAdmin = false,
}: {
  product: Product;
  isAdmin?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const unavailable = product.type === "server" && product.available === false;

  function addToCart() {
    if (unavailable || isAdmin) return;
    let cart: CartItem[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]") as unknown;
      if (Array.isArray(stored))
        cart = stored.filter(
          (item): item is CartItem =>
            typeof item === "object" &&
            item !== null &&
            typeof item.productId === "string" &&
            item.quantity === 1,
        );
    } catch {
      cart = [];
    }
    if (!cart.some((item) => item.productId === product.id)) {
      window.localStorage.setItem(
        cartStorageKey,
        JSON.stringify([...cart, { productId: product.id, quantity: 1 }]),
      );
      window.dispatchEvent(new Event("ceylonhosting-cart-updated"));
    }
    setAdded(true);
  }

  if (isAdmin) {
    return (
      <Button disabled variant="outline" title="Admins cannot purchase items">
        Admin view (disabled)
      </Button>
    );
  }

  return (
    <Button disabled={unavailable} onClick={addToCart}>
      {unavailable ? (
        "Unavailable"
      ) : added ? (
        <>
          <Check size={16} /> Added to cart
        </>
      ) : (
        <>
          Add to cart <ArrowRight size={16} />
        </>
      )}
    </Button>
  );
}
