import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import type { OnApproveData } from '@paypal/paypal-js';
import { useSubscription } from '@/hooks/useSubscription';

interface PayPalSubscribeButtonProps {
  paypalPlanId: string;
  planSku: string;
  seatCount: number;
  onActivated?: () => void;
}

/**
 * Maps a workspace seat count to the PayPal subscription quantity.
 * Mirrors the backend `app.billing.catalog.quantity_for_seat_count`:
 * solo plans always render quantity=1; workspace plans use TIERED
 * pricing where qty=1 covers the included 4 seats and qty=N covers
 * 4 + (N-1) extra seats.
 */
function quantityForSeats(planSku: string, seatCount: number): number {
  if (planSku.startsWith('solo-')) return 1;
  const includedSeats = 4;
  return 1 + Math.max(0, seatCount - includedSeats);
}

/**
 * Renders a PayPal SDK Subscribe Button bound to a known PayPal Plan id.
 * On buyer approval, hits `POST /v1/billing/subscriptions/activate` via
 * `useSubscription`, which stamps the user row with `paypal_sub_id` +
 * `status='active'` server-side and refreshes the local account cache.
 *
 * Why an SDK Subscribe Button rather than a Hosted Button: hosted
 * buttons are a one-time-payment + comp_until grant model. SDK Subscribe
 * Buttons create a real PayPal subscription that auto-renews, supports
 * /revise for plan changes, and stays in sync with our `users.plan_id`
 * via the existing webhook handler. Critical for the founding-member
 * 50% promo so subscribers keep the discount across renewal cycles.
 */
export function PayPalSubscribeButton({
  paypalPlanId,
  planSku,
  seatCount,
  onActivated,
}: PayPalSubscribeButtonProps) {
  const { activate } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      data-testid="paypal-subscribe-button-container"
    >
      <PayPalButtons
        style={{ shape: 'rect', layout: 'vertical', label: 'subscribe', color: 'silver' }}
        createSubscription={(_data, actions) =>
          actions.subscription.create({
            plan_id: paypalPlanId,
            quantity: String(quantityForSeats(planSku, seatCount)),
          })
        }
        onApprove={async (data: OnApproveData) => {
          if (!data.subscriptionID) {
            setError('PayPal did not return a subscription id.');
            return;
          }
          setActivating(true);
          setError(null);
          try {
            await activate(data.subscriptionID, planSku, seatCount, null);
            onActivated?.();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'activation failed');
          } finally {
            setActivating(false);
          }
        }}
        onError={(err) =>
          setError(err instanceof Error ? err.message : 'PayPal error')
        }
      />
      {activating ? (
        <p
          style={{
            color: 'var(--color-text-dim)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            margin: 0,
          }}
        >
          Confirming subscription...
        </p>
      ) : null}
      {error ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
