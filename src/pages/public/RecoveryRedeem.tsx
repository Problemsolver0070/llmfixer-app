import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { redeemRecoveryCode } from '@/hooks/useMfaRecovery';
import { supabase } from '@/lib/supabase';

/**
 * "Lost my authenticator" recovery flow.
 *
 * Caller is signed in (aal1) but cannot complete the aal2 challenge
 * because their TOTP factor is unreachable. They paste one of the
 * recovery codes they downloaded at enrollment time. On match, the
 * backend deletes their TOTP factor server-side, we sign them out
 * and redirect to /login with a banner telling them to re-enroll
 * after sign-in.
 *
 * This page is reachable from the MFA challenge step on the sign-in
 * form (a "Lost access?" link) and via direct navigation to /recovery.
 *
 * Why not skip the sign-out step? After the factor is deleted the
 * Supabase JWT in memory still asserts aal2 (or aal1 with an
 * outstanding aal2 requirement); a fresh session is the cleanest way
 * to land in a known good state. The user signs back in with just
 * the password and is bounced straight to security to re-enroll.
 */
export default function RecoveryRedeem(): React.ReactElement {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await redeemRecoveryCode(code.trim());
      // Sign out so the next sign-in lands without an aal2 challenge
      // (the TOTP factor is now gone). The Login page redirect param
      // bounces the user to security so they re-enroll immediately.
      await supabase.auth.signOut();
      navigate('/login?next=/app/account/security%3Fstep%3Dre-enroll', {
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Code not recognised. Each code can only be used once.');
        } else if (err.status === 409) {
          setError('Code already used. Try a different one.');
        } else if (err.status === 401) {
          setError('Sign in first, then try the recovery code again.');
        } else {
          setError('Could not verify the code. Try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, fontWeight: 300, margin: '0 0 12px' }}>
          Use a recovery code
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 18px' }}>
          Enter one of the recovery codes you saved when you set up MFA. Each
          code works once. After we verify it, you will sign in again with
          your password and be guided through enrolling a new authenticator.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <Input
            label="Recovery code"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            autoComplete="off"
            inputMode="text"
            placeholder="XXXX-XXXX-XXXX"
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
          <Button type="submit" loading={loading} loadingLabel="Verifying...">
            Verify code
          </Button>
        </form>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            marginTop: 18,
          }}
        >
          Lost the codes too?{' '}
          <Link to="/login" style={{ color: 'var(--color-link)' }}>
            Back to sign in
          </Link>
          . If you cannot recover, contact support.
        </p>
      </div>
    </div>
  );
}
