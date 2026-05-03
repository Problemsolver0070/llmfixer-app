import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

interface EnrolledFactor {
  id: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
  created_at: string;
}

interface PendingEnrollment {
  factorId: string;
  qrSvg: string;
  secret: string;
  otpauthUri: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Something went wrong. Please try again.';
}

export default function Security() {
  const [params] = useSearchParams();
  const returnPath = params.get('return');
  const [factors, setFactors] = useState<EnrolledFactor[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<string | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setLoadError(errorMessage(error));
      setFactors([]);
      return;
    }
    const all = data?.all ?? [];
    setFactors(
      all.map((f) => ({
        id: f.id,
        factor_type: f.factor_type,
        status: f.status as 'verified' | 'unverified',
        friendly_name: f.friendly_name ?? undefined,
        created_at: f.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial factor list load on mount; reload is stable
    void reload();
  }, [reload]);

  const verifiedFactor = factors?.find(
    (f) => f.factor_type === 'totp' && f.status === 'verified',
  );

  async function startEnroll() {
    setEnrollLoading(true);
    setVerifyError(null);
    setSuccess(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      const totp = data?.totp;
      if (!data?.id || !totp) {
        throw new Error('Enrollment did not return a factor id.');
      }
      const otpauthUri = totp.uri ?? totp.qr_code;
      const qrSvg = await QRCode.toString(otpauthUri, { type: 'svg', margin: 1, width: 220 });
      setPending({
        factorId: data.id,
        qrSvg,
        secret: totp.secret,
        otpauthUri,
      });
    } catch (e) {
      setVerifyError(errorMessage(e));
    } finally {
      setEnrollLoading(false);
    }
  }

  async function cancelEnroll() {
    if (!pending) return;
    try {
      await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
    } catch {
      // best-effort cleanup
    }
    setPending(null);
    setCode('');
    setVerifyError(null);
  }

  async function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
        factorId: pending.factorId,
      });
      if (chalErr) throw chalErr;
      if (!chal?.id) throw new Error('Challenge did not return an id.');
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: pending.factorId,
        challengeId: chal.id,
        code: code.trim(),
      });
      if (verifyErr) throw verifyErr;
      setPending(null);
      setCode('');
      setSuccess('MFA enabled.');
      await reload();
      if (returnPath && returnPath.startsWith('/app/')) {
        // Give the user a beat to read the confirmation, then bounce back.
        setTimeout(() => {
          window.location.assign(returnPath);
        }, 600);
      }
    } catch (err) {
      setVerifyError(errorMessage(err));
    } finally {
      setVerifyLoading(false);
    }
  }

  async function onDisable(factorId: string) {
    setDisableLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setLoadError(errorMessage(error));
        return;
      }
      setSuccess('MFA disabled.');
      setConfirmDisable(null);
      await reload();
    } finally {
      setDisableLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Security</h1>

      <Card>
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Two-factor authentication
        </p>

        {factors === null && (
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--color-text-dim)' }}>Loading...</p>
        )}

        {loadError && (
          <p
            role="alert"
            style={{ marginTop: 14, fontSize: 12, color: 'var(--color-danger)' }}
          >
            {loadError}
          </p>
        )}

        {success && (
          <p
            style={{ marginTop: 14, fontSize: 13, color: 'var(--color-success, #5fbf6f)' }}
          >
            {success}
          </p>
        )}

        {factors && !verifiedFactor && !pending && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text)', margin: '0 0 14px' }}>
              Use an authenticator app (1Password, Google Authenticator, Authy) to add a
              second sign-in step. Required for admin access.
            </p>
            <div style={{ maxWidth: 240 }}>
              <Button onClick={startEnroll} loading={enrollLoading} loadingLabel="Starting...">
                Enable TOTP
              </Button>
            </div>
            {verifyError && (
              <p
                role="alert"
                style={{ marginTop: 10, fontSize: 12, color: 'var(--color-danger)' }}
              >
                {verifyError}
              </p>
            )}
          </div>
        )}

        {pending && (
          <form onSubmit={onVerify} style={{ marginTop: 16 }} noValidate>
            <p style={{ fontSize: 13, color: 'var(--color-text)', margin: '0 0 12px' }}>
              Scan this QR code in your authenticator app, then enter the 6-digit code it
              shows.
            </p>
            <div
              data-testid="mfa-qr"
              style={{
                background: '#fff',
                padding: 12,
                width: 'fit-content',
                marginBottom: 12,
              }}
              dangerouslySetInnerHTML={{ __html: pending.qrSvg }}
            />
            <p
              style={{
                fontSize: 11,
                color: 'var(--color-text-dim)',
                margin: '0 0 14px',
                wordBreak: 'break-all',
              }}
            >
              Manual entry secret: <code>{pending.secret}</code>
            </p>
            <Input
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              required
            />
            {verifyError && (
              <p
                role="alert"
                style={{ marginTop: 4, marginBottom: 10, fontSize: 12, color: 'var(--color-danger)' }}
              >
                {verifyError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, maxWidth: 360 }}>
              <Button type="submit" loading={verifyLoading} loadingLabel="Verifying...">
                Verify and enable
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEnroll}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {verifiedFactor && !pending && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--color-text)', margin: '0 0 6px' }}>
              MFA enabled.
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                margin: '0 0 14px',
              }}
            >
              Factor created {formatDate(verifiedFactor.created_at)}.
            </p>
            {confirmDisable === verifiedFactor.id ? (
              <div style={{ display: 'flex', gap: 12, maxWidth: 380 }}>
                <Button
                  variant="danger"
                  onClick={() => onDisable(verifiedFactor.id)}
                  loading={disableLoading}
                  loadingLabel="Disabling..."
                >
                  Confirm disable
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDisable(null)}>
                  Keep enabled
                </Button>
              </div>
            ) : (
              <div style={{ maxWidth: 200 }}>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDisable(verifiedFactor.id)}
                >
                  Disable
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
