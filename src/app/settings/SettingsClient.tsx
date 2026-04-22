"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { siteUrl } from "@/lib/siteUrl";

interface Props {
  userId: string;
  email: string;
  fullName: string;
  isPro: boolean;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  hasPortal: boolean;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconUser() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
}
function IconShield() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L3 6v6c0 5.25 3.75 10.14 9 11.25C18.25 22.14 22 17.25 22 12V6L12 2z"/></svg>;
}
function IconBell() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
}
function IconCreditCard() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IconCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconArrowLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
}
function IconLogOut() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
}

type Tab = "profile" | "security" | "notifications" | "billing";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",       label: "Profile",       icon: <IconUser /> },
  { id: "security",      label: "Security",      icon: <IconShield /> },
  { id: "notifications", label: "Notifications", icon: <IconBell /> },
  { id: "billing",       label: "Billing",       icon: <IconCreditCard /> },
];

export default function SettingsClient({ userId, email, fullName, isPro, subscriptionStatus, periodEnd, hasPortal }: Props) {
  const router = useRouter();
  const [tab, setTab]                 = useState<Tab>("profile");
  const [name, setName]               = useState(fullName);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [signingOut, setSigningOut]   = useState(false);

  const initials = (name || email).slice(0, 2).toUpperCase();

  async function handleSaveProfile() {
    setSaving(true);
    setSaveError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", userId);
      if (error) {
        console.error("[Settings] profile update failed:", error.message, error.code);
        setSaveError(error.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch (e) {
      setSaveError("Unexpected error — please try again.");
      console.error("[Settings] handleSaveProfile threw:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", fontFamily: "var(--font-body)", WebkitFontSmoothing: "antialiased" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 58, borderBottom: "1px solid var(--border)", background: "var(--bg-1)", display: "flex", alignItems: "center", padding: "0 28px", gap: 16 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "var(--t3)", textDecoration: "none" }}>
          <IconArrowLeft /> Dashboard
        </Link>
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", fontFamily: "var(--font-display)" }}>Settings</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 28px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>

        {/* ── Sidebar ── */}
        <div>
          {/* Avatar card */}
          <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "24px 20px", marginBottom: 12, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,191,159,.12)", border: "2px solid rgba(31,191,159,.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--teal)" }}>
              {initials}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: "var(--font-display)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "BA Learner"}</div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: isPro ? "rgba(31,191,159,.1)" : "rgba(255,255,255,.05)", border: isPro ? "1px solid rgba(31,191,159,.2)" : "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: isPro ? "var(--teal)" : "var(--t3)", fontFamily: "var(--font-mono)" }}>
              {isPro ? "⚡ Pro Member" : "Free Plan"}
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: tab === n.id ? "rgba(31,191,159,.08)" : "transparent", color: tab === n.id ? "var(--teal)" : "var(--t2)", fontSize: 13.5, fontWeight: tab === n.id ? 600 : 500, fontFamily: "var(--font-body)", textAlign: "left", transition: "all .15s" }}
                onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ opacity: tab === n.id ? 1 : 0.6 }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </div>

          {/* Sign out */}
          <button onClick={handleSignOut} disabled={signingOut} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: "transparent", color: "#f87171", fontSize: 13.5, fontWeight: 500, fontFamily: "var(--font-body)", marginTop: 12, width: "100%", opacity: signingOut ? 0.5 : 1, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <IconLogOut /> {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>

        {/* ── Main panel ── */}
        <div>

          {/* PROFILE */}
          {tab === "profile" && (
            <Section title="Profile" subtitle="Update your display name and personal details.">
              <Field label="Display Name">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(31,191,159,.08)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }} />
              </Field>
              <Field label="Email Address">
                <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--t3)" }}>Email cannot be changed. Contact support if needed.</div>
              </Field>
              <Field label="Initials Preview">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(31,191,159,.12)", border: "1px solid rgba(31,191,159,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--teal)" }}>{initials}</div>
                  <span style={{ fontSize: 13, color: "var(--t3)" }}>Shown in challenges and scorecards</span>
                </div>
              </Field>
              <div style={{ paddingTop: 8 }}>
                <button onClick={handleSaveProfile} disabled={saving || saved} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: "var(--radius-sm)", border: "none", cursor: saving ? "wait" : "pointer", background: saved ? "rgba(31,191,159,.15)" : "var(--teal)", color: saved ? "var(--teal)" : "#041a13", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", transition: "all .2s" }}>
                  {saved ? <><IconCheck /> Saved</> : saving ? "Saving…" : "Save Changes"}
                </button>
                {saveError && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#f87171", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.15)" }}>
                    {saveError}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* SECURITY */}
          {tab === "security" && (
            <Section title="Security" subtitle="Manage your password and login security.">
              <div style={{ background: "rgba(31,191,159,.04)", border: "1px solid rgba(31,191,159,.12)", borderRadius: "var(--radius-sm)", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
                <div style={{ color: "var(--teal)", marginTop: 1 }}><IconShield /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)", marginBottom: 3 }}>Password reset via email</div>
                  <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55 }}>We&apos;ll send a secure reset link to <strong style={{ color: "var(--t1)" }}>{email}</strong>. Check your inbox after clicking below.</div>
                </div>
              </div>
              <PasswordResetButton email={email} />

              <Divider />

              <Field label="Active Sessions">
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)", marginBottom: 2 }}>Current session</div>
                    <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--font-mono)" }}>Active now · This device</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                </div>
              </Field>
            </Section>
          )}

          {/* NOTIFICATIONS */}
          {tab === "notifications" && (
            <Section title="Notifications" subtitle="Control how and when TheBAPortal contacts you.">
              {[
                { label: "Challenge completions",    sub: "Email when you finish and receive your score",  key: "challenge" },
                { label: "New challenges released",   sub: "Be first to know when new scenarios go live",   key: "releases" },
                { label: "Platform updates",          sub: "Feature releases, improvements, and news",      key: "updates" },
                { label: "Tips from Alex Rivera",     sub: "Periodic coaching tips and BA insights",        key: "tips" },
              ].map(item => <ToggleRow key={item.key} label={item.label} sub={item.sub} defaultOn={item.key !== "updates"} />)}
            </Section>
          )}

          {/* BILLING */}
          {tab === "billing" && (
            <Section title="Billing" subtitle="Manage your plan and payment details.">
              <BillingPanel
                isPro={isPro}
                subscriptionStatus={subscriptionStatus}
                periodEnd={periodEnd}
                hasPortal={hasPortal}
              />
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 5 }}>{title}</h1>
        <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />;
}

