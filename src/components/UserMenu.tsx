"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings, ChevronUp } from "lucide-react";

interface UserMenuProps {
  fullName: string | null;
  email: string;
  isPro: boolean;
  initials: string;
}

export default function UserMenu({ fullName, email, isPro, initials }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        borderTop: "1px solid var(--border)",
        padding: "8px 8px 8px",
      }}
    >
      {/* Dropdown menu — renders above the trigger */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "8px",
          right: "8px",
          background: "#1a1a22",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          zIndex: 50,
        }}>
          {/* User info header */}
          <div style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              fontSize: "13px", fontWeight: 600,
              color: "var(--text-1)",
              fontFamily: "'Inter','Open Sans',sans-serif",
              marginBottom: "2px",
            }}>
              {fullName || "BA Learner"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", wordBreak: "break-all" }}>
              {email}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              marginTop: "8px", padding: "3px 8px", borderRadius: "6px",
              background: isPro ? "rgba(31,191,159,0.12)" : "rgba(255,255,255,0.05)",
              border: isPro ? "1px solid rgba(31,191,159,0.2)" : "1px solid rgba(255,255,255,0.08)",
              fontSize: "11px", fontWeight: 600,
              color: isPro ? "var(--teal)" : "var(--text-3)",
            }}>
              {isPro ? "⚡ Pro Member" : "Free Plan"}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "6px" }}>
            <MenuButton
              icon={<User size={14} />}
              label="Profile"
              onClick={() => { setOpen(false); router.push("/settings"); }}
            />
            <MenuButton
              icon={<Settings size={14} />}
              label="Settings"
              onClick={() => { setOpen(false); router.push("/settings"); }}
            />
            {!isPro && (
              <MenuButton
                icon={<span style={{ fontSize: "13px" }}>⚡</span>}
                label="Upgrade to Pro"
                teal
                onClick={() => { setOpen(false); router.push("/pricing"); }}
              />
            )}
          </div>

          {/* Sign out — separated */}
          <div style={{ padding: "6px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 12px", borderRadius: "10px",
                background: "none", border: "none", cursor: signingOut ? "not-allowed" : "pointer",
                color: "#f87171", fontSize: "13px", fontWeight: 600,
                fontFamily: "'Inter','Open Sans',sans-serif",
                transition: "background 0.15s",
                opacity: signingOut ? 0.5 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <LogOut size={14} />
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 10px",
          borderRadius: "12px",
          background: open ? "rgba(255,255,255,0.06)" : "none",
          border: open ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.15s",
          textAlign: "left",
        }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.background = "none";
        }}
      >
        {/* Avatar */}
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          flexShrink: 0,
          background: "var(--teal-soft)",
          border: "1px solid var(--teal-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 700, color: "var(--teal)",
          fontFamily: "'Inter','Open Sans',sans-serif",
        }}>
          {initials}
        </div>

        {/* Name + plan */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "var(--text-1)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fullName || "BA Learner"}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "1px" }}>
            {isPro ? "Pro Member" : "Free Plan"}
          </div>
        </div>

        {/* Chevron indicator */}
        <ChevronUp
          size={14}
          style={{
            color: "var(--text-4)",
            flexShrink: 0,
            transform: open ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}

function MenuButton({
  icon, label, onClick, teal = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  teal?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px",
        padding: "9px 12px", borderRadius: "10px",
        background: "none", border: "none", cursor: "pointer",
        color: teal ? "var(--teal)" : "var(--text-2)",
        fontSize: "13px", fontWeight: 500,
        fontFamily: "'Inter','Open Sans',sans-serif",
        transition: "background 0.15s",
        textAlign: "left",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = teal
        ? "rgba(31,191,159,0.08)"
        : "rgba(255,255,255,0.05)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      {icon}
      {label}
    </button>
  );
}