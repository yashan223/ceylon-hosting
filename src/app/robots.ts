import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const disallowList = [
    "/api/",
    "/admin",
    "/admin/",
    "/dashboard",
    "/dashboard/",
    "/profile",
    "/orders",
    "/orders/",
    "/checkout",
    "/checkout/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products/", "/terms", "/refund-policy"],
        disallow: disallowList,
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/products/", "/terms", "/refund-policy"],
        disallow: disallowList,
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/products/", "/terms", "/refund-policy"],
        disallow: disallowList,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
