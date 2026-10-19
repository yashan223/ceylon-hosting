import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LayoutDashboard, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/server/auth/session";
import { findUserById } from "@/server/auth/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const profileUser = await findUserById(user.id);
  if (!profileUser) return null;

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href="/">
          <span className="brand-mark">C</span>
          <span>
            <strong>CeylonHosting</strong>
            <small>CLIENT WORKSPACE</small>
          </span>
        </Link>
        <nav className="dashboard-nav" aria-label="Account navigation">
          <Link href="/dashboard">
            <LayoutDashboard size={16} /> Overview
          </Link>
          <Link href="/dashboard/items">
            <ShoppingBag size={16} /> Items & Mods
          </Link>
          <Link href="/dashboard/messages">
            <MessageCircle size={16} /> Messages
          </Link>
          <Link className="active" href="/profile">
            <UserRound size={16} /> Profile
          </Link>
        </nav>
        <Link className="dashboard-store-link" href="/">
          Back to store <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="section-kicker">Client workspace</span>
            <strong>{user.email}</strong>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="dashboard-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </header>
        <div className="profile-dashboard-content">
          <div className="profile-heading">
            <span className="section-kicker">Account details</span>
            <h1>Profile settings</h1>
            <p>
              Keep your account details current and secure. Your email stays connected to your order
              history.
            </p>
          </div>
          <div className="profile-settings-grid">
            <section className="profile-panel">
              <div className="profile-panel-heading">
                <div>
                  <span className="section-kicker">Your profile</span>
                  <h2>{profileUser.firstName || "Account"}</h2>
                </div>
                <span className="profile-verified">
                  {profileUser.emailVerified ? "Email verified" : "Email pending"}
                </span>
              </div>
              <ProfileForm
                user={{
                  email: profileUser.email,
                  firstName: profileUser.firstName,
                  country: profileUser.country,
                }}
              />
            </section>
            <section className="profile-panel">
              <div className="profile-panel-heading">
                <div>
                  <span className="section-kicker">Security</span>
                  <h2>Change password</h2>
                </div>
              </div>
              <PasswordForm />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
