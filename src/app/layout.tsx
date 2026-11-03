import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TheBAPortal",
    template: "%s | TheBAPortal",
  },
  description: "A work tool for practising business analysts — projects, requirements, user stories, process analysis, testing, and decision support, all connected in one workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Fonts (Inter headings, Open Sans body, JetBrains Mono labels) are self-hosted: see ./fonts.css. */}
      <body>
        {children}
      </body>
    </html>
  );
}