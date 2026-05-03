import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DestructiveConfirm } from '@/components/admin/DestructiveConfirm';
import type { AdminUserDetail } from '@/hooks/useAdminUser';

interface Props {
  open: boolean;
  user: AdminUserDetail;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  onSaved?: () => void;
}

const CONFIRM_KEYWORD = 'DELETE';

/**
 * Destructive modal for `DELETE /v1/admin/users/{user_id}`.
 *
 * The hardest of the four: requires "DELETE" typed verbatim and a reason.
 */
export function DeleteUserModal({
  open,
  user,
  onClose,
  onSubmit,
  onSaved,
}: Props) {
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
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onSaved?.();
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

  return (
    <Modal open={open} onClose={onClose} title="Delete user">
      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-danger)',
            margin: '0 0 14px',
          }}
        >
          This deletes the auth user, the public user row, and any owned data
          for <strong>{user.email}</strong>. This cannot be undone.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="delete-user-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="delete-user-reason"
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
            loadingLabel="Deleting..."
            disabled={reasonEmpty || !confirmOk}
            style={{ width: 'auto' }}
          >
            Delete user
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
