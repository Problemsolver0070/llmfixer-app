import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

const resetRedirect = () => `${window.location.origin}/reset`;

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function send() {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirect(),
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await send();
    setLoading(false);
    setSent(true);
  }

  async function onResend() {
    setResending(true);
    setResendSent(false);
    await send();
    setResending(false);
    setResendSent(true);
  }

  if (sent) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', textAlign: 'center', marginBottom: 14 }}>
          If an account exists for <strong>{email}</strong>, we just sent a reset link. Check your inbox.
        </p>
        {resendSent && (
          <p style={{ color: 'var(--color-success)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
            New link sent.
          </p>
        )}
        <Button onClick={onResend} loading={resending} loadingLabel="Resending...">
          Resend link
        </Button>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            marginTop: 18,
          }}
        >
          <Link to="/login" style={{ color: 'var(--color-link)' }}>
            Back to sign in
          </Link>
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
      <Button type="submit" loading={loading} loadingLabel="Sending...">
        Send reset link
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        <Link to="/login" style={{ color: 'var(--color-link)' }}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
