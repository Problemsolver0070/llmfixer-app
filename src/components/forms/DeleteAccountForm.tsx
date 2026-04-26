import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const PHRASE = 'delete my account';

export function DeleteAccountForm() {
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/v1/account', { method: 'DELETE' });
      await supabase.auth.signOut();
      window.location.assign('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 14px' }}>
        This cancels your subscription, revokes all keys, and deletes your account. You cannot undo this.
      </p>
      <Input
        id="delete-confirm"
        label={`Type "${PHRASE}" to confirm`}
        value={phrase}
        onChange={(e) => setPhrase(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="danger"
        loading={loading}
        loadingLabel="Deleting..."
        disabled={phrase.trim().toLowerCase() !== PHRASE}
      >
        Delete my account
      </Button>
    </form>
  );
}
