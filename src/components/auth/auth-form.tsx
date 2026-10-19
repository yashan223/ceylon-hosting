"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/ui/country-select";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

type ApiResponse = {
  error?: string;
  message?: string;
  code?: string;
  redirectTo?: string;
  emailSent?: boolean;
};

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const [firstName, setFirstName] = useState("");
  const [country, setCountry] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [pendingVerification, setPendingVerification] = useState("");
  const [verificationPopupOpen, setVerificationPopupOpen] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [verificationSendFailed, setVerificationSendFailed] = useState(false);

  useEffect(() => {
    if (isSignUp) return;
    const verificationState = new URLSearchParams(window.location.search).get("verified");
    const resetState = new URLSearchParams(window.location.search).get("reset");
    const timeoutId = window.setTimeout(() => {
      if (verificationState === "1") setNotice("Email verified. You can sign in now.");
      if (verificationState === "0") setError("This verification link is invalid or has expired.");
      if (resetState === "1") setNotice("Password updated. You can sign in now.");
    });
    return () => window.clearTimeout(timeoutId);
  }, [isSignUp]);

  useEffect(() => {
    if (!verificationPopupOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setVerificationPopupOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [verificationPopupOpen]);

  function closeVerificationPopup() {
    setVerificationPopupOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCanResend(false);
    if (isSignUp && !country.trim()) {
      setError("Please select your country.");
      return;
    }
    if (
      isSignUp &&
      (!whatsapp.trim() || !/^[0-9+\s()-]{6,25}$/.test(whatsapp.trim()))
    ) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          country,
          whatsapp,
          acceptedTerms,
          email,
          password,
          rememberMe,
          redirectTo: new URLSearchParams(window.location.search).get("redirect_url"),
        }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setError(result.error ?? "Something went wrong.");
        setCanResend(result.code === "EMAIL_NOT_VERIFIED");
        return;
      }
      if (isSignUp) {
        setPendingVerification(email.trim().toLowerCase());
        setVerificationFeedback("");
        setVerificationSendFailed(result.emailSent === false);
        setVerificationPopupOpen(true);
        setPassword("");
      } else {
        window.location.assign(result.redirectTo ?? "/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendVerification(targetEmail: string) {
    setIsLoading(true);
    setError("");
    setVerificationFeedback("");
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(result.error ?? "Unable to resend the email.");
      const message = result.message ?? "Check your email.";
      if (pendingVerification) {
        setVerificationSendFailed(false);
        setVerificationFeedback(message);
      } else setNotice(message);
    } catch (resendError) {
      const message =
        resendError instanceof Error ? resendError.message : "Unable to resend the email.";
      if (pendingVerification) setVerificationFeedback(message);
      else setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const verificationSummary = verificationSendFailed ? (
    <>
      Your account was created, but we could not send a verification link to{" "}
      <strong>{pendingVerification}</strong> yet.
    </>
  ) : (
    <>
      We sent a verification link to <strong>{pendingVerification}</strong>. Open it within 24 hours
      to activate your account.
    </>
  );

  return (
    <div className="auth-card">
      <form className="auth-fields" onSubmit={submit}>
        {isSignUp && (
          <label>
            Full name
            <Input
              autoComplete="name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
        )}
        {isSignUp && (
          <div className="auth-field-group">
            <span>Country</span>
            <CountrySelect
              value={country}
              onChange={setCountry}
              required
            />
          </div>
        )}
        {isSignUp && (
          <label>
            WhatsApp number
            <Input
              type="tel"
              autoComplete="tel"
              placeholder="+94 7X XXX XXXX"
              required
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
            />
          </label>
        )}
        <label>
          Email address
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {!isSignUp && (
          <div className="auth-options-row">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />{" "}
              Remember me
            </label>
            <Link className="auth-forgot-link" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}
        {error && <p className="auth-message auth-error">{error}</p>}
        {notice && <p className="auth-message auth-success">{notice}</p>}
        {pendingVerification && !verificationPopupOpen && (
          <p className="auth-message auth-success">
            {verificationFeedback || verificationSummary}{" "}
            <button
              className="auth-resend"
              type="button"
              onClick={() => void resendVerification(pendingVerification)}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Resend verification email"}
            </button>
          </p>
        )}
        {isSignUp && (
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
            />{" "}
            I agree to the <Link href="/terms">Terms & Conditions</Link> and{" "}
            <Link href="/refund-policy">No Refund Policy</Link>
          </label>
        )}
        <Button type="submit" disabled={isLoading || Boolean(pendingVerification)}>
          {isLoading
            ? "Please wait..."
            : pendingVerification
              ? "Verification pending"
              : isSignUp
                ? "Create account"
                : "Sign in"}
        </Button>
        {canResend && (
          <button
            className="auth-resend"
            type="button"
            onClick={() => void resendVerification(email)}
          >
            Resend verification email
          </button>
        )}
      </form>
      <p className="auth-switch">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create one"}</Link>
      </p>
      {pendingVerification && verificationPopupOpen && (
        <div className="auth-notice-overlay" role="presentation" onClick={closeVerificationPopup}>
          <div
            className="auth-notice-popup"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="auth-notice-close"
              type="button"
              onClick={closeVerificationPopup}
              aria-label="Close verification message"
            >
              <X size={18} />
            </button>
            <span className="auth-notice-icon">@</span>
            <h2 id="auth-notice-title">Check your email</h2>
            <p>{verificationSummary}</p>
            {verificationFeedback && (
              <p className="auth-notice-feedback" role="status">
                {verificationFeedback}
              </p>
            )}
            <Button type="button" autoFocus onClick={closeVerificationPopup}>
              Continue
            </Button>
            <button
              className="auth-notice-resend"
              type="button"
              onClick={() => void resendVerification(pendingVerification)}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
