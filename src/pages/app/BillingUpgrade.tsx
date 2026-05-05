import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { PlanPicker } from '@/components/pricing/PlanPicker';
import { CascadeCancelDialog } from '@/components/workspace/CascadeCancelDialog';
import { PayPalSubscribeButton } from '@/components/billing/PayPalSubscribeButton';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useAccount } from '@/hooks/useAccount';
import { useWorkspace } from '@/hooks/useWorkspace';

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
  // Solo SKUs subscribe via the PayPal SDK Subscribe Button (real
  // recurring subscription). Workspace SKUs are not yet self-serve
  // because the workspace management page (Tasks 13-17 of A.2.b plan)
  // has not shipped; they fall through to the "contact us" notice.
  const canSelfServeSubscribe = tier === 'solo' && Boolean(selectedPlan?.paypal_plan_id);
  const introPromoActive = Boolean(selectedPlan?.intro_promo_active);

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

  const compUntil = account?.user.comp_until ?? null;
  const compPlanId = account?.user.plan_id ?? null;
  const isCompAccess =
    account?.user.status === 'active'
    && !account.user.paypal_sub_id
    && Boolean(account.user.comp_until);
  const headerTitle = hasSubscription
    ? 'Change plan'
    : isCompAccess
      ? 'Switch to a recurring subscription'
      : 'Pick a plan';
  const headerSub = hasSubscription
    ? 'Pick a different tier or cadence. Pro-rated by PayPal automatically.'
    : isCompAccess
      ? 'Optional. Your access is paid through the date below, this is only for moving to a recurring subscription.'
      : 'Pick a plan to subscribe. First charge in 24 hours.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>
          {headerTitle}
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '8px 0 0' }}>{headerSub}</p>
      </header>

      {isCompAccess && compUntil ? (
        <div style={{ border: '1px solid var(--color-border)', padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
          You're on {compPlanId ?? 'a paid plan'}, paid through{' '}
          <strong style={{ color: 'var(--color-text)' }}>{new Date(compUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
          {' '}You don't need to pick a plan to keep your access.
        </div>
      ) : null}

      {!hasSubscription && introPromoActive ? (
        <div
          data-testid="launch-promo-banner"
          style={{
            border: '1px solid var(--color-accent-copper)',
            padding: '12px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <strong style={{ color: 'var(--color-accent-copper-bright)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            50% off launch pricing
          </strong>
          <span style={{ color: 'var(--color-text-dim)' }}>
            Founding members lock in the discount for the lifetime of their subscription.
            Cancel anytime, no questions asked.
          </span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', margin: 0 }}>
            Subscribing to <strong style={{ color: 'var(--color-text)' }}>{selectedPlan.display_price}</strong>
            {introPromoActive && selectedPlan.original_display_price ? (
              <>
                {' '}(was{' '}
                <span style={{ textDecoration: 'line-through' }}>{selectedPlan.original_display_price}</span>)
              </>
            ) : null}
            {tier === 'workspace' ? <> with <strong style={{ color: 'var(--color-text)' }}>{seats} seats</strong></> : null}
          </p>
          {canSelfServeSubscribe && selectedPlan ? (
            <>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0 }}>
                Pay with the email you signed up with. First {selectedPlan.trial_days}-day{selectedPlan.trial_days === 1 ? '' : 's'} are free, no charge until then.
              </p>
              <PayPalSubscribeButton
                paypalPlanId={selectedPlan.paypal_plan_id}
                planSku={sku}
                seatCount={seats}
                onActivated={() => setSubmitting('done')}
              />
            </>
          ) : (
            <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: 0 }}>
              The {sku} plan is not available for self-service yet. Pick a
              solo plan to subscribe today, or email
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
