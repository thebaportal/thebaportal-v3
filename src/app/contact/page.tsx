import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata = { title: "Contact — TheBAPortal" };

export default function ContactPage() {
  return (
    <div style={{ background: "#07070a", color: "#f2f2f8", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 28px", background: "rgba(7,7,10,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 800, color: "#f2f2f8", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#1fbf9f" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </Link>
          <Link href="/" style={{ fontSize: 13, color: "#505068", textDecoration: "none", fontFamily: "'Open Sans',sans-serif" }}>Back to home</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "140px 28px 80px", textAlign: "center" }}>

        <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(31,191,159,0.1)", border: "1px solid rgba(31,191,159,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <Mail size={28} color="#1fbf9f" />
        </div>

        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#1fbf9f", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Get in touch</div>

        <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f2f2f8", marginBottom: 20, lineHeight: 1.1 }}>
          We read every message
        </h1>

        <p style={{ fontSize: 16, color: "#9090a8", lineHeight: 1.7, marginBottom: 40, maxWidth: 420, margin: "0 auto 40px" }}>
          Whether you have a question, a bug report, or just want to say hi, drop us an email. We aim to respond within one business day.
        </p>

        <a
          href="mailto:hello@thebaportal.com"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", borderRadius: 14, background: "#1fbf9f", color: "#041a13", fontSize: 15, fontWeight: 700, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}
        >
          <Mail size={16} />
          hello@thebaportal.com
        </a>

        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Billing or account issues", email: "hello@thebaportal.com" },
            { label: "Privacy requests",          email: "privacy@thebaportal.com" },
            { label: "Legal questions",            email: "legal@thebaportal.com" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 14, color: "#9090a8" }}>{item.label}</span>
              <a href={`mailto:${item.email}`} style={{ fontSize: 13, color: "#1fbf9f", textDecoration: "none", fontFamily: "monospace" }}>{item.email}</a>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#2a2a38", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
