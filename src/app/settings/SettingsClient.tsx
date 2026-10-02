"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { siteUrl } from "@/lib/siteUrl";
import { getInitials } from "@/lib/initials";
import AppSidebar from "@/components/AppSidebar";

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

  const initials = getInitials(name, email);
  const sidebarProfile = { full_name: fullName || null, subscription_tier: isPro ? "pro" : null };
  const sidebarUser = { email };

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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/settings" profile={sidebarProfile} user={sidebarUser} />

      <main className="app-shell-main" style={{ flex: 1, overflowY: "auto" }}>
        <div className="settings-grid" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px 80px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>

          {/* ── In-page settings nav ── */}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", marginBottom: 20 }}>
              Settings
            </h1>

            {/* Avatar card */}
            <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: "20px 18px", marginBottom: 12, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: "var(--teal)" }}>
                {initials}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--lc-text-1)", fontFamily: "var(--font-display)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Business Analyst"}</div>
              <div style={{ fontSize: 10.5, color: "var(--lc-text-3)", marginBottom: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: isPro ? "var(--lc-teal-bg)" : "var(--lc-faint)", border: isPro ? "1px solid var(--lc-teal-border)" : "1px solid var(--lc-border)", fontSize: 10.5, fontWeight: 600, color: isPro ? "var(--teal)" : "var(--lc-text-3)", fontFamily: "var(--font-mono)" }}>
                {isPro ? "⚡ Pro Member" : "Free Plan"}
              </div>
            </div>

            {/* Nav */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: tab === n.id ? "var(--lc-teal-bg)" : "transparent", color: tab === n.id ? "var(--teal)" : "var(--lc-text-3)", fontSize: 13, fontWeight: tab === n.id ? 600 : 500, fontFamily: "var(--font-body)", textAlign: "left", transition: "all .15s" }}
                  onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.background = "var(--lc-faint)"; }}
                  onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ opacity: tab === n.id ? 1 : 0.7 }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </div>

            {/* Sign out */}
            <button onClick={handleSignOut} disabled={signingOut} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: "transparent", color: "var(--lc-red)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)", marginTop: 10, width: "100%", opacity: signingOut ? 0.5 : 1, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--lc-red-bg)"; }}
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
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--teal-glow)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--lc-border)"; e.currentTarget.style.boxShadow = "none"; }} />
                </Field>
                <Field label="Email Address">
                  <input value={email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--lc-text-4)" }}>Email cannot be changed. Contact support if needed.</div>
                </Field>
                <Field label="Initials Preview">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--teal)" }}>{initials}</div>
                    <span style={{ fontSize: 13, color: "var(--lc-text-3)" }}>Shown in the sidebar and account menu</span>
                  </div>
                </Field>
                <div style={{ paddingTop: 8 }}>
                  <button onClick={handleSaveProfile} disabled={saving || saved} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: "var(--radius-sm)", border: "none", cursor: saving ? "wait" : "pointer", background: saved ? "var(--lc-teal-bg)" : "var(--teal)", color: saved ? "var(--teal)" : "#f5f1e7", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", transition: "all .2s" }}>
                    {saved ? <><IconCheck /> Saved</> : saving ? "Saving…" : "Save Changes"}
                  </button>
                  {saveError && (
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--lc-red)", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)" }}>
                      {saveError}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* SECURITY */}
            {tab === "security" && (
              <Section title="Security" subtitle="Manage your password and login security.">
                <div style={{ background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", borderRadius: "var(--radius-sm)", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
                  <div style={{ color: "var(--teal)", marginTop: 1 }}><IconShield /></div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--lc-text-1)", marginBottom: 3 }}>Password reset via email</div>
                    <div style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.55 }}>We&apos;ll send a secure reset link to <strong style={{ color: "var(--lc-text-1)" }}>{email}</strong>. Check your inbox after clicking below.</div>
                  </div>
                </div>
                <PasswordResetButton email={email} />

                <Divider />

                <Field label="Active Sessions">
                  <div style={{ background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--lc-text-1)", marginBottom: 2 }}>Current session</div>
                      <div style={{ fontSize: 12, color: "var(--lc-text-3)", fontFamily: "var(--font-mono)" }}>Active now · This device</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lc-green)" }} />
                  </div>
                </Field>
              </Section>
            )}

            {/* NOTIFICATIONS */}
            {tab === "notifications" && (
              <Section title="Notifications" subtitle="Control how and when TheBAPortal contacts you.">
                {[
                  { label: "Project activity",   sub: "Email when there's new activity in your projects",     key: "activity" },
                  { label: "New features",        sub: "Be first to know when new tools or workstreams go live", key: "releases" },
                  { label: "Platform updates",    sub: "Feature releases, improvements, and news",              key: "updates" },
                  { label: "Product tips",        sub: "Periodic tips for getting more out of TheBAPortal",     key: "tips" },
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
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", marginBottom: 5 }}>{title}</h2>
        <p style={{ fontSize: 13.5, color: "var(--lc-text-3)", lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--lc-text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--lc-border)", margin: "6px 0" }} />;
}

function ToggleRow({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--lc-border-soft)" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--lc-text-1)", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--lc-text-3)" }}>{sub}</div>
      </div>
      <button onClick={() => setOn(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: on ? "var(--teal)" : "var(--lc-border)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
        <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: on ? "#f5f1e7" : "#ffffff", transition: "left .2s" }} />
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
      // Must match forgot-password's redirectTo exactly — both recovery entry
      // points need to land on the same-form after verification. The old
      // `?type=recovery` here was never actually read by anything: /auth/callback
      // reads `type` from the verification request itself (which the email
      // template constructs), not from this redirectTo string.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
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
      <button onClick={handleReset} disabled={state === "loading" || state === "sent"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: "var(--radius-sm)", border: "1px solid var(--lc-border)", cursor: (state === "loading" || state === "sent") ? "not-allowed" : "pointer", background: state === "sent" ? "var(--lc-teal-bg)" : "var(--lc-faint)", color: state === "sent" ? "var(--teal)" : "var(--lc-text-1)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-display)", transition: "all .2s", opacity: state === "loading" ? 0.6 : 1 }}>
        {state === "sent" ? <><IconCheck /> Reset email sent — check your inbox</> : state === "loading" ? "Sending…" : "Send Password Reset Email"}
      </button>
      {state === "error" && (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--lc-red)", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)" }}>
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
      <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--lc-text-1)", marginBottom: 4 }}>Free Plan</div>
        <div style={{ fontSize: 13, color: "var(--lc-text-2)", marginBottom: 18 }}>5 Decision Lab analyses per month. Upgrade for unlimited access.</div>
        <button onClick={handleUpgrade} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: "var(--radius-sm)", background: "var(--teal)", color: "#f5f1e7", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Redirecting…" : "Upgrade to Pro"}
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--lc-text-3)" }}>$19/mo billed annually · Cancel anytime</div>
        {error && <div style={{ marginTop: 10, fontSize: 13, color: "var(--lc-red)" }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", borderRadius: "var(--radius)", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--lc-text-1)", marginBottom: 4 }}>Pro Plan</div>
            {isCancelled && formattedDate && (
              <div style={{ fontSize: 13, color: "var(--lc-amber)" }}>Access until {formattedDate}</div>
            )}
            {!isCancelled && formattedDate && (
              <div style={{ fontSize: 13, color: "var(--lc-text-2)" }}>Next billing on {formattedDate}</div>
            )}
            {isPastDue && (
              <div style={{ fontSize: 13, color: "var(--lc-red)" }}>Payment failed — update your card to keep access</div>
            )}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: isCancelled ? "var(--lc-amber-bg)" : isPastDue ? "var(--lc-red-bg)" : "var(--lc-teal-bg)",
            color: isCancelled ? "var(--lc-amber)" : isPastDue ? "var(--lc-red)" : "var(--teal)",
            border: isCancelled ? "1px solid rgba(181,116,31,.3)" : isPastDue ? "1px solid var(--lc-red-border)" : "1px solid var(--lc-teal-border)",
          }}>
            {isCancelled ? "Cancelling" : isPastDue ? "Past due" : "Active"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {["Unlimited Decision Lab analyses — all 5 modes", "Testing and Requirements Traceability Matrix", "Priority document generation", "Priority support"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--lc-text-2)" }}>
              <span style={{ color: "var(--teal)" }}><IconCheck /></span>{f}
            </div>
          ))}
        </div>

        {hasPortal && (
          <button onClick={handlePortal} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: "var(--radius-sm)", border: "1px solid var(--lc-teal-border)", background: "transparent", color: "var(--teal)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-display)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, transition: "all .15s" }}>
            {loading ? "Opening…" : "Manage subscription"}
          </button>
        )}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: "var(--lc-red)" }}>{error}</div>}
      </div>

      <div style={{ fontSize: 12, color: "var(--lc-text-3)" }}>
        Cancel, update payment, or view invoices via the Stripe billing portal above.
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "var(--lc-faint)",
  border: "1px solid var(--lc-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--lc-text-1)",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s, box-shadow .15s",
};
