import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type {
  AdminUserDetail,
  CapOverrideInput,
} from '@/hooks/useAdminUser';

interface Props {
  user: AdminUserDetail;
  onSubmit: (input: CapOverrideInput) => Promise<void>;
  onSaved?: () => void;
}

/**
 * Cap controls form for the admin UserDetail Overview tab.
 *
 * Backs `POST /v1/admin/users/{user_id}/cap-override`. Each numeric override
 * has an explicit "clear" toggle so we can set the field back to null (which
 * means "fall back to plan-level default").
 */
export function CapOverrideCard({ user, onSubmit, onSaved }: Props) {
  const [outputTokens, setOutputTokens] = useState<string>(
    user.output_token_override_per_week !== null
      ? String(user.output_token_override_per_week)
      : '',
  );
  const [clearOutput, setClearOutput] = useState<boolean>(false);
  const [requests, setRequests] = useState<string>(
    user.requests_override_per_week !== null
      ? String(user.requests_override_per_week)
      : '',
  );
  const [clearRequests, setClearRequests] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }

    const body: CapOverrideInput = { reason: reason.trim() };

    if (clearOutput) {
      body.set_output_to_null = true;
    } else if (outputTokens.trim() !== '') {
      const n = Number.parseInt(outputTokens, 10);
      if (!Number.isFinite(n) || n < 0) {
        setError('Output token override must be a non-negative integer.');
        return;
      }
      if (n !== user.output_token_override_per_week) body.output_token_override_per_week = n;
    }

    if (clearRequests) {
      body.set_requests_to_null = true;
    } else if (requests.trim() !== '') {
      const n = Number.parseInt(requests, 10);
      if (!Number.isFinite(n) || n < 0) {
        setError('Requests override must be a non-negative integer.');
        return;
      }
      if (n !== user.requests_override_per_week) body.requests_override_per_week = n;
    }

    const hasChange =
      body.output_token_override_per_week !== undefined ||
      body.set_output_to_null === true ||
      body.requests_override_per_week !== undefined ||
      body.set_requests_to_null === true;

    if (!hasChange) {
      setError('No changes to save.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(body);
      setReason('');
      setClearOutput(false);
      setClearRequests(false);
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const reasonEmpty = reason.trim().length === 0;

  return (
    <Card>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 400 }}>
        Cap controls
      </h3>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <Input
            label="Output tokens override per week"
            type="number"
            min={0}
            value={outputTokens}
            onChange={(e) => setOutputTokens(e.currentTarget.value)}
            disabled={clearOutput}
            placeholder="leave blank for plan default"
          />
          <label style={inlineToggleStyle}>
            <input
              type="checkbox"
              checked={clearOutput}
              onChange={(e) => setClearOutput(e.currentTarget.checked)}
            />
            <span>Clear override (use plan default)</span>
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Input
            label="Requests override per week"
            type="number"
            min={0}
            value={requests}
            onChange={(e) => setRequests(e.currentTarget.value)}
            disabled={clearRequests}
            placeholder="leave blank for plan default"
          />
          <label style={inlineToggleStyle}>
            <input
              type="checkbox"
              checked={clearRequests}
              onChange={(e) => setClearRequests(e.currentTarget.checked)}
            />
            <span>Clear override (use plan default)</span>
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="cap-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="cap-reason"
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

        <Button
          type="submit"
          loading={submitting}
          loadingLabel="Saving..."
          disabled={reasonEmpty}
        >
          Save caps
        </Button>
      </form>
    </Card>
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'var(--color-text-dim)',
  marginTop: 6,
  cursor: 'pointer',
};
