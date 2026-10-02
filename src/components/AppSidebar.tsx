"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/initials";
import {
  Settings, LogOut, User, ChevronLeft, ChevronRight, Menu, X, ArrowUpRight,
  FileText, Folders,
} from "lucide-react";

// Decision Lab and BA Intelligence are project-scoped now (reached via a
// project's own Decisions/Intelligence tabs), not global destinations —
// see ProjectWorkspaceClient's project nav.
const WORK_ITEMS = [
  { icon: Folders,    label: "Projects",        href: "/projects" },
  { icon: FileText,   label: "Template Studio", href: "/templates" },
];

interface AppSidebarProps {
  activeHref: string;
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

export default function AppSidebar({ activeHref, profile, user }: AppSidebarProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) setCollapsed(saved === "true");
    else if (window.innerWidth < 1024) setCollapsed(true);
    setIsMobile(window.innerWidth < 768);
  }, []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";
  const fullName = profile?.full_name || null;
  const initials = getInitials(fullName, user.email);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

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
      router.push("/auth/login");
    } catch {
      setSigningOut(false);
    }
  }

  const desktopWidth = collapsed ? 64 : 240;

  // ─── Nav item renderer ────────────────────────────────────────────────────
  function NavItem({
    icon: Icon, label, href, isCollapsed,
  }: { icon: React.ElementType; label: string; href: string; isCollapsed: boolean }) {
    const active = activeHref === href;

    return (
      <button
        onClick={() => { router.push(href); if (isMobile) setMobileOpen(false); }}
        title={isCollapsed ? label : undefined}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: isCollapsed ? 0 : 10,
          padding: isCollapsed ? "11px 0" : "9px 12px",
          borderRadius: 10,
          marginBottom: 2,
          background: active ? "var(--teal-on-dark-soft)" : "transparent",
          border: active ? "1px solid var(--teal-on-dark-border)" : "1px solid transparent",
          color: active ? "var(--teal-on-dark)" : "var(--text-2)",
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          fontFamily: "'Inter','Open Sans',sans-serif",
          cursor: "pointer",
          transition: "background 0.12s, color 0.12s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textAlign: "left",
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
        <Icon size={16} style={{ flexShrink: 0 }} />
        {!isCollapsed && <span style={{ flex: 1 }}>{label}</span>}
      </button>
    );
  }

  // ─── Section label renderer ───────────────────────────────────────────────
  function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
    if (isCollapsed) return <div style={{ height: 8 }} />;
    return (
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-3)",
        padding: "0 12px 6px",
        fontFamily: "'Inter','Open Sans',sans-serif",
      }}>
        {label}
      </div>
    );
  }

  // ─── Sidebar content ──────────────────────────────────────────────────────
  const SidebarBody = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header — collapsed (64px) has no room for the mark and the toggle side
          by side, so they stack instead of overlapping. */}
      <div style={{
        height: 60,
        display: "flex",
        flexDirection: isCollapsed ? "column" : "row",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "flex-start",
        padding: isCollapsed ? 0 : "0 12px 0 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        gap: isCollapsed ? 3 : 10,
      }}>
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", cursor: "pointer", flex: isCollapsed ? "none" : 1, minWidth: 0, lineHeight: 1 }}
        >
          {isCollapsed ? (
            <span style={{
              fontFamily: "'Inter','Open Sans',sans-serif",
              fontWeight: 800, fontSize: 15, color: "var(--teal-on-dark)", letterSpacing: "-0.02em",
            }}>
              BA
            </span>
          ) : (
            <span style={{
              fontFamily: "'Inter','Open Sans',sans-serif",
              fontWeight: 800, fontSize: 15,
              color: "var(--text-1)", letterSpacing: "-0.03em",
              whiteSpace: "nowrap", overflow: "hidden",
            }}>
              The<span style={{ color: "var(--teal-on-dark)" }}>BA</span>Portal
            </span>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={toggleDesktop}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              flexShrink: 0, width: isCollapsed ? 22 : 24, height: isCollapsed ? 20 : 24, borderRadius: 6,
              background: "transparent", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-3)", transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 8px 8px", overflowY: "auto", overflowX: "hidden" }}>

        {/* Work — the whole active product */}
        <SectionLabel label="Work" isCollapsed={isCollapsed} />
        {WORK_ITEMS.map(item => (
          <NavItem key={item.href} {...item} isCollapsed={isCollapsed} />
        ))}

        {/* Bottom divider + Settings */}
        <div style={{ height: 1, background: "var(--border)", margin: "20px 4px 10px" }} />
        <button
          onClick={() => { router.push("/settings"); if (isMobile) setMobileOpen(false); }}
          title={isCollapsed ? "Settings" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? "11px 0" : "9px 12px",
            borderRadius: 10,
            background: activeHref === "/settings" ? "var(--teal-on-dark-soft)" : "transparent",
            border: activeHref === "/settings" ? "1px solid var(--teal-on-dark-border)" : "1px solid transparent",
            color: activeHref === "/settings" ? "var(--teal-on-dark)" : "var(--text-2)",
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter','Open Sans',sans-serif",
            cursor: "pointer",
            transition: "background 0.12s, color 0.12s",
            whiteSpace: "nowrap", overflow: "hidden", textAlign: "left",
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
        {/* Folio light popover — same surface/border/shadow tokens as the
            rest of the authenticated app's overlays, not a separate dark card. */}
        {/* Collapsed (64px) rail: the aside clips overflow, so the menu opens
            beside the rail (fixed) instead of being cut to the rail's width. */}
        {menuOpen && (
          <div style={{
            ...(isCollapsed
              ? { position: "fixed" as const, left: desktopWidth + 8, bottom: 12, width: 232 }
              : { position: "absolute" as const, bottom: "calc(100% + 6px)", left: 8, right: 8 }),
            background: "var(--lc-surface)",
            border: "1px solid var(--lc-border)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "var(--lc-shadow-lg)",
            zIndex: 50,
            minWidth: 160,
          }}>
            {/* Identity */}
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--lc-border-soft)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lc-text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                {fullName || "Business Analyst"}
              </div>
              <div style={{ fontSize: 11, color: "var(--lc-text-4)", marginTop: 2, wordBreak: "break-all" }}>
                {user.email}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 8, padding: "3px 8px", borderRadius: 6,
                background: isPro ? "var(--lc-teal-bg)" : "var(--lc-bg)",
                border: isPro ? "1px solid var(--lc-teal-border)" : "1px solid var(--lc-border)",
                fontSize: 11, fontWeight: 600,
                color: isPro ? "var(--lc-teal)" : "var(--lc-text-3)",
              }}>
                {isPro ? "Pro Member" : "Free Plan"}
              </div>
            </div>

            {/* Account actions */}
            <div style={{ padding: 6 }}>
              {[
                { icon: <User size={14} />, label: "Profile", href: "/settings" },
                { icon: <Settings size={14} />, label: "Settings", href: "/settings" },
              ].map(it => (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); router.push(it.href); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--lc-text-2)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter','Open Sans',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--lc-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {it.icon}{it.label}
                </button>
              ))}
              {!isPro && (
                <button
                  onClick={() => { setMenuOpen(false); router.push("/pricing"); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--lc-teal)", fontSize: 13, fontWeight: 600, fontFamily: "'Inter','Open Sans',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--lc-teal-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <ArrowUpRight size={14} /> Upgrade to Pro
                </button>
              )}
            </div>

            {/* Sign out — quiet by default; only takes the Folio red on hover. */}
            <div style={{ padding: 6, borderTop: "1px solid var(--lc-border-soft)" }}>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                disabled={signingOut}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: signingOut ? "not-allowed" : "pointer", color: "var(--lc-text-3)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter','Open Sans',sans-serif", opacity: signingOut ? 0.5 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--lc-red-bg)"; e.currentTarget.style.color = "var(--lc-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--lc-text-3)"; }}
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
            background: "var(--teal-on-dark-soft)", border: "1px solid var(--teal-on-dark-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "var(--teal-on-dark)",
            fontFamily: "'Inter','Open Sans',sans-serif",
          }}>
            {initials}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fullName || "Business Analyst"}
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
    <div style={{
      width: isMobile ? 0 : desktopWidth,
      flexShrink: 0,
      transition: "width 250ms ease",
      position: "relative",
    }}>

      {/* Desktop sidebar */}
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

      {/* Mobile */}
      {isMobile && (
        <>
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 300,
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12, padding: "0 12px",
          }}>
            <button
              onClick={() => setMobileOpen(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: "none", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-2)",
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
              The<span style={{ color: "var(--teal-on-dark)" }}>BA</span>Portal
            </span>
          </div>

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
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 1,
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
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
