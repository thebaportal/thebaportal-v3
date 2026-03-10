"use client";

import { useState } from "react";
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

const perks = [
  { icon: "🎯", text: "Access your first challenge free — no card needed" },
  { icon: "🤖", text: "AI stakeholders that push back like real ones" },
  { icon: "📊", text: "4-dimension scoring that names your actual gaps" },
  { icon: "🏅", text: "Progress tracking and difficulty badges" },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  function checkStrength(val: string) {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    setPasswordStrength(score);
  }

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "#ef4444", "#fb923c", "#eab308", "#1fbf9f"][passwordStrength];

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) { setError(authError.message); return; }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: `1px solid ${focusedField === field ? "rgba(31,191,159,0.4)" : "rgba(255,255,255,0.08)"}`,
    background: focusedField === field ? "rgba(31,191,159,0.04)" : "rgba(255,255,255,0.03)",
    color: "#f0f0f4",
    fontSize: "15px",
    fontFamily: "'Open Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(31,191,159,0.08)" : "none",
  });

  // ── Success state ──
  if (done) {
    return (
      <div style={{
        minHeight: "100vh", background: "#09090b",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 24px",
      }}>
        <div style={{
          maxWidth: "440px", width: "100%",
          textAlign: "center",
          padding: "56px 48px",
          borderRadius: "24px",
          background: "#0e0e12",
          border: "1px solid rgba(31,191,159,0.2)",
          boxShadow: "0 0 60px rgba(31,191,159,0.06)",
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(31,191,159,0.1)",
            border: "1px solid rgba(31,191,159,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", margin: "0 auto 24px",
          }}>✓</div>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "26px", fontWeight: 800,
            letterSpacing: "-0.03em", color: "#f0f0f4",
            margin: "0 0 12px",
          }}>Check your email.</h2>
          <p style={{ fontSize: "15px", color: "#9090a0", lineHeight: 1.7, margin: "0 0 32px" }}>
            We sent a confirmation link to <strong style={{ color: "#f0f0f4" }}>{email}</strong>. Click it to activate your account and start your first challenge.
          </p>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "13px 28px", borderRadius: "12px",
            background: "#1fbf9f", color: "#05120f",
            fontSize: "15px", fontWeight: 700,
            textDecoration: "none", fontFamily: "'Inter', sans-serif",
          }}>
            Go to Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#09090b",
      display: "flex",
      fontFamily: "'Open Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(31,191,159,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(31,191,159,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 60% 80% at 70% 50%, black 20%, transparent 100%)",
      }} />

      {/* Left — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 64px",
        position: "relative",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "40px" }}>
            <BAPortalLogo size={32} />
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
              TheBAPortal
            </span>
          </Link>

          <div style={{ marginBottom: "32px" }}>
            <h1 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "30px", fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#f0f0f4", margin: "0 0 10px",
            }}>
              Start for free.
            </h1>
            <p style={{ fontSize: "15px", color: "#9090a0", margin: 0 }}>
              No credit card. Your first challenge is on us.
            </p>
          </div>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 700,
                color: "#9090a0", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: "8px",
                fontFamily: "'Inter', sans-serif",
              }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                placeholder="Jane Smith"
                required
                style={inputStyle("name")}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 700,
                color: "#9090a0", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: "8px",
                fontFamily: "'Inter', sans-serif",
              }}>Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="you@company.com"
                required
                style={inputStyle("email")}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 700,
                color: "#9090a0", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: "8px",
                fontFamily: "'Inter', sans-serif",
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); checkStrength(e.target.value); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min. 8 characters"
                  required
                  style={{ ...inputStyle("password"), paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{
                    position: "absolute", right: "14px", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: showPassword ? "#1fbf9f" : "#505060",
                    fontSize: "13px", padding: "4px",
                    transition: "color 0.15s",
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "99px",
                      background: strengthColor,
                      width: `${(passwordStrength / 4) * 100}%`,
                      transition: "all 0.3s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: "11px", color: strengthColor, fontWeight: 600, minWidth: "36px" }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: "10px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                fontSize: "14px", color: "#f87171",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "15px",
                borderRadius: "12px", border: "none",
                background: loading ? "rgba(31,191,159,0.5)" : "#1fbf9f",
                color: "#05120f",
                fontSize: "15px", fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
                marginTop: "4px",
                boxShadow: loading ? "none" : "0 0 24px rgba(31,191,159,0.2)",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#25d4b0"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1fbf9f"; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    border: "2px solid #05120f", borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite", display: "inline-block",
                  }} />
                  Creating account...
                </>
              ) : "Create Free Account →"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "#333342", margin: "4px 0 0", lineHeight: 1.6 }}>
              By signing up you agree to our{" "}
              <Link href="/terms" style={{ color: "#505060", textDecoration: "underline" }}>Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" style={{ color: "#505060", textDecoration: "underline" }}>Privacy Policy</Link>.
            </p>
          </form>

          <div style={{
            display: "flex", alignItems: "center", gap: "16px",
            margin: "24px 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: "12px", color: "#333342" }}>already have an account?</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          <Link href="/login" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "13px", borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#9090a0", fontSize: "14px", fontWeight: 600,
            textDecoration: "none", fontFamily: "'Inter', sans-serif",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,0.25)"; e.currentTarget.style.color = "#f0f0f4"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9090a0"; }}
          >
            Sign in instead
          </Link>
        </div>
      </div>

      {/* Right panel — perks */}
      <div style={{
        flex: "0 0 42%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 64px",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", bottom: "20%", right: "10%",
          width: "360px", height: "360px",
          background: "radial-gradient(ellipse, rgba(31,191,159,0.07) 0%, transparent 70%)",
          filter: "blur(50px)", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: "12px", fontWeight: 700, color: "#1fbf9f",
            textTransform: "uppercase", letterSpacing: "0.1em",
            fontFamily: "'Inter', sans-serif", marginBottom: "20px",
          }}>What you get</div>

          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "28px", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.15,
            color: "#f0f0f4", margin: "0 0 40px",
          }}>
            Stop studying BA work.<br />Start doing it.
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "48px" }}>
            {perks.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: "rgba(31,191,159,0.08)",
                  border: "1px solid rgba(31,191,159,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", flexShrink: 0,
                }}>{p.icon}</div>
                <p style={{ fontSize: "15px", color: "#9090a0", lineHeight: 1.6, margin: 0, paddingTop: "10px" }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          {/* Testimonial snippet */}
          <div style={{
            padding: "20px 22px", borderRadius: "14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <p style={{ fontSize: "14px", color: "#c0c0cc", lineHeight: 1.7, margin: "0 0 14px", fontStyle: "italic" }}>
              "The Expert difficulty mode is genuinely hard. I failed my first two attempts. That's exactly why I kept coming back."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 700, color: "#f59e0b",
                fontFamily: "'Inter', sans-serif",
              }}>JO</div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0f4", fontFamily: "'Inter', sans-serif" }}>James O.</div>
                <div style={{ fontSize: "11px", color: "#505060" }}>Lead BA · RBC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}