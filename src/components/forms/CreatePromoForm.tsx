import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatePromoInput, PromoCode } from '@/hooks/useAdminPromos';

interface Props { onCreate: (input: CreatePromoInput) => Promise<void> }

export function CreatePromoForm({ onCreate }: Props) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoCode['type']>('free_time');
  const [amount, setAmount] = useState('7');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate({
        code: code.toUpperCase(),
        type,
        amount_int: Number.parseInt(amount, 10),
        max_redemptions: maxRedemptions ? Number.parseInt(maxRedemptions, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true,
      });
      setCode('');
      setMaxRedemptions('');
      setExpiresAt('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Code"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
        required
      />
      <div style={{ marginBottom: 14 }}>
        <label
          htmlFor="promo-type"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Type
        </label>
        <select
          id="promo-type"
          value={type}
          onChange={(e) => setType(e.target.value as PromoCode['type'])}
          style={{
            width: '100%',
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '10px 12px',
            fontSize: 13,
          }}
        >
          <option value="free_time">free_time (extend trial by N days)</option>
          <option value="full_comp">full_comp (free for N days)</option>
          <option value="trial_extension">trial_extension (alias of free_time)</option>
        </select>
      </div>
      <Input
        label="Amount (days)"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.currentTarget.value)}
        required
        min={1}
      />
      <Input
        label="Max redemptions (blank = unlimited)"
        type="number"
        value={maxRedemptions}
        onChange={(e) => setMaxRedemptions(e.currentTarget.value)}
      />
      <Input
        label="Expires at (blank = never)"
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create promo
      </Button>
    </form>
  );
}
