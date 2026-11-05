import Link from "next/link";

// Shared frame for the public, logged-out document pages (Support, Privacy Policy, Terms of Service).
// Same dark public-site styling as FAQ / Contact: fixed top bar, centred reading column, link footer.

export const SUPPORT_EMAIL = "support@thebaportal.com";
export const LEGAL_LAST_UPDATED = "November 5, 2026";

export const PUBLIC_FOOTER_LINKS: [string, string][] = [
  ["Home", "/"],
  ["Pricing", "/pricing"],
  ["FAQ", "/faq"],
  ["Support", "/support"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export function SupportEmail() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

export function PublicDocLayout({ eyebrow, title, lastUpdated, intro, children }: {
  eyebrow: string;
  title: string;
  lastUpdated?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pdoc">
      <nav className="pdoc-nav">
        <div className="pdoc-nav-inner">
          <Link href="/" className="pdoc-brand">
            The<span>BA</span>Portal
          </Link>
          <Link href="/" className="pdoc-back">← Back to home</Link>
        </div>
      </nav>

      <main className="pdoc-main">
        <header className="pdoc-header">
          <div className="pdoc-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          {lastUpdated && <p className="pdoc-updated">Last updated: {lastUpdated}</p>}
        </header>
        {intro && <div className="pdoc-intro">{intro}</div>}
        <div className="pdoc-body">{children}</div>
      </main>

      <footer className="pdoc-footer">
        <div className="pdoc-footer-links">
          {PUBLIC_FOOTER_LINKS.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
        <p>The BA Portal is operated by Consultingly Inc., Alberta, Canada.</p>
      </footer>

      {/* Injected as raw CSS: React escapes quotes in <style> text children, which breaks hydration. */}
      <style dangerouslySetInnerHTML={{ __html: PDOC_CSS }} />
    </div>
  );
}

const PDOC_CSS = `
        .pdoc { background: #07070a; color: #f2f2f8; min-height: 100vh; font-family: 'Open Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .pdoc a { color: #8d97d9; text-decoration: none; }
        .pdoc a:hover { text-decoration: underline; }
        .pdoc-nav { position: fixed; inset: 0 0 auto; z-index: 100; height: 58px; display: flex; align-items: center; padding: 0 16px; background: rgba(7,7,10,0.92); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pdoc-nav-inner { max-width: 860px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pdoc .pdoc-brand { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: #f2f2f8; letter-spacing: -0.02em; }
        .pdoc .pdoc-brand span { color: #8d97d9; font-weight: 800; }
        .pdoc .pdoc-back { font-size: 13px; color: #9090a8; }
        .pdoc-main { max-width: 760px; margin: 0 auto; padding: 108px 16px 72px; }
        .pdoc-header { margin-bottom: 36px; }
        .pdoc-eyebrow { font-family: monospace; font-size: 11px; color: #8d97d9; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
        .pdoc h1 { font-family: 'Inter', sans-serif; font-size: clamp(32px, 6vw, 48px); font-weight: 800; letter-spacing: -0.03em; color: #f2f2f8; margin: 0 0 14px; line-height: 1.08; }
        .pdoc-updated { font-size: 13px; color: #9090a8; font-family: monospace; margin: 0; }
        .pdoc-intro p { font-size: 15.5px; color: #b4b4c8; line-height: 1.75; margin: 0 0 16px; }
        .pdoc-intro { margin-bottom: 40px; }
        .pdoc-body > section { padding-top: 28px; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); scroll-margin-top: 80px; }
        .pdoc-body > section:first-child { border-top: none; margin-top: 0; padding-top: 0; }
        .pdoc h2 { font-family: 'Inter', sans-serif; font-size: 19px; font-weight: 700; color: #f2f2f8; margin: 0 0 12px; letter-spacing: -0.01em; line-height: 1.3; }
        .pdoc h3 { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: #e4e4f0; margin: 20px 0 8px; }
        .pdoc-body p, .pdoc-body li { font-size: 14.5px; color: #a8a8bc; line-height: 1.78; }
        .pdoc-body p { margin: 0 0 12px; }
        .pdoc-body ul { margin: 0 0 12px; padding-left: 20px; list-style: disc outside; }
        .pdoc-body li::marker { color: #6b6b80; }
        .pdoc-body li { margin-bottom: 6px; }
        .pdoc-body strong { color: #e4e4f0; font-weight: 600; }
        .pdoc-body a { overflow-wrap: anywhere; }
        .pdoc-table { width: 100%; border-collapse: collapse; margin: 4px 0 14px; font-size: 14px; }
        .pdoc-table th, .pdoc-table td { text-align: left; vertical-align: top; padding: 10px 12px 10px 0; border-bottom: 1px solid rgba(255,255,255,0.07); color: #a8a8bc; line-height: 1.6; }
        .pdoc-table th { color: #e4e4f0; font-weight: 600; font-size: 13px; }
        .pdoc-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .pdoc-card { padding: 20px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
        .pdoc-card h2 { font-size: 16px; margin-bottom: 8px; }
        .pdoc-card p, .pdoc-card li { font-size: 14px; }
        .pdoc-card p:last-child, .pdoc-card ul:last-child { margin-bottom: 0; }
        .pdoc-contact { margin: 0 0 36px; padding: 22px; border-radius: 16px; background: rgba(52,64,125,0.12); border: 1px solid rgba(141,151,217,0.25); }
        .pdoc-contact p { margin: 0 0 8px; color: #b4b4c8; font-size: 14.5px; line-height: 1.7; }
        .pdoc-contact .pdoc-email { display: inline-block; font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 700; color: #f2f2f8; margin: 2px 0 10px; overflow-wrap: anywhere; }
        .pdoc-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
        .pdoc-links a { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); font-size: 13.5px; color: #e4e4f0; }
        .pdoc-footer { border-top: 1px solid rgba(255,255,255,0.07); padding: 28px 16px; text-align: center; }
        .pdoc-footer-links { display: flex; justify-content: center; gap: 10px 22px; flex-wrap: wrap; margin-bottom: 12px; }
        .pdoc .pdoc-footer-links a { font-size: 13px; color: #9090a8; }
        .pdoc-footer p { margin: 0; font-size: 12px; color: #6b6b80; }
        @media (max-width: 640px) {
          .pdoc-cards { grid-template-columns: 1fr; }
          .pdoc-main { padding-top: 96px; }
          .pdoc-table thead { display: none; }
          .pdoc-table, .pdoc-table tbody, .pdoc-table tr, .pdoc-table td { display: block; width: 100%; }
          .pdoc-table tr { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
          .pdoc-table td { border: none; padding: 2px 0; }
          .pdoc-table td:first-child { color: #e4e4f0; font-weight: 600; }
        }
`;
