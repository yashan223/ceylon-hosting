"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    const msg = error?.message || "";
    if (
      msg.includes("failed-to-find-server-action") ||
      msg.includes("Server Reference ID")
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <main className="policy-page">
      <article style={{ textAlign: "center", padding: "60px 20px" }}>
        <span className="section-kicker">Application Update</span>
        <h1>New version available</h1>
        <p style={{ margin: "16px auto 24px", maxWidth: 440 }}>
          A newer deployment is active. Please refresh to load the latest updates.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </article>
    </main>
  );
}
