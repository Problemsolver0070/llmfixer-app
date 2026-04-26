import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import type { RedeemResult } from '@/hooks/useSubscription';

const REASONS: Record<string, string> = {
  invalid: 'That code is not valid.',
  expired: 'That code is expired.',
  exhausted: 'That code is no longer available.',
  already_redeemed: 'You already redeemed that code.',
  wrong_status: 'That code does not apply to your current account.',
};

export function RedeemPromoForm({ onRedeem }: { onRedeem: (code: string) => Promise<RedeemResult> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const out = await onRedeem(code);
      const eff = out.applied_effect;
      if (eff.type === 'free_time' || eff.type === 'trial_extension') {
        setSuccess(`${eff.days_added} days added to your trial.`);
      } else if (eff.type === 'full_comp') {
        setSuccess(`Account comped through ${eff.comp_until}.`);
      }
      setCode('');
    } catch (caught) {
      const body = caught instanceof ApiError
        ? caught.body
        : (caught as { body?: unknown }).body;
      if (body && typeof body === 'object') {
        const reason = (body as { reason?: string }).reason;
        setError((reason && REASONS[reason]) ?? 'Could not redeem that code.');
      } else {
        setError('Could not redeem that code.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Promo code"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
        placeholder="ENTERCODE"
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}>{success}</p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Redeeming...">
        Redeem
      </Button>
    </form>
  );
}
