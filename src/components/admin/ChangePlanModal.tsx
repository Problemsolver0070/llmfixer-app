import { type CSSProperties, type FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePlans, type Plan } from '@/hooks/usePlans';
import type {
  AdminUserDetail,
  ChangePlanInput,
} from '@/hooks/useAdminUser';

interface Props {
  open: boolean;
  user: AdminUserDetail;
  onClose: () => void;
  onSubmit: (input: ChangePlanInput) => Promise<void>;
  onSaved?: () => void;
}

function formatPlanLabel(p: Plan): string {
  const tier = p.tier === 'solo' ? 'Solo' : 'Workspace';
  const cad = p.cadence.charAt(0).toUpperCase() + p.cadence.slice(1);
  const dollars = (p.base_price_cents / 100).toFixed(2);
  const cadShort =
    p.cadence === 'weekly'
      ? '/wk'
      : p.cadence === 'monthly'
        ? '/mo'
        : p.cadence === 'quarterly'
          ? '/qtr'
          : '/yr';
  return `${tier} ${cad} $${dollars}${cadShort}`;
}

/**
 * Modal for `POST /v1/admin/users/{user_id}/change-plan`.
 *
 * Surfaces a warning if the user has an active PayPal subscription, since the
 * backend will (per spec) cancel the old PayPal sub and issue a new one when
 * `prorate=true`. Reason is required.
 */
export function ChangePlanModal({
  open,
  user,
  onClose,
  onSubmit,
  onSaved,
}: Props) {
  const { plans, loading: plansLoading } = usePlans();
  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.tier !== b.tier) return a.tier.localeCompare(b.tier);
        return a.base_price_cents - b.base_price_cents;
      }),
    [plans],
  );
  const [planSku, setPlanSku] = useState<string>('');
  const [seatCount, setSeatCount] = useState<string>('1');
  const [prorate, setProrate] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedPlan = sortedPlans.find((p) => p.sku === planSku) ?? null;
  const isWorkspace = selectedPlan?.tier === 'workspace';
  const hasActivePayPal =
    user.paypal_sub_id !== null && user.paypal_sub_status === 'ACTIVE';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!planSku) {
      setError('Pick a target plan.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }
    const body: ChangePlanInput = {
      new_plan_sku: planSku,
      reason: reason.trim(),
      prorate,
    };
    if (isWorkspace) {
      const seats = Number.parseInt(seatCount, 10);
      if (!Number.isFinite(seats) || seats < 1) {
        setError('Seat count must be at least 1 for workspace plans.');
        return;
      }
      body.new_seat_count = seats;
    }

    setSubmitting(true);
    try {
      await onSubmit(body);
      onSaved?.();
      // Reset volatile fields and close.
      setPlanSku('');
      setReason('');
      setProrate(true);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const reasonEmpty = reason.trim().length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Change plan">
      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: '0 0 14px',
          }}
        >
          Switch <strong>{user.email}</strong> from{' '}
          <code>{user.plan_id ?? '(none)'}</code> to a new plan.
        </p>

        {hasActivePayPal && (
          <div
            role="alert"
            style={{
              padding: 10,
              border: '1px solid var(--color-accent-copper)',
              color: 'var(--color-accent-copper-bright)',
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            User has an active PayPal subscription (
            <code>{user.paypal_sub_id}</code>). Switching plans will cancel the
            existing subscription on PayPal and create a new one.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="change-plan-sku" style={labelStyle}>
            New plan
          </label>
          <select
            id="change-plan-sku"
            value={planSku}
            onChange={(e) => setPlanSku(e.currentTarget.value)}
            disabled={plansLoading}
            style={selectStyle}
          >
            <option value="">{plansLoading ? 'Loading plans...' : 'Pick a plan'}</option>
            {sortedPlans.map((p) => (
              <option key={p.sku} value={p.sku}>
                {formatPlanLabel(p)} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {isWorkspace && (
          <Input
            label="Seat count"
            type="number"
            min={1}
            value={seatCount}
            onChange={(e) => setSeatCount(e.currentTarget.value)}
            required
          />
        )}

        <label style={inlineToggleStyle}>
          <input
            type="checkbox"
            checked={prorate}
            onChange={(e) => setProrate(e.currentTarget.checked)}
          />
          <span>Prorate the change (refund / charge difference)</span>
        </label>

        <div style={{ marginBottom: 14, marginTop: 14 }}>
          <label htmlFor="change-plan-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="change-plan-reason"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
            style={textareaStyle}
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: 'var(--color-danger)',
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            style={{ width: 'auto' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            loadingLabel="Changing..."
            disabled={reasonEmpty || !planSku}
            style={{ width: 'auto' }}
          >
            Change plan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const selectStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 13,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  resize: 'vertical',
};

const inlineToggleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--color-text-dim)',
  cursor: 'pointer',
};
