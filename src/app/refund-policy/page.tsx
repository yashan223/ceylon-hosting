import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No Refund Policy",
  description:
    "Understand when COD4 servers, mods, and setup services bought from CeylonHosting can be refunded.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <main className="policy-page">
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
          <a href="mailto:support@ceylonhosting.tech">support@ceylonhosting.tech</a>.
        </p>
      </article>
    </main>
  );
}
