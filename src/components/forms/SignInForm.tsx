import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { resolveNextDestination } from '@/lib/next-redirect';

const dashboardRedirect = () => `${window.location.origin}/app/dashboard`;

const inviteAcceptRedirect = (token: string) =>
  `${window.location.origin}/app/workspace/accept?token=${encodeURIComponent(token)}`;

function isUnverified(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === 'email_not_confirmed') return true;
  return /not confirmed/i.test(err.message ?? '');
}

export function SignInForm({ inviteToken }: { inviteToken?: string | null } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mfaRequired = searchParams.get('mfa_required') === '1';
  const returnParam = searchParams.get('return');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  // MFA step-up state
  const [mfaStep, setMfaStep] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const resendEmailRedirectTo = inviteToken
    ? inviteAcceptRedirect(inviteToken)
    : dashboardRedirect();
  // Invite acceptance flow takes precedence; otherwise honor ?next= for
  // cross-subdomain redirects (e.g. chat.thefixer.in click-through).
  // When the admin gate sent us here (mfa_required=1), prefer ?return=
  // because we want to bounce back to the exact admin page after step-up.
  const successPath = inviteToken
    ? `/app/workspace/accept?token=${encodeURIComponent(inviteToken)}`
    : mfaRequired && returnParam && returnParam.startsWith('/app/')
      ? returnParam
      : resolveNextDestination(searchParams.get('next'));

  function navigateAfterSuccess() {
    if (/^https?:\/\//i.test(successPath)) {
      window.location.href = successPath;
    } else {
      navigate(successPath);
    }
  }

  async function startMfaChallenge() {
    const { data: factors, error: lfErr } = await supabase.auth.mfa.listFactors();
    if (lfErr) {
      setError('Could not load MFA factors. Sign in again.');
      return;
    }
    const verified = (factors?.all ?? []).find(
      (f) => f.factor_type === 'totp' && f.status === 'verified',
    );
    if (!verified) {
      // No factor enrolled yet, send the user to enrollment.
      navigate(`/app/account/security?return=${encodeURIComponent(successPath)}`);
      return;
    }
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
      factorId: verified.id,
    });
    if (chalErr || !chal?.id) {
      setError('Could not start the MFA challenge. Try again.');
      return;
    }
    setMfaStep({ factorId: verified.id, challengeId: chal.id });
    setMfaError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setResendSent(false);
    setResendError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      if (isUnverified(error as { code?: string; message?: string })) {
        setUnverified(true);
        return;
      }
      setError('Wrong email or password.');
      return;
    }
    if (mfaRequired) {
      await startMfaChallenge();
      setLoading(false);
      return;
    }
    setLoading(false);
    // Cross-subdomain absolute URLs need a full document navigation so the
    // browser sends the newly-set .thefixer.in cookie on the next request.
    navigateAfterSuccess();
  }

  async function onMfaVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mfaStep) return;
    setMfaLoading(true);
    setMfaError(null);
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: mfaStep.factorId,
      challengeId: mfaStep.challengeId,
      code: mfaCode.trim(),
    });
    setMfaLoading(false);
    if (verifyErr) {
      setMfaError('Invalid code. Try again.');
      return;
    }
    navigateAfterSuccess();
  }

  async function onResend() {
    setResending(true);
    setResendError(null);
    setResendSent(false);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: resendEmailRedirectTo },
    });
    setResending(false);
    if (error) {
      setResendError(error.message);
      return;
    }
    setResendSent(true);
  }

  if (mfaStep) {
    return (
      <form onSubmit={onMfaVerify} noValidate>
        <p style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 14 }}>
          Enter the 6-digit code from your authenticator app.
        </p>
        <Input
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.currentTarget.value)}
          required
        />
        {mfaError && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
            {mfaError}
          </p>
        )}
        <Button type="submit" loading={mfaLoading} loadingLabel="Verifying...">
          Verify
        </Button>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            marginTop: 18,
          }}
        >
          Lost access to your authenticator?{' '}
          <Link to="/recovery" style={{ color: 'var(--color-link)' }}>
            Use a recovery code
          </Link>
          .
        </p>
      </form>
    );
  }

  if (unverified) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 10 }}>
          Email not verified yet for <strong>{email}</strong>.
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Click the link in your inbox to finish creating your account, or send a new one.
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
        <Button onClick={onResend} loading={resending} loadingLabel="Sending...">
          Resend verification email
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
            onClick={() => setUnverified(false)}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--color-link)',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            Use a different account
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        required
      />
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <Link to="/forgot" style={{ fontSize: 11, color: 'var(--color-link)' }}>
          Forgot password?
        </Link>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Signing in...">
        Sign in
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        Don&apos;t have an account?{' '}
        <Link to="/signup" style={{ color: 'var(--color-link)' }}>
          Create one
        </Link>
      </p>
    </form>
  );
}
