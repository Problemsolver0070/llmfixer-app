import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

const dashboardRedirect = () => `${window.location.origin}/app/dashboard`;

const inviteAcceptRedirect = (token: string) =>
  `${window.location.origin}/app/workspace/accept?token=${encodeURIComponent(token)}`;

export function SignUpForm({ inviteToken }: { inviteToken?: string | null } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const emailRedirectTo = inviteToken ? inviteAcceptRedirect(inviteToken) : dashboardRedirect();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPwError(null);
    if (password.length < 8) {
      setPwError('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSignedUp(true);
  }

  async function onResend() {
    setResending(true);
    setResendError(null);
    setResendSent(false);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
    setResending(false);
    if (error) {
      setResendError(error.message);
      return;
    }
    setResendSent(true);
  }

  function reset() {
    setSignedUp(false);
    setResendSent(false);
    setResendError(null);
    setPassword('');
  }

  if (signedUp) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 10 }}>
          Check your inbox at <strong>{email}</strong> for a link to finish creating your account.
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          The link signs you in automatically. You can close this tab.
        </p>
        {resendSent && (
          <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}>
            New link sent.
          </p>
        )}
        {resendError && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
            {resendError}
          </p>
        )}
        <Button onClick={onResend} loading={resending} loadingLabel="Resending...">
          Resend email
        </Button>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            marginTop: 18,
          }}
        >
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--color-link)',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            Use a different email
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        hint="At least 8 characters."
        error={pwError ?? undefined}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create account
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-link)' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
