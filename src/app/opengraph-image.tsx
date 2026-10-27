import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/lib/seo";

export const alt = `${siteName} — ${siteTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#0f172a",
        backgroundImage: "radial-gradient(circle at 25% 25%, #1e293b 0%, #0f172a 100%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "70px 80px",
        width: "100%",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            color: "#38bdf8",
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          {siteName}
        </div>
        <div
          style={{
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 9999,
            color: "#38bdf8",
            display: "flex",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "8px 20px",
            textTransform: "uppercase",
          }}
        >
          COD4 Hosting & Mods
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#f8fafc",
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {siteTagline}
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 24,
            marginTop: 36,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 10,
              color: "#94a3b8",
              display: "flex",
              fontSize: 20,
              fontWeight: 500,
              padding: "10px 18px",
            }}
          >
            ⚡ Low Latency Sri Lanka & Global
          </div>
          <div
            style={{
              background: "#1e293b",
              borderRadius: 10,
              color: "#94a3b8",
              display: "flex",
              fontSize: 20,
              fontWeight: 500,
              padding: "10px 18px",
            }}
          >
            🛡️ Promod & Custom Configs
          </div>
          <div
            style={{
              background: "#1e293b",
              borderRadius: 10,
              color: "#94a3b8",
              display: "flex",
              fontSize: 20,
              fontWeight: 500,
              padding: "10px 18px",
            }}
          >
            💬 Direct WhatsApp Support
          </div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
