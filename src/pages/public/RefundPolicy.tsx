import { Brand } from '@/components/shell/Brand';
import { useSession } from '@/hooks/useSession';

export default function RefundPolicy() {
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
          Refund Policy
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '0 0 40px' }}>
          Last updated 2026-05-09.
        </p>

        <Section title="The short version">
          <p>
            Within 24 hours of subscribing, you can ask for a 100% refund as long as you have used
            less than 100,000 tokens and made fewer than 100 requests in total. After 24 hours, you
            can still ask for a partial, pro-rated refund on the remaining days of your billing cycle,
            with a 15% deduction. We process every refund manually within five business days.
          </p>
        </Section>

        <Section title="1. Full refund (within 24 hours)">
          <p>You qualify for a full refund of the amount you were charged when all of the following are true:</p>
          <ul style={listStyle}>
            <li>You request the refund within 24 hours of the original charge clearing.</li>
            <li>Your total usage on the account is below 100,000 tokens (input plus output combined).</li>
            <li>Your total request count is below 100.</li>
          </ul>
          <p>
            Promotional credit, granted hours, comp codes, and any usage paid for by someone other
            than you do not count toward your usage thresholds. Those are not refundable on their own.
          </p>
        </Section>

        <Section title="2. Partial refund (after 24 hours)">
          <p>
            After the 24-hour window closes, or if your usage exceeds the limits above, you can still
            request a pro-rated refund for the remaining days on your current billing cycle, minus a
            15% administrative deduction.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-bg-elev)', padding: '14px 16px', borderRadius: 4, fontSize: 13, lineHeight: 1.6 }}>
            refund = subscription_price × ( days_remaining / total_days_in_cycle &minus; 0.15 )
          </p>
          <p>
            <strong>Example.</strong> You bought a weekly plan at $10 and ask for a refund 3 days in,
            with 4 days remaining. The refund is $10 × (4 / 7 &minus; 0.15) = $10 × 0.4214 ≈ <strong>$4.21</strong>.
          </p>
          <p>
            If the formula yields zero or a negative number, you are not eligible for a partial refund.
            For a weekly plan that means refund eligibility ends after day 5; for a monthly plan, after
            day 25; and so on.
          </p>
        </Section>

        <Section title="3. What is not refundable">
          <ul style={listStyle}>
            <li>Granted, comped, or promotional usage hours, regardless of whether they were used.</li>
            <li>Charges already disputed or charged back through your bank or card network.</li>
            <li>Subscriptions cancelled but not refunded earlier (cancellation alone does not trigger a refund).</li>
            <li>Workspace seats removed mid-cycle, except as part of a workspace-wide refund request.</li>
          </ul>
        </Section>

        <Section title="4. How to request a refund">
          <p>
            Open <a href="/app/support" style={linkStyle}>Support</a> from your dashboard and submit
            a request with kind <em>refund</em>. Include your account email, the date of the charge,
            and a one-line reason. If you cannot sign in, email{' '}
            <a href="mailto:venu-kumar@thefixer.in?subject=Refund%20request" style={linkStyle}>
              venu-kumar@thefixer.in
            </a>{' '}
            with the same details.
          </p>
          <p>
            We review every refund manually so we can sanity-check the eligibility math and the
            usage record. You will hear back within five business days, usually sooner.
          </p>
        </Section>

        <Section title="5. How long the refund takes">
          <p>
            Once approved, the refund is initiated against your original payment method on the same
            business day. Time to land in your account depends on the payment provider and your bank,
            and is typically 5 to 10 business days. We will email you the provider's reference ID so
            you can track it.
          </p>
        </Section>

        <Section title="6. Disputes">
          <p>
            If you are not satisfied with how we handled a refund, reply to the decision email or
            write to <a href="mailto:venu-kumar@thefixer.in?subject=Refund%20dispute" style={linkStyle}>venu-kumar@thefixer.in</a>.
            We will reopen the case and reply within three business days.
          </p>
        </Section>

        <p style={{ color: 'var(--color-text-dim)', fontSize: 12, marginTop: 48 }}>
          Pricing details on the <a href="/pricing" style={linkStyle}>pricing page</a>.
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
