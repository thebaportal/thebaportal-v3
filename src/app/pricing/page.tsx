"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Check, Crown, Zap, ArrowLeft, Loader2 } from "lucide-react";

const freeFeatures = [
  "20 BA scenarios (beginner level)",
  "Basic progress tracking",
  "BA artifact templates",
  "Community access",
  "Email support",
];

const proFeatures = [
  "All 60+ BA scenarios (all levels)",
  "AI-powered feedback on submissions",
  "Industry case studies (8 sectors)",
  "Advanced analytics dashboard",
  "Certificate of completion",
  "Priority email support",
  "New scenarios added monthly",
  "Downloadable BA toolkit",
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
        alert("Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">TheBAPortal</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3 h-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Invest in your BA career
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Join hundreds of Business Analysts mastering real-world skills with our scenario-based learning platform.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 mt-8 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                Save 34%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-8"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-1">Free</h2>
            <p className="text-slate-500 text-sm mb-4">Perfect for getting started</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">$0</span>
              <span className="text-slate-400 text-sm ml-1">/ forever</span>
            </div>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push("/signup")}
              className="w-full h-11 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              Get started free
            </button>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold">Pro</h2>
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Most Popular
                </span>
              </div>
              <p className="text-blue-200 text-sm mb-4">For serious BA professionals</p>
              <div className="mb-1">
                <span className="text-4xl font-bold">${displayPrice}</span>
                <span className="text-blue-300 text-sm ml-1">
                  / month{billing === "annual" ? " (billed annually)" : ""}
                </span>
              </div>
              {billing === "annual" && (
                <p className="text-blue-200 text-xs mb-2">
                  That&apos;s ${annualPrice * 12}/year — you save $120
                </p>
              )}

              <ul className="space-y-3 mb-8 mt-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-blue-50">
                    <Check className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-11 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Upgrade to Pro
                  </>
                )}
              </button>
              <p className="text-blue-300 text-xs text-center mt-3">
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
          className="flex flex-wrap items-center justify-center gap-6 mt-12 text-slate-400 text-sm"
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