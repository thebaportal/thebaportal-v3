import Link from "next/link";

// Shared frame for the public document pages (Support, Privacy Policy, Terms of Service).
// Light "Folio" look, matching the sign-in and sign-up pages: cream page, white document
// sheet, navy accents, and everything anchored to the same left gutter as the wordmark.

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

function Wordmark() {
  return <>The<span>BA</span>Portal</>;
}

export function PublicDocLayout({ eyebrow, title, lastUpdated, intro, toc, children }: {
  eyebrow: string;
  title: string;
  lastUpdated?: string;
  intro?: React.ReactNode;
  /** Section anchors for the "On this page" list: [id, label]. Omit for non-document pages. */
  toc?: [string, string][];
  children: React.ReactNode;
}) {
  return (
    <div className="pd">
      <header className="pd-top">
        <div className="pd-wrap pd-top-inner">
          <Link href="/" className="pd-brand" aria-label="TheBAPortal home"><Wordmark /></Link>
          <nav className="pd-nav" aria-label="Site">
            <Link href="/pricing" className="pd-nav-link">Pricing</Link>
            <Link href="/faq" className="pd-nav-link">FAQ</Link>
            <Link href="/support" className="pd-nav-link">Support</Link>
            <Link href="/auth/login" className="pd-nav-link pd-signin">Sign in</Link>
            <Link href="/auth/signup" className="pd-cta">Get started</Link>
          </nav>
        </div>
      </header>

      <div className="pd-wrap">
        <div className="pd-hero">
          <div className="pd-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          {lastUpdated && (
            <div className="pd-meta">
              <span>Last updated: {lastUpdated}</span>
              <span className="pd-meta-dot" aria-hidden="true" />
              <span>Consultingly Inc., Alberta, Canada</span>
            </div>
          )}
        </div>

        {toc ? (
          <div className="pd-doc-grid">
            <aside className="pd-toc" aria-label="On this page">
              <div className="pd-toc-label">On this page</div>
              <ol>
                {toc.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`}>{label}</a></li>
                ))}
              </ol>
              <div className="pd-toc-help">
                <div className="pd-toc-help-title">Questions?</div>
                <p>Email <SupportEmail /> and put &ldquo;Privacy&rdquo; or &ldquo;Terms&rdquo; in the subject line.</p>
              </div>
            </aside>
            <main className="pd-sheet">
              {intro && <div className="pd-intro">{intro}</div>}
              <div className="pd-body">{children}</div>
            </main>
          </div>
        ) : (
          <main className="pd-plain">
            {intro && <div className="pd-intro">{intro}</div>}
            {children}
          </main>
        )}
      </div>

      <footer className="pd-footer">
        <div className="pd-wrap pd-footer-inner">
          <div className="pd-footer-brand">
            <span className="pd-brand pd-brand-sm"><Wordmark /></span>
            <p>The BA Portal is operated by Consultingly Inc., Alberta, Canada.</p>
          </div>
          <nav className="pd-footer-links" aria-label="Footer">
            {PUBLIC_FOOTER_LINKS.map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
        </div>
      </footer>

      {/* Injected as raw CSS: React escapes quotes in <style> text children, which breaks hydration. */}
      <style dangerouslySetInnerHTML={{ __html: PD_CSS }} />
    </div>
  );
}

const PD_CSS = `
.pd { min-height: 100vh; background: var(--lc-bg); color: var(--lc-text-2); font-family: var(--font-body); -webkit-font-smoothing: antialiased; display: flex; flex-direction: column; }
.pd a { color: var(--lc-teal); text-decoration: underline; text-decoration-color: var(--lc-teal-border); text-underline-offset: 3px; }
.pd a:hover { text-decoration-color: var(--lc-teal); }
.pd-wrap { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 48px; box-sizing: border-box; }

/* top bar — same anchoring as the sign-in page */
.pd-top-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-top: 24px; padding-bottom: 24px; }
.pd .pd-brand { font-family: var(--font-display); font-size: 16px; font-weight: 700; letter-spacing: -0.02em; color: var(--lc-text-1); text-decoration: none; }
.pd .pd-brand span { color: var(--lc-teal); }
.pd-nav { display: flex; align-items: center; gap: 6px; }
.pd .pd-nav-link { font-family: var(--font-display); font-size: 13.5px; font-weight: 600; color: var(--lc-text-3); text-decoration: none; padding: 8px 12px; border-radius: 8px; }
.pd .pd-nav-link:hover { color: var(--lc-text-1); background: var(--lc-faint); }
.pd .pd-signin { margin-left: 6px; }
.pd .pd-cta { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; color: #f5f1e7; background: var(--lc-teal); text-decoration: none; padding: 9px 16px; border-radius: 10px; margin-left: 4px; }
.pd .pd-cta:hover { background: var(--teal-bright); }

/* page title — anchored left, not centred */
.pd-hero { padding: 40px 0 36px; border-bottom: 1px solid var(--lc-border); margin-bottom: 40px; }
.pd-eyebrow { font-family: var(--font-display); font-size: 11px; font-weight: 700; color: var(--lc-teal); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
.pd h1 { font-family: var(--font-display); font-size: 46px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; color: var(--lc-text-1); margin: 0; }
.pd-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 18px; font-size: 13.5px; color: var(--lc-text-4); }
.pd-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--lc-border); }

/* document layout: section list on the left, white sheet beside it */
.pd-doc-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 56px; align-items: start; padding-bottom: 80px; }
.pd-toc { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow-y: auto; }
.pd-toc-label { font-family: var(--font-display); font-size: 11px; font-weight: 700; color: var(--lc-text-4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
.pd-toc ol { list-style: none; margin: 0; padding: 0; border-left: 1px solid var(--lc-border); }
.pd-toc li { margin: 0; }
.pd .pd-toc a { display: block; padding: 6px 0 6px 14px; margin-left: -1px; border-left: 2px solid transparent; font-size: 13.5px; line-height: 1.45; color: var(--lc-text-3); text-decoration: none; }
.pd .pd-toc a:hover { color: var(--lc-text-1); border-left-color: var(--lc-teal); }
.pd-toc-help { margin-top: 28px; padding: 16px; border-radius: 12px; background: var(--lc-teal-bg); border: 1px solid var(--lc-teal-border); }
.pd-toc-help-title { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; color: var(--lc-text-1); margin-bottom: 4px; }
.pd-toc-help p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--lc-text-3); }

