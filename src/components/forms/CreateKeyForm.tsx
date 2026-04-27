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
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [copyError, setCopyError] = useState<string | null>(null);

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

  async function onCopy(value: string) {
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard not available');
      }
      await navigator.clipboard.writeText(value);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyError('Could not copy. Select the key and copy manually.');
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
            marginBottom: 8,
          }}
        >
          {created.key}
        </code>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => onCopy(created.key)}
            style={{
              background: 'transparent',
              color: copyState === 'copied' ? 'var(--color-success)' : 'var(--color-accent-bright)',
              border: 0,
              fontSize: 12,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {copyState === 'copied' ? 'Copied' : 'Copy'}
          </button>
          {copyError && (
            <span role="alert" style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              {copyError}
            </span>
          )}
        </div>
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
