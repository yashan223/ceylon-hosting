import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const corsOriginEnv =
  process.env.CORS_ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";

function extractHostname(raw: string): string | null {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname;
  } catch {
    return null;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const corsHostname = extractHostname(corsOriginEnv);
const realtimeOriginEnv = process.env.NEXT_PUBLIC_REALTIME_URL;
const realtimeHostname = realtimeOriginEnv ? extractHostname(realtimeOriginEnv) : null;

const allowedDevOrigins = Array.from(
  new Set([
    ...(corsHostname ? [corsHostname, `*.${corsHostname}`] : []),
    ...(realtimeHostname ? [realtimeHostname, `*.${realtimeHostname}`] : []),
  ]),
);

const corsHeaders = (origin: string) => [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: origin },
  { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
  {
    key: "Access-Control-Allow-Headers",
    value:
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  },
  { key: "Access-Control-Max-Age", value: "86400" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["three", "lucide-react"],
  },
  allowedDevOrigins,
  async headers() {
    const originRegex = corsHostname
      ? `(?<origin>https?:\\/\\/${escapeRegex(corsHostname)}(?::\\d+)?)`
      : "(?<origin>https?:\\/\\/[^/]+)";

    const defaultOrigin = (() => {
      try {
        return new URL(corsOriginEnv).origin;
      } catch {
        return corsOriginEnv;
      }
    })();

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        has: [
          {
            type: "header",
            key: "origin",
            value: originRegex,
          },
        ],
        headers: corsHeaders(":origin"),
      },
      {
        source: "/api/:path*",
        missing: [
          {
            type: "header",
            key: "origin",
            value: ".*",
          },
        ],
        headers: corsHeaders(defaultOrigin),
      },
    ];
  },
};

export default nextConfig;
