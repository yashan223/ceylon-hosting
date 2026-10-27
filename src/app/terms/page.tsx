import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbSchema, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Review CeylonHosting terms of service for purchasing private Call of Duty 4 servers, custom mods, and remote VPS setup services in Sri Lanka.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    title: `Terms & Conditions | ${siteName}`,
    description:
      "Review CeylonHosting terms of service for purchasing private Call of Duty 4 servers, custom mods, and remote VPS setup services.",
  },
  twitter: {
    card: "summary",
    title: `Terms & Conditions | ${siteName}`,
    description:
      "Review CeylonHosting terms of service for purchasing private Call of Duty 4 servers, custom mods, and remote VPS setup services.",
  },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Terms & Conditions", path: "/terms" },
]);

export default function TermsPage() {
  return (
    <main className="policy-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c"),
        }}
      />
      <Link className="back-link" href="/">
        Back to store
      </Link>
      <article>
        <span className="section-kicker">Legal</span>
        <h1>Terms & Conditions</h1>
        <p>
          By using CeylonHosting, you agree to provide accurate account details and use the platform
          for lawful purposes.
        </p>
        <h2>Orders and services</h2>
        <p>
          Server hosting, mods, tools, and setup services are supplied as described on each product
          page. Customers must provide accurate VPS and server access details when a service
          requires remote setup.
        </p>
        <h2>Payment and fulfillment</h2>
        <p>
          Payments are processed through Payments.lk. An order is placed into the fulfillment queue
          after payment confirmation. Delivery updates and setup instructions are handled through
          the order chat.
        </p>
        <h2>Account security</h2>
        <p>
          You are responsible for keeping your account credentials private. Contact us promptly if
          you believe your account or order has been accessed without permission.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to{" "}
          <a href="mailto:ceylonhosting@proton.me">ceylonhosting@proton.me</a>.
        </p>
      </article>
    </main>
  );
}
