"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types/database";
import {
  BookOpen, LayoutDashboard, Target, TrendingUp, Settings,
  LogOut, ChevronDown, Flame, CheckCircle2, BarChart3,
  Sparkles, ArrowRight, Crown, Lock, FileText, Brain, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  completedCount: number;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Scenarios", icon: Target, href: "/scenarios" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const featureCards = [
  {
    icon: Brain,
    title: "AI-Powered Scenarios",
    description: "60+ real-world BA challenges with intelligent feedback across 8 industries",
    badge: "Popular",
    badgeColor: "bg-blue-100 text-blue-700",
    cta: "Browse Scenarios",
    href: "/scenarios",
    gradient: "from-blue-50 to-indigo-50",
    border: "border-blue-100",
    locked: false,
  },
  {
    icon: FileText,
    title: "BA Artifact Templates",
    description: "Download professional BRDs, use case templates, process maps, and more",
    badge: "Free",
    badgeColor: "bg-green-100 text-green-700",
    cta: "Get Templates",
    href: "/templates",
    gradient: "from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    locked: false,
  },
  {
    icon: Users,
    title: "Industry Case Studies",
    description: "Deep-dive into Banking, Energy, Healthcare, and Tech BA projects",
    badge: "Pro",
    badgeColor: "bg-purple-100 text-purple-700",
    cta: "View Case Studies",
    href: "/case-studies",
    gradient: "from-purple-50 to-pink-50",
    border: "border-purple-100",
    locked: true,
  },
];

export default function DashboardClient({ user, profile, completedCount }: DashboardClientProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgradeSuccess = searchParams.get("upgrade") === "success";

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const stats = [
    {
      label: "Scenarios Completed",
      value: completedCount,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      change: "+2 this week",
    },
    {
      label: "Current Streak",
      value: "3 days",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
      change: "Keep it going!",
    },
    {
      label: "Overall Progress",
      value: `${Math.round((completedCount / 60) * 100)}%`,
      icon: BarChart3,
      color: "text-green-600",
      bg: "bg-green-50",
      change: `${completedCount}/60 scenarios`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="flex-shrink-0 w-60">
        <div className="fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-100 flex flex-col z-30">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight">TheBAPortal</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  item.active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-4 h-4 ${item.active ? "text-blue-600" : "text-slate-400"}`} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Upgrade Card */}
          {!isPro && (
            <div className="mx-3 mb-3 p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className="w-3.5 h-3.5 text-yellow-300" />
                <span className="text-xs font-semibold text-yellow-300">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-blue-100 mb-3">Unlock all 60+ scenarios and AI coaching</p>
              <button
                onClick={() => router.push("/pricing")}
                className="w-full bg-white text-blue-700 text-xs font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                See Plans →
              </button>
            </div>
          )}

          {/* Sign out */}
          <div className="px-3 pb-4 border-t border-slate-100 pt-3">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-sm font-semibold text-slate-900">Dashboard</h1>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-slate-900 leading-tight">{displayName}</div>
                <div className="text-xs text-slate-400 leading-tight">
                  {isPro ? "Pro Member" : "Free Plan"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
                <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Settings
                </button>
                {!isPro && (
                  <button
                    onClick={() => router.push("/pricing")}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Upgrade to Pro
                  </button>
                )}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">

          {/* SUCCESS BANNER */}
          {upgradeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl px-5 py-3.5 mb-6 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Welcome to Pro! 🎉</p>
                <p className="text-xs text-green-600">You now have access to all 60+ scenarios and AI coaching.</p>
              </div>
            </motion.div>
          )}

          {/* Hero welcome */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 mb-8 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white rounded-full translate-y-20" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-blue-200 text-sm font-medium">Welcome back</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  Hello, {firstName}! 👋
                </h2>
                <p className="text-blue-200 text-sm">
                  {completedCount === 0
                    ? "Start your first BA challenge today and build real-world skills."
                    : `You've completed ${completedCount} scenario${completedCount !== 1 ? "s" : ""}. Keep the momentum going!`}
                </p>
              </div>
              {!isPro && (
                <div className="hidden md:block">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Upgrade to Pro
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {isPro && (
                <Badge className="bg-yellow-400 text-yellow-900 font-semibold px-3 py-1">
                  <Crown className="w-3 h-3 mr-1" /> Pro Member
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
                  </div>
                  <div className={`${stat.bg} w-10 h-10 rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-4">Get Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className={`relative bg-gradient-to-br ${card.gradient} rounded-xl border ${card.border} p-5 hover:shadow-md transition-all group`}
                >
                  {card.locked && (
                    <div className="absolute top-4 right-4">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                    <card.icon className="w-4 h-4 text-slate-700" />
                  </div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1.5">{card.title}</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{card.description}</p>
                  <button
                    onClick={() => router.push(card.locked && !isPro ? "/pricing" : card.href)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors"
                  >
                    {card.locked && !isPro ? "Unlock with Pro" : card.cta}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Plan card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-6 bg-white rounded-xl border border-slate-100 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Your Plan</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={isPro ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}
                  >
                    {isPro ? "Pro" : "Free"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {isPro ? "Access to all 60+ scenarios" : "Access to 20 free scenarios"}
                  </span>
                </div>
              </div>
              {!isPro && (
                <button
                  onClick={() => router.push("/pricing")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Upgrade Now
                </button>
              )}
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}