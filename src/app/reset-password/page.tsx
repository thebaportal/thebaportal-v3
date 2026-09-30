"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword]  = useState("");
  const [error,           setError]            = useState("");
  const [loading,         setLoading]          = useState(false);
  const [done,            setDone]             = useState(false);
  const [pf,              setPf]               = useState(false);
  const [cf,              setCf]               = useState(false);
  const [showPassword,    setShowPassword]     = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

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
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authError.message || "Could not update password. Please try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/projects"), 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Reset error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div style={{ color: "var(--lc-text-4)", fontSize: "13px", textAlign: "center" }}>Loading...</div>;
  }

  if (!hasSession) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--lc-text-1)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Link expired or invalid
        </h2>
        <p style={{ fontSize: "13px", color: "var(--lc-text-3)", lineHeight: 1.6, margin: "0 0 16px" }}>
          This password reset link is no longer valid. Request a new one to continue.
        </p>
        <Link href="/forgot-password" style={{ color: "var(--teal)", textDecoration: "none", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--lc-green)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Password updated
        </h2>
        <p style={{ fontSize: "13px", color: "var(--lc-text-3)", lineHeight: 1.6, margin: 0 }}>
          Taking you to your projects...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--lc-text-1)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Set a new password
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--lc-text-3)", margin: 0, lineHeight: 1.5 }}>
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ ...label, display: "block", marginBottom: "6px" }}>New password</label>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPf(true)} onBlur={() => setPf(false)}
              placeholder="Min. 8 characters" required
              style={{ ...inp(pf), padding: "0 52px 0 14px" }} />
            <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: "12px", fontWeight: 700, lineHeight: 1, fontFamily: "var(--font-display)", padding: "4px 2px" }}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label style={{ ...label, display: "block", marginBottom: "6px" }}>Confirm password</label>
          <input type={showPassword ? "text" : "password"} value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onFocus={() => setCf(true)} onBlur={() => setCf(false)}
            placeholder="Re-enter password" required style={inp(cf)} />
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
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Updating...</>
            : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
