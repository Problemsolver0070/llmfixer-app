import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '@/components/shell/Brand';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { TierCard } from '@/components/pricing/TierCard';
import { usePlans, type Plan } from '@/hooks/usePlans';
import { useSession } from '@/hooks/useSession';

const SOLO_TAGLINE = 'A single drop-in key for one developer who already knows what heavy use looks like.';
const WORKSPACE_TAGLINE = 'Four seats, pooled context, shared key vault. The mark of a team that ships together.';
const ENTERPRISE_TAGLINE = 'Procurement, compliance, dedicated capacity. We come to you.';

const SOLO_FEATURES = [
  'No artificial caps on requests or output tokens.',
  'All live models: Sonnet 4.6, Opus 4.6, Opus 4.7.',
  'Context-on-Demand orchestration on by default.',
  'Drop-in for claude-code, Anthropic SDK, OpenCode.',
  'In-app support chat, Opus-powered.',
];
const WORKSPACE_FEATURES = [
  'Everything in Solo, per seat.',
  'Pooled context across the team.',
  'Shared key vault, per-seat usage view.',
  'Admin role for billing and seat management.',
  'Seat invites by email.',
];
const ENTERPRISE_FEATURES = [
  'Everything in Workspace.',
  'SSO and SAML.',
  'Uptime SLA with credits.',
  'Dedicated rate-limit pool.',
  'DPA, audit-log export, custom retention.',
  'Annual ACH or NET-30, MSA negotiation.',
  'Named technical contact.',
];

function pickPlan(plans: Plan[], tier: 'solo' | 'workspace', cadence: Cadence): Plan | undefined {
  return plans.find((p) => p.tier === tier && p.cadence === cadence);
}

function priceParts(plan: Plan | undefined): { price: string; period: string } {
  if (!plan) return { price: '...', period: '' };
  const display = plan.display_price;
  const splitPoint = display.indexOf(' / ');
  if (splitPoint === -1) return { price: display, period: '' };
  const headline = display.slice(0, splitPoint);
  const periodEnd = display.indexOf(' + ', splitPoint);
  const periodSlice = periodEnd === -1
    ? display.slice(splitPoint + 1)
    : display.slice(splitPoint + 1, periodEnd);
  return { price: headline, period: periodSlice };
}

function extraSeatParts(plan: Plan | undefined): { price: string; period: string; minSeats: number } | undefined {
  if (!plan || plan.tier !== 'workspace' || plan.per_seat_price_cents == null) return undefined;
  const cents = plan.per_seat_price_cents;
  const price = `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  const periodMap: Record<Cadence, string> = {
    weekly: ' / seat / week',
    monthly: ' / seat / month',
    quarterly: ' / seat / quarter',
    annual: ' / seat / year',
  };
  return { price, period: periodMap[plan.cadence], minSeats: plan.included_seats };
}

export default function Pricing() {
  const navigate = useNavigate();
  const { session, emailVerified } = useSession();
  const signedIn = Boolean(session && emailVerified);
  const { plans } = usePlans();
  const [cadence, setCadence] = useState<Cadence>('weekly');

  const solo = useMemo(() => pickPlan(plans, 'solo', cadence), [plans, cadence]);
  const workspace = useMemo(() => pickPlan(plans, 'workspace', cadence), [plans, cadence]);
  const soloParts = priceParts(solo);
  const workspaceParts = priceParts(workspace);

  function startTrial(tier: 'solo' | 'workspace'): void {
    const sku = tier === 'solo' ? `solo-${cadence}` : `workspace-${cadence}`;
    if (signedIn) {
      navigate(`/app/billing/upgrade?plan=${sku}`);
    } else {
      navigate(`/signup?plan=${sku}`);
    }
  }

  function contactSales(): void {
    navigate('/pricing/enterprise');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--rule-fine)',
        background: 'var(--color-bg-rail)',
      }}>
        <Brand />
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="/pricing" style={{ color: 'var(--color-text)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Pricing</a>
          {signedIn ? (
            <a href="/app/dashboard" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Dashboard</a>
          ) : (
            <a href="/login" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Sign in</a>
          )}
        </nav>
      </header>

      <main className="pricing-page">
        <section className="pricing-hero">
          <h1 className="pricing-hero-title">Built for heavy LLM use.</h1>
          <p className="pricing-hero-sub">
            No artificial caps. Pooled context. One drop-in key for every model. Forty-eight-hour free trial, no upfront charge.
          </p>
        </section>

        <CadenceToggle cadence={cadence} onChange={setCadence} />

        <section className="pricing-tiers">
          <TierCard
            name="Solo"
            price={soloParts.price}
            period={soloParts.period}
            tagline={SOLO_TAGLINE}
            features={SOLO_FEATURES}
            ctaLabel="Start 24-hour trial"
            onCtaClick={() => startTrial('solo')}
          />
          <TierCard
            name="Workspace"
            price={workspaceParts.price}
            period={workspaceParts.period}
            tagline={WORKSPACE_TAGLINE}
            features={WORKSPACE_FEATURES}
            extraSeat={extraSeatParts(workspace)}
            ctaLabel="Start 24-hour trial"
            onCtaClick={() => startTrial('workspace')}
          />
          <TierCard
            name="Enterprise"
            price="Custom"
            tagline={ENTERPRISE_TAGLINE}
            features={ENTERPRISE_FEATURES}
            ctaLabel="Contact sales"
            onCtaClick={contactSales}
            ctaQuiet
          />
        </section>

        <section className="pricing-footnote">
          Hit a usage limit? <a href="mailto:venu-kumar@thefixer.in?subject=Limit%20on%20api.thefixer.in">Tell us</a> and we will resolve it or refund you in full. 24-hour refund window from any charge. Prices in USD, billed via PayPal.
        </section>
      </main>
    </div>
  );
}
