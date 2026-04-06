"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); return; }
      router.push(await getPostAuthRedirect());
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
        maskImage: "radial-gradient(ellipse 60% 80% at 30% 50%, black 20%, transparent 100%)",
      }} />

      {/* Left panel — decorative */}
      <div style={{
        flex: "0 0 44%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: "400px", height: "400px",
          background: "radial-gradient(ellipse, rgba(31,191,159,0.08) 0%, transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none",
        }} />

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", position: "relative", zIndex: 1 }}>
          <BAPortalLogo size={36} />
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            TheBAPortal
          </span>
        </Link>

        {/* Centre quote */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: "42px", color: "#1fbf9f", lineHeight: 1,
            marginBottom: "20px", opacity: 0.5,
            fontFamily: "'Inter', sans-serif",
          }}>"</div>
          <blockquote style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#f0f0f4",
            lineHeight: 1.4,
            margin: "0 0 20px",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "-0.02em",
          }}>
            The gap between a good BA<br />and a great one is practice<br />under real pressure.
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700, color: "#a78bfa",
              fontFamily: "'Inter', sans-serif",
            }}>AR</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f4", fontFamily: "'Inter', sans-serif" }}>Alex Rivera</div>
              <div style={{ fontSize: "12px", color: "#505060" }}>Senior BA Coach · TheBAPortal</div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: "flex", gap: "28px", position: "relative", zIndex: 1 }}>
          {[
            { val: "7", label: "Challenges" },
            { val: "3", label: "Difficulty modes" },
            { val: "4", label: "Eval dimensions" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#1fbf9f", letterSpacing: "-0.03em", fontFamily: "'Inter', sans-serif" }}>{s.val}</div>
              <div style={{ fontSize: "11px", color: "#505060", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 64px",
        position: "relative",
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          {/* Heading */}
          <div style={{ marginBottom: "40px" }}>
            <h1 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "30px", fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#f0f0f4", margin: "0 0 10px",
            }}>
              Welcome back.
            </h1>
            <p style={{ fontSize: "15px", color: "#9090a0", margin: 0 }}>
              Sign in to continue your BA simulation.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 700,
                color: "#9090a0", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: "8px",
                fontFamily: "'Inter', sans-serif",
              }}>Email</label>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{
                  fontSize: "12px", fontWeight: 700,
                  color: "#9090a0", textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontFamily: "'Inter', sans-serif",
                }}>Password</label>
                <Link href="/forgot-password" style={{
                  fontSize: "12px", color: "#505060",
                  textDecoration: "none", transition: "color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#1fbf9f")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#505060")}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
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
                    transition: "color 0.15s", lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
                marginTop: "8px",
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
                  Signing in...
                </>
              ) : "Sign In →"}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: "16px",
            margin: "28px 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: "12px", color: "#333342" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Sign up link */}
          <p style={{ textAlign: "center", fontSize: "14px", color: "#9090a0", margin: 0 }}>
            No account yet?{" "}
            <Link href="/signup" style={{
              color: "#1fbf9f", fontWeight: 600, textDecoration: "none",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#25d4b0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#1fbf9f")}
            >
              Try a challenge free →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}