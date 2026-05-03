import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DestructiveConfirm } from '@/components/admin/DestructiveConfirm';
import type {
  AdminUserDetail,
  RefundInput,
} from '@/hooks/useAdminUser';

interface Props {
  open: boolean;
  user: AdminUserDetail;
  onClose: () => void;
  onSubmit: (input: RefundInput) => Promise<void>;
  onSaved?: () => void;
}

const CONFIRM_KEYWORD = 'REFUND';

/**
 * Destructive modal for `POST /v1/admin/users/{user_id}/refund`.
 *
 * Refunds a specific PayPal capture. `amount_cents` is optional: blank means
 * "full refund", a positive integer means "partial refund". Requires "REFUND"
 * typed and a reason.
 */
export function RefundChargeModal({
  open,
  user,
  onClose,
  onSubmit,
  onSaved,
}: Props) {
  const [captureId, setCaptureId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!captureId.trim()) {
      setError('Capture id is required.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }
    if (confirm !== CONFIRM_KEYWORD) {
      setError(`Type ${CONFIRM_KEYWORD} to confirm.`);
      return;
    }

    const body: RefundInput = {
      capture_id: captureId.trim(),
      reason: reason.trim(),
    };
    if (amount.trim() !== '') {
      const cents = Number.parseInt(amount, 10);
      if (!Number.isFinite(cents) || cents <= 0) {
        setError('Amount must be a positive integer (cents).');
        return;
      }
      body.amount_cents = cents;
    }

    setSubmitting(true);
    try {
      await onSubmit(body);
      onSaved?.();
      setCaptureId('');
      setAmount('');
      setReason('');
      setConfirm('');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const reasonEmpty = reason.trim().length === 0;
  const confirmOk = confirm === CONFIRM_KEYWORD;
  const captureEmpty = captureId.trim().length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Refund a charge">
      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: '0 0 14px',
          }}
        >
          Refunds a PayPal capture on <strong>{user.email}</strong>'s account.
          Leave amount blank for a full refund.
        </p>

        <Input
          label="Capture id"
          value={captureId}
          onChange={(e) => setCaptureId(e.currentTarget.value)}
          placeholder="PAYPAL-CAPTURE-ID"
          required
        />

        <Input
          label="Amount (cents, blank = full)"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.currentTarget.value)}
        />

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="refund-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="refund-reason"
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
            loadingLabel="Refunding..."
            disabled={reasonEmpty || !confirmOk || captureEmpty}
            style={{ width: 'auto' }}
          >
            Issue refund
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
