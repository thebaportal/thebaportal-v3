import Link from "next/link";

export const metadata = { title: "Privacy Policy — TheBAPortal" };

const SECTIONS = [
  {
    title: "Information we collect",
    body: `When you create an account, we collect your name and email address. When you use the platform, we collect your challenge submissions, scores, and activity data so we can show you your progress. When you subscribe to Pro, payment is processed by Stripe — we do not store your card details.`,
  },
  {
    title: "How we use your information",
    body: `We use your data to provide the platform: personalising your experience, generating your scores and feedback, tracking your progress, and sending you transactional emails (account confirmation, receipts). We do not use your data to train third-party AI models without your consent. We do not sell your data.`,
  },
  {
    title: "Data storage and security",
    body: `Your data is stored in Supabase (hosted on AWS infrastructure in the United States). We use industry-standard encryption in transit (TLS) and at rest. Access to production data is restricted to authorised team members only.`,
  },
  {
    title: "Cookies",
    body: `We use strictly necessary cookies to keep you signed in (session cookies via Supabase Auth). We do not use advertising cookies or third-party tracking pixels. You can clear cookies at any time via your browser settings, which will sign you out.`,
  },
  {
    title: "Third-party services",
    body: `We use Supabase for database and authentication, Stripe for payment processing, and Anthropic's Claude API to power AI stakeholder interviews and evaluation. Each provider has their own privacy policy. We do not share your personally identifiable information with any other third parties.`,
  },
  {
    title: "Your rights",
    body: `You can request a copy of your data, ask us to correct inaccurate information, or request deletion of your account and associated data at any time. To exercise any of these rights, email us at the address below. We will respond within 30 days.`,
  },
  {
    title: "Data retention",
    body: `We retain your account data for as long as your account is active. If you delete your account, we will remove your personal information within 30 days, except where we are required to retain it for legal or financial compliance purposes (for example, transaction records).`,
  },
  {
    title: "Children",
    body: `TheBAPortal is not directed at children under 16. We do not knowingly collect personal information from anyone under 16. If you believe a child has provided us with personal information, please contact us and we will delete it.`,
  },
  {
    title: "Changes to this policy",
    body: `We may update this policy from time to time. We will notify you of material changes via email or a notice on the platform at least 14 days before the change takes effect.`,
  },
  {
    title: "Contact",
    body: `For any privacy-related questions or requests, email us at privacy@thebaportal.com. We aim to respond within 2 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: "#07070a", color: "#f2f2f8", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 28px", background: "rgba(7,7,10,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 800, color: "#f2f2f8", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#1fbf9f" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </Link>
          <Link href="/" style={{ fontSize: 13, color: "#505068", textDecoration: "none", fontFamily: "'Open Sans',sans-serif" }}>← Back to home</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "110px 28px 80px" }}>

        <div style={{ marginBottom: "52px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#1fbf9f", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>Legal</div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f2f2f8", marginBottom: "14px", lineHeight: 1.05 }}>Privacy Policy</h1>
          <p style={{ fontSize: "14px", color: "#505068", fontFamily: "monospace" }}>Last updated: March 2026</p>
          <p style={{ fontSize: "15px", color: "#9090a8", lineHeight: 1.7, marginTop: "16px", padding: "16px 20px", borderRadius: "10px", background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.12)" }}>
            <strong style={{ color: "#fb923c" }}>Note:</strong> This policy is a working draft and should be reviewed by a qualified lawyer before you rely on it as a legal document.
          </p>
        </div>

        <p style={{ fontSize: "15px", color: "#9090a8", lineHeight: 1.75, marginBottom: "48px" }}>
          TheBAPortal ("we", "us", "our") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and what rights you have in relation to it. By using the platform you agree to the collection and use of information as described here.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {SECTIONS.map((s, i) => (
            <div key={s.title}>
              <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "17px", fontWeight: 700, color: "#f2f2f8", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#1fbf9f", fontWeight: 600, minWidth: "24px" }}>{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <p style={{ fontSize: "14px", color: "#9090a8", lineHeight: 1.78 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["FAQ", "/faq"], ["Terms", "/terms"], ["Pricing", "/pricing"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#2a2a38", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