.pd-sheet { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius-lg); box-shadow: var(--lc-shadow-sm); padding: 52px 56px; max-width: 860px; box-sizing: border-box; }
.pd-intro p { font-size: 16.5px; line-height: 1.7; color: var(--lc-text-2); margin: 0 0 14px; }
.pd-sheet .pd-intro { padding-bottom: 28px; margin-bottom: 4px; border-bottom: 1px solid var(--lc-border-soft); }
.pd-body > section { padding-top: 32px; scroll-margin-top: 24px; }
.pd h2 { font-family: var(--font-display); font-size: 21px; font-weight: 750; letter-spacing: -0.015em; line-height: 1.3; color: var(--lc-text-1); margin: 0 0 12px; }
.pd h3 { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--lc-text-1); margin: 22px 0 8px; }
.pd-body p, .pd-body li { font-size: 15px; line-height: 1.75; color: var(--lc-text-2); }
.pd-body p { margin: 0 0 12px; }
.pd-body ul { margin: 0 0 12px; padding-left: 22px; list-style: disc outside; }
.pd-body li { margin-bottom: 6px; padding-left: 2px; }
.pd-body li::marker { color: var(--lc-text-5); }
.pd-body strong { color: var(--lc-text-1); font-weight: 650; }
.pd-body code { font-family: var(--font-mono); font-size: 13px; background: var(--lc-faint); padding: 1px 6px; border-radius: 5px; }
.pd a { overflow-wrap: anywhere; }
.pd-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 14px; }
.pd-table th, .pd-table td { text-align: left; vertical-align: top; padding: 12px 14px 12px 0; border-bottom: 1px solid var(--lc-border-soft); line-height: 1.6; color: var(--lc-text-2); }
.pd-table th { font-family: var(--font-display); font-size: 12px; font-weight: 700; color: var(--lc-text-4); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--lc-border); }
.pd-table td:first-child { font-weight: 650; color: var(--lc-text-1); white-space: nowrap; }

