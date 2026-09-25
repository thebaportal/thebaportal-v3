"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Exactly three benefits, matching the reference — do not add a fourth.
const BENEFITS = [
  {
    title: "One workspace for the whole project",
    text: "Keep context, artifacts, versions and decisions together.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
    ),
  },
  {
    title: "Keep the work connected",
    text: "Link requirements, user stories, testing and traceability as the project evolves.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8 6.5h4a4 4 0 0 1 4 4"/></svg>
    ),
  },
  {
    title: "Catch what slips through",
    text: "Surface gaps, contradictions, stale work and unresolved issues when they matter.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
    ),
  },
];

function CheckDot({ met }: { met: boolean }) {
  return (
    <span style={{
      width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${met ? "var(--teal)" : "var(--lc-border)"}`,
      background: met ? "var(--teal)" : "none", transition: "all 0.15s ease",
    }}>
      {met && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#f5f1e7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
    </span>
  );
}

function SignupForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirectTo") || "";

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [ef, setEf] = useState(false);
  const [pf, setPf] = useState(false);

  // Quiet visual guidance only — the actual accepted/rejected rule is
  // unchanged (still just length >= 8, enforced client- and server-side).
  const hasMinLength = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    try {
      // Create confirmed account server-side — no email confirmation required
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.field === "email") setError(json.error);
        else setError(json.error || "Something went wrong. Please try again.");
        return;
      }

      // Account created — sign in immediately
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signInError) { setError(signInError.message); return; }

      router.refresh();
      router.push(redirectTo || "/projects");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inp = (focused: boolean, hasError = false): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    height: "46px",
    padding: "0 14px",
    borderRadius: "10px",
    border: hasError
      ? "1px solid var(--lc-red-border)"
      : `1px solid ${focused ? "var(--teal)" : "var(--lc-border)"}`,
    background: hasError ? "var(--lc-red-bg)" : "var(--lc-faint)",
    color: "var(--lc-text-1)", fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    boxShadow: focused && !hasError ? "0 0 0 3px var(--lc-teal-bg)" : "none",
    transition: "all 0.15s ease",
  });

  const label: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    color: "var(--lc-text-4)", textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: "6px", fontFamily: "var(--font-display)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--lc-text-1)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Create your workspace.
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--lc-text-3)", margin: 0 }}>Free to start. No credit card.</p>
      </div>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setEf(true)} onBlur={() => setEf(false)}
            placeholder="you@example.com" required style={inp(ef)} />
        </div>

        <div>
          <label style={label}>Password</label>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPf(true)} onBlur={() => setPf(false)}
              placeholder="Create a password" required
              style={{ ...inp(pf), padding: "0 52px 0 14px" }} />
            <button type="button"
              onMouseDown={e => { e.preventDefault(); setShowPass(s => !s); }}
              style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: "12px", fontWeight: 700, lineHeight: 1, fontFamily: "var(--font-display)", padding: "4px 2px" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckDot met={hasMinLength} />
              <span style={{ fontSize: "12px", color: hasMinLength ? "var(--lc-text-2)" : "var(--lc-text-4)" }}>At least 8 characters</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckDot met={hasLetterAndNumber} />
              <span style={{ fontSize: "12px", color: hasLetterAndNumber ? "var(--lc-text-2)" : "var(--lc-text-4)" }}>One letter and one number</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckDot met={hasSpecial} />
              <span style={{ fontSize: "12px", color: hasSpecial ? "var(--lc-text-2)" : "var(--lc-text-4)" }}>One special character (e.g. ! @ # $)</span>
            </div>
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
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Creating account...</>
            : "Create my account"}
        </button>

        <p style={{ textAlign: "center", fontSize: "11.5px", color: "var(--lc-text-4)", margin: 0, lineHeight: 1.5 }}>
          By signing up you agree to our{" "}
          <Link href="/terms" style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}>Terms</Link>
          {" "}&amp;{" "}
          <Link href="/privacy" style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}>Privacy</Link>.
        </p>
      </form>
    </div>
  );
}

function HeaderSignIn() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";
  const loginHref = `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
  return (
    <span style={{ fontSize: "13px", color: "var(--lc-text-3)" }}>
      Already have an account?{" "}
      <Link href={loginHref} style={{ color: "var(--teal)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
    </span>
  );
}

// Very subtle abstract shapes on the far right edge — decorative only, low
// contrast, contained so they never cause horizontal scroll.
function DecorativeShapes() {
  return (
    <div aria-hidden className="signup-decor" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", top: "-10%", right: "-14%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,64,125,0.06) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "0%", right: "-4%", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,64,125,0.045) 0%, transparent 70%)" }} />
    </div>
  );
}

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lc-bg)", fontFamily: "var(--font-body)" }}>
      <Suspense fallback={null}>
        <header className="signup-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 48px", maxWidth: "1280px", margin: "0 auto" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--lc-text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              The<span style={{ color: "var(--teal)" }}>BA</span>Portal
            </span>
          </Link>
          <HeaderSignIn />
        </header>
      </Suspense>

      <div className="signup-columns" style={{ display: "flex", alignItems: "flex-start", gap: "64px", maxWidth: "1280px", margin: "0 auto", padding: "24px 48px 64px", position: "relative" }}>
        {/* Left — signup card */}
        <div className="signup-card-col" style={{ flex: "0 0 520px", position: "relative", zIndex: 1 }}>
          <div style={{ width: "100%", padding: "40px", borderRadius: "var(--radius-lg)", border: "1px solid var(--lc-border)", background: "var(--lc-surface)", boxShadow: "var(--lc-shadow-md)" }}>
            <Suspense fallback={<div style={{ color: "var(--lc-text-4)", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
              <SignupForm />
            </Suspense>
          </div>
        </div>

        {/* Right — product positioning */}
        <div className="signup-right-col" style={{ flex: 1, position: "relative", paddingTop: "20px", minWidth: 0 }}>
          <DecorativeShapes />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-display)", marginBottom: "14px" }}>
              Built for real BA work
            </div>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, color: "var(--lc-text-1)", margin: "0 0 14px" }}>
              Start from the beginning. Pick up midway. Keep the work connected.
            </h2>
            <p style={{ fontSize: "14px", color: "var(--lc-text-3)", lineHeight: 1.65, margin: "0 0 32px", maxWidth: "440px" }}>
              Begin with the business context, or jump into requirements, process analysis, user stories, testing, or wherever the project needs you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "var(--lc-teal-bg)", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {b.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--lc-text-1)", marginBottom: "2px" }}>{b.title}</div>
                    <p style={{ fontSize: "12.5px", color: "var(--lc-text-3)", lineHeight: 1.55, margin: 0, maxWidth: "400px" }}>{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
