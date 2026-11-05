import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocLayout, SupportEmail, LEGAL_LAST_UPDATED } from "@/components/PublicDocLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to your use of The BA Portal, operated by Consultingly Inc.",
};

export default function TermsPage() {
  return (
    <PublicDocLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={<>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and Consultingly Inc. (&ldquo;Consultingly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;), a company based in Alberta, Canada. They govern your use of The BA Portal, the website at thebaportal.com and the application available through it (the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account or using the Service, you agree to these Terms and acknowledge our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the Service. Questions are welcome at <SupportEmail />.
        </p>
      </>}
    >
      <section>
        <h2>1. Your account</h2>
        <ul>
          <li>You must be at least 18 years old, and able to enter into a binding contract, to create an account.</li>
          <li>If you use the Service on behalf of an employer, client or other organization, you confirm that you are authorized to accept these Terms for that use.</li>
          <li>Give accurate information when you sign up and keep your email address current, because we use it to contact you about your account and billing.</li>
          <li>Each account is for one person. Do not share your sign-in details. You are responsible for keeping your password and email account secure, and for activity under your account.</li>
          <li>Tell us promptly at <SupportEmail /> if you believe your account has been accessed without your permission.</li>
        </ul>
      </section>

      <section>
        <h2>2. The Service and its plans</h2>
        <p>
          The BA Portal is a workspace for business analysts. It includes project workstreams, AI-assisted document generation, Decision Lab, BA Intelligence, exports and downloadable templates. It is offered in two plans:
        </p>
        <ul>
          <li><strong>Free</strong> costs nothing and does not need a payment card. It includes the features listed as Free on our <Link href="/pricing">Pricing</Link> page, including a monthly allowance of Decision Lab analyses. The allowance resets each calendar month (UTC).</li>
          <li><strong>Pro</strong> costs <strong>CA$19 per month</strong> or <strong>CA$180 per year</strong> and adds the Pro features listed on our <Link href="/pricing">Pricing</Link> page.</li>
        </ul>
        <p>
          Prices are in Canadian dollars. If sales taxes apply to your purchase, they will be shown at checkout before you pay. We may change what each plan includes over time. Section 15 explains how we handle changes.
        </p>
      </section>

      <section>
        <h2>3. Payment and automatic renewal</h2>
        <ul>
          <li>Payments are processed by Stripe through Stripe&rsquo;s hosted checkout page. Stripe&rsquo;s own terms also apply to the payment. We never receive your full card number.</li>
          <li>Pro is a subscription. It <strong>renews automatically</strong> at the end of each billing period (each month for monthly, each year for annual) until you cancel. By subscribing, you authorize us, through Stripe, to charge your payment method at the start of each billing period.</li>
          <li>If a renewal payment fails, Stripe may retry it, and we may mark your subscription as past due. If payment still cannot be collected, the subscription may end and your account will move to the Free plan.</li>
          <li>If we change the Pro price, we will give you reasonable advance notice by email, or any longer notice that applicable law requires. The new price applies from your first renewal after the notice period. You can cancel before then if you do not want to continue at the new price.</li>
        </ul>
      </section>

      <section>
        <h2>4. Cancellation</h2>
        <ul>
          <li>You can cancel at any time in <strong>Settings → Billing → Manage subscription</strong>, which opens the Stripe billing portal. If you cannot reach the billing portal, email <SupportEmail /> from the email address on your account and we will cancel for you.</li>
          <li>Cancellation takes effect at the end of your current billing period. You keep Pro until then and you will not be charged again.</li>
          <li>When Pro ends, your account moves to the Free plan. Your projects and documents stay in your account. Pro-only features stop being available.</li>
          <li>Cancelling your subscription does not delete your account. To delete your account, see section 13.</li>
        </ul>
      </section>

      <section>
        <h2>5. Refunds</h2>
        <ul>
          <li>Except as described in this section or required by law, payments are non-refundable. We do not give refunds or credits for partial billing periods, unused time, or for cancelling partway through a period.</li>
          <li>If you believe you were charged in error, contact <SupportEmail /> within 30 days of the charge. Examples include a duplicate charge, a charge after a cancellation took effect, or a charge for the wrong amount. We will investigate and refund confirmed errors to the original payment method.</li>
          <li>If we end your subscription without cause, or we discontinue the Service, we will refund the prepaid fees for the unused part of your billing period.</li>
          <li>Nothing in these Terms limits any refund rights you have under consumer protection laws that apply to you.</li>
        </ul>
      </section>

      <section>
        <h2>6. Your content</h2>
        <p>
          &ldquo;Your content&rdquo; means everything you enter into the Service, such as projects, notes, text you type or paste, and decisions, together with the documents and other output the Service generates for you. As between you and us, <strong>you own your content</strong>. We do not claim ownership of it.
        </p>
        <p>
          You give us a non-exclusive, worldwide, royalty-free licence to host, store, copy, process, transmit and display your content only as needed to provide, secure and support the Service for you, and to comply with the law. This includes sending it to the service providers described in our Privacy Policy, such as our AI provider when you use an AI feature. The licence ends when your content is deleted, except for copies we must keep by law and copies in backups until they expire.
        </p>
        <p>
          We do not sell your content and we do not use it to train AI models.
        </p>
      </section>

      <section>
        <h2>7. Confidential, client and company information</h2>
        <p>
          You are responsible for the content you put into the Service, including information that belongs to or concerns your employer, your clients, or other people. Before you add it, make sure you have the right to use it this way. That includes complying with any confidentiality agreements, workplace or client policies, and privacy laws that apply to you.
        </p>
        <p>
          Include only the information your work needs. Do not enter sensitive personal information about individuals, such as health information, financial account numbers or government identifiers, unless it is necessary and you are authorized to share it. Our <Link href="/privacy">Privacy Policy</Link> describes how this information is processed, including by service providers outside Canada.
        </p>
      </section>

      <section>
        <h2>8. AI features and output</h2>
        <ul>
          <li>The Service uses a third-party AI model, provided by Anthropic, to generate drafts, analyses and suggestions from what you provide.</li>
          <li>AI output can be wrong, incomplete, out of date or inconsistent, and it may resemble output generated for other users. It is a drafting and thinking aid. It is not professional, legal, financial, regulatory or other expert advice.</li>
          <li>You are responsible for reviewing output, checking it against your own knowledge and sources, and for the decisions you make and the documents you share. Apply your own professional judgment before you rely on it.</li>
        </ul>
      </section>

      <section>
        <h2>9. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the Service for anything unlawful, fraudulent or harmful, or to infringe or misappropriate anyone else&rsquo;s rights;</li>
          <li>upload or transmit malware, or content you do not have the right to use;</li>
          <li>try to gain unauthorized access to the Service, other accounts or our systems, or probe, scan or test their vulnerabilities without our written permission (please report suspected vulnerabilities to <SupportEmail /> instead);</li>
          <li>interfere with or disrupt the Service, or place an unreasonable load on it;</li>
          <li>scrape the Service or access it by automated means other than through the features we provide;</li>
          <li>copy, reverse engineer or attempt to extract the Service&rsquo;s source code, prompts or model instructions, except where the law expressly allows it;</li>
          <li>resell, sublicense or share access to your account; or</li>
          <li>use the AI features to create content that breaks the law or the usage policies of our AI provider.</li>
        </ul>
      </section>

      <section>
        <h2>10. Usage limits</h2>
        <p>
          To keep the Service reliable and fair, we apply rate limits to AI features, and the Free plan includes a monthly Decision Lab allowance. Do not try to get around these limits, for example by creating multiple accounts, automating requests, or tampering with requests sent to the Service. We may adjust limits to protect the Service&rsquo;s reliability and security.
        </p>
      </section>

      <section>
        <h2>11. Our intellectual property</h2>
        <p>
          The Service is owned by Consultingly or its licensors and is protected by intellectual property laws. That includes its software, design, prompts, templates, text and branding. Apart from your content, these Terms give you no rights in the Service except a limited, non-exclusive, non-transferable and revocable right to use it in line with these Terms.
        </p>
        <p>
          You can use the downloadable templates in your own work, including work for your employer or clients. You may not resell or redistribute them as templates.
        </p>
        <p>
          If you send us feedback or suggestions, we may use them without any obligation to you.
        </p>
      </section>

      <section>
        <h2>12. Third-party services</h2>
        <p>
          The Service relies on third-party providers, including Stripe for payments, Anthropic for AI processing, Supabase for database and authentication and Vercel for hosting. Their services are subject to their own terms. We are not responsible for third-party services beyond our reasonable control, but we choose providers carefully and use them as described in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>13. Privacy and security</h2>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how we handle personal information. We use reasonable safeguards, but no online service can guarantee complete security. You are responsible for securing your password, email account and devices, and for telling us promptly about any unauthorized use.
        </p>
        <p>
          The Service does not currently offer self-service account deletion. To delete your account, email <SupportEmail /> from the email address on the account. Exports let you download your documents, and we recommend keeping your own copies of work that matters to you.
        </p>
      </section>

      <section>
        <h2>14. Suspension and termination</h2>
        <ul>
          <li>You can stop using the Service at any time. To close your account, see section 13.</li>
          <li>We may suspend or close your account if you materially breach these Terms, if your use creates a risk of harm or legal exposure for us, other users or third parties, if we are required to by law, or for non-payment. Where reasonable, we will give you notice and a chance to fix the problem first.</li>
          <li>If we close your account without cause, we will give you reasonable notice and a chance to export your content, and we will refund prepaid fees as described in section 5.</li>
          <li>After an account is closed, your information is handled as described in our Privacy Policy. Sections 5 to 8, 11, and 16 to 20 continue to apply.</li>
        </ul>
      </section>

      <section>
        <h2>15. Availability and changes to the Service</h2>
        <p>
          We work to keep the Service available and reliable, but we do not promise that it will be uninterrupted or error-free. Maintenance, provider outages and other events can affect it. We may add, change or remove features. If a change materially reduces the Pro features you are paying for, you can cancel under section 4. If we decide to discontinue the Service entirely, we will give reasonable advance notice where possible so that you can export your content, and we will refund prepaid fees for the unused period.
        </p>
      </section>

      <section>
        <h2>16. Disclaimer of warranties</h2>
        <p>
          To the extent permitted by law, the Service and all output are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We disclaim all warranties and conditions not expressly stated in these Terms, including implied warranties or conditions of merchantability, fitness for a particular purpose, accuracy and non-infringement. Some laws do not allow these exclusions. Where that is the case, the exclusions apply only to the extent the law allows.
        </p>
      </section>

      <section>
        <h2>17. Limitation of liability</h2>
        <p>
          To the extent permitted by law, Consultingly is not liable for indirect, incidental, special, consequential or punitive damages. Nor is it liable for loss of profits, revenue, business opportunity or goodwill arising from or related to the Service, even if we were told such damages were possible.
        </p>
        <p>
          To the extent permitted by law, our total liability for all claims relating to the Service is limited to the greater of (a) the amount you paid us for the Service in the 12 months before the event giving rise to the claim, and (b) CA$100.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, such as liability for fraud, gross negligence or wilful misconduct, or your rights under mandatory consumer protection laws.
        </p>
      </section>

      <section>
        <h2>18. Indemnity</h2>
        <p>
          To the extent permitted by law, you agree to indemnify Consultingly against reasonable losses and costs, including reasonable legal fees, arising from third-party claims caused by your misconduct. This covers (a) content you submitted without the right to do so, (b) your breach of section 7 or section 9, or (c) your violation of law or of someone else&rsquo;s rights. This indemnity does not apply to the extent a claim is caused by our own breach, negligence or misconduct.
        </p>
      </section>

      <section>
        <h2>19. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada that apply there. Subject to the next sentence, the courts of Alberta have jurisdiction over disputes about these Terms or the Service. If you are a consumer, you keep any protection given to you by the mandatory laws of the place where you live, including any right to bring a claim in your local courts.
        </p>
        <p>
          If you have a concern or dispute, please contact us first at <SupportEmail /> and describe the issue. We will try in good faith to resolve it with you informally. This does not prevent either of us from going to court or from contacting a regulator.
        </p>
      </section>

      <section>
        <h2>20. General</h2>
        <ul>
          <li>These Terms and our Privacy Policy are the entire agreement between you and us about the Service.</li>
          <li>If any part of these Terms is found unenforceable, the rest stays in effect.</li>
          <li>If we do not enforce a right right away, we have not given it up.</li>
          <li>You may not transfer your rights under these Terms without our consent. We may transfer ours in connection with a merger, acquisition or sale of all or part of our business, and we will tell you if that happens.</li>
          <li>We may send you notices by email to the address on your account or by a notice in the Service.</li>
          <li>We may update these Terms. We will change the &ldquo;Last updated&rdquo; date, and for material changes we will give reasonable advance notice by email or in the Service before they take effect, or such other notice as applicable law requires. Changes do not apply to past events. If you do not agree with a change, you can cancel and stop using the Service before it takes effect.</li>
        </ul>
      </section>

      <section>
        <h2>21. Contact</h2>
        <p>
          Consultingly Inc., Alberta, Canada. Email: <SupportEmail />. For help with your account or billing, see our <Link href="/support">Support</Link> page.
        </p>
      </section>
    </PublicDocLayout>
  );
}
