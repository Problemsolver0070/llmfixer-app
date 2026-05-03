import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRedeemCode, type RedeemCodeResult } from '@/hooks/useRedeemCode';
import { formatDuration } from '@/lib/duration';

interface Props {
  /**
   * Called after a successful redeem so the parent page can refresh
   * `useUserMe()` / `useAccount()` and re-render the rest of the billing
   * surface against the new comp state.
   */
  onRedeemed?: (result: RedeemCodeResult) => void | Promise<void>;
}

/**
 * Compact card for redeeming a paid-usage code (R3.T3.3).
 *
 * Sits under the current-plan card on `/app/billing`. Hits
 * `POST /v1/codes/redeem`. Renders an inline success block with the
 * granted duration plus the new expiry, or an inline error message
 * mapped from the backend `error_code`.
 */
export function RedeemCodeForm({ onRedeemed }: Props) {
  const { redeem, loading, lastError, reset } = useRedeemCode();
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState<RedeemCodeResult | null>(null);

  const trimmed = code.trim();
  const submittable = trimmed.length > 0 && !loading;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submittable) return;
    setSuccess(null);
    try {
      const out = await redeem(trimmed);
      setSuccess(out);
      setCode('');
      if (onRedeemed) await onRedeemed(out);
    } catch {
      // Error state is captured in `lastError` via the hook; no rethrow.
    }
  }

  function onChange(value: string) {
    // Auto-uppercase, trim leading/trailing whitespace lazily on change so
    // the visible input stays consistent with what we'll POST.
    const next = value.toUpperCase().slice(0, 64);
    setCode(next);
    // Clear any stale error/success the moment the user edits the field.
    if (lastError || success) {
      setSuccess(null);
      reset();
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Redeem a code">
      <p
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          margin: '0 0 4px',
        }}
      >
        Have a code?
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 12px' }}>
        Redeem it for granted access. No card required.
      </p>
      <Input
        label="Code"
        value={code}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="ENTERCODE"
        maxLength={64}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={loading}
      />
      {lastError && (
        <p
          role="alert"
          style={{ color: 'var(--color-danger)', fontSize: 12, margin: '0 0 12px' }}
        >
          {lastError.message}
        </p>
      )}
      {success && (
        <div
          role="status"
          style={{
            color: 'var(--color-success)',
            fontSize: 12,
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>
            {formatDuration(success.granted_seconds)} of access added.
          </p>
          <p style={{ margin: '2px 0 0', color: 'var(--color-text-dim)' }}>
            New expiry: {new Date(success.new_comp_until).toLocaleString()}.
          </p>
        </div>
      )}
      <Button
        type="submit"
        loading={loading}
        loadingLabel="Redeeming..."
        disabled={!submittable}
      >
        Redeem
      </Button>
    </form>
  );
}
