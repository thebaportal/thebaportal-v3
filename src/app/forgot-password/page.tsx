"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/siteUrl";

function ForgotPasswordForm() {
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [ef,      setEf]      = useState(false);

  const inp = (focused: boolean): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    height: "46px",
    padding: "0 14px",
    borderRadius: "10px",
    border: `1px solid ${focused ? "var(--teal)" : "var(--lc-border)"}`,
    background: "var(--lc-faint)",
    color: "var(--lc-text-1)", fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px var(--lc-teal-bg)" : "none",
    transition: "all 0.15s ease",
  });

  const label: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "var(--lc-text-4)",
    textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "var(--font-display)",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      });
      if (authError) {
        setError(authError.message || "Could not send reset email. Please try again.");
        return;
      }
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Reset request error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--lc-text-1)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Check your inbox
        </h2>
        <p style={{ fontSize: "13px", color: "var(--lc-text-3)", lineHeight: 1.6, margin: "0 0 16px" }}>
          If an account exists for <strong style={{ color: "var(--lc-text-1)" }}>{email}</strong>, we sent a link to reset your password. Click it to continue.
        </p>
        <Link href="/auth/login" style={{ color: "var(--teal)", textDecoration: "none", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--lc-text-1)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Reset your password
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--lc-text-3)", margin: 0, lineHeight: 1.5 }}>
          Enter your account email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ ...label, display: "block", marginBottom: "6px" }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setEf(true)} onBlur={() => setEf(false)}
            autoFocus placeholder="you@example.com" required style={inp(ef)} />
        </div>

        {error && (
          <div style={{ padding: "11px 14px", borderRadius: "9px", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", fontSize: "13px", color: "var(--lc-red)", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: loading ? "var(--teal-soft)" : "var(--teal)", color: "#f5f1e7", fontSize: "14.5px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "filter 0.18s ease" }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.filter = "brightness(1)"; }}>
          {loading
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Sending...</>
            : "Send reset link"}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: "13px", color: "var(--lc-text-4)" }}>
          Remembered it?{" "}
          <Link href="/auth/login" style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 700 }}>
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lc-bg)", fontFamily: "var(--font-body)" }}>
      <header style={{ display: "flex", alignItems: "center", padding: "24px 48px", maxWidth: "1280px", margin: "0 auto" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--lc-text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </span>
        </Link>
      </header>

      <div style={{ display: "flex", justifyContent: "center", padding: "40px 24px 64px" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "40px", borderRadius: "var(--radius-lg)", border: "1px solid var(--lc-border)", background: "var(--lc-surface)", boxShadow: "var(--lc-shadow-md)" }}>
          <Suspense fallback={<div style={{ color: "var(--lc-text-4)", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
