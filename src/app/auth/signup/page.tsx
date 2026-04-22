"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/siteUrl";
import { getPostAuthRedirect } from "@/lib/postAuthRedirect";

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

const PERKS = [
  { icon: "⚡", text: "First challenge free — no card needed" },
  { icon: "🤖", text: "AI stakeholders that push back like real ones" },
  { icon: "📊", text: "4-dimension scoring that names your actual gaps" },
  { icon: "🏅", text: "Progress tracking across difficulty levels" },
];

function SignupForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirectTo") || "";
  const loginHref   = `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  const [fullName,   setFullName]   = useState("");
  const [nameError,  setNameError]  = useState("");
  const [nameTouched,setNameTouched]= useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [strength,   setStrength]   = useState(0);
  const [nf, setNf] = useState(false);
  const [ef, setEf] = useState(false);
  const [pf, setPf] = useState(false);

  function toTitleCase(str: string) {
    return str.trim().replace(/\s+/g, " ")
      .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  function validateName(val: string): string {
    const trimmed = val.trim();
    if (trimmed.length < 3) return "Please enter your full name (first and last name)";
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) return "Please enter your full name (first and last name)";
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) return "Please enter your full name (first and last name)";
    return "";
  }

  function handleNameChange(val: string) {
    setFullName(val);
    if (nameTouched) setNameError(validateName(val));
  }

  function handleNameBlur() {
    const cased = toTitleCase(fullName);
    setFullName(cased);
    setNameTouched(true);
    setNameError(validateName(cased));
  }

  function checkStrength(val: string) {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setStrength(s);
  }

  const strengthColor = ["", "#ef4444", "#fb923c", "#eab308", "#1fbf9f"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    // Run all validations before touching the network
    const nameErr = validateName(fullName);
    if (nameErr) { setNameError(nameErr); setNameTouched(true); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    try {
      // Server-side name validation before Supabase call
      const check = await fetch("/api/auth/validate-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      if (!check.ok) {
        const { error: checkErr } = await check.json();
        setNameError(checkErr || "Please enter your full name (first and last name)");
        setNameTouched(true);
        return;
      }

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: toTitleCase(fullName) },
          emailRedirectTo: `${siteUrl()}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`,
        },
      });
      if (authError) { setError(authError.message); return; }
      // Supabase returns an empty identities array when the email already exists
      if (data.user && data.user.identities?.length === 0) {
        router.push(loginHref + (loginHref.includes("?") ? "&" : "?") + "hint=existing");
        return;
      }
      if (data.session) {
        router.push(redirectTo || (await getPostAuthRedirect()));
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inp = (focused: boolean, hasError = false): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    height: "44px",
    padding: "0 14px",
    borderRadius: "10px",
    border: hasError
      ? "1px solid rgba(248,113,113,0.6)"
      : `1px solid ${focused ? "rgba(31,191,159,0.45)" : "#27272a"}`,
    background: hasError
      ? "rgba(248,113,113,0.04)"
      : focused ? "rgba(31,191,159,0.05)" : "rgba(15,15,20,0.8)",
    color: "#f0f0f4", fontSize: "14px",
    fontFamily: "'Open Sans', sans-serif",
    outline: "none",
    boxShadow: hasError
      ? "0 0 0 3px rgba(248,113,113,0.07)"
      : focused ? "0 0 0 3px rgba(31,191,159,0.07)" : "none",
    transition: "all 0.18s ease",
  });

  const label: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    color: "#6a6a7a", textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: "5px", fontFamily: "'Inter', sans-serif",
  };

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(31,191,159,0.1)", border: "1px solid rgba(31,191,159,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", margin: "0 auto 16px" }}>✓</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", color: "#f0f0f4", margin: "0 0 8px" }}>Check your email.</h2>
        <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.6, margin: "0 0 20px" }}>
          Confirmation link sent to <strong style={{ color: "#f0f0f4" }}>{email}</strong>.
        </p>
        <Link href={loginHref} style={{ display: "inline-flex", alignItems: "center", padding: "11px 24px", borderRadius: "10px", background: "#1fbf9f", color: "#05120f", fontSize: "14px", fontWeight: 700, textDecoration: "none", fontFamily: "'Inter', sans-serif" }}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Heading */}
      <div style={{ marginBottom: "4px" }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: "36px", fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f0f4", margin: "0 0 6px" }}>
          Start for free.
        </h1>
        <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>No credit card. Your first challenge is on us.</p>
      </div>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Full name */}
        <div>
          <label style={label}>Full Name</label>
          <input type="text" value={fullName}
            onChange={e => handleNameChange(e.target.value)}
            onFocus={() => setNf(true)}
            onBlur={handleNameBlur}
            placeholder="Jane Smith" required
            style={inp(nf, !!nameError)} />
          {nameError && (
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#f87171" }}>{nameError}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label style={label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setEf(true)} onBlur={() => setEf(false)}
            placeholder="you@company.com" required style={inp(ef)} />
        </div>

        {/* Password */}
        <div>
          <label style={label}>Password</label>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={password}
              onChange={e => { setPassword(e.target.value); checkStrength(e.target.value); }}
              onFocus={() => setPf(true)} onBlur={() => setPf(false)}
              placeholder="Min. 8 characters" required
              style={{ ...inp(pf), padding: "0 46px 0 14px" }} />
            <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPass ? "#1fbf9f" : "#505060", fontSize: "12px", lineHeight: 1 }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          {password.length > 0 && (
            <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, height: "2px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "99px", background: strengthColor, width: `${(strength / 4) * 100}%`, transition: "all 0.3s ease" }} />
              </div>
              <span style={{ fontSize: "10px", color: strengthColor, fontWeight: 600, minWidth: "32px" }}>{strengthLabel}</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "9px 13px", borderRadius: "9px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: "13px", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(31,191,159,0.5)" : "#1fbf9f", color: "#05120f", fontSize: "14px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: loading ? "none" : "0 0 20px rgba(31,191,159,0.18)", transition: "all 0.18s ease" }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.1)"; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.filter = "brightness(1)"; }}>
          {loading
            ? <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #05120f", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Creating account...</>
            : "Start my first simulation"}
        </button>

        {/* Terms */}
        <p style={{ textAlign: "center", fontSize: "11px", color: "#3f3f46", margin: 0, lineHeight: 1.5 }}>
          By signing up you agree to our{" "}
          <Link href="/terms" style={{ color: "#52525b", textDecoration: "underline" }}>Terms</Link>
          {" "}&amp;{" "}
          <Link href="/privacy" style={{ color: "#52525b", textDecoration: "underline" }}>Privacy</Link>.
        </p>

        {/* Sign in */}
        <p style={{ textAlign: "center", fontSize: "13px", color: "#52525b", margin: 0 }}>
          Already have an account?{" "}
          <Link href={loginHref} style={{ color: "#1fbf9f", textDecoration: "none", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div style={{ height: "100vh", background: "#09090b", display: "flex", fontFamily: "'Open Sans', sans-serif", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(31,191,159,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 60% 80% at 70% 50%, black 20%, transparent 100%)" }} />

      {/* Left panel — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 48px", position: "relative" }}>
        {/* Logo */}
        <div style={{ position: "absolute", top: "28px", left: "36px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
            <BAPortalLogo size={30} />
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>TheBAPortal</span>
          </Link>
        </div>

        <div style={{ width: "100%", maxWidth: "370px", padding: "36px", borderRadius: "16px", border: "1px solid rgba(39,39,42,0.6)", background: "rgba(24,24,27,0.7)", backdropFilter: "blur(12px)" }}>
          <Suspense fallback={<div style={{ color: "#505060", fontSize: "13px", textAlign: "center" }}>Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>

      {/* Right panel — perks */}
      <div className="hidden lg:flex" style={{ flex: "0 0 42%", flexDirection: "column", justifyContent: "center", padding: "36px 48px", borderLeft: "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden", background: "linear-gradient(200deg, rgba(31,191,159,0.04) 0%, transparent 50%)" }}>
        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(31,191,159,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,0.07) 1px, transparent 1px)`, backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 80% at 70% 50%, black 10%, transparent 80%)" }} />
        {/* Glow — reduced intensity */}
        <div style={{ position: "absolute", bottom: "25%", right: "5%", width: "300px", height: "300px", background: "radial-gradient(ellipse, rgba(31,191,159,0.06) 0%, transparent 65%)", filter: "blur(70px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#1fbf9f", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif", marginBottom: "12px" }}>What you get</div>

          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.25, color: "#d4d4d8", margin: "0 0 20px" }}>
            Stop studying BA work.<br />Start doing it.
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(31,191,159,0.08)", border: "1px solid rgba(31,191,159,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                  {p.icon}
                </div>
                <p style={{ fontSize: "13px", color: "#9090a0", lineHeight: 1.5, margin: 0 }}>{p.text}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 10px", fontStyle: "italic" }}>
              &ldquo;The Expert difficulty mode is genuinely hard. I failed my first two attempts. That&apos;s exactly why I kept coming back.&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#f59e0b", fontFamily: "'Inter', sans-serif" }}>JO</div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f4", fontFamily: "'Inter', sans-serif" }}>James O.</div>
                <div style={{ fontSize: "11px", color: "#505060" }}>Lead BA · RBC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
