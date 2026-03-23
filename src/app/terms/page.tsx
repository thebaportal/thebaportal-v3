import Link from "next/link";

export const metadata = { title: "Terms of Service — TheBAPortal" };

const SECTIONS = [
  {
    title: "Acceptance of terms",
    body: `By creating an account or using TheBAPortal, you agree to these Terms of Service. If you do not agree, do not use the platform. We may update these terms from time to time. Continued use after an update constitutes acceptance of the revised terms.`,
  },
  {
    title: "Description of service",
    body: `TheBAPortal provides a practice platform for Business Analysts, including simulated BA scenarios, AI-powered stakeholder interviews, submission scoring, learning modules, career tools, and exam preparation. The platform is provided on an "as is" and "as available" basis.`,
  },
  {
    title: "Account registration",
    body: `You must be at least 16 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to provide accurate and complete information when registering.`,
  },
  {
    title: "Subscriptions and billing",
    body: `Free accounts have access to limited features as described on the Pricing page. Pro subscriptions are billed monthly or annually in advance. Prices are in USD unless otherwise stated. You authorise us to charge your payment method on a recurring basis until you cancel. Refunds are handled on a case-by-case basis — contact us within 7 days of a charge if you believe an error has occurred.`,
  },
  {
    title: "Cancellation",
    body: `You may cancel your Pro subscription at any time from your account Settings. Cancellation takes effect at the end of the current billing period. You will not be charged again after that date, and you will retain access to Pro features until the period ends.`,
  },
  {
    title: "Acceptable use",
    body: `You agree not to use the platform to: attempt to reverse-engineer or extract model prompts or AI system instructions; scrape or systematically download content; create accounts for the purpose of reselling access; submit content that is unlawful, abusive, or infringes third-party rights; or interfere with the security or operation of the platform.`,
  },
  {
    title: "Intellectual property",
    body: `All platform content — challenges, learning modules, evaluation frameworks, scoring logic, and branding — is owned by TheBAPortal or its licensors. Your submissions and deliverables remain yours. We do not claim ownership over work you produce on the platform. You grant us a limited licence to store and process your submissions for the purpose of providing the service (scoring, feedback, progress tracking).`,
  },
  {
    title: "AI-generated content",
    body: `The platform uses AI to simulate stakeholder conversations and generate evaluation feedback. AI output is not professional advice and should not be relied upon as such. Scores and feedback are generated for practice purposes only. We make no guarantees about the accuracy or completeness of AI-generated responses.`,
  },
  {
    title: "Disclaimers and limitation of liability",
    body: `The platform is provided without warranties of any kind, express or implied. We do not guarantee that the platform will be error-free or uninterrupted. To the maximum extent permitted by law, TheBAPortal's liability for any claim arising from use of the platform is limited to the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: "Governing law",
    body: `These terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Ontario.`,
  },
  {
    title: "Contact",
    body: `Questions about these terms? Email us at legal@thebaportal.com.`,
  },
];

export default function TermsPage() {
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
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f2f2f8", marginBottom: "14px", lineHeight: 1.05 }}>Terms of Service</h1>
          <p style={{ fontSize: "14px", color: "#505068", fontFamily: "monospace" }}>Last updated: March 2026</p>
        </div>

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
          {[["Home", "/"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Pricing", "/pricing"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#2a2a38", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
