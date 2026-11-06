import type { Metadata } from "next";
import Link from "next/link";
import { UserRound, CreditCard, CalendarX, AlertCircle, HelpCircle, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { PublicDocLayout, SupportEmail, SUPPORT_EMAIL } from "@/components/PublicDocLayout";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your The BA Portal account, sign-in, subscription, billing, cancellation, product questions and privacy requests.",
};

const ICON = { size: 18, strokeWidth: 2 } as const;

export default function SupportPage() {
  return (
    <PublicDocLayout eyebrow="Support" title="How can we help?">
      <div className="pd-support">
        <aside className="pd-contact" aria-label="Contact support">
          <p className="pd-contact-lead">Email us and a real person will reply.</p>
          <a className="pd-contact-email" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <p>
            Please write from the email address on your account and briefly describe what you need. For billing questions, include the date and amount of the charge. Never send us your password or full card number.
          </p>
          <a className="pd-contact-btn" href={`mailto:${SUPPORT_EMAIL}`}><Mail size={16} strokeWidth={2} aria-hidden="true" /> Email support</a>
          <div className="pd-contact-links">
            <div className="pd-contact-kicker">Useful links</div>
            <ul>
              <li><Link href="/pricing">Pricing <ArrowRight size={15} aria-hidden="true" /></Link></li>
              <li><Link href="/faq">FAQ <ArrowRight size={15} aria-hidden="true" /></Link></li>
              <li><Link href="/privacy">Privacy Policy <ArrowRight size={15} aria-hidden="true" /></Link></li>
              <li><Link href="/terms">Terms of Service <ArrowRight size={15} aria-hidden="true" /></Link></li>
            </ul>
          </div>
        </aside>

        <div className="pd-topics">
          <section className="pd-topic">
            <div className="pd-topic-icon"><UserRound {...ICON} aria-hidden="true" /></div>
            <h2>Accounts and sign-in</h2>
            <p>
              If you have forgotten your password, use <Link href="/forgot-password">Forgot password</Link>. On the sign-in page, you can also ask for a magic link to be sent to your email. If you still cannot get in, email us from the address on your account.
            </p>
          </section>

          <section className="pd-topic">
            <div className="pd-topic-icon"><CreditCard {...ICON} aria-hidden="true" /></div>
            <h2>Subscriptions and billing</h2>
            <p>
              Pro is CA$19 per month or CA$180 per year and renews automatically until you cancel. To see invoices or change your card, go to <strong>Settings → Billing → Manage subscription</strong>. Plan details are on our <Link href="/pricing">Pricing</Link> page.
            </p>
          </section>

          <section className="pd-topic">
            <div className="pd-topic-icon"><CalendarX {...ICON} aria-hidden="true" /></div>
            <h2>Cancellation</h2>
            <p>
              Cancel at any time in <strong>Settings → Billing → Manage subscription</strong>. Cancellation takes effect at the end of your current billing period. You keep Pro until then, you are not charged again, and your projects stay in your account on the Free plan.
            </p>
          </section>

          <section className="pd-topic">
            <div className="pd-topic-icon"><AlertCircle {...ICON} aria-hidden="true" /></div>
            <h2>Payment issues</h2>
            <p>
              If a payment is declined or a renewal fails, update your card in the billing portal. If you think you were charged in error, email us within 30 days of the charge. Our refund policy is in the <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>

          <section className="pd-topic">
            <div className="pd-topic-icon"><HelpCircle {...ICON} aria-hidden="true" /></div>
            <h2>Product questions</h2>
            <p>
              Not sure how a workstream, Decision Lab or BA Intelligence works, or found something that looks wrong? Check the <Link href="/faq">FAQ</Link> or email us with what you were doing, and include a screenshot if you can.
            </p>
          </section>

          <section className="pd-topic">
            <div className="pd-topic-icon"><ShieldCheck {...ICON} aria-hidden="true" /></div>
            <h2>Privacy and data requests</h2>
            <p>
              To access, correct or delete your personal information, or to delete your account, email <SupportEmail /> from the address on your account. Please put &ldquo;Privacy&rdquo; in the subject line. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle these requests.
            </p>
          </section>
        </div>
      </div>
    </PublicDocLayout>
  );
}
