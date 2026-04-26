import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ChangePasswordForm() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setPw('');
    setConfirm('');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.currentTarget.value)}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {done && (
        <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}>
          Password updated.
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Saving...">
        Update password
      </Button>
    </form>
  );
}
