import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";
import PixelBlast from "@/components/PixelBlast";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-pixel" aria-hidden="true">
          <PixelBlast
            variant="square"
            pixelSize={3}
            color="#ffffff"
            patternScale={2}
            patternDensity={0.9}
            enableRipples={false}
            speed={0.3}
            transparent
            edgeFade={0.5}
          />
        </div>
        <div className="auth-brand">
          <Image
            src="/logo.png"
            alt="CeylonHosting"
            className="auth-logo"
            width={220}
            height={52}
            priority
            style={{ height: "auto" }}
          />
        </div>
        <div>
          <span className="auth-kicker">Welcome back, User</span>
          <h1>
            Ready when
            <br />
            <em>your squad is.</em>
          </h1>
          <p>Get your game servers, mod packs and player support from one place.</p>
        </div>
        <span className="auth-coordinate">CEYLONHOSTING / 2026</span>
      </section>
      <section className="auth-form">
        <div className="auth-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your store account.</p>
        </div>
        <AuthForm mode="sign-in" />
        <Link className="auth-home-link" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
