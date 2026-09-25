"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/siteUrl";

// Exactly three compact highlights, matching the reference — do not add a fourth.
const HIGHLIGHTS = [
  {
    title: "Your projects", text: "Access and continue your work.",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>,
  },
  {
    title: "See what changed", text: "Stay aligned with the latest updates.",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8 6.5h4a4 4 0 0 1 4 4"/></svg>,
  },
  {
    title: "Keep moving", text: "Turn decisions into progress.",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>,
  },
];

function DecorativeShapes() {
  return (
    <div aria-hidden className="login-decor" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", top: "-10%", right: "-14%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,64,125,0.06) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "0%", right: "-4%", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,64,125,0.045) 0%, transparent 70%)" }} />
    </div>
  );
}

function LoginForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirectTo") || "";
  const hint        = searchParams.get("hint");

  const signupHref = `/auth/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [magicMode,    setMagicMode]    = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent,    setMagicSent]    = useState(false);
  const [ef, setEf] = useState(false);
  const [pf, setPf] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const msg = authError.message;
        setError(
          msg === "Invalid login credentials" ? "Wrong email or password." :
          msg === "Email not confirmed" ? "Email not confirmed — check your inbox for the confirmation link." :
          msg || "Sign in failed. Please try again."
        );
        return;
      }
      router.refresh();
      router.push(redirectTo || "/projects");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Sign in error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError("Enter your email address first."); return; }
    setMagicLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`,
      },
    });
    setMagicLoading(false);
    if (authError) { setError(authError.message); } else { setMagicSent(true); }
  }

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

  if (magicSent) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--lc-text-1)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Check your inbox
        </h2>
        <p style={{ fontSize: "13px", color: "var(--lc-text-3)", lineHeight: 1.6, margin: "0 0 16px" }}>
          We sent a link to <strong style={{ color: "var(--lc-text-1)" }}>{email}</strong>. Click it to sign in.
        </p>
        <button onClick={() => { setMagicSent(false); setMagicMode(false); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {hint === "existing" && (
        <div style={{ padding: "10px 13px", borderRadius: "9px", background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", fontSize: "13px", color: "var(--teal)" }}>
          Looks like you already have an account. Sign in below.
        </div>
      )}

      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--lc-text-1)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Welcome back.
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--lc-text-3)", margin: 0 }}>Sign in to continue working on your projects.</p>
      </div>

      {!magicMode ? (
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ ...label, display: "block", marginBottom: "6px" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setEf(true)} onBlur={() => setEf(false)}
              placeholder="you@example.com" required style={inp(ef)} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={label}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: "12px", color: "var(--teal)", fontWeight: 600, textDecoration: "none" }}>
                Forgot?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPf(true)} onBlur={() => setPf(false)}
                placeholder="Enter your password" required
                style={{ ...inp(pf), padding: "0 52px 0 14px" }} />
              <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: "12px", fontWeight: 700, lineHeight: 1, fontFamily: "var(--font-display)", padding: "4px 2px" }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
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
              ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Signing in...</>
              : "Sign in"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--lc-border)" }} />
            <span style={{ fontSize: "11px", color: "var(--lc-text-4)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--lc-border)" }} />
          </div>

          <button type="button" onClick={() => { setMagicMode(true); setError(""); }}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--lc-border)", background: "none", color: "var(--lc-text-2)", fontSize: "13.5px", fontWeight: 600, fontFamily: "var(--font-display)", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal-border)"; e.currentTarget.style.color = "var(--teal)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--lc-border)"; e.currentTarget.style.color = "var(--lc-text-2)"; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 7 10-7" />
            </svg>
            Send me a magic link instead
          </button>

          <p style={{ margin: 0, textAlign: "center", fontSize: "13px", color: "var(--lc-text-4)" }}>
            No account?{" "}
            <Link href={signupHref} style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 700 }}>
              Create one
            </Link>
          </p>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ ...label, display: "block", marginBottom: "6px" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setEf(true)} onBlur={() => setEf(false)}
              autoFocus placeholder="you@example.com" style={inp(ef)} />
          </div>
          {error && (
            <div style={{ padding: "11px 14px", borderRadius: "9px", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", fontSize: "13px", color: "var(--lc-red)", fontWeight: 500 }}>
              {error}
            </div>
          )}
          <button type="button" onClick={handleMagicLink} disabled={magicLoading}
            style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: magicLoading ? "var(--teal-soft)" : "var(--teal)", color: "#f5f1e7", fontSize: "14.5px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: magicLoading ? "not-allowed" : "pointer" }}>
            {magicLoading ? "Sending..." : "Send magic link"}
          </button>
          <button type="button" onClick={() => { setMagicMode(false); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lc-text-3)", fontSize: "13px", textAlign: "center", fontFamily: "var(--font-body)" }}>
            Back to password sign in
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lc-bg)", fontFamily: "var(--font-body)" }}>
      <header className="login-header" style={{ display: "flex", alignItems: "center", padding: "24px 48px", maxWidth: "1280px", margin: "0 auto" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--lc-text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </span>
        </Link>
      </header>

      <div className="login-columns" style={{ display: "flex", alignItems: "flex-start", gap: "64px", maxWidth: "1280px", margin: "0 auto", padding: "24px 48px 64px", position: "relative" }}>
        {/* Left — sign-in card */}
        <div className="login-card-col" style={{ flex: "0 0 500px", position: "relative", zIndex: 1 }}>
          <div style={{ width: "100%", padding: "40px", borderRadius: "var(--radius-lg)", border: "1px solid var(--lc-border)", background: "var(--lc-surface)", boxShadow: "var(--lc-shadow-md)" }}>
            <Suspense fallback={<div style={{ color: "var(--lc-text-4)", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Right — calm return-user message */}
        <div className="login-right-col" style={{ flex: 1, position: "relative", paddingTop: "20px", minWidth: 0 }}>
          <DecorativeShapes />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-display)", marginBottom: "14px" }}>
              Real work. Real progress.
            </div>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--lc-text-1)", margin: "0 0 14px" }}>
              Pick up where you left off.
            </h2>
            <p style={{ fontSize: "14px", color: "var(--lc-text-3)", lineHeight: 1.65, margin: "0 0 32px", maxWidth: "440px" }}>
              Your projects, approved context, decisions, requirements and testing stay connected as the work evolves.
            </p>

            <div className="login-highlights" style={{ display: "flex", gap: "28px" }}>
              {HIGHLIGHTS.map((h, i) => (
                <div key={i} style={{ maxWidth: "160px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "var(--lc-teal-bg)", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                    {h.icon}
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--lc-text-1)", marginBottom: "3px" }}>{h.title}</div>
                  <p style={{ fontSize: "12px", color: "var(--lc-text-3)", lineHeight: 1.5, margin: 0 }}>{h.text}</p>
                </div>
              ))}
            </div>

            <div style={{ height: "1px", background: "var(--lc-border)", margin: "28px 0 16px", maxWidth: "440px" }} />
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--lc-text-5)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-display)" }}>
              Same context. A clearer path forward.
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
