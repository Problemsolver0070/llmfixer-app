import { type CSSProperties, type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type {
  AdminUserDetail,
  StateOverrideInput,
} from '@/hooks/useAdminUser';

const STATUS_OPTIONS = [
  'pending',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'locked',
];

interface Props {
  user: AdminUserDetail;
  onSubmit: (input: StateOverrideInput) => Promise<void>;
  onSaved?: () => void;
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time. Strip seconds + tz.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

/**
 * State controls form for the admin UserDetail Overview tab.
 *
 * Backs `POST /v1/admin/users/{user_id}/state-override`. Each nullable field
 * (`comp_until`, `trial_ends_at`) has an explicit "clear" toggle; when the
 * toggle is on the form sends `set_*_to_null: true` instead of a value, so the
 * backend can distinguish "leave alone" from "clear". `status` is a select.
 * `reason` is required to match the rest of the admin surface.
 */
export function StateOverrideCard({ user, onSubmit, onSaved }: Props) {
  const [compUntil, setCompUntil] = useState<string>(
    isoToLocalInput(user.comp_until),
  );
  const [clearComp, setClearComp] = useState<boolean>(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string>(
    isoToLocalInput(user.trial_ends_at),
  );
  const [clearTrial, setClearTrial] = useState<boolean>(false);
  const [status, setStatus] = useState<string>(user.status);
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

    const body: StateOverrideInput = { reason: reason.trim() };

    if (clearComp) {
      body.set_comp_until_to_null = true;
    } else if (compUntil && compUntil !== isoToLocalInput(user.comp_until)) {
      body.comp_until = localInputToIso(compUntil);
    }

    if (clearTrial) {
      body.set_trial_ends_at_to_null = true;
    } else if (
      trialEndsAt &&
      trialEndsAt !== isoToLocalInput(user.trial_ends_at)
    ) {
      body.trial_ends_at = localInputToIso(trialEndsAt);
    }

    if (status !== user.status) {
      body.status = status;
    }

    const hasChange =
      body.comp_until !== undefined ||
      body.set_comp_until_to_null === true ||
      body.trial_ends_at !== undefined ||
      body.set_trial_ends_at_to_null === true ||
      body.status !== undefined;

    if (!hasChange) {
      setError('No changes to save.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(body);
      setReason('');
      setClearComp(false);
      setClearTrial(false);
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
        State controls
      </h3>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <Input
            label="Comp until"
            type="datetime-local"
            value={compUntil}
            onChange={(e) => setCompUntil(e.currentTarget.value)}
            disabled={clearComp}
          />
          <label style={inlineToggleStyle}>
            <input
              type="checkbox"
              checked={clearComp}
              onChange={(e) => setClearComp(e.currentTarget.checked)}
            />
            <span>Clear comp_until (set to null)</span>
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Input
            label="Trial ends at"
            type="datetime-local"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.currentTarget.value)}
            disabled={clearTrial}
          />
          <label style={inlineToggleStyle}>
            <input
              type="checkbox"
              checked={clearTrial}
              onChange={(e) => setClearTrial(e.currentTarget.checked)}
            />
            <span>Clear trial_ends_at (set to null)</span>
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="state-status" style={labelStyle}>
            Status
          </label>
          <select
            id="state-status"
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value)}
            style={selectStyle}
          >
            {STATUS_OPTIONS.includes(user.status) ? null : (
              <option value={user.status}>{user.status}</option>
            )}
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="state-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="state-reason"
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
          Save state
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
  fontSize: 11,
  color: 'var(--color-text-dim)',
  marginTop: 6,
  cursor: 'pointer',
};
