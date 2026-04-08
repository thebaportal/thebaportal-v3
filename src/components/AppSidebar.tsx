"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, LayoutDashboard, TrendingUp, GraduationCap,
  Target, BriefcaseBusiness, Trophy, Settings, LogOut,
  User, ChevronLeft, ChevronRight, Menu, X, Mic, Globe2, FolderOpen, MessageSquare,
} from "lucide-react";

const CORE_ITEMS = [
  { icon: LayoutDashboard,    label: "Dashboard",      href: "/dashboard" },
  { icon: BookOpen,           label: "Simulation Lab", href: "/scenarios" },
  { icon: MessageSquare,      label: "Interview Lab",  href: "/interview" },
  { icon: Globe2,             label: "Jobs",           href: "/opportunities" },
];

const SECONDARY_ITEMS = [
  { icon: Mic,    label: "PitchReady", href: "/pitchready" },
  { icon: Target, label: "Exam Prep",  href: "/exam" },
];

const MORE_ITEMS = [
  { icon: TrendingUp,        label: "Progress",      href: "/progress" },
  { icon: BriefcaseBusiness, label: "Career Suite",  href: "/career" },
  { icon: FolderOpen,        label: "My Workspace",  href: "/workspace" },
  { icon: Trophy,            label: "Portfolio",     href: "/portfolio" },
  { icon: GraduationCap,     label: "Learning",      href: "/learning" },
];