/* Support page */
.pd-plain { padding-bottom: 80px; }
.pd-support { display: grid; grid-template-columns: 380px minmax(0, 1fr); gap: 32px; align-items: start; }
.pd-contact { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius-lg); box-shadow: var(--lc-shadow-md); padding: 32px; position: sticky; top: 24px; }
.pd-contact-kicker { font-family: var(--font-display); font-size: 11px; font-weight: 700; color: var(--lc-text-4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
.pd .pd-contact-email { display: block; font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--lc-text-1); text-decoration: none; margin-bottom: 14px; overflow-wrap: anywhere; }
.pd .pd-contact-email:hover { color: var(--lc-teal); }
.pd-contact p { font-size: 14px; line-height: 1.65; color: var(--lc-text-3); margin: 0 0 18px; }
.pd .pd-contact-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 13px 16px; border-radius: 10px; background: var(--lc-teal); color: #f5f1e7; font-family: var(--font-display); font-size: 14.5px; font-weight: 700; text-decoration: none; }
.pd .pd-contact-btn:hover { background: var(--teal-bright); }
.pd-contact-links { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--lc-border-soft); }
.pd-contact-links ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 2px; }
.pd .pd-contact-links a { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; font-weight: 600; color: var(--lc-text-2); text-decoration: none; }
.pd .pd-contact-links a:hover { color: var(--lc-teal); }
.pd-topics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.pd-topic { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius); padding: 24px; }
.pd-topic-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--lc-teal-bg); color: var(--lc-teal); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.pd-topic h2 { font-size: 16.5px; margin-bottom: 8px; }
.pd-topic p { font-size: 14.5px; line-height: 1.7; color: var(--lc-text-3); margin: 0; }
.pd-topic strong { color: var(--lc-text-1); font-weight: 650; }

/* footer */
.pd-footer { margin-top: auto; border-top: 1px solid var(--lc-border); background: var(--lc-surface); }
.pd-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-top: 28px; padding-bottom: 28px; }
.pd-footer-brand p { margin: 6px 0 0; font-size: 13px; color: var(--lc-text-4); }
.pd .pd-brand-sm { font-size: 15px; }
.pd-footer-links { display: flex; flex-wrap: wrap; gap: 6px 22px; }
.pd .pd-footer-links a { font-size: 13.5px; font-weight: 600; color: var(--lc-text-3); text-decoration: none; }
.pd .pd-footer-links a:hover { color: var(--lc-teal); }

@media (max-width: 1080px) {
  .pd-doc-grid { grid-template-columns: 220px minmax(0, 1fr); gap: 36px; }
  .pd-support { grid-template-columns: 1fr; }
  .pd-contact { position: static; }
}
@media (max-width: 820px) {
  .pd-wrap { padding: 0 16px; }
  .pd-nav .pd-nav-link:not(.pd-signin) { display: none; }
  .pd-hero { padding: 20px 0 24px; margin-bottom: 24px; }
  .pd h1 { font-size: 34px; }
  .pd-doc-grid { grid-template-columns: 1fr; gap: 20px; padding-bottom: 48px; }
  .pd-toc { position: static; max-height: none; background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: 14px; padding: 16px; }
  .pd-toc-help { display: none; }
  .pd-sheet { padding: 28px 20px; border-radius: 16px; }
  .pd-topics { grid-template-columns: 1fr; }
  .pd-contact { padding: 24px; }
  .pd-table thead { display: none; }
  .pd-table, .pd-table tbody, .pd-table tr, .pd-table td { display: block; width: 100%; }
  .pd-table tr { padding: 12px 0; border-bottom: 1px solid var(--lc-border-soft); }
  .pd-table td { border: none; padding: 2px 0; white-space: normal; }
  .pd-footer-inner { flex-direction: column; align-items: flex-start; }
}
`;
