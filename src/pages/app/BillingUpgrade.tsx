import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { PlanPicker } from '@/components/pricing/PlanPicker';
import { CascadeCancelDialog } from '@/components/workspace/CascadeCancelDialog';
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

  const currentSku = account?.user.plan_id ?? null;
  const memberOnlyCount = (workspace?.members ?? []).filter((m) => !m.is_admin).length;
  const isWorkspaceAdminTier =
    workspace?.viewer_role === 'admin' && (workspace?.plan_id ?? '').startsWith('workspace-');
  const downgradingToSolo = sku.startsWith('solo-') && (currentSku ?? '').startsWith('workspace-');
  const cascadeNeeded = isWorkspaceAdminTier && memberOnlyCount > 0 && downgradingToSolo;

  async function commitChangePlan(): Promise<void> {
    setSubmitting('changing');
    try {
      const tier = sku.startsWith('solo-') ? 'solo' : 'workspace';
      const seats = tier === 'solo' ? 1 : Math.max(seatCount, 4);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>
          Change plan
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '8px 0 0' }}>
          Pick a different tier or cadence. Pro-rated by PayPal automatically.
        </p>
      </header>

      <CadenceToggle cadence={cadence} onChange={(c) => { setCadence(c); }} />

      <PlanPicker
        plans={plans}
        currentSku={sku}
        cadence={cadence}
        seatCount={seatCount}
        onPickPlan={setSku}
        onSeatCountChange={setSeatCount}
      />

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
