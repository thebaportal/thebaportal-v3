import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TheBAPortal",
    template: "%s | TheBAPortal",
  },
  description: "Certification practice, AI-powered scenarios, and real BA deliverables — built for BAs preparing for ECBA, CCBA, and CBAP.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter for headings — clean, professional, sharp at heavy weights */}
        {/* Open Sans for body — warm, readable, highly legible at all sizes */}
        {/* JetBrains Mono for labels, eyebrows, stats — technical credibility */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}