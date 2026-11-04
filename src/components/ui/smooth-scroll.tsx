"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const isExcluded = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

    if (isExcluded) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        delete (window as unknown as { __lenis?: Lenis }).__lenis;
      }
      return;
    }

    if (lenisRef.current) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    });

    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [pathname]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis && !window.location.hash) {
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return null;
}
