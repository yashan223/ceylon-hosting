import type { Metadata } from "next";
import { Storefront } from "@/components/store/storefront";
import { getActiveProducts } from "@/server/catalog/products";
import { getCurrentUser } from "@/server/auth/session";
import { isAdminUser } from "@/server/auth/admin";
import { getStoreSettings } from "@/server/settings/settings";
import { siteDescription, siteName, siteUrl, siteKeywords } from "@/lib/seo";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "CeylonHosting | COD4 Server Hosting, Mods & Support Sri Lanka",
  },
  description: siteDescription,
  keywords: siteKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "CeylonHosting | COD4 Server Hosting, Mods & Support Sri Lanka",
    description: siteDescription,
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: "CeylonHosting | COD4 Server Hosting, Mods & Support Sri Lanka",
    description: siteDescription,
  },
};

const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "CeylonHosting | COD4 Server Hosting, Mods & Support Sri Lanka",
      description: siteDescription,
      isPartOf: {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@type": "Thing",
        name: "Call of Duty 4: Modern Warfare Server Hosting",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "How quickly will my server be ready?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most server plans are prepared within one business day. Your operator will send the connection details and next steps after ordering.",
          },
        },
        {
          "@type": "Question",
          name: "Are the mod packs compatible with my server?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Each product lists its version and client requirements. If you are unsure, contact support before purchasing and we will help you choose.",
          },
        },
        {
          "@type": "Question",
          name: "How does payment work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payments are processed securely via Payments.lk in Sri Lankan rupees (LKR), or direct orders can be placed and confirmed through WhatsApp chat with direct operator guidance.",
          },
        },
        {
          "@type": "Question",
          name: "Can I get help after purchasing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Every purchase includes dedicated operator support for setup, configuration, and getting your gaming community online.",
          },
        },
        {
          "@type": "Question",
          name: "Where are CeylonHosting COD4 servers hosted?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Our game servers are hosted across high-performance low-latency datacenters including Singapore, Germany, and regional locations with direct routing for South Asian and global players.",
          },
        },
      ],
    },
  ],
};

export default async function Home() {
  let products: Product[] = [];
  const currentUser = await getCurrentUser();
  const isAdmin = await isAdminUser();
  const storeSettings = await getStoreSettings();

  try {
    products = await getActiveProducts();
  } catch (error) {
    console.error("Unable to load products from MongoDB", error);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Storefront
        products={products}
        currentUser={currentUser}
        isAdmin={isAdmin}
        storeSettings={storeSettings}
      />
    </>
  );
}
