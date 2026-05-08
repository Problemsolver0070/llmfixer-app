import { Brand } from '@/components/shell/Brand';
import { useSession } from '@/hooks/useSession';

export default function PrivacyPolicy() {
  const { user } = useSession();
  const signedIn = !!user;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--rule-fine)',
        background: 'var(--color-bg-rail)',
      }}>
        <Brand />
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="/pricing" style={navLinkStyle}>Pricing</a>
          {signedIn ? (
            <a href="/app/dashboard" style={navLinkDimStyle}>Dashboard</a>
          ) : (
            <a href="/login" style={navLinkDimStyle}>Sign in</a>
          )}
        </nav>
      </header>

      <main style={{
        flex: 1,
        maxWidth: 760,
        margin: '0 auto',
        padding: '48px 32px 64px',
        color: 'var(--color-text)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          margin: '0 0 8px',
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '0 0 40px' }}>
          Last updated 2026-05-09.
        </p>

        <Section title="The short version">
          <p>
            Your conversations belong to you. We work hard to keep them that way. We collect the
            bare minimum we need to run the service, bill you correctly, and stop people from
            abusing it. We do not sell your data, we do not run ads, and we do not use your
            conversations to train models. When you delete your account, your conversations and
            files go with it.
          </p>
        </Section>

        <Section title="1. What we collect">
          <p>To run The Fixer, we collect a few categories of data:</p>
          <ul style={listStyle}>
            <li>
              <strong>Account information.</strong> Your email, name, and country at signup. A
              password hash (we never see your password in plaintext). Your billing plan and
              payment-provider identifiers (we never see your card number).
            </li>
            <li>
              <strong>Conversations and files.</strong> The messages you send to a model, the
              responses you receive, and any files or images you upload while chatting.
            </li>
            <li>
              <strong>Usage metrics.</strong> Lightweight counters per account: requests per
              minute, tokens per minute, number of threads, average tokens per thread, longest
              context window seen. We use these for billing, fairness, and detecting abuse.
            </li>
            <li>
              <strong>Audit events.</strong> Sign-ins, plan changes, refund requests, and similar
              account-state events. We record what happened, when, and for which account, for
              security and accountability.
            </li>
          </ul>
          <p>
            That is the complete list. We do not collect browsing history outside our site, we do
            not place tracking pixels in your inbox, and we do not buy data about you from
            third-party data brokers.
          </p>
        </Section>

        <Section title="2. How your conversations reach the model">
          <p>
            When you send a message, it leaves our infrastructure for a moment so the LLM provider
            can generate a response. Today, your prompts are routed through Microsoft AI Foundry
            to Anthropic's models. As we expand the model catalog, we are integrating additional
            providers (including AWS Bedrock for upcoming models) under the same rules described
            below. Other LLM-routing partners we add will be listed in our subprocessors section
            and announced before they go live.
          </p>
          <p>
            This is the same hop that happens when you use Claude.ai or ChatGPT directly. The
            difference is what we do around it. We have configured our LLM partners so that your
            prompts and responses are not used to train their models. They process the request to
            generate your reply, and that is it. Microsoft AI Foundry's terms confirm this in
            writing for Anthropic deployments.
          </p>
          <p>
            All in-flight traffic between you, our infrastructure, and our partners is encrypted
            in transit (TLS 1.2 or higher). All data at rest on our infrastructure is encrypted by
            Azure-managed keys. As we add cloud-routed providers, those providers' managed
            encryption applies to the traffic they handle.
          </p>
        </Section>

        <Section title="3. Context-on-Demand and what it means for your data">
          <p>
            Context-on-Demand is the engine behind The Fixer. In plain terms, before each model
            call, we run a small audit of your in-thread context to figure out what the model
            actually needs to answer well, and we send only that. The audit happens in our
            infrastructure, on parallel passes that run alongside your main reply. A soft-memory
            anchor preserves the meaning of older turns without pushing every token back to the
            provider.
          </p>
          <p>
            The practical effect on your privacy: the LLM provider receives less of your raw
            context than they would in a normal chat client, and the audit machinery itself never
            persists your conversation outside our database. The goal is the same as the rest of
            this policy: take the bare minimum needed to serve you.
          </p>
        </Section>

        <Section title="4. Who can see your data">
          <p>
            <strong>You.</strong> Your full conversation history, files, and account settings are
            yours to read, export, and delete from your dashboard.
          </p>
          <p>
            <strong>Our LLM providers, for the duration of a request.</strong> Microsoft AI
            Foundry (today), and additional providers we onboard, see your prompt and our
            response while they generate it. They do not retain it for training under the
            agreements we have with them.
          </p>
          <p>
            <strong>Payment processors.</strong> Razorpay and PayPal handle your payment details.
            We never see your card number, UPI handle, or bank account. We only store the
            subscription and payment IDs they hand back to us so we can reconcile billing.
          </p>
          <p>
            <strong>Our team, only when needed.</strong> We do not browse your conversations as a
            matter of course. Operator access to user data is reserved for specific cases:
            responding to a support request you opened, investigating a suspected security or
            abuse incident, or complying with a lawful order. We log this access. Our roadmap is
            to push this access boundary further so that even those narrow cases require explicit
            user-permitted scripts.
          </p>
          <p>
            <strong>Nobody else.</strong> We do not sell your data, we do not share it with
            advertisers or data brokers, and we do not have an analytics pixel in the chat
            interface.
          </p>
        </Section>

        <Section title="5. How long we keep things">
          <ul style={listStyle}>
            <li>
              <strong>Conversations and files.</strong> Kept while your account exists. Deleted
              when you delete your account, or sooner if you delete a specific conversation.
            </li>
            <li>
              <strong>Account profile.</strong> Kept until you delete your account.
            </li>
            <li>
              <strong>Aggregate usage and billing metadata.</strong> Retained for up to 24 months
              after account deletion in de-identified form, for tax, accounting, and fraud
              prevention. This does not include your conversation contents.
            </li>
            <li>
              <strong>Audit log.</strong> Account-state events (sign-ins, plan changes, refund
              decisions) are retained for 12 months. We need this for security and dispute
              resolution.
            </li>
          </ul>
        </Section>

        <Section title="6. Your rights">
          <p>You can do all of the following from <a href="/app/account" style={linkStyle}>your account page</a>, or by emailing us:</p>
          <ul style={listStyle}>
            <li>Access and export your conversations and account data.</li>
            <li>Correct your name, email, country, or other profile fields.</li>
            <li>Delete your account, your conversations, and your uploaded files.</li>
            <li>Withdraw consent for any optional data use we may add in the future.</li>
            <li>
              File a complaint with your local data-protection authority. In India that is the
              Data Protection Board under the DPDP Act, 2023. In the EU/UK it is your country's
              supervisory authority.
            </li>
          </ul>
          <p>
            Account deletion is one click on your account page. It removes your conversations,
            files, profile, and any per-account settings. It cancels your active subscription so
            you are not charged again. Aggregate billing metadata is retained as described above.
          </p>
        </Section>

        <Section title="7. Children">
          <p>
            The Fixer is not intended for users under 18. We do not knowingly collect data from
            anyone under 18. If you believe a minor has signed up, contact us and we will close
            the account and remove the data.
          </p>
        </Section>

        <Section title="8. Subprocessors and cloud providers">
          <p>The companies that touch your data on our behalf:</p>
          <ul style={listStyle}>
            <li><strong>Microsoft Azure</strong>: hosting our backend, database, and the AI Foundry endpoint that routes prompts to Anthropic models. Region: East US 2.</li>
            <li><strong>Supabase</strong>: managed Postgres for account, billing, and audit data. Region: us-east-1.</li>
            <li><strong>Cloudflare</strong>: edge security, DNS, and the gate in front of our chat surface.</li>
            <li><strong>Razorpay</strong> and <strong>PayPal</strong>: payment processing.</li>
            <li><strong>Resend</strong>: transactional email (signup confirmation, refund decisions, invoice receipts).</li>
            <li><strong>AWS</strong>: rolling out for additional LLM model coverage via AWS Bedrock. Will appear here when live.</li>
          </ul>
          <p>
            We update this list before adding a new subprocessor. If you have an active
            subscription when we add one, we email you in advance.
          </p>
        </Section>

        <Section title="9. Security and incident response">
          <p>
            We treat user conversations as the most sensitive data on our platform. Encryption at
            rest, encryption in transit, separated infrastructure for billing and chat, narrow
            operator access, and continuous improvements to isolation are how we live up to the
            commitment in the short version. If we ever discover a breach that affects your
            personal data, we will email you and the relevant data-protection authority within 72
            hours of confirming it, with what we know, what we are doing about it, and what you
            can do to protect yourself.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            When we change anything material in this policy, we will email you at the address on
            your account before the change takes effect, and we will keep older versions linked
            from this page so you can compare. The "Last updated" date at the top will reflect
            the most recent change.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions, deletion requests, complaints, or anything else:{' '}
            <a href="mailto:venu-kumar@thefixer.in?subject=Privacy" style={linkStyle}>
              venu-kumar@thefixer.in
            </a>. We reply within three business days, usually sooner.
          </p>
        </Section>

        <p style={{ color: 'var(--color-text-dim)', fontSize: 12, marginTop: 48 }}>
          <a href="/refund-policy" style={linkStyle}>Refund policy</a>{' '}|{' '}
          <a href="/pricing" style={linkStyle}>Pricing</a>
        </p>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 10, marginTop: 24, opacity: 0.7 }}>
          Operator and data fiduciary: Venu Kumar, sole proprietor, India. Disclosed in compliance with India's DPDP Act, 2023.
        </p>
      </main>

      <footer style={{
        padding: '20px 32px',
        fontSize: 11,
        color: 'var(--color-text-dim)',
        letterSpacing: '0.04em',
        textAlign: 'center',
      }}>
        thefixer.in
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 600,
        margin: '0 0 12px',
        letterSpacing: '-0.005em',
      }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)' }}>
        {children}
      </div>
    </section>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  fontSize: 12,
  letterSpacing: '0.06em',
  textDecoration: 'none',
};
const navLinkDimStyle: React.CSSProperties = {
  ...navLinkStyle,
  color: 'var(--color-text-dim)',
};
const linkStyle: React.CSSProperties = {
  color: 'var(--color-link)',
  textDecoration: 'underline',
};
const listStyle: React.CSSProperties = {
  paddingLeft: 24,
  margin: '12px 0',
};
