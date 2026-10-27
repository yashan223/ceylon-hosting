import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbSchema, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "No Refund Policy",
  description:
    "Review CeylonHosting refund and cancellation policy for COD4 game servers, custom mods, tools, and VPS setup services.",
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    type: "website",
    url: "/refund-policy",
    title: `No Refund Policy | ${siteName}`,
    description:
      "Understand when COD4 servers, mods, and setup services bought from CeylonHosting can be refunded or cancelled.",
  },
  twitter: {
    card: "summary",
    title: `No Refund Policy | ${siteName}`,
    description:
      "Understand when COD4 servers, mods, and setup services bought from CeylonHosting can be refunded or cancelled.",
  },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "No Refund Policy", path: "/refund-policy" },
]);

export default function RefundPolicyPage() {
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
        <h1>No Refund Policy</h1>
        <p>
          Because our servers, mods, tools, and VPS setup services are prepared or delivered for a
          specific customer, payments are generally non-refundable once fulfillment has started.
        </p>
        <h2>Before fulfillment</h2>
        <p>
          Contact support as soon as possible if you believe an order was made by mistake. We may
          review cancellation requests before work begins, but approval is not guaranteed.
        </p>
        <h2>Service delivery</h2>
        <p>
          Setup services are considered fulfilled when the requested installation or configuration
          work is completed or the delivery instructions have been provided through the order chat.
        </p>
        <h2>Problems with delivery</h2>
        <p>
          If a purchased service or file is not delivered as described, contact us through the order
          chat. We will investigate and, where appropriate, correct the issue or provide a
          reasonable replacement.
        </p>
        <h2>Contact</h2>
        <p>
          For policy questions, email{" "}
          <a href="mailto:ceylonhosting@proton.me">ceylonhosting@proton.me</a>.
        </p>
      </article>
    </main>
  );
}
