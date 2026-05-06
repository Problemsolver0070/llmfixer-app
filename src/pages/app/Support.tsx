import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  useSupportRequests,
  useSupportRequestActions,
  type SupportRequest,
  type SupportRequestKind,
  type SupportRequestStatus,
} from '@/hooks/useSupportRequests';

const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

const KIND_OPTIONS: ReadonlyArray<{ value: SupportRequestKind; label: string; description: string }> = [
  {
    value: 'bug',
    label: 'Bug',
    description: 'Something is broken or behaving wrongly.',
  },
  {
    value: 'suggestion',
    label: 'Suggestion',
    description: 'Idea for a feature, improvement, or model.',
  },
  {
    value: 'demo',
    label: 'Demo',
    description: 'Request a short paid-access window to try The Fixer.',
  },
];

const KIND_LABEL: Record<SupportRequestKind, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  demo: 'Demo',
};

const STATUS_LABEL: Record<SupportRequestStatus, string> = {
  open: 'Open',
  approved: 'Approved',
  declined: 'Declined',
  resolved: 'Resolved',
};

const STATUS_COLOR: Record<SupportRequestStatus, string> = {
  open: 'var(--color-accent-copper-bright)',
  approved: 'var(--color-success)',
  declined: 'var(--color-danger)',
  resolved: 'var(--color-text-dim)',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function KindBadge({ kind }: { kind: SupportRequestKind }): ReactNode {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--color-text-dim)',
        border: '1px solid var(--color-border)',
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function StatusBadge({ status }: { status: SupportRequestStatus }): ReactNode {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}`,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function RequestRow({ row }: { row: SupportRequest }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <li
      style={{
        listStyle: 'none',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 90px 90px 1fr 16px',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
          {formatRelative(row.created_at)}
        </span>
        <KindBadge kind={row.kind} />
        <StatusBadge status={row.status} />
        <span
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.subject}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>
          {open ? '-' : '+'}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '4px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'var(--color-text-dim)',
                textTransform: 'uppercase',
                margin: '0 0 4px',
              }}
            >
              Body
            </p>
            <p
              style={{
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              {row.body}
            </p>
          </div>
          {row.status !== 'open' && (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--color-text-dim)',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Decision
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
                {STATUS_LABEL[row.status]} on {formatAbsolute(row.decided_at)}
                {row.granted_hours != null && row.granted_hours > 0 && (
                  <> {`(${row.granted_hours}h granted)`}</>
                )}
              </p>
              {row.decision_notes && (
                <p
                  style={{
                    fontSize: 13,
                    margin: 0,
                    color: 'var(--color-text)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {row.decision_notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  borderRadius: 4,
};

export default function Support(): ReactNode {
  const list = useSupportRequests();
  const { create } = useSupportRequestActions();

  const [kind, setKind] = useState<SupportRequestKind>('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sameKindOpen = useMemo<SupportRequest | null>(() => {
    return list.data.find((r) => r.kind === kind && r.status === 'open') ?? null;
  }, [list.data, kind]);

  const subjectTooLong = subject.length > SUBJECT_MAX;
  const bodyTooLong = body.length > BODY_MAX;
  const subjectEmpty = subject.trim().length === 0;
  const bodyEmpty = body.trim().length === 0;
  const validationError =
    subjectEmpty || bodyEmpty || subjectTooLong || bodyTooLong;

  const submitDisabled =
    submitting || sameKindOpen !== null || validationError;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      const created = await create({
        kind,
        subject: subject.trim(),
        body: body.trim(),
      });
      list.prepend(created);
      setSubject('');
      setBody('');
      toast.success('Request submitted. We will email you when there is news.');
    } catch (caught) {
      const err = caught as Error & { type?: string };
      if (err.type === 'conflict_open_request_exists') {
        toast.error(`You already have an open ${KIND_LABEL[kind].toLowerCase()} request.`);
        // Refresh so the sticky open row appears in the list below.
        void list.refresh();
      } else if (err.type === 'rate_limited') {
        toast.error('Too many requests, try again later.');
      } else {
        toast.error(err.message || 'Could not submit your request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Support</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Report a bug, suggest a feature, or request a demo window.
        </p>
      </header>

      <Card>
        <form onSubmit={onSubmit} noValidate>
          <fieldset
            style={{ border: 0, padding: 0, margin: '0 0 18px' }}
            aria-labelledby="support-kind-label"
          >
            <legend id="support-kind-label" style={labelStyle}>
              Kind
            </legend>
            <div
              role="radiogroup"
              aria-labelledby="support-kind-label"
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
            >
              {KIND_OPTIONS.map((opt) => {
                const checked = opt.value === kind;
                return (
                  <label
                    key={opt.value}
                    style={{
                      flex: '1 1 180px',
                      border: `1px solid ${checked ? 'var(--color-accent-copper)' : 'var(--color-border)'}`,
                      background: checked ? 'var(--color-bg-rail)' : 'transparent',
                      padding: '10px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <input
                      type="radio"
                      name="support-kind"
                      value={opt.value}
                      checked={checked}
                      onChange={() => setKind(opt.value)}
                      style={{ marginTop: 3 }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                        {opt.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="support-subject" style={labelStyle}>
              Subject
            </label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              placeholder="One-line summary"
              maxLength={SUBJECT_MAX + 50}
              style={{
                ...fieldStyle,
                borderColor: subjectTooLong
                  ? 'var(--color-danger)'
                  : 'var(--color-border)',
              }}
            />
            <p
              style={{
                fontSize: 11,
                color: subjectTooLong ? 'var(--color-danger)' : 'var(--color-text-dim)',
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {subject.length} / {SUBJECT_MAX}
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="support-body" style={labelStyle}>
              Details
            </label>
            <textarea
              id="support-body"
              value={body}
              onChange={(e) => setBody(e.currentTarget.value)}
              placeholder={
                kind === 'demo'
                  ? 'Tell us what you want to test and roughly how long you need.'
                  : kind === 'bug'
                    ? 'Steps to reproduce, what you expected, what happened.'
                    : 'What would help and why?'
              }
              rows={8}
              maxLength={BODY_MAX + 200}
              style={{
                ...fieldStyle,
                resize: 'vertical',
                borderColor: bodyTooLong ? 'var(--color-danger)' : 'var(--color-border)',
              }}
            />
            <p
              style={{
                fontSize: 11,
                color: bodyTooLong ? 'var(--color-danger)' : 'var(--color-text-dim)',
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {body.length} / {BODY_MAX}
            </p>
          </div>

          {sameKindOpen !== null && (
            <p
              role="alert"
              style={{
                fontSize: 12,
                color: 'var(--color-accent-copper-bright)',
                marginBottom: 14,
              }}
            >
              You already have an open {KIND_LABEL[kind].toLowerCase()} request,
              scroll down to see it.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 200 }}>
              <Button
                type="submit"
                disabled={submitDisabled}
                loading={submitting}
                loadingLabel="Submitting..."
              >
                Submit request
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <section>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 400,
            margin: '0 0 12px',
            color: 'var(--color-text)',
          }}
        >
          Your requests
        </h2>
        {list.loading ? (
          <Card>
            <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Loading...</p>
          </Card>
        ) : list.error ? (
          <Card>
            <p role="alert" style={{ fontSize: 13, color: 'var(--color-danger)' }}>
              Could not load your requests. {list.error.message}
            </p>
          </Card>
        ) : list.data.length === 0 ? (
          <Card>
            <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
              No requests yet. Submit one above.
            </p>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            <ul style={{ margin: 0, padding: 0 }}>
              {list.data.map((row) => (
                <RequestRow key={row.id} row={row} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
