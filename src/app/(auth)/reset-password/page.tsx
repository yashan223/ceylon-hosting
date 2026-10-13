import Image from "next/image";
import Link from "next/link";
import PixelBlast from "@/components/PixelBlast";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
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
          <span className="auth-kicker">Secure account access</span>
          <h1>
            Choose a new
            <br />
            <em>password.</em>
          </h1>
          <p>Use a strong password you do not use anywhere else.</p>
        </div>
        <span className="auth-coordinate">CEYLONHOSTING / 2026</span>
      </section>
      <section className="auth-form">
        <div className="auth-heading">
          <h2>Set a new password</h2>
          <p>Your reset link is valid for one hour.</p>
        </div>
        <div className="auth-card">
          <ResetPasswordForm token={token} />
          <p className="auth-switch">
            <Link href="/sign-in">Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
