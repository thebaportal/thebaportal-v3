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
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1px solid ${focused ? "rgba(52,64,125,0.45)" : "rgba(255,255,255,0.09)"}`,
    background: focused ? "rgba(52,64,125,0.05)" : "rgba(15,15,20,0.8)",
    color: "#f0f0f4", fontSize: "14px",
    fontFamily: "'Open Sans', sans-serif",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(52,64,125,0.07)" : "none",
    transition: "all 0.18s ease",
  });

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
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>✉️</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, color: "#f0f0f4", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Check your inbox
        </h2>
        <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.6, margin: "0 0 16px" }}>
          If an account exists for <strong style={{ color: "#f0f0f4" }}>{email}</strong>, we sent a link to reset your password. Click it to continue.
        </p>
        <Link href="/auth/login" style={{ color: "#34407d", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f0f4", margin: "0 0 8px" }}>
          Reset your password
        </h1>
        <p style={{ fontSize: "13px", color: "#9090a0", margin: 0, lineHeight: 1.5 }}>
          Enter your account email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
            Email
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setEf(true)} onBlur={() => setEf(false)}
            autoFocus placeholder="you@company.com" required style={inp(ef)} />
        </div>

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)", fontSize: "13px", color: "#fca5a5", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(52,64,125,0.5)" : "#34407d", color: "#f5f1e7", fontSize: "14px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: loading ? "none" : "0 0 20px rgba(52,64,125,0.18)", transition: "all 0.18s ease" }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#46549a"; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#34407d"; }}>
          {loading
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Sending...</>
            : "Send reset link"}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: "13px", color: "#505060" }}>
          Remembered it?{" "}
          <Link href="/auth/login"
            style={{ color: "#34407d", textDecoration: "none", fontWeight: 600, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={{ height: "100vh", background: "#09090b", display: "flex", fontFamily: "'Open Sans', sans-serif", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(52,64,125,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(52,64,125,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 60% 80% at 30% 50%, black 20%, transparent 100%)" }} />

      {/* Left panel */}
      <div className="hidden lg:flex" style={{ flex: "0 0 44%", flexDirection: "column", justifyContent: "space-between", padding: "36px 40px", borderRight: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, rgba(52,64,125,0.04) 0%, transparent 50%)" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(52,64,125,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,64,125,0.07) 1px, transparent 1px)`, backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 80% at 30% 40%, black 10%, transparent 80%)" }} />
        <div style={{ position: "absolute", top: "35%", left: "-5%", width: "340px", height: "340px", background: "radial-gradient(ellipse, rgba(52,64,125,0.13) 0%, transparent 65%)", filter: "blur(55px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", left: "10%", width: "420px", height: "420px", background: "radial-gradient(ellipse, rgba(52,64,125,0.06) 0%, transparent 70%)", filter: "blur(70px)", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            The<span style={{ color: "#8d97d9", fontWeight: 800 }}>BA</span>Portal
          </span>
        </Link>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "36px", color: "#34407d", lineHeight: 1, marginBottom: "16px", opacity: 0.5, fontFamily: "'Inter', sans-serif" }}>&ldquo;</div>
          <blockquote style={{ fontSize: "19px", fontWeight: 700, color: "#f0f0f4", lineHeight: 1.45, margin: "0 0 18px", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            The work never gets easier.<br />The tools should.
          </blockquote>
        </div>

        <div style={{ display: "flex", gap: "28px", position: "relative", zIndex: 1 }}>
          {[{ val: "7", label: "BA workstreams" }, { val: "5", label: "Decision Lab modes" }, { val: "1", label: "Connected project" }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#34407d", letterSpacing: "-0.03em", fontFamily: "'Inter', sans-serif" }}>{s.val}</div>
              <div style={{ fontSize: "11px", color: "#505060", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 48px", position: "relative" }}>
        <div className="lg:hidden" style={{ position: "absolute", top: "20px", left: "20px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
              The<span style={{ color: "#8d97d9", fontWeight: 800 }}>BA</span>Portal
            </span>
          </Link>
        </div>
        <div style={{ width: "100%", maxWidth: "360px", padding: "32px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)" }}>
          <Suspense fallback={<div style={{ color: "#505060", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
