import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatedKey } from '@/hooks/useKeys';

interface Props {
  onCreate: (label: string) => Promise<CreatedKey>;
  onDone: () => void;
}

export function CreateKeyForm({ onCreate, onDone }: Props) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const out = await onCreate(label);
      setCreated(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Your new key
        </p>
        <code
          style={{
            display: 'block',
            background: 'var(--color-bg-rail)',
            padding: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            wordBreak: 'break-all',
            border: '1px solid var(--color-border)',
            marginBottom: 14,
          }}
        >
          {created.key}
        </code>
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 18 }}>
          Save it now, you cannot see it again.
        </p>
        <Button onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Label"
        placeholder="production, staging, my-laptop"
        value={label}
        onChange={(e) => setLabel(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create key
      </Button>
    </form>
  );
}