interface AppSidebarProps {
  activeHref: string;
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

export default function AppSidebar({ activeHref, profile, user }: AppSidebarProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024; // default collapsed on tablet
  });
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";
  const fullName = profile?.full_name || null;
  const initials = (fullName?.[0] || user.email[0]).toUpperCase();

  // Responsive detection
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [activeHref]);

  function toggleDesktop() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar_collapsed", String(next)); } catch { /* */ }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      await sb.auth.signOut();
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  }

  const desktopWidth = collapsed ? 64 : 240;

  // ─── Sidebar content ──────────────────────────────────────────────────────
  const SidebarBody = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header: logo + collapse toggle */}
      <div style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: isCollapsed ? "0 16px" : "0 12px 0 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        gap: 10,
      }}>
        {/* Logo — links to home */}
        <div
          onClick={() => router.push("/")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", flex: 1, minWidth: 0,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "var(--teal-soft)",
            border: "1px solid var(--teal-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={15} color="var(--teal)" />
          </div>
          {!isCollapsed && (
            <span style={{
              fontFamily: "'Inter','Open Sans',sans-serif",
              fontWeight: 800, fontSize: 15,
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}>
              The<span style={{ color: "var(--teal)" }}>BA</span>Portal
            </span>
          )}
        </div>

        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={toggleDesktop}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              flexShrink: 0,
              width: 24, height: 24,
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-3)",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>

        {/* Core items */}
        {CORE_ITEMS.map(item => {
          const active = activeHref === item.href ||
            (item.href !== "/dashboard" && activeHref.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); if (isMobile) setMobileOpen(false); }}
              title={isCollapsed ? item.label : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 10,
                padding: isCollapsed ? "11px 0" : "10px 12px",
                borderRadius: 10,
                marginBottom: 2,
                background: active ? "var(--teal-soft)" : "transparent",
                border: active ? "1px solid var(--teal-border)" : "1px solid transparent",
                color: active ? "var(--teal)" : "var(--text-2)",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                fontFamily: "'Inter','Open Sans',sans-serif",
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
                }
              }}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* Secondary items — de-emphasized */}
        <div style={{ height: 1, background: "var(--border)", margin: "8px 8px" }} />
        {SECONDARY_ITEMS.map(item => {
          const active = activeHref.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); if (isMobile) setMobileOpen(false); }}
              title={isCollapsed ? item.label : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 10,
                padding: isCollapsed ? "10px 0" : "9px 12px",
                borderRadius: 10,
                marginBottom: 2,
                background: active ? "var(--teal-soft)" : "transparent",
                border: active ? "1px solid var(--teal-border)" : "1px solid transparent",
                color: active ? "var(--teal)" : "var(--text-3)",
                fontSize: 12.5,
                fontWeight: active ? 600 : 400,
                fontFamily: "'Inter','Open Sans',sans-serif",
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
                whiteSpace: "nowrap",
                overflow: "hidden",
                opacity: active ? 1 : 0.7,
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
                }
              }}
            >
              <item.icon size={15} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "8px 8px" }} />

        {/* Settings */}
        <button
          onClick={() => { router.push("/settings"); if (isMobile) setMobileOpen(false); }}
          title={isCollapsed ? "Settings" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? "11px 0" : "10px 12px",
            borderRadius: 10,
            background: activeHref === "/settings" ? "var(--teal-soft)" : "transparent",
            border: activeHref === "/settings" ? "1px solid var(--teal-border)" : "1px solid transparent",
            color: activeHref === "/settings" ? "var(--teal)" : "var(--text-2)",
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter','Open Sans',sans-serif",
            cursor: "pointer",
            transition: "background 0.12s, color 0.12s",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
          onMouseEnter={e => { if (activeHref !== "/settings") { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; } }}
          onMouseLeave={e => { if (activeHref !== "/settings") { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; } }}
        >
          <Settings size={16} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </nav>

      {/* User menu */}
      <div ref={menuRef} style={{ borderTop: "1px solid var(--border)", padding: 8, position: "relative" }}>
        {/* Dropdown */}
        {menuOpen && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 8, right: 8,
            background: "#1a1a22",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
            zIndex: 50,
            minWidth: 160,
          }}>
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                {fullName || "BA Learner"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, wordBreak: "break-all" }}>
                {user.email}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 8, padding: "3px 8px", borderRadius: 6,
                background: isPro ? "rgba(31,191,159,0.12)" : "rgba(255,255,255,0.05)",
                border: isPro ? "1px solid rgba(31,191,159,0.2)" : "1px solid rgba(255,255,255,0.08)",
                fontSize: 11, fontWeight: 600,
                color: isPro ? "var(--teal)" : "var(--text-3)",
              }}>
                {isPro ? "⚡ Pro Member" : "Free Plan"}
              </div>
            </div>
            {/* More — hidden nav items */}
            <div style={{ padding: "6px 6px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {!isCollapsed && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-4)", textTransform: "uppercase", padding: "4px 12px 6px", fontFamily: "monospace" }}>
                  More
                </div>
              )}
              {MORE_ITEMS.map(it => (
                <button
                  key={it.href}
                  onClick={() => { setMenuOpen(false); router.push(it.href); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 13, fontWeight: 400, fontFamily: "'Inter','Open Sans',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <it.icon size={14} style={{ flexShrink: 0 }} />{it.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 6 }}>
              {[
                { icon: <User size={14} />, label: "Profile", href: "/settings" },
                { icon: <Settings size={14} />, label: "Settings", href: "/settings" },
              ].map(it => (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); router.push(it.href); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-2)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter','Open Sans',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {it.icon}{it.label}
                </button>
              ))}
              {!isPro && (
                <button
                  onClick={() => { setMenuOpen(false); router.push("/pricing"); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter','Open Sans',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(31,191,159,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: 13 }}>⚡</span> Upgrade to Pro
                </button>
              )}
            </div>
            <div style={{ padding: 6, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                disabled={signingOut}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: signingOut ? "not-allowed" : "pointer", color: "#f87171", fontSize: 13, fontWeight: 600, fontFamily: "'Inter','Open Sans',sans-serif", opacity: signingOut ? 0.5 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <LogOut size={14} />
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        )}

        {/* User button */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 10,
            padding: isCollapsed ? "10px 0" : "10px",
            borderRadius: 12,
            background: menuOpen ? "rgba(255,255,255,0.06)" : "none",
            border: menuOpen ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = "none"; }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "var(--teal)",
            fontFamily: "'Inter','Open Sans',sans-serif",
          }}>
            {initials}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fullName || "BA Learner"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                {isPro ? "Pro Member" : "Free Plan"}
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    // Flex placeholder — holds space in the layout on desktop, zero-width on mobile
    <div style={{
      width: isMobile ? 0 : desktopWidth,
      flexShrink: 0,
      transition: "width 250ms ease",
      position: "relative",
    }}>

      {/* ── Desktop sidebar (fixed) ── */}
      {!isMobile && (
        <aside style={{
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          width: desktopWidth,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 250ms ease",
          overflow: "hidden",
          zIndex: 20,
        }}>
          <SidebarBody isCollapsed={collapsed} />
        </aside>
      )}

      {/* ── Mobile ── */}
      {isMobile && (
        <>
          {/* Floating hamburger button */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            style={{
              position: "fixed", top: 12, left: 12, zIndex: 300,
              width: 40, height: 40, borderRadius: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-2)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Backdrop */}
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 250,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            />
          )}

          {/* Mobile sidebar overlay */}
          <aside style={{
            position: "fixed",
            top: 0, left: 0, bottom: 0,
            width: 240,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 260ms ease",
            zIndex: 260,
            overflow: "hidden",
          }}>
            {/* Close button inside mobile sidebar */}
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 1,
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-3)",
              }}
            >
              <X size={14} />
            </button>
            <SidebarBody isCollapsed={false} />
          </aside>
        </>
      )}
    </div>
  );
}
