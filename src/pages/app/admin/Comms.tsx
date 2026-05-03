import { type CSSProperties, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SendBulkEmailForm } from '@/components/admin/SendBulkEmailForm';
import type { SendResult } from '@/hooks/useAdminComms';

/**
 * /app/admin/comms
 *
 * Single-purpose page: pick a named user segment, paste subject + HTML,
 * preview the recipient count + first 5 emails, and (after a typed-keyword
 * destructive confirm) fan out via Resend. The page itself is a thin
 * shell around `SendBulkEmailForm` plus the success-toast dropdown that
 * fires after every real send.
 *
 * Reason input is required for the audit row. Dry-run sends still write
 * an audit entry so an operator's intent ("I tried to send X to Y") is
 * recorded even when no email actually went out.
 */
export default function Comms() {
  const [toast, setToast] = useState<SendResult | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 18 }}>
        <h1 style={{ fontSize: 16, fontWeight: 400, margin: '0 0 8px' }}>
          Bulk email
        </h1>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: 0,
          }}
        >
          Send a one-off transactional email to a named segment of users.
          The fan-out goes through Resend with per-recipient envelopes (no
          shared lists). Every send writes one row to the audit log,
          including dry runs.
        </p>
      </Card>

      <SendBulkEmailForm onSent={(r) => setToast(r)} />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={toastStyle(toast.failed > 0)}
        >
          <div style={{ flex: 1 }}>
            {toast.dry_run
              ? 'Dry run recorded.'
              : `Send queued for ${toast.recipient_count} recipient${
                  toast.recipient_count === 1 ? '' : 's'
                }.`}{' '}
            {toast.failed > 0 && (
              <span style={{ color: 'var(--color-danger)' }}>
                {toast.failed} envelopes failed.
              </span>
            )}
            {toast.audit_log_id !== null && (
              <>
                {' '}
                <a href="/app/admin/audit-log" style={{ color: 'var(--color-link)' }}>
                  Audit row #{toast.audit_log_id}
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={dismissBtn}
          >
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function toastStyle(hasFailures: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    border: hasFailures
      ? '1px solid var(--color-danger)'
      : '1px solid var(--color-success, var(--color-border))',
    background: 'var(--color-bg-elev)',
    fontSize: 12,
    color: 'var(--color-text)',
  };
}

const dismissBtn: CSSProperties = {
  background: 'transparent',
  border: 0,
  color: 'var(--color-text-dim)',
  cursor: 'pointer',
  fontSize: 11,
};
