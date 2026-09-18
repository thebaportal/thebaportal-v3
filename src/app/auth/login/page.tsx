"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/siteUrl";
import { getPostAuthRedirect } from "@/lib/postAuthRedirect";


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

  const [ef, setEf] = useState(false);
  const [pf, setPf] = useState(false);

  if (magicSent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>✉️</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, color: "#f0f0f4", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Check your inbox
        </h2>
        <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.6, margin: "0 0 16px" }}>
          We sent a link to <strong style={{ color: "#f0f0f4" }}>{email}</strong>. Click it to sign in.
        </p>
        <button onClick={() => { setMagicSent(false); setMagicMode(false); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#34407d", fontSize: "13px", fontWeight: 600 }}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {hint === "existing" && (
        <div style={{ padding: "10px 13px", borderRadius: "9px", background: "rgba(52,64,125,0.07)", border: "1px solid rgba(52,64,125,0.2)", fontSize: "13px", color: "#34407d" }}>
          Looks like you already have an account. Sign in below.
        </div>
      )}
      {/* Static heading */}
      <div>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: "32px", fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f0f4", margin: 0 }}>
          Sign in
        </h1>
      </div>

      {!magicMode ? (
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setEf(true)} onBlur={() => setEf(false)}
              placeholder="you@company.com" required style={inp(ef)} />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
                Password
              </label>
              <Link href="/forgot-password" style={{ fontSize: "12px", color: "#505060", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#34407d")}
                onMouseLeave={e => (e.currentTarget.style.color = "#505060")}>
                Forgot?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPf(true)} onBlur={() => setPf(false)}
                placeholder="••••••••" required
                style={{ ...inp(pf), paddingRight: "46px" }} />
              <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPassword ? "#34407d" : "#6a6a7a", fontSize: "12px", fontWeight: 600, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)", fontSize: "13px", color: "#fca5a5", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Sign in */}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(52,64,125,0.5)" : "#34407d", color: "#f5f1e7", fontSize: "14px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: loading ? "none" : "0 0 20px rgba(52,64,125,0.18)", transition: "all 0.18s ease" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#46549a"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#34407d"; }}>
            {loading
              ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #f5f1e7", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Signing in...</>
              : "Sign in"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: "11px", color: "#333342" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Magic link */}
          <button type="button" onClick={() => { setMagicMode(true); setError(""); }}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#9090a0", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", transition: "all 0.18s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(52,64,125,0.25)"; e.currentTarget.style.color = "#f0f0f4"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9090a0"; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 7 10-7" />
            </svg>
            Send me a magic link instead
          </button>

          {/* Create account */}
          <p style={{ margin: 0, textAlign: "center", fontSize: "13px", color: "#505060" }}>
            No account?{" "}
            <Link href={signupHref}
              style={{ color: "#34407d", textDecoration: "none", fontWeight: 600, transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Create one
            </Link>
          </p>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setEf(true)} onBlur={() => setEf(false)}
              autoFocus placeholder="you@company.com" style={inp(ef)} />
          </div>
          {error && (
            <div style={{ padding: "11px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", fontSize: "13px", color: "#fca5a5", fontWeight: 500 }}>
              {error}
            </div>
          )}
          <button type="button" onClick={handleMagicLink} disabled={magicLoading}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: magicLoading ? "rgba(52,64,125,0.5)" : "#34407d", color: "#f5f1e7", fontSize: "14px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: magicLoading ? "not-allowed" : "pointer" }}>
            {magicLoading ? "Sending..." : "Send magic link"}
          </button>
          <button type="button" onClick={() => { setMagicMode(false); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#505060", fontSize: "13px", textAlign: "center" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#9090a0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#505060")}>
            Back to password sign in
          </button>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ height: "100vh", background: "#09090b", display: "flex", fontFamily: "'Open Sans', sans-serif", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(52,64,125,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(52,64,125,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 60% 80% at 30% 50%, black 20%, transparent 100%)" }} />

      {/* Left panel */}
      <div className="hidden lg:flex" style={{ flex: "0 0 44%", flexDirection: "column", justifyContent: "space-between", padding: "36px 40px", borderRight: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, rgba(52,64,125,0.04) 0%, transparent 50%)" }}>
        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(52,64,125,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,64,125,0.07) 1px, transparent 1px)`, backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 80% at 30% 40%, black 10%, transparent 80%)" }} />
        {/* Glow behind quote */}
        <div style={{ position: "absolute", top: "35%", left: "-5%", width: "340px", height: "340px", background: "radial-gradient(ellipse, rgba(52,64,125,0.13) 0%, transparent 65%)", filter: "blur(55px)", pointerEvents: "none" }} />
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: "25%", left: "10%", width: "420px", height: "420px", background: "radial-gradient(ellipse, rgba(52,64,125,0.06) 0%, transparent 70%)", filter: "blur(70px)", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            The<span style={{ color: "#8d97d9", fontWeight: 800 }}>BA</span>Portal
          </span>
        </Link>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: "19px", fontWeight: 700, color: "#f0f0f4", lineHeight: 1.45, margin: 0, fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            The work never gets easier.<br />The tools should.
          </p>
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
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
