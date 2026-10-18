export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      return envUrl.replace(/\/+$/, "");
    }
  }
  if (process.env.NODE_ENV === "production") {
    return "https://ceylonhosting.tech";
  }
  return "http://localhost:4000";
}

export function getCorsAllowedOrigin(): string {
  return process.env.CORS_ALLOWED_ORIGIN || getAppUrl();
}

export function getRequestBaseUrl(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");

    if (host && !host.startsWith("127.0.0.1") && !host.startsWith("localhost")) {
      return `${proto}://${host}`;
    }
  }
  return getAppUrl();
}
