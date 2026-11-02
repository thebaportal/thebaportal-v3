import { permanentRedirect } from "next/navigation";

// The old Contact page listed retired addresses (hello@, privacy@, legal@).
// Support is now the single public contact page; keep /contact working for old links.
export default function ContactPage() {
  permanentRedirect("/support");
}
