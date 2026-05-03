import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { api, ApiError } from '@/lib/api';
import { resolveNextDestination } from '@/lib/next-redirect';

const dashboardRedirect = () => `${window.location.origin}/app/dashboard`;

const inviteAcceptRedirect = (token: string) =>
  `${window.location.origin}/app/workspace/accept?token=${encodeURIComponent(token)}`;

// Honor ?next= when present and valid, so a user who lands on /signup
// after being bounced from chat.thefixer.in returns there once their
// confirmation email is verified. Same allow-list as SignInForm.
function resolveSignupRedirect(rawNext: string | null, inviteToken: string | null | undefined) {
  if (inviteToken) return inviteAcceptRedirect(inviteToken);
  const resolved = resolveNextDestination(rawNext);
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return `${window.location.origin}${resolved}`;
}

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/;

// Read ?ref= from the URL once at form-initial-state and only accept it
// if it matches the strict 8-char alphanumeric format. Anything else is
// dropped silently (the URL is untrusted, anyone can share a link).
function initialReferralFromSearch(search: URLSearchParams): {
  code: string;
  prefilled: boolean;
} {
  const fromUrl = search.get('ref');
  if (!fromUrl) return { code: '', prefilled: false };
  const normalized = fromUrl.trim().toUpperCase();
  if (REFERRAL_CODE_PATTERN.test(normalized)) {
    return { code: normalized, prefilled: true };
  }
  return { code: '', prefilled: false };
}

// Map backend referral-claim error_codes to user-facing copy. The signup
// itself is already complete by this point, so every message reassures
// the user that their account exists.
function referralClaimErrorMessage(body: unknown): string {
  const detail =
    body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
  const code =
    detail && typeof detail === 'object'
      ? ((detail as { error_code?: string }).error_code ?? '')
      : '';
  switch (code) {
    case 'referrer_cap_reached':
      return "This referral code is at its limit right now. You're signed up, sign in and add a payment method to start your 24-hour trial.";
    case 'referrer_not_eligible':
      return "This referral code isn't active. You're signed up, add a payment method to start your 24-hour trial.";
    case 'code_not_found':
      return "Referral code not found. You're signed up, add a payment method to start your 24-hour trial.";
    case 'self_referral':
      return "You can't refer yourself. You're signed up, add a payment method to start your 24-hour trial.";
    case 'already_claimed':
      return "This account already used a referral. You're signed up, add a payment method to start your 24-hour trial.";
    default:
      return "We couldn't apply the referral code. You're signed up, contact support if needed.";
  }
}

export function SignUpForm({ inviteToken }: { inviteToken?: string | null } = {}) {
  const [searchParams] = useSearchParams();
  const initialReferral = initialReferralFromSearch(searchParams);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral.code);
  const [referralPrefilled] = useState(initialReferral.prefilled);
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralNotice, setReferralNotice] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const rawNext = searchParams.get('next');
  const emailRedirectTo = rawNext
    ? resolveSignupRedirect(rawNext, inviteToken ?? null)
    : inviteToken
      ? inviteAcceptRedirect(inviteToken)
      : dashboardRedirect();

  async function tryClaimReferral(code: string) {
    try {
      await api('/v1/referrals/claim', { method: 'POST', body: { code } });
      setReferralNotice({
        kind: 'success',
        message: 'Referral applied. 12-hour demo started.',
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setReferralNotice({ kind: 'error', message: referralClaimErrorMessage(caught.body) });
      } else {
        setReferralNotice({
          kind: 'error',
          message:
            "We couldn't apply the referral code. You're signed up, contact support if needed.",
        });
      }
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPwError(null);
    setNameError(null);
    setReferralError(null);

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError('Please enter your name.');
      return;
    }
    if (trimmedName.length > 100) {
      setNameError('Please keep your name under 100 characters.');
      return;
    }
    if (password.length < 8) {
      setPwError('Use at least 8 characters.');
      return;
    }

    const trimmedReferral = referralCode.trim().toUpperCase();
    if (trimmedReferral.length > 0 && !REFERRAL_CODE_PATTERN.test(trimmedReferral)) {
      setReferralError('Referral codes are 8 letters or numbers.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { full_name: trimmedName },
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (trimmedReferral.length > 0) {
      await tryClaimReferral(trimmedReferral);
    }

    setLoading(false);
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
    setReferralNotice(null);
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
        {referralNotice && (
          <p
            role={referralNotice.kind === 'error' ? 'alert' : undefined}
            style={{
              color:
                referralNotice.kind === 'success'
                  ? 'var(--color-success)'
                  : 'var(--color-danger)',
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            {referralNotice.message}
          </p>
        )}
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
        label="Name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        hint="What should we call you?"
        error={nameError ?? undefined}
        maxLength={100}
        required
      />
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
      <Input
        label="Referral code (optional)"
        type="text"
        autoComplete="off"
        value={referralCode}
        onChange={(e) => setReferralCode(e.currentTarget.value.toUpperCase())}
        onBlur={(e) => setReferralCode(e.currentTarget.value.trim().toUpperCase())}
        hint="Enter a code to start with a 12-hour free trial."
        error={referralError ?? undefined}
        maxLength={8}
        placeholder="ABCD1234"
        data-prefilled={referralPrefilled ? 'true' : undefined}
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
