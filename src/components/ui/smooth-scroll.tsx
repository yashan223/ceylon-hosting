"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Only enable smooth momentum scrolling on customer-facing storefront pages.
    // Administrative consoles (/admin) and client dashboards (/dashboard) have their own
    // fixed layouts, data grids, and internal overflow scroll containers.
    const isExcluded = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

    if (isExcluded) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        delete (window as unknown as { __lenis?: Lenis }).__lenis;
      }
      return;
    }

    if (lenisRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      autoRaf: true,
      respectReducedMotion: true,
      allowNestedScroll: true,
      prevent: (node) => {
        if (!node || typeof (node as HTMLElement).closest !== "function") return false;
        const el = node as HTMLElement;
        return (
          el.closest(".admin-shell") !== null ||
          el.closest(".admin-content") !== null ||
          el.closest(".dashboard-shell") !== null ||
          el.closest("[data-lenis-prevent]") !== null ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT"
        );
      },
    });

    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [pathname]);

  // When changing pages/routes on storefront, ensure scroll starts at top unless an anchor hash is present
  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis && !window.location.hash) {
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return null;
}
