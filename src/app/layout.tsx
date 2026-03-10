import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheBAPortal — Learn BA by Doing BA",
  description: "The most advanced Business Analyst training platform. Real simulations. Real stakeholders. Real feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter for headings — clean, professional, no personality quirks */}
        {/* Open Sans for body — warm, readable, highly legible at all sizes */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