function ToggleRow({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)" }}>{sub}</div>
      </div>
      <button onClick={() => setOn(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: on ? "var(--teal)" : "var(--bg-3)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
        <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: on ? "#041a13" : "var(--t3)", transition: "left .2s" }} />
      </button>
    </div>
  );
}

function PasswordResetButton({ email }: { email: string }) {
  const [state, setState]   = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleReset() {
    setState("loading");
    setErrMsg("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl()}/auth/callback?type=recovery`,
      });
      if (error) {
        console.error("[Settings] resetPasswordForEmail failed:", error.message);
        setErrMsg(error.message);
        setState("error");
        return;
      }
      setState("sent");
    } catch (e) {
      setErrMsg("Unexpected error — please try again.");
      console.error("[Settings] handleReset threw:", e);
      setState("error");
    }
  }

  return (
    <div>
      <button onClick={handleReset} disabled={state === "loading" || state === "sent"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", cursor: (state === "loading" || state === "sent") ? "not-allowed" : "pointer", background: state === "sent" ? "rgba(31,191,159,.08)" : "var(--bg-2)", color: state === "sent" ? "var(--teal)" : "var(--t1)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-display)", transition: "all .2s", opacity: state === "loading" ? 0.6 : 1 }}>
        {state === "sent" ? <><IconCheck /> Reset email sent — check your inbox</> : state === "loading" ? "Sending…" : "Send Password Reset Email"}
      </button>
      {state === "error" && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#f87171", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.15)" }}>
          {errMsg}
        </div>
      )}
    </div>
  );
}

function BillingPanel({ isPro, subscriptionStatus, periodEnd, hasPortal }: {
  isPro: boolean;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  hasPortal: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const formattedDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const isCancelled = subscriptionStatus === "canceled" || subscriptionStatus === "cancelled";
  const isPastDue   = subscriptionStatus === "past_due";

  async function handleUpgrade() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ billing: "annual" }) });
      const data = await res.json();
      if (!res.ok || !data.url) { setError(data.message ?? "Checkout failed — please try again."); return; }
      window.location.href = data.url;
    } catch { setError("Unexpected error — please try again."); }
    finally { setLoading(false); }
  }

  async function handlePortal() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) { setError("Could not open billing portal — please try again."); return; }
      window.location.href = data.url;
    } catch { setError("Unexpected error — please try again."); }
    finally { setLoading(false); }
  }

  if (!isPro) {
    return (
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>Free Plan</div>
        <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>3 challenges included. Upgrade for full access.</div>
        <button onClick={handleUpgrade} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: "var(--radius-sm)", background: "var(--teal)", color: "#041a13", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Redirecting…" : "⚡ Upgrade to Pro"}
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--t3)" }}>$19/mo billed annually · Cancel anytime</div>
        {error && <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "rgba(31,191,159,.04)", border: "1px solid rgba(31,191,159,.18)", borderRadius: "var(--radius)", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>Pro Plan</div>
            {isCancelled && formattedDate && (
              <div style={{ fontSize: 13, color: "#fb923c" }}>Access until {formattedDate}</div>
            )}
            {!isCancelled && formattedDate && (
              <div style={{ fontSize: 13, color: "var(--t2)" }}>Next billing on {formattedDate}</div>
            )}
            {isPastDue && (
              <div style={{ fontSize: 13, color: "#f87171" }}>Payment failed — update your card to keep access</div>
            )}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: isCancelled ? "rgba(251,146,60,.1)" : isPastDue ? "rgba(248,113,113,.1)" : "rgba(31,191,159,.12)",
            color: isCancelled ? "#fb923c" : isPastDue ? "#f87171" : "var(--teal)",
            border: isCancelled ? "1px solid rgba(251,146,60,.25)" : isPastDue ? "1px solid rgba(248,113,113,.25)" : "1px solid rgba(31,191,159,.2)",
          }}>
            {isCancelled ? "Cancelling" : isPastDue ? "Past due" : "Active"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {["All challenges + every new release", "Hard & Expert difficulty modes", "Full scoring history & analytics", "Priority support"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--t2)" }}>
              <span style={{ color: "var(--teal)" }}><IconCheck /></span>{f}
            </div>
          ))}
        </div>

        {hasPortal && (
          <button onClick={handlePortal} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(31,191,159,.3)", background: "transparent", color: "var(--teal)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-display)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, transition: "all .15s" }}>
            {loading ? "Opening…" : "Manage subscription"}
          </button>
        )}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: "#f87171" }}>{error}</div>}
      </div>

      <div style={{ fontSize: 12, color: "var(--t3)" }}>
        Cancel, update payment, or view invoices via the Stripe billing portal above.
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--t1)",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
};