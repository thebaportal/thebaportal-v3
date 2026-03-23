"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Check, Crown, Zap, ArrowLeft, Loader2 } from "lucide-react";

const freeFeatures = [
  "3 BA challenge simulations",
  "Basic progress tracking",
  "Career advisor (starter flows)",
  "Email support",
];

const proFeatures = [
  "All BA challenge simulations",
  "AI-powered submission feedback",
  "Full career advisor suite",
  "Portfolio case study builder",
  "Interview answer generator",
  "Resume bullet generator",
  "Exam prep module",
  "Advanced progress analytics",
  "Priority email support",
  "New content added monthly",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const router = useRouter();

  const monthlyPrice = 29;
  const annualPrice = 19;
  const displayPrice = billing === "monthly" ? monthlyPrice : annualPrice;

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "not_authenticated") {
        router.push("/login?redirectTo=/pricing");
      } else {
        alert(`Checkout error: ${data.message || data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: "var(--teal)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={16} color="#09090b" />
          </div>
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
            TheBAPortal
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-2)",
            background: "none", border: "none", cursor: "pointer",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 24px" }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
            color: "var(--teal)", fontSize: 12, fontWeight: 600,
            padding: "6px 14px", borderRadius: 999, marginBottom: 20,
          }}>
            <Zap size={12} />
            Simple, transparent pricing
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-1)", marginBottom: 12 }}>
            Invest in your BA career
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-2)", maxWidth: 480, margin: "0 auto" }}>
            Real simulations. AI coaching. Career tools. Everything you need to grow as a Business Analyst.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 4, marginTop: 32, gap: 4,
          }}>
            <button
              onClick={() => setBilling("monthly")}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: billing === "monthly" ? "var(--surface)" : "transparent",
                color: billing === "monthly" ? "var(--text-1)" : "var(--text-2)",
                boxShadow: billing === "monthly" ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8,
                background: billing === "annual" ? "var(--surface)" : "transparent",
                color: billing === "annual" ? "var(--text-1)" : "var(--text-2)",
                boxShadow: billing === "annual" ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
              }}
            >
              Annual
              <span style={{
                background: "rgba(31,191,159,0.15)", color: "var(--teal)",
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              }}>
                Save 34%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          maxWidth: 720,
          margin: "0 auto",
        }}>

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 32,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Free</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>Perfect for getting started</p>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: "var(--text-1)" }}>$0</span>
              <span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 6 }}>/ forever</span>
            </div>

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {freeFeatures.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text-2)" }}>
                  <Check size={14} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push("/signup")}
              style={{
                width: "100%", height: 44,
                border: "1px solid var(--border-mid)",
                background: "transparent",
                color: "var(--text-1)",
                fontWeight: 600, fontSize: 14,
                borderRadius: 12, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--card-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              Get started free
            </button>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: "linear-gradient(135deg, #0d2a24 0%, #0a1f2e 100%)",
              border: "1px solid var(--teal-border)",
              borderRadius: 20,
              padding: 32,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle glow */}
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 120, height: 120,
              background: "var(--teal-glow)",
              borderRadius: "50%",
              filter: "blur(40px)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>Pro</h2>
                <span style={{
                  background: "var(--teal)", color: "#09090b",
                  fontSize: 11, fontWeight: 700,
                  padding: "4px 10px", borderRadius: 999,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Crown size={11} /> Most Popular
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>For serious BA professionals</p>

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "var(--text-1)" }}>${displayPrice}</span>
                <span style={{ fontSize: 13, color: "var(--text-2)", marginLeft: 6 }}>
                  / month{billing === "annual" ? " (billed annually)" : ""}
                </span>
              </div>
              {billing === "annual" && (
                <p style={{ fontSize: 12, color: "var(--teal-dim)", marginBottom: 4 }}>
                  That&apos;s ${annualPrice * 12}/year — you save $120
                </p>
              )}

              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, margin: "24px 0 28px" }}>
                {proFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text-2)" }}>
                    <Check size={14} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCheckout}
                disabled={loading}
                style={{
                  width: "100%", height: 44,
                  background: "var(--teal)",
                  color: "#09090b",
                  fontWeight: 700, fontSize: 14,
                  borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--teal-bright)"; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "var(--teal)"; }}
              >
                {loading ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <>
                    <Crown size={14} />
                    Upgrade to Pro
                  </>
                )}
              </button>
              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 12 }}>
                Cancel anytime · Secure checkout via Stripe
              </p>
            </div>
          </motion.div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            display: "flex", flexWrap: "wrap",
            alignItems: "center", justifyContent: "center",
            gap: 24, marginTop: 48,
            fontSize: 13, color: "var(--text-3)",
          }}
        >
          {[
            "🔒 256-bit SSL encryption",
            "💳 Powered by Stripe",
            "↩️ Cancel anytime",
            "🌍 Used by BAs in 20+ countries",
          ].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
