import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useUserMe } from '@/hooks/useUserMe';
import { api, ApiError } from '@/lib/api';

const SUCCESS_TIMEOUT_MS = 3000;

function extractApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: { message?: string } } | null;
    if (body && body.error && typeof body.error.message === 'string') {
      return body.error.message;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Try again.';
}

export default function Profile() {
  const { data, loading, refresh } = useUserMe();
  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate the local input from the backend value once. After the first
  // hydrate we let the user edit freely; refresh() after a successful save
  // will re-run useUserMe but we do not want to clobber unsaved input.
  useEffect(() => {
    if (!initialized && data) {
      // Hydrate local input from server state once. setState in an effect
      // body is intentional here, mirroring `useUserMe`.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(data.full_name ?? '');
      setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Enter your name.');
      return;
    }
    if (trimmed.length > 100) {
      setError('Name is too long (max 100 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await api('/v1/users/me', { method: 'PATCH', body: { full_name: trimmed } });
      await refresh();
      setName(trimmed);
      setSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSuccess(false);
        successTimerRef.current = null;
      }, SUCCESS_TIMEOUT_MS);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !initialized) {
    return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Profile</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>
        How The Fixer addresses you in chats and in emails.
      </p>

      <Card>
        <form onSubmit={onSubmit} noValidate>
          <Input
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              if (success) setSuccess(false);
              if (error) setError(null);
            }}
            maxLength={100}
            autoComplete="name"
            required
          />
          {error && (
            <p
              role="alert"
              style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}
            >
              Saved.
            </p>
          )}
          <div style={{ maxWidth: 200 }}>
            <Button type="submit" loading={submitting} loadingLabel="Saving...">
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
