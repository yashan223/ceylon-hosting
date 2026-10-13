import Image from "next/image";
import Link from "next/link";
import PixelBlast from "@/components/PixelBlast";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
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
          <span className="auth-kicker">Account recovery</span>
          <h1>
            Get back to
            <br />
            <em>game night.</em>
          </h1>
          <p>We will send a secure password reset link to your email.</p>
        </div>
        <span className="auth-coordinate">CEYLONHOSTING / 2026</span>
      </section>
      <section className="auth-form">
        <div className="auth-heading">
          <h2>Reset your password</h2>
          <p>Enter the email linked to your account.</p>
        </div>
        <div className="auth-card">
          <ForgotPasswordForm />
          <p className="auth-switch">
            <Link href="/sign-in">Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
