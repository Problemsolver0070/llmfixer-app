import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RedeemPromoForm } from '@/components/forms/RedeemPromoForm';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { env } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export default function Billing() {
  const { data, loading } = useAccount();
  const { subscription, activate, cancel, redeem } = useSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  const u = data.user;
  const showSubscribe = ['trial', 'trial_expired', 'cancelled', 'expired'].includes(u.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Billing</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Flat rate, $9.99 first week then $19.99 per week. Cancel any time.
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
        </p>
        {u.cancels_at && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>
            Subscription ends {formatDateTime(u.cancels_at)}.
          </p>
        )}
      </Card>

      {showSubscribe && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Subscribe
          </p>
          <PayPalButtons
            style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'subscribe' }}
            createSubscription={(_data, actions) =>
              actions.subscription.create({ plan_id: env.paypalPlanId })
            }
            onApprove={async (data) => {
              if (data.subscriptionID) {
                await activate(data.subscriptionID);
              }
            }}
            onError={(err) => {
              console.error('PayPal error', err);
            }}
          />
        </Card>
      )}

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Promo code
        </p>
        <RedeemPromoForm onRedeem={redeem} />
      </Card>

      {u.status === 'active' && !u.cancels_at && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Cancel
          </p>
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel subscription
          </Button>
        </Card>
      )}

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel subscription?">
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Your keys keep working until the end of the current billing period. You will not be charged again.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep subscription</Button>
          <Button
            variant="danger"
            onClick={async () => {
              await cancel();
              setConfirmCancel(false);
            }}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
