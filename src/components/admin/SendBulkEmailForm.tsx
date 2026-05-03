import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useState,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { DestructiveConfirm } from '@/components/admin/DestructiveConfirm';
import {
  useAdminComms,
  SEGMENT_OPTIONS,
  type Segment,
  type SendResult,
} from '@/hooks/useAdminComms';

const CONFIRM_KEYWORD = 'SEND';

// Cap mirrors `MAX_HTML_BYTES` in the api repo's `schemas/admin_comms.py`.
// Hard-cap the textarea size client-side so the operator gets immediate
// feedback when they paste 100KB of inlined CSS instead of waiting for a
// 422 from the api.
const MAX_HTML_BYTES = 50_000;

interface Props {
  /** Called when a real send succeeds, so the parent can render a toast. */
  onSent?: (result: SendResult) => void;
}

/**
 * The single form for the /app/admin/comms page.
 *
 * Layout: segment select + recipient-count preview, subject, html body,
 * reason, dry-run toggle, "Send to N" destructive button. The button
 * label binds to the latest preview count; clicking it opens a
 * destructive-confirm modal (type SEND) before actually firing
 * `POST /v1/admin/comms/send`.
 */
export function SendBulkEmailForm({ onSent }: Props) {
  const { preview, send, lastPreview, lastSend, resetPreview } =
    useAdminComms();

  const [segment, setSegment] = useState<Segment>('all_users');
  const [subject, setSubject] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [dryRun, setDryRun] = useState<boolean>(false);

  const [previewing, setPreviewing] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [confirmKey, setConfirmKey] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const onSegmentChange = useCallback(
    (next: Segment) => {
      setSegment(next);
      // Stale preview: a different segment likely matches a different set,
      // so blank the count rather than render a misleading "Send to N" label.
      resetPreview();
      setPreviewError(null);
    },
    [resetPreview],
  );

  const onPreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewing(true);
    try {
      await preview({ segment, subject: orPlaceholder(subject), html: orPlaceholder(html) });
    } catch (e) {
      setPreviewError((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  }, [preview, segment, subject, html]);

  const onOpenConfirm = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSendError(null);
      if (!subject.trim()) {
        setSendError('Subject is required.');
        return;
      }
      if (!html.trim()) {
        setSendError('HTML body is required.');
        return;
      }
      if (!reason.trim()) {
        setSendError('Reason is required (powers the audit log).');
        return;
      }
      if (htmlBytes(html) > MAX_HTML_BYTES) {
        setSendError(
          `HTML body too large (${htmlBytes(html)} bytes). Limit is ${MAX_HTML_BYTES}.`,
        );
        return;
      }
      setConfirmKey('');
      setModalOpen(true);
    },
    [subject, html, reason],
  );

  const onConfirmedSend = useCallback(async () => {
    setSendError(null);
    if (confirmKey !== CONFIRM_KEYWORD) {
      setSendError(`Type ${CONFIRM_KEYWORD} to confirm.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await send({
        segment,
        subject: subject.trim(),
        html,
        reason: reason.trim(),
        dry_run: dryRun,
      });
      onSent?.(result);
      setModalOpen(false);
      setConfirmKey('');
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [confirmKey, send, segment, subject, html, reason, dryRun, onSent]);

  const previewedCount = lastPreview?.matched_count ?? null;
  const sendDisabled =
    !subject.trim() || !html.trim() || !reason.trim() || submitting;

  return (
    <Card>
      <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 6px' }}>
        Send bulk email
      </h2>
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-dim)',
          margin: '0 0 18px',
        }}
      >
        Sends the same rendered HTML to every address in the chosen segment
        via Resend. Each recipient gets their own envelope (no shared lists).
        Operations are audited.
      </p>

      <form onSubmit={onOpenConfirm} noValidate>
        <Field label="Segment">
          <select
            value={segment}
            onChange={(e) => onSegmentChange(e.currentTarget.value as Segment)}
            style={inputStyle}
          >
            {SEGMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '0 0 14px',
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onPreview}
            loading={previewing}
            loadingLabel="Counting..."
            style={{ width: 'auto' }}
          >
            Preview matched recipients
          </Button>
          {previewedCount !== null ? (
            <span style={previewBadgeStyle}>
              {previewedCount} matched
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              Click to count this segment.
            </span>
          )}
        </div>

        {lastPreview && lastPreview.first_5_emails.length > 0 && (
          <div style={previewListStyle}>
            <div style={previewListLabelStyle}>First 5 sample emails</div>
            <ul style={previewListItemsStyle}>
              {lastPreview.first_5_emails.map((email) => (
                <li key={email} style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {email}
                </li>
              ))}
            </ul>
          </div>
        )}

        {previewError && (
          <p role="alert" style={errorTextStyle}>
            {previewError}
          </p>
        )}

        <Field label="Subject">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.currentTarget.value)}
            maxLength={300}
            placeholder="Subject line (one line, plain text)"
            style={inputStyle}
            required
          />
        </Field>

        <Field
          label="HTML body"
          hint={`${htmlBytes(html)} / ${MAX_HTML_BYTES} bytes. Paste rendered HTML; templates / Markdown are out of scope for v1.`}
        >
          <textarea
            value={html}
            onChange={(e) => setHtml(e.currentTarget.value)}
            rows={14}
            spellCheck={false}
            style={textareaStyle}
            placeholder={'<p>Hi {name}, ...</p>'}
            required
          />
        </Field>

        <Field
          label="Reason"
          hint="Required. Surfaces in the audit log so future operators understand why this went out."
        >
          <textarea
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
            maxLength={2000}
            style={textareaStyle}
            placeholder="e.g. Trial-end deadline reminder, weekly newsletter."
            required
          />
        </Field>

        <label style={dryRunLabelStyle}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.currentTarget.checked)}
          />
          <span>Dry run (audits the operation, does not call Resend)</span>
        </label>

        {sendError && !modalOpen && (
          <p role="alert" style={errorTextStyle}>
            {sendError}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="danger"
            disabled={sendDisabled}
            style={{ width: 'auto' }}
          >
            {previewedCount !== null
              ? `Send to ${previewedCount} recipient${previewedCount === 1 ? '' : 's'}`
              : 'Send to segment'}
          </Button>
        </div>
      </form>

      {/* Last-send feedback. Shown alongside the form so the operator can
          confirm the audit-log id without leaving the page. The Comms page
          itself fires a toast (via onSent) and additionally renders a
          deeper recap card; this inline summary is a "what just happened"
          ribbon. */}
      {lastSend && (
        <div style={lastSendBoxStyle}>
          <div style={lastSendHeaderStyle}>
            {lastSend.dry_run ? 'Dry run complete.' : 'Send complete.'}
          </div>
          <div style={lastSendBodyStyle}>
            Segment: <code>{lastSend.segment}</code>. Recipients:{' '}
            {lastSend.recipient_count}. Sent: {lastSend.sent}. Failed:{' '}
            {lastSend.failed}.{' '}
            {lastSend.audit_log_id !== null && (
              <a
                href="/app/admin/audit-log"
                style={{ color: 'var(--color-link)' }}
              >
                View audit row #{lastSend.audit_log_id}
              </a>
            )}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={dryRun ? 'Confirm dry run' : 'Confirm bulk send'}
      >
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: '0 0 12px',
          }}
        >
          {dryRun ? (
            <>
              Dry run: writes one audit row but does not call Resend. Segment{' '}
              <code>{segment}</code>. Subject "{subject.trim()}".
            </>
          ) : (
            <>
              About to email <strong>{previewedCount ?? '?'}</strong>{' '}
              {previewedCount === 1 ? 'recipient' : 'recipients'} in segment{' '}
              <code>{segment}</code> with subject "{subject.trim()}". This
              cannot be undone.
            </>
          )}
        </p>

        <DestructiveConfirm
          expected={CONFIRM_KEYWORD}
          value={confirmKey}
          onChange={setConfirmKey}
        />

        {sendError && (
          <p role="alert" style={errorTextStyle}>
            {sendError}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setModalOpen(false)}
            style={{ width: 'auto' }}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirmedSend}
            loading={submitting}
            loadingLabel="Sending..."
            disabled={confirmKey !== CONFIRM_KEYWORD}
            style={{ width: 'auto' }}
          >
            {dryRun ? 'Confirm dry run' : 'Send now'}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Hint sits outside the <label> so the label's accessible name is just
  // the field title (matters for getByLabelText queries in tests, and for
  // screen readers that announce the label text + value, not the helper).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
          }}
        >
          {label}
        </span>
        {children}
      </label>
      {hint && (
        <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function htmlBytes(html: string): number {
  // Approximates the byte length of the body the api will receive (it's
  // sent as JSON-encoded UTF-8). Good enough for an inline counter; the
  // server enforces the real cap.
  return new TextEncoder().encode(html).length;
}

function orPlaceholder(value: string): string {
  // Pydantic on the api side enforces min_length=1 on `subject` and `html`.
  // For the preview path we don't actually need the operator to have
  // typed final copy yet; substituting a single space lets them sample
  // the segment count before drafting copy.
  return value.length > 0 ? value : ' ';
}

const inputStyle: CSSProperties = {
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};

const textareaStyle: CSSProperties = {
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 12,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
};

const previewBadgeStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.04em',
  padding: '4px 8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
};

const previewListStyle: CSSProperties = {
  marginBottom: 14,
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
};

const previewListLabelStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-text-dim)',
  marginBottom: 6,
};

const previewListItemsStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12,
  color: 'var(--color-text)',
};

const dryRunLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--color-text-dim)',
  marginBottom: 14,
  cursor: 'pointer',
};

const errorTextStyle: CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  marginBottom: 12,
};

const lastSendBoxStyle: CSSProperties = {
  marginTop: 18,
  padding: '12px 14px',
  border: '1px solid var(--color-success, var(--color-border))',
  background: 'var(--color-bg)',
};

const lastSendHeaderStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-success, var(--color-text-dim))',
  marginBottom: 6,
};

const lastSendBodyStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text)',
};
