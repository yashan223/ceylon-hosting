"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { openWhatsAppChat, getProductWhatsAppMessage } from "@/lib/whatsapp";
import type { Product } from "@/types/product";
import type { StoreSettings } from "@/server/settings/settings";
import { ServerConfigModal, type ServerConfig } from "@/components/store/server-config-modal";

type CartItem = {
  productId: string;
  quantity: number;
  serverName?: string;
  serverPassword?: string;
  rconPassword?: string;
};
const cartStorageKey = "ceylonhosting-cart";

export function ProductAddToCart({
  product,
  isAdmin = false,
  storeSettings,
}: {
  product: Product;
  isAdmin?: boolean;
  storeSettings?: StoreSettings;
}) {
  const [settings, setSettings] = useState<StoreSettings>(
    storeSettings ?? {
      taxEnabled: true,
      taxRate: 2.29,
      sandboxEnabled: true,
      whatsappNumber: "+94 78 890 1407",
      updatedAt: new Date(),
    },
  );
  const [added, setAdded] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const unavailable = product.type === "server" && product.available === false;

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.sandboxEnabled === "boolean") {
          setSettings((prev) => ({
            ...prev,
            taxEnabled: data.taxEnabled ?? prev.taxEnabled,
            taxRate: data.taxRate ?? prev.taxRate,
            sandboxEnabled: data.sandboxEnabled,
            whatsappNumber: data.whatsappNumber || prev.whatsappNumber,
          }));
        }
      })
      .catch(() => {});
  }, []);

  function saveToCart(config?: ServerConfig) {
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

    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex] = { ...cart[existingIndex], ...config };
    } else {
      cart.push({ productId: product.id, quantity: 1, ...config });
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("ceylonhosting-cart-updated"));
    window.dispatchEvent(new Event("ceylonhosting-open-cart"));
    setAdded(true);
  }

  function handleButtonClick() {
    if (unavailable || isAdmin) return;
    if (!settings.sandboxEnabled) {
      openWhatsAppChat(settings.whatsappNumber, getProductWhatsAppMessage(product));
      return;
    }
    if (product.type === "server") {
      setIsConfigOpen(true);
      return;
    }
    saveToCart();
  }

  if (isAdmin) {
    return (
      <Button disabled variant="outline" title="Admins cannot purchase items">
        Admin view (disabled)
      </Button>
    );
  }

  return (
    <>
      <Button
        disabled={unavailable}
        className={!settings.sandboxEnabled && !unavailable ? "whatsapp-button" : undefined}
        onClick={handleButtonClick}
      >
        {unavailable ? (
          "Unavailable"
        ) : !settings.sandboxEnabled ? (
          <>
            <WhatsAppIcon size={16} /> Contact in WhatsApp
          </>
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

      {product.type === "server" && (
        <ServerConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          product={product}
          onConfirm={(config) => {
            saveToCart(config);
            setIsConfigOpen(false);
          }}
          products={[product]}
          sandboxEnabled={settings.sandboxEnabled}
          whatsappNumber={settings.whatsappNumber}
        />
      )}
    </>
  );
}
