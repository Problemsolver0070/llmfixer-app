import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
        Check both inboxes ({currentEmail} and {email}) to confirm the change.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '0 0 14px' }}>
        Current: <strong>{currentEmail}</strong>
      </p>
      <Input
        label="New email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Sending...">
        Update email
      </Button>
    </form>
  );
}
