import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ background: "#16140f", color: "#f0ead9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px", fontFamily: "'Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <Link href="/" style={{ textDecoration: "none", fontFamily: "'Inter',sans-serif", fontSize: 17, fontWeight: 700, color: "#f0ead9", letterSpacing: "-0.02em", marginBottom: 40 }}>
        The<span style={{ color: "#8d97d9", fontWeight: 800 }}>BA</span>Portal
      </Link>

      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#8d97d9", letterSpacing: "0.1em", marginBottom: 14 }}>404</div>
      <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f0ead9", margin: "0 0 12px", textAlign: "center" }}>
        We can&apos;t find that page
      </h1>
      <p style={{ fontSize: 15, color: "#c4bca6", lineHeight: 1.6, textAlign: "center", maxWidth: 420, margin: "0 0 32px" }}>
        The link may be out of date, or the project it points to may no longer exist or belong to your account.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "#f5f1e7", background: "#34407d", padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>
          Back to Projects
        </Link>
        <Link href="/" style={{ fontSize: 13.5, color: "#c4bca6", textDecoration: "none" }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
