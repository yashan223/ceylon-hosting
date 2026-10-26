import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getStoreSettings } from "@/server/settings/settings";

type StorePageHeaderProps = { backHref?: string; backLabel?: string };

export async function StorePageHeader({
  backHref,
  backLabel = "Back to store",
}: StorePageHeaderProps) {
  const [user, settings] = await Promise.all([getCurrentUser(), getStoreSettings()]);

  return (
    <header className="store-page-header">
      <Link className="store-page-brand" href="/" aria-label="CeylonHosting home">
        <Image
          src="/logo.png"
          alt="CeylonHosting"
          width={120}
          height={30}
          style={{ height: "auto" }}
        />
      </Link>
      <nav className="store-page-nav" aria-label="Main navigation">
        <Link href="/#home">Home</Link>
        <Link href="/#catalog">Shop</Link>
        <Link href="/#faq">FAQ</Link>
      </nav>
      <div className="store-page-actions">
        {user ? (
          <Link className="store-page-account" href="/dashboard">
            Dashboard
          </Link>
        ) : (
          <Link className="store-page-account" href="/sign-in">
            Sign in
          </Link>
        )}
        {settings.sandboxEnabled && (
          <Link className="store-page-cart ui-button ui-button-default" href="/?cart=1#catalog">
            <ShoppingBag size={17} /> Cart
          </Link>
        )}
        {backHref && (
          <Link className="back-link" href={backHref}>
            <ArrowLeft size={15} /> {backLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
