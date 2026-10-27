import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/server/catalog/products";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
      images: [absoluteUrl("/logo.png"), absoluteUrl("/icon.png")],
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/refund-policy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  try {
    const products = await getActiveProducts();
    routes.push(
      ...products.map((product) => {
        const productImages: string[] = [];
        if (product.imageUrl) {
          productImages.push(absoluteUrl(product.imageUrl));
        }
        if (product.images && product.images.length > 0) {
          for (const img of product.images) {
            const url = absoluteUrl(img);
            if (!productImages.includes(url)) {
              productImages.push(url);
            }
          }
        }

        return {
          url: absoluteUrl(`/products/${product.id}`),
          lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
          changeFrequency: "weekly" as const,
          priority: 0.9,
          images: productImages.length > 0 ? productImages : undefined,
        };
      }),
    );
  } catch (error) {
    console.error("Unable to build product sitemap entries", error);
  }

  return routes;
}
