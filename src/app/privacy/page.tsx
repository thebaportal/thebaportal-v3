import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocLayout, SupportEmail, LEGAL_LAST_UPDATED } from "@/components/PublicDocLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Consultingly Inc. collects, uses, shares and protects personal information in The BA Portal.",
};

export default function PrivacyPage() {
  return (
    <PublicDocLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={<>
        <p>
          This Privacy Policy explains how Consultingly Inc. (&ldquo;Consultingly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;), a company based in Alberta, Canada, collects, uses, discloses and protects personal information in connection with The BA Portal, the website at thebaportal.com and the application available through it (the &ldquo;Service&rdquo;).
        </p>
        <p>
          If you have a question about this policy or about how we handle your information, contact us at <SupportEmail />.
        </p>
      </>}
    >
      <section>
        <h2>1. Who is responsible for your information</h2>
        <p>
          Consultingly Inc. operates The BA Portal and is responsible for the personal information under its control. Our Privacy Officer answers questions about this policy, about requests to access, correct or delete personal information, and about how our service providers, including those outside Canada, handle personal information for us. You can reach the Privacy Officer at <SupportEmail />. Please put &ldquo;Privacy&rdquo; in the subject line.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>Account and profile information</h3>
        <ul>
          <li>Your email address, and your name if you choose to provide it.</li>
          <li>Your password. It is sent over an encrypted connection to our authentication provider, which stores it in hashed form. We do not keep your password ourselves.</li>
          <li>Account records that our authentication provider keeps, such as when the account was created and when you last signed in.</li>
          <li>Your plan (Free or Pro), subscription status, and the end date of your current billing period.</li>
        </ul>
        <h3>Project and workspace content</h3>
        <p>
          Everything you create or enter in the Service: projects, problem statements, notes and text you type or paste, stakeholder information, requirements, user stories, process analyses, test cases, business cases, decisions, Decision Lab analyses, BA Intelligence sessions and findings, AI conversations, generated documents, and their approval status and history.
        </p>
        <h3>AI prompts and context</h3>
        <p>
          When you use an AI feature, we process your request together with the project context the feature needs. Section 4 explains how this works.
        </p>
        <h3>Payment and subscription information</h3>
        <p>
          Payments are handled by Stripe. When you subscribe, you enter your card details on Stripe&rsquo;s hosted checkout page, and they go directly to Stripe. We never receive or store your full card number. We store your Stripe customer and subscription identifiers, plan and subscription status. Through our Stripe account we can also see the billing details Stripe holds, such as your billing name, email address, billing address if you give one, card brand, the last four digits and expiry date of your card, payment history and invoices.
        </p>
        <h3>Technical and usage information</h3>
        <ul>
          <li><strong>Server and hosting logs.</strong> When your browser connects to the Service, our hosting provider records technical request details such as your IP address, the page or address requested, the time, your browser&rsquo;s user agent, and the response status. Our application logs record errors, and for some billing and account events they record your account identifier.</li>
          <li><strong>Session and browser storage.</strong> Information stored in your browser to keep you signed in and remember your preferences. See section 6.</li>
        </ul>
        <h3>Communications</h3>
        <p>
          If you email us, we keep your message, your email address and our reply so we can help you and keep a record of the conversation.
        </p>
        <p>
          We do not ask for government identification numbers, health information or other sensitive personal information, and the Service is not designed to hold it. Section 3 explains your responsibilities if your work involves information about other people.
        </p>
      </section>

      <section>
        <h2>3. Information you add about other people</h2>
        <p>
          Business analysis work often involves information about colleagues, stakeholders, clients, customers or your employer. If you add that kind of information to the Service, you are responsible for making sure you are allowed to do so. That means following your employer&rsquo;s or client&rsquo;s policies, any confidentiality obligations you have, and applicable privacy laws. Please include only what your work needs. Avoid entering sensitive personal information about individuals, such as health information, financial account numbers or government identifiers, unless it is necessary and you have authority to share it.
        </p>
        <p>
          We use that information only to provide the Service to you as described in this policy.
        </p>
      </section>

      <section>
        <h2>4. AI processing</h2>
        <p>
          The Service&rsquo;s AI features use Anthropic, PBC&rsquo;s Claude API. These features include the project workstreams, document generation, Decision Lab, Thought Buddy, option suggestions and BA Intelligence. When you use one, our servers send Anthropic the following:
        </p>
        <ul>
          <li>Your message or input.</li>
          <li>The project context the feature needs. Depending on the feature, this can include your problem statement, approved documents from the same project, accepted findings, earlier messages in that conversation, and decisions you have recorded.</li>
          <li>Our own instructions to the model.</li>
        </ul>
        <p>
          Anthropic returns a response, which we store in your workspace. These requests go from our servers to Anthropic, not from your browser.
        </p>
        <p>
          We send every request with Anthropic&rsquo;s United States-only processing setting, so the AI model processes it in the United States. Anthropic stores API data in the United States. Anthropic currently states that inputs and outputs from its commercial API are not used to train its models unless the customer explicitly opts in. We have not opted in. Anthropic also currently states that it deletes standard API inputs and outputs within 30 days. It can keep them longer where needed to enforce its usage policies, where the law requires it, or under a different agreement with the customer. These are Anthropic&rsquo;s policies, which Anthropic may change.
        </p>
        <p>
          The BA Portal does not use your workspace content to train AI models. AI output can be inaccurate or incomplete. Please review it before relying on it. Our <Link href="/terms">Terms of Service</Link> say more about this.
        </p>
      </section>

      <section>
        <h2>5. No third-party analytics or advertising tracking</h2>
        <p>
          The Service does not use third-party analytics, advertising or tracking services. We do not use tracking pixels, session recording or heatmaps, and we do not share information about how you use the Service with advertisers.
        </p>
      </section>

      <section>
        <h2>6. Cookies and browser storage</h2>
        <ul>
          <li><strong>Sign-in cookie.</strong> When you sign in, our authentication provider (Supabase) sets a cookie named <code>sb-…-auth-token</code> that keeps you signed in. It is necessary for the Service to work and is removed when you sign out. No cookies are set while you browse the public pages without signing in.</li>
          <li><strong>Preferences and recent work in your browser.</strong> The Service stores a few items in your browser&rsquo;s local storage: whether the sidebar is collapsed, the last project and session you used in BA Intelligence, and your most recent Decision Lab sessions (up to 20), including the text you entered, so you can return to them. These items stay on your device until you clear them, so take care on shared computers.</li>
        </ul>
        <p>
          Our fonts are served from our own website, so loading a page does not contact a third-party font service.
        </p>
        <p>
          We do not use advertising cookies or advertising tracking pixels. We do not sell personal information or use it for targeted advertising.
        </p>
      </section>

      <section>
        <h2>7. How we use personal information</h2>
        <ul>
          <li>To create and manage your account and sign you in.</li>
          <li>To provide the Service: storing, displaying and exporting your work, and generating AI output when you ask for it.</li>
          <li>To process subscriptions and payments, and to apply plan features, usage allowances and rate limits.</li>
          <li>To send service emails, such as sign-in links and password reset emails. We also contact you about your account, billing, security or changes to our terms or this policy.</li>
          <li>To respond to your support requests.</li>
          <li>To keep the Service secure and working: detecting and preventing abuse, investigating errors and fixing problems.</li>
          <li>To understand how the Service is used and improve it.</li>
          <li>To meet legal, tax and accounting obligations, and to enforce our Terms of Service.</li>
        </ul>
        <p>
          We do not send marketing emails unless you have agreed to receive them. We collect, use and disclose personal information only for these purposes, or for purposes that a reasonable person would consider appropriate in the circumstances, or as permitted or required by law.
        </p>
      </section>

      <section>
        <h2>8. Service providers and other disclosures</h2>
        <p>
          We use the following service providers to run the Service. They process personal information on our behalf for the purposes described here.
        </p>
        <table className="pdoc-table">
          <thead>
            <tr><th>Provider</th><th>What it does for us</th><th>Where it processes data</th></tr>
          </thead>
          <tbody>
            <tr><td>Vercel Inc.</td><td>Hosts the website and runs our application servers, including request and error logs</td><td>Application servers in the United States (Washington, D.C. area). Requests first reach Vercel&rsquo;s network point nearest to you, which for visitors in Canada is usually in Canada or the United States.</td></tr>
            <tr><td>Supabase Inc.</td><td>Stores account and workspace data, handles sign-in, and sends sign-in and password reset emails</td><td>United States (Amazon Web Services, US East, Northern Virginia)</td></tr>
            <tr><td>Anthropic, PBC</td><td>Generates AI responses from the requests our servers send</td><td>United States (processing and storage)</td></tr>
            <tr><td>Stripe</td><td>Payment processing, subscriptions, billing portal, invoices and fraud prevention</td><td>Canada and the United States. Stripe states that it transfers Canadian personal data to its data centres in the United States, and that its own service providers are mainly in the United States, the European Union and India.</td></tr>
          </tbody>
        </table>
        <p>We may also disclose personal information:</p>
        <ul>
          <li>when required or permitted by law, for example in response to a valid court order or other legal process;</li>
          <li>to protect the rights, safety or security of our users, the public or Consultingly, including to investigate fraud or abuse;</li>
          <li>to a buyer, successor or advisor in a merger, financing, acquisition or sale of all or part of our business, subject to obligations to protect the information; and</li>
          <li>with your consent.</li>
        </ul>
        <p>We do not sell personal information.</p>
      </section>

      <section>
        <h2>9. Processing outside Canada</h2>
        <p>
          Your information is stored and processed outside Canada by the providers listed above, for the purposes listed beside each one. Account and workspace data, application servers and logs are in the United States. AI requests are processed and stored by Anthropic in the United States. Payment information is handled by Stripe in Canada and the United States, and by Stripe&rsquo;s own service providers, mainly in the United States, the European Union and India. Information held outside Canada is subject to the laws of the country where it is held, and the courts, law enforcement and national security authorities there may be able to access it. If you have questions about how our service providers outside Canada collect, use, disclose or store personal information for us, contact our Privacy Officer at <SupportEmail />.
        </p>
      </section>

      <section>
        <h2>10. How we protect information</h2>
        <p>We use reasonable safeguards for the sensitivity of the information we handle, including:</p>
        <ul>
          <li>encrypted HTTPS connections between your browser and the Service;</li>
          <li>database access rules that limit each account to its own records, plus ownership checks on our servers;</li>
          <li>keeping secret credentials on our servers and out of the browser;</li>
          <li>password storage handled by our authentication provider in hashed form, and card details handled only by Stripe;</li>
          <li>verifying that payment notifications really come from Stripe, and checking plan access on our servers;</li>
          <li>limits on how often AI features can be called; and</li>
          <li>limiting access to production systems to the people who operate the Service.</li>
        </ul>
        <p>
          No method of transmission or storage is completely secure, and we cannot guarantee absolute security. You can help by using a strong, unique password, signing out on shared devices, and telling us promptly if you think your account has been used without your permission.
        </p>
      </section>

      <section>
        <h2>11. How long we keep information</h2>
        <ul>
          <li><strong>Account and workspace content</strong> is kept while your account is open. When your account is deleted at your request, or closed under our Terms of Service, it is handled as described below.</li>
          <li><strong>Account deletion.</strong> The Service does not currently have a self-service delete button. To delete your account, email <SupportEmail /> from the email address on the account. After we verify the request, we delete your account, profile and workspace content from our production database within a reasonable period and confirm when it is done. This is subject to applicable law and to information we must or legitimately need to keep for legal, security, accounting and dispute-resolution purposes. Copies in our database provider&rsquo;s backups are removed as those backups expire. We also keep a record that the request was handled.</li>
          <li><strong>Payment records</strong> are kept by Stripe and by us for as long as tax, accounting and legal requirements require.</li>
          <li><strong>Server and application logs</strong> are kept for limited periods under our hosting provider&rsquo;s log retention settings.</li>
          <li><strong>Support emails</strong> are kept as long as needed to help you and to keep a reasonable record of the conversation.</li>
          <li><strong>Information in your browser</strong> stays on your device until you clear it or sign out.</li>
        </ul>
        <p>
          We do not currently delete inactive accounts automatically. If we introduce a practice of deleting inactive accounts, we will tell you before it applies to you.
        </p>
      </section>

      <section>
        <h2>12. Your choices and rights</h2>
        <p>Subject to applicable law, you can:</p>
        <ul>
          <li>ask for access to the personal information we hold about you;</li>
          <li>ask us to correct information that is inaccurate or incomplete;</li>
          <li>ask us to delete your account and associated personal information;</li>
          <li>withdraw your consent to certain uses, although this may mean we can no longer provide some or all of the Service; and</li>
          <li>complain to us, and, if you are not satisfied, to the Office of the Privacy Commissioner of Canada or the Office of the Information and Privacy Commissioner of Alberta.</li>
        </ul>
        <p>
          Some changes you can make yourself. You can update your name in Settings, update billing details in the Stripe billing portal (Settings → Billing → Manage subscription), and export your documents from the workspace. For anything else, email <SupportEmail /> from the email address on your account. We may need to confirm your identity before acting on a request. We will respond within the time required by applicable law, which is generally 30 days. If we cannot fully meet a request, we will explain why.
        </p>
      </section>

      <section>
        <h2>13. Privacy and security incidents</h2>
        <p>
          If we learn of a breach of security safeguards involving personal information under our control, we will act promptly to contain and investigate it. Where the law requires, including where a breach creates a real risk of significant harm, we will notify affected individuals and the relevant privacy regulators. We also keep records of breaches as the law requires. If you believe your account or information has been compromised, or you have found a security vulnerability, please report it to <SupportEmail />.
        </p>
      </section>

      <section>
        <h2>14. Age requirement</h2>
        <p>
          The Service is a professional tool for adults. It is not intended for children, and you must be at least 18 years old to create an account. We do not knowingly collect personal information from anyone under 18. If you believe someone under 18 has given us personal information, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>15. Changes to this policy</h2>
        <p>
          We may update this policy as the Service or the law changes. When we do, we will change the &ldquo;Last updated&rdquo; date at the top of this page. If we make a material change, we will give you reasonable advance notice by email or with a notice in the Service before the change takes effect, or such other notice as applicable law requires.
        </p>
      </section>

      <section>
        <h2>16. Contact us</h2>
        <p>
          Consultingly Inc., Alberta, Canada. Privacy Officer: <SupportEmail />. For general help, see our <Link href="/support">Support</Link> page.
        </p>
      </section>
    </PublicDocLayout>
  );
}
