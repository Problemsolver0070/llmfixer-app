import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DestructiveConfirm } from '@/components/admin/DestructiveConfirm';
import type {
  AdminUserDetail,
  CancelSubInput,
} from '@/hooks/useAdminUser';

interface Props {
  open: boolean;
  user: AdminUserDetail;
  onClose: () => void;
  onSubmit: (input: CancelSubInput) => Promise<void>;
  onSaved?: () => void;
}

const CONFIRM_KEYWORD = 'CANCEL';

/**
 * Destructive modal for `POST /v1/admin/users/{user_id}/cancel-sub`.
 *
 * Cancels the PayPal subscription, optionally refunds the most recent charge.
 * Requires "CANCEL" typed and a reason.
 */
export function CancelSubModal({
  open,
  user,
  onClose,
  onSubmit,
  onSaved,
}: Props) {
  const [refund, setRefund] = useState<boolean>(false);
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

    const body: CancelSubInput = {
      refund,
      reason: reason.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(body);
      onSaved?.();
      setReason('');
      setConfirm('');
      setRefund(false);
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
    <Modal open={open} onClose={onClose} title="Cancel subscription">
      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: '0 0 14px',
          }}
        >
          Cancels the PayPal subscription for <strong>{user.email}</strong>{' '}
          {user.paypal_sub_id ? (
            <>
              (<code>{user.paypal_sub_id}</code>)
            </>
          ) : null}
          .
        </p>

        <label style={inlineToggleStyle}>
          <input
            type="checkbox"
            checked={refund}
            onChange={(e) => setRefund(e.currentTarget.checked)}
          />
          <span>Also refund the most recent charge</span>
        </label>

        <div style={{ marginBottom: 14, marginTop: 14 }}>
          <label htmlFor="cancel-sub-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="cancel-sub-reason"
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
            Back
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={submitting}
            loadingLabel="Cancelling..."
            disabled={reasonEmpty || !confirmOk}
            style={{ width: 'auto' }}
          >
            Cancel subscription
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
