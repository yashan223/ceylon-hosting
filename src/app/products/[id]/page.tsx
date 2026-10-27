import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/session";
import { isAdminUser } from "@/server/auth/admin";
import { getActiveProductById, getActiveProducts } from "@/server/catalog/products";
import { getStoreSettings } from "@/server/settings/settings";
import { CartButton } from "@/components/store/cart-button";
import { ProductAddToCart } from "@/components/store/product-add-to-cart";
import { ProductGallery } from "@/components/store/product-gallery";
import { absoluteUrl, siteName, siteUrl } from "@/lib/seo";
import { parseProductDetails } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const getProduct = cache(getActiveProductById);

function formatPrice(price: number) {
  return `Rs. ${price.toLocaleString("en-LK")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };

  const isService = product.type === "service";
  const typeLabel =
    product.type === "server" ? "COD4 Server Hosting" : isService ? "Setup Service" : "COD4 Mod";

  const rawDescription = product.description.replace(/\r?\n+/g, " ").trim();
  const description =
    rawDescription.length > 155 ? `${rawDescription.slice(0, 152)}...` : rawDescription;

  const title = `${product.name} — ${typeLabel}`;
  const canonicalUrl = `/products/${product.id}`;
  const imageUrl = product.imageUrl || product.images?.[0];
  const ogImage = imageUrl ? absoluteUrl(imageUrl) : absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    keywords: [
      product.name,
      `COD4 ${product.name}`,
      product.type === "server" ? "COD4 game server rental" : "COD4 mod pack",
      "CeylonHosting",
      "Call of Duty 4 Sri Lanka",
      "low ping game server",
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: `${title} | ${siteName}`,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${product.name} - ${typeLabel}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteName}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [product, allProducts, storeSettings] = await Promise.all([
    getProduct(id),
    getActiveProducts(),
    getStoreSettings(),
  ]);
  if (!product) notFound();

  const isService = product.type === "service";
  const currentUser = await getCurrentUser();
  const isAdmin = await isAdminUser();
  const { summary: cleanDescription, features } = parseProductDetails(product);

  const productImages = (
    product.images && product.images.length > 0 ? product.images : [product.imageUrl || "/logo.png"]
  ).map((img) => absoluteUrl(img));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      sku: product.id,
      mpn: product.id,
      category:
        product.type === "server"
          ? "Game Server Hosting"
          : isService
            ? "Setup Service"
            : "Game Mods & Tools",
      image: productImages,
      brand: { "@type": "Brand", name: siteName },
      offers: {
        "@type": "Offer",
        url: absoluteUrl(`/products/${product.id}`),
        priceCurrency: "LKR",
        price: product.price,
        priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
        itemCondition: "https://schema.org/NewCondition",
        availability:
          product.type === "server" && product.available === false
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "LK",
          returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
          merchantReturnLink: absoluteUrl("/refund-policy"),
        },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: "0",
            currency: "LKR",
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: {
              "@type": "QuantitativeValue",
              minValue: 0,
              maxValue: 1,
              unitCode: "DAY",
            },
          },
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Catalog",
          item: `${siteUrl}/#catalog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.name,
          item: absoluteUrl(`/products/${product.id}`),
        },
      ],
    },
  ];

  return (
    <main className="product-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="site-header site-header-scrolled">
        <Link className="brand" href="/" aria-label="CeylonHosting home">
          <Image
            src="/logo.png"
            alt="CeylonHosting - COD4 Servers and Mods"
            className="brand-logo"
            width={120}
            height={30}
            style={{ height: "auto" }}
          />
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/#home">Home</Link>
          <Link href="/#catalog">Shop</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <div className="header-actions">
          {currentUser ? (
            <Link
              className="ui-button ui-button-ghost sign-in-button"
              href={isAdmin ? "/admin" : "/dashboard"}
            >
              {isAdmin ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <Link className="ui-button ui-button-ghost sign-in-button" href="/sign-in">
              Sign in
            </Link>
          )}
          {!isAdmin && storeSettings.sandboxEnabled && (
            <CartButton products={allProducts} storeSettings={storeSettings} />
          )}
          <Link className="back-link" href="/">
            <ArrowLeft size={15} /> Back to store
          </Link>
        </div>
      </header>
      <div className="product-detail-layout">
        <ProductGallery product={product} />
        <article className="product-detail-copy">
          <nav className="product-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="product-breadcrumb-sep">/</span>
            <Link href="/#catalog">Catalog</Link>
            <span className="product-breadcrumb-sep">/</span>
            <span className="product-breadcrumb-current" aria-current="page">
              {product.name}
            </span>
          </nav>
          <Badge>
            {product.tag ??
              (product.type === "server"
                ? "Game server"
                : isService
                  ? "Setup service"
                  : "Mod or tool")}
          </Badge>
          <h1>{product.name}</h1>
          {product.type === "server" && (product.locations?.length || product.location) && (
            <div className="product-detail-location">
              <Globe size={15} />
              <span>
                {product.locations && product.locations.length > 1 ? (
                  <>
                    Available Locations: <strong>{product.locations.join(", ")}</strong>
                  </>
                ) : (
                  <>
                    Server Location: <strong>{product.locations?.[0] || product.location}</strong>
                  </>
                )}
              </span>
            </div>
          )}
          {cleanDescription && <p>{cleanDescription}</p>}
          {(features.length > 0 || product.meta) && (
            <div className="product-detail-spec">
              <span>
                {product.type === "server" ? "Server Features & Specifications" : "Specifications"}
              </span>
              {features.length > 0 ? (
                <ul className="product-detail-feature-points" aria-label="Product features">
                  {features.map((feat, idx) => (
                    <li key={idx} className="product-detail-feature-item">
                      <Check size={14} className="feature-check-icon" strokeWidth={2.5} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              ) : product.meta ? (
                <strong>{product.meta}</strong>
              ) : null}
            </div>
          )}
          <div className="product-detail-buy">
            <div>
              <span>
                {product.type === "server"
                  ? "Monthly hosting"
                  : isService
                    ? "One-time setup"
                    : "One-time download"}
              </span>
              <strong>{formatPrice(product.price)}</strong>
            </div>
            <ProductAddToCart product={product} isAdmin={isAdmin} storeSettings={storeSettings} />
          </div>
          {isAdmin ? (
            <small className="detail-note">
              You are viewing this product as an administrator. Purchasing and cart operations are
              disabled for admin accounts.
            </small>
          ) : !storeSettings.sandboxEnabled ? (
            <small className="detail-note">
              Direct order via WhatsApp. No account or sign in required to place your order.
            </small>
          ) : currentUser ? (
            <small className="detail-note">Payments are handled securely by Payments.lk.</small>
          ) : (
            <small className="detail-note">
              Sign in before ordering to save this purchase to your account. Payments are handled
              securely by Payments.lk.
            </small>
          )}
        </article>
      </div>
    </main>
  );
}
