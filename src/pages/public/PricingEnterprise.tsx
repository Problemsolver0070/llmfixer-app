import { Brand } from '@/components/shell/Brand';
import { EnterpriseContactForm } from '@/components/pricing/EnterpriseContactForm';

export default function PricingEnterprise() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--rule-fine)',
        background: 'var(--color-bg-rail)',
      }}>
        <Brand />
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="/pricing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Pricing</a>
          <a href="/login" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Sign in</a>
        </nav>
      </header>

      <main className="pricing-page">
        <section className="pricing-hero">
          <h1 className="pricing-hero-title">Enterprise inquiry.</h1>
          <p className="pricing-hero-sub">
            Tell us about your team and the constraints you are working with. We will respond within one business day.
          </p>
        </section>
        <EnterpriseContactForm />
      </main>
    </div>
  );
}
