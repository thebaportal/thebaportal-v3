"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function BAPortalLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="none" stroke="#1fbf9f" strokeWidth="1.5" opacity="0.4" />
      <path d="M20 8L32 20L20 32L8 20L20 8Z" fill="none" stroke="#1fbf9f" strokeWidth="1.5" opacity="0.7" />
      <text x="20" y="24" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="800" fontSize="11" fill="#1fbf9f" letterSpacing="-0.5">BA</text>
      <circle cx="20" cy="2" r="2" fill="#1fbf9f" opacity="0.8" />
      <circle cx="36" cy="11" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="36" cy="29" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="20" cy="38" r="2" fill="#1fbf9f" opacity="0.8" />
      <circle cx="4" cy="29" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="4" cy="11" r="1.5" fill="#1fbf9f" opacity="0.4" />
    </svg>
  );
}

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
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1px solid ${focused ? "rgba(31,191,159,0.45)" : "rgba(255,255,255,0.09)"}`,
    background: focused ? "rgba(31,191,159,0.05)" : "rgba(15,15,20,0.8)",
    color: "#f0f0f4", fontSize: "14px",
    fontFamily: "'Open Sans', sans-serif",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(31,191,159,0.07)" : "none",
    transition: "all 0.18s ease",
  });

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
    return <div style={{ color: "#505060", fontSize: "13px", textAlign: "center" }}>Loading...</div>;
  }

  if (!hasSession) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, color: "#f0f0f4", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Link expired or invalid
        </h2>
        <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.6, margin: "0 0 16px" }}>
          This password reset link is no longer valid. Request a new one to continue.
        </p>
        <Link href="/forgot-password" style={{ color: "#1fbf9f", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, color: "#f0f0f4", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Password updated
        </h2>
        <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.6, margin: 0 }}>
          Taking you to your projects...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f0f4", margin: "0 0 8px" }}>
          Set a new password
        </h1>
        <p style={{ fontSize: "13px", color: "#9090a0", margin: 0, lineHeight: 1.5 }}>
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
            New password
          </label>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPf(true)} onBlur={() => setPf(false)}
              placeholder="••••••••" required
              style={{ ...inp(pf), paddingRight: "46px" }} />
            <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPassword ? "#1fbf9f" : "#6a6a7a", fontSize: "12px", fontWeight: 600, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
            Confirm password
          </label>
          <input type={showPassword ? "text" : "password"} value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onFocus={() => setCf(true)} onBlur={() => setCf(false)}
            placeholder="••••••••" required style={inp(cf)} />
        </div>

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)", fontSize: "13px", color: "#fca5a5", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(31,191,159,0.5)" : "#1fbf9f", color: "#05120f", fontSize: "14px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: loading ? "none" : "0 0 20px rgba(31,191,159,0.18)", transition: "all 0.18s ease" }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#25d4b0"; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1fbf9f"; }}>
          {loading
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #05120f", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Updating...</>
            : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ height: "100vh", background: "#09090b", display: "flex", fontFamily: "'Open Sans', sans-serif", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(31,191,159,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 60% 80% at 30% 50%, black 20%, transparent 100%)" }} />

      {/* Left panel */}
      <div className="hidden lg:flex" style={{ flex: "0 0 44%", flexDirection: "column", justifyContent: "space-between", padding: "36px 40px", borderRight: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, rgba(31,191,159,0.04) 0%, transparent 50%)" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(31,191,159,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,0.07) 1px, transparent 1px)`, backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 80% at 30% 40%, black 10%, transparent 80%)" }} />
        <div style={{ position: "absolute", top: "35%", left: "-5%", width: "340px", height: "340px", background: "radial-gradient(ellipse, rgba(31,191,159,0.13) 0%, transparent 65%)", filter: "blur(55px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", left: "10%", width: "420px", height: "420px", background: "radial-gradient(ellipse, rgba(31,191,159,0.06) 0%, transparent 70%)", filter: "blur(70px)", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", position: "relative", zIndex: 1 }}>
          <BAPortalLogo size={32} />
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>TheBAPortal</span>
        </Link>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "36px", color: "#1fbf9f", lineHeight: 1, marginBottom: "16px", opacity: 0.5, fontFamily: "'Inter', sans-serif" }}>&ldquo;</div>
          <blockquote style={{ fontSize: "19px", fontWeight: 700, color: "#f0f0f4", lineHeight: 1.45, margin: "0 0 18px", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            The work never gets easier.<br />The tools should.
          </blockquote>
        </div>

        <div style={{ display: "flex", gap: "28px", position: "relative", zIndex: 1 }}>
          {[{ val: "7", label: "BA workstreams" }, { val: "5", label: "Decision Lab modes" }, { val: "1", label: "Connected project" }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#1fbf9f", letterSpacing: "-0.03em", fontFamily: "'Inter', sans-serif" }}>{s.val}</div>
              <div style={{ fontSize: "11px", color: "#505060", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 48px", position: "relative" }}>
        <div className="lg:hidden" style={{ position: "absolute", top: "20px", left: "20px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <BAPortalLogo size={26} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>TheBAPortal</span>
          </Link>
        </div>
        <div style={{ width: "100%", maxWidth: "360px", padding: "32px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)" }}>
          <Suspense fallback={<div style={{ color: "#505060", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
