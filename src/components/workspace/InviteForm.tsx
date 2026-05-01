import { useState, type FormEvent } from 'react';

export function InviteForm({
  onInvite,
}: {
  onInvite: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onInvite(email);
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="workspace-invite-form">
      <input
        type="email"
        required
        placeholder="teammate@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="workspace-invite-input"
        disabled={pending}
      />
      <button type="submit" disabled={pending} className="workspace-invite-submit">
        {pending ? 'Sending...' : 'Send invite'}
      </button>
      {error ? (
        <p className="workspace-invite-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
