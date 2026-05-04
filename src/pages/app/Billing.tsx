import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RedeemPromoForm } from '@/components/forms/RedeemPromoForm';
import { RedeemCodeForm } from '@/components/billing/RedeemCodeForm';
import { CascadeCancelDialog } from '@/components/workspace/CascadeCancelDialog';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserMe } from '@/hooks/useUserMe';
import { useWorkspace } from '@/hooks/useWorkspace';
import { formatDateTime } from '@/lib/format';

export default function Billing() {
  const { data, loading, refresh: refreshAccount } = useAccount();
  const { subscription, cancel, redeem } = useSubscription();
  const { refresh: refreshUserMe } = useUserMe();
  const { workspace } = useWorkspace();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cascadeOpen, setCascadeOpen] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  const u = data.user;
  const showSubscribe = ['trial', 'trial_expired', 'cancelled', 'expired'].includes(u.status);
  // Plan card surfaces the active SKU + change-plan link for paying users
  // and the comp window + subscribe-to-paid link for comp recipients.
  const showPlanCard = (u.status === 'active' || u.status === 'comped') && Boolean(u.plan_id);

  const memberOnlyCount = (workspace?.members ?? []).filter((m) => !m.is_admin).length;
  const isWorkspaceAdminTier =
    workspace?.viewer_role === 'admin' && (workspace?.plan_id ?? '').startsWith('workspace-');
  const cascadeNeeded = isWorkspaceAdminTier && memberOnlyCount > 0;

  function onCancelClicked() {
    if (cascadeNeeded) {
      setCascadeOpen(true);
    } else {
      setConfirmCancel(true);
    }
  }

  const accessLossDate = workspace?.renews_at
    ? new Date(workspace.renews_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Billing</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Pricing and plan management.
        </p>
      </header>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Current plan
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Status: <strong>{u.status}</strong>
          {subscription?.next_billing_time && (
            <>, next charge {formatDateTime(subscription.next_billing_time)}</>
          )}
          {u.status === 'comped' && u.comp_until && (
            <>, comped through {formatDateTime(u.comp_until)}</>
          )}
        </p>
        {u.cancels_at && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>
            Subscription ends {formatDateTime(u.cancels_at)}.
          </p>
        )}
      </Card>

      {showSubscribe ? (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Subscribe
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 12px' }}>
            Pick a plan to keep your access after the trial ends.
          </p>
          <Link to="/pricing" className="trial-banner-cta">See plans &rarr;</Link>
        </Card>
      ) : null}

      {showPlanCard ? (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Plan
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text)', margin: '0 0 12px' }}>
            <span className="code-id" style={{ color: 'var(--color-accent-copper-bright)' }}>{u.plan_id}</span>
            {' '}with {u.seat_count} seat{u.seat_count === 1 ? '' : 's'}
            {u.status === 'comped' && u.comp_until
              ? ` (comped through ${formatDateTime(u.comp_until)})`
              : '.'}
          </p>
          <Link to="/app/billing/upgrade" className="trial-banner-cta">
            {u.status === 'comped' ? 'Subscribe to a paid plan' : 'Change plan'} &rarr;
          </Link>
        </Card>
      ) : null}

      {u.status === 'active' && !u.cancels_at && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Cancel
          </p>
          <Button variant="ghost" onClick={onCancelClicked}>
            Cancel subscription
          </Button>
        </Card>
      )}

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Have a code?
        </p>
        <RedeemCodeForm
          onRedeemed={async () => {
            await Promise.all([refreshAccount(), refreshUserMe()]);
          }}
        />
      </Card>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Promo code (legacy)
        </p>
        <RedeemPromoForm onRedeem={redeem} />
      </Card>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel subscription?">
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Your keys keep working until the end of the current billing period. You will not be charged again.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep subscription</Button>
          <Button
            variant="danger"
            onClick={async () => { await cancel(); setConfirmCancel(false); }}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>

      {cascadeOpen && workspace ? (
        <CascadeCancelDialog
          members={workspace.members.filter((m) => !m.is_admin).map((m) => ({ email: m.email }))}
          accessLossDate={accessLossDate}
          action="cancel"
          onCancel={() => setCascadeOpen(false)}
          onConfirm={async () => {
            await cancel();
            setCascadeOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
