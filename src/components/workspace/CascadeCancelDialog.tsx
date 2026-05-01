import { useEffect, useRef, useState } from 'react';

interface CascadeCancelDialogProps {
  members: { email: string }[];
  accessLossDate: string;
  action: 'downgrade' | 'cancel';
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function CascadeCancelDialog({
  members,
  accessLossDate,
  action,
  onCancel,
  onConfirm,
}: CascadeCancelDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelRef.current();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const verb = action === 'cancel' ? 'Cancelling' : 'Downgrading';
  const confirmLabel = action === 'cancel' ? 'Cancel subscription' : 'Downgrade to Solo';
  const memberNoun = members.length === 1 ? 'member' : 'members';
  const accessClause = action === 'cancel' ? `on ${accessLossDate}` : 'immediately';

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="cascade-modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="cascade-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="cascade-dialog-title" className="cascade-title">
          End workspace access for {members.length} {memberNoun}?
        </h4>
        <p className="cascade-body">
          {verb} your workspace subscription will leave these members without pool access {accessClause}:
        </p>
        <div className="cascade-members" role="list">
          {members.map((m) => (
            <div key={m.email} className="cascade-member" role="listitem">
              {m.email}
            </div>
          ))}
        </div>
        <p className="cascade-body">
          They'll receive an email letting them know. To keep using The Fixer, each member will need their own subscription.
        </p>
        <div className="cascade-actions">
          <button
            type="button"
            className="cascade-btn-keep"
            onClick={onCancel}
            disabled={submitting}
          >
            Keep workspace
          </button>
          <button
            type="button"
            className="cascade-btn-confirm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
