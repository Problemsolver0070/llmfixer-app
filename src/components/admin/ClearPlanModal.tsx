import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DestructiveConfirm } from '@/components/admin/DestructiveConfirm';
import type {
  AdminUserDetail,
  ClearPlanInput,
} from '@/hooks/useAdminUser';

interface Props {
  open: boolean;
  user: AdminUserDetail;
  onClose: () => void;
  onSubmit: (input: ClearPlanInput) => Promise<void>;
  onSaved?: () => void;
}

const CONFIRM_KEYWORD = 'CLEAR';

/**
 * Destructive modal for `POST /v1/admin/users/{user_id}/clear-plan`.
 *
 * Surfaces toggles for cancelling the PayPal subscription and refunding the
 * recent charge. Requires the operator to type "CLEAR" before the action
 * fires. Reason is required.
 */
export function ClearPlanModal({
  open,
  user,
  onClose,
  onSubmit,
  onSaved,
}: Props) {
  const [cancelPayPal, setCancelPayPal] = useState<boolean>(true);
  const [refundCharge, setRefundCharge] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }
    if (confirm !== CONFIRM_KEYWORD) {
      setError(`Type ${CONFIRM_KEYWORD} to confirm.`);
      return;
    }

    const body: ClearPlanInput = {
      cancel_paypal_sub: cancelPayPal,
      refund_recent_charge: refundCharge,
      reason: reason.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(body);
      onSaved?.();
      setReason('');
      setConfirm('');
      setCancelPayPal(true);
      setRefundCharge(false);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const reasonEmpty = reason.trim().length === 0;
  const confirmOk = confirm === CONFIRM_KEYWORD;

  return (
    <Modal open={open} onClose={onClose} title="Clear plan">
      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: '0 0 14px',
          }}
        >
          Removes plan + seat assignment for <strong>{user.email}</strong>. The
          user will be left without an active plan.
        </p>

        <label style={inlineToggleStyle}>
          <input
            type="checkbox"
            checked={cancelPayPal}
            onChange={(e) => setCancelPayPal(e.currentTarget.checked)}
          />
          <span>
            Also cancel the PayPal subscription
            {user.paypal_sub_id ? ` (${user.paypal_sub_id})` : ''}
          </span>
        </label>

        <label style={{ ...inlineToggleStyle, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={refundCharge}
            onChange={(e) => setRefundCharge(e.currentTarget.checked)}
          />
          <span>Also refund the most recent charge</span>
        </label>

        <div style={{ marginBottom: 14, marginTop: 14 }}>
          <label htmlFor="clear-plan-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="clear-plan-reason"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
            style={textareaStyle}
            required
          />
        </div>

        <DestructiveConfirm
          expected={CONFIRM_KEYWORD}
          value={confirm}
          onChange={setConfirm}
        />

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

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
            variant="danger"
            loading={submitting}
            loadingLabel="Clearing..."
            disabled={reasonEmpty || !confirmOk}
            style={{ width: 'auto' }}
          >
            Clear plan
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
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--color-text-dim)',
  cursor: 'pointer',
};
