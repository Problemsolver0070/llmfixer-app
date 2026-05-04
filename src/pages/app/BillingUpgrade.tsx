import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { PlanPicker } from '@/components/pricing/PlanPicker';
import { CascadeCancelDialog } from '@/components/workspace/CascadeCancelDialog';
import { HostedPaypalButton } from '@/components/billing/HostedPaypalButton';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useAccount } from '@/hooks/useAccount';
import { useWorkspace } from '@/hooks/useWorkspace';

// SKU -> PayPal Hosted Button id. Each entry is a button created in
// the PayPal merchant dashboard ("Manage Hosted Buttons"). Only the
// SKUs listed here can be self-served from /app/billing/upgrade;
// other SKUs render a "contact support" notice. Add new entries when
// the corresponding hosted buttons exist on PayPal's side.
const HOSTED_BUTTON_BY_SKU: Record<string, string> = {
  'solo-weekly': '27X5L7LRWJCUJ',
};

export default function BillingUpgrade() {
  const [params] = useSearchParams();
  const { plans, loading: plansLoading } = usePlans();
  const { data: account } = useAccount();
  const { changePlan } = useSubscription();
  const { workspace } = useWorkspace();

  const initialSku = params.get('plan') ?? account?.user.plan_id ?? 'solo-weekly';
  const initialCadence = (initialSku.split('-')[1] ?? 'weekly') as Cadence;

  const [sku, setSku] = useState<string>(initialSku);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [seatCount, setSeatCount] = useState<number>(account?.user.seat_count ?? 1);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cascadeOpen, setCascadeOpen] = useState(false);

  if (plansLoading) return <p style={{ color: 'var(--color-text-dim)' }}>Loading plans...</p>;

  const hasSubscription = Boolean(account?.user.paypal_sub_id);
  const currentSku = account?.user.plan_id ?? null;
  const selectedPlan = plans.find((p) => p.sku === sku);
  const tier = sku.startsWith('solo-') ? 'solo' : 'workspace';
  const seats = tier === 'solo' ? 1 : Math.max(seatCount, 4);
  const memberOnlyCount = (workspace?.members ?? []).filter((m) => !m.is_admin).length;
  const isWorkspaceAdminTier =
    workspace?.viewer_role === 'admin' && (workspace?.plan_id ?? '').startsWith('workspace-');
  const downgradingToSolo = sku.startsWith('solo-') && (currentSku ?? '').startsWith('workspace-');
  const cascadeNeeded = isWorkspaceAdminTier && memberOnlyCount > 0 && downgradingToSolo;
  const hostedButtonId = HOSTED_BUTTON_BY_SKU[sku];

  async function commitChangePlan(): Promise<void> {
    setSubmitting('changing');
    try {
      await changePlan(sku, seats);
      setSubmitting('done');
    } catch (e) {
      setSubmitting(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function onConfirm(): void {
    if (cascadeNeeded) {
      setCascadeOpen(true);
    } else {
      void commitChangePlan();
    }
  }

  const isComped = account?.user.status === 'comped';
  const compUntil = account?.user.comp_until ?? null;
  const compPlanId = account?.user.plan_id ?? null;
  const headerTitle = hasSubscription
    ? 'Change plan'
    : isComped
      ? 'Switch to a paid plan'
      : 'Pick a plan';
  const headerSub = hasSubscription
    ? 'Pick a different tier or cadence. Pro-rated by PayPal automatically.'
    : isComped
      ? 'Optional. Your comp covers you for now, this is only for switching to a paid subscription.'
      : 'Start with a 24-hour free trial. Cancel anytime before the trial ends and you will not be charged.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>
          {headerTitle}
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '8px 0 0' }}>{headerSub}</p>
      </header>

      {isComped && compUntil ? (
        <div style={{ border: '1px solid var(--color-border)', padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
          You're on {compPlanId ?? 'a comped plan'}, comped through{' '}
          <strong style={{ color: 'var(--color-text)' }}>{new Date(compUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
          {' '}You don't need to pick a plan to keep your access.
        </div>
      ) : null}

      <CadenceToggle cadence={cadence} onChange={(c) => { setCadence(c); }} />

      <PlanPicker
        plans={plans}
        currentSku={sku}
        cadence={cadence}
        seatCount={seatCount}
        onPickPlan={setSku}
        onSeatCountChange={setSeatCount}
      />

      {hasSubscription ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting === 'changing'}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-accent-copper)',
              color: 'var(--color-accent-copper-bright)',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {submitting === 'changing' ? 'Changing...' : (sku === currentSku ? 'No change' : 'Confirm change')}
          </button>
          <Link to="/app/billing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em' }}>Cancel</Link>
        </div>
      ) : selectedPlan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', margin: 0 }}>
            Subscribing to <strong style={{ color: 'var(--color-text)' }}>{selectedPlan.display_price}</strong>
            {tier === 'workspace' ? <> with <strong style={{ color: 'var(--color-text)' }}>{seats} seats</strong></> : null}
          </p>
          {hostedButtonId ? (
            <>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0 }}>
                Pay with the email you signed up with.
              </p>
              <HostedPaypalButton hostedButtonId={hostedButtonId} />
            </>
          ) : (
            <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: 0 }}>
              The {sku} plan is not available for self-service yet. Pick the
              weekly solo plan to subscribe today, or email
              venu-kumar@thefixer.in for a custom invoice.
            </p>
          )}
          <Link to="/app/billing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em' }}>Cancel</Link>
        </div>
      ) : (
        <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>Plan {sku} not found in catalog.</p>
      )}

      {submitting === 'done' ? (
        <p style={{ color: 'var(--color-success)', fontSize: 13 }}>Plan updated. Your next charge will reflect the change.</p>
      ) : null}
      {submitting?.startsWith('error') ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{submitting}</p>
      ) : null}

      {cascadeOpen && workspace ? (
        <CascadeCancelDialog
          members={workspace.members.filter((m) => !m.is_admin).map((m) => ({ email: m.email }))}
          accessLossDate="immediately"
          action="downgrade"
          onCancel={() => setCascadeOpen(false)}
          onConfirm={async () => {
            setCascadeOpen(false);
            await commitChangePlan();
          }}
        />
      ) : null}
    </div>
  );
}
