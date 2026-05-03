import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  type MintResponse,
  type RecoveryStatus,
  mintRecoveryCodes,
  useMfaRecoveryStatus,
} from '@/hooks/useMfaRecovery';

/**
 * MFA recovery codes panel rendered inside the security page.
 *
 * Two states the user navigates through:
 *
 * - Resting: shows the chip "8 of 10 recovery codes left, minted on
 *   <date>" and a "Regenerate" button. No plaintext codes are visible
 *   here; the only place they ever appear is the response from the
 *   mint call below.
 * - Just-minted: shows the 10 plaintext codes in a monospace block
 *   plus a download (.txt) button and a copy-to-clipboard button.
 *   Big warning copy: "Save these. They will not be shown again."
 *   The user dismisses the panel back to resting state by clicking
 *   "I have saved these codes."
 *
 * The component is self-contained: no parent prop API beyond
 * optional callbacks. Caller mounts it inside the security page once
 * a TOTP factor is verified.
 */
export function RecoveryCodes({
  initialMint = null,
}: {
  /**
   * If the caller just enrolled TOTP and wants the freshly minted
   * codes shown immediately, it can pass them in. Otherwise the
   * panel starts in resting state and the user clicks Regenerate.
   */
  initialMint?: MintResponse | null;
}): React.ReactElement {
  const { status, loading, error, reload } = useMfaRecoveryStatus();
  const [mint, setMint] = useState<MintResponse | null>(initialMint);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const onMint = useCallback(async () => {
    setMinting(true);
    setMintError(null);
    try {
      const res = await mintRecoveryCodes();
      setMint(res);
      setConfirmRegen(false);
      reload();
    } catch (e) {
      setMintError(
        e instanceof Error ? e.message : 'Could not mint recovery codes.',
      );
    } finally {
      setMinting(false);
    }
  }, [reload]);

  function dismissMint() {
    setMint(null);
    setCopyState('idle');
  }

  function downloadCodes() {
    if (!mint) return;
    const blob = new Blob(
      [
        ['# The Fixer recovery codes', '# Save somewhere safe (password manager, printed copy).', '', ...mint.codes].join(
          '\n',
        ),
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thefixer-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyCodes() {
    if (!mint) return;
    try {
      await navigator.clipboard.writeText(mint.codes.join('\n'));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // Clipboard blocked. The user can still download the file or
      // hand-copy from the on-screen list.
    }
  }

  if (mint) {
    return (
      <div data-testid="mfa-recovery-codes-mint" style={{ marginTop: 18 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Your recovery codes
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-warn, #d29922)',
            margin: '12px 0 6px',
            fontWeight: 500,
          }}
        >
          Save these now. They will not be shown again.
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '0 0 14px' }}>
          Each code lets you sign in once if you lose access to your authenticator
          device. Store them in a password manager or print and lock them up.
        </p>
        <ul
          aria-label="recovery codes"
          style={{
            margin: 0,
            padding: '12px 16px',
            listStyle: 'none',
            background: 'var(--color-bg-elevated, #181818)',
            border: '1px solid var(--color-border, #2a2a2a)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 13,
            lineHeight: 1.7,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '4px 24px',
          }}
        >
          {mint.codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <Button onClick={downloadCodes}>Download .txt</Button>
          <Button variant="ghost" onClick={copyCodes}>
            {copyState === 'copied' ? 'Copied' : 'Copy all'}
          </Button>
          <Button variant="ghost" onClick={dismissMint}>
            I have saved these codes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="mfa-recovery-codes-panel" style={{ marginTop: 18 }}>
      <p
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Recovery codes
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text)', margin: '10px 0 6px' }}>
        Backup codes get you back in if you lose access to your authenticator app.
        Each code works once.
      </p>
      <RecoveryStatusLine status={status} loading={loading} error={error} />
      {confirmRegen ? (
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <Button onClick={onMint} loading={minting} loadingLabel="Generating...">
            Generate new codes
          </Button>
          <Button variant="ghost" onClick={() => setConfirmRegen(false)}>
            Cancel
          </Button>
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              flexBasis: '100%',
              margin: 0,
            }}
          >
            Generating new codes invalidates every previous code immediately.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 14, maxWidth: 240 }}>
          <Button
            variant="ghost"
            onClick={() => {
              if (status && status.remaining > 0) {
                setConfirmRegen(true);
              } else {
                void onMint();
              }
            }}
          >
            {status && status.remaining > 0
              ? 'Regenerate codes'
              : 'Generate recovery codes'}
          </Button>
        </div>
      )}
      {mintError && (
        <p
          role="alert"
          style={{ marginTop: 10, fontSize: 12, color: 'var(--color-danger)' }}
        >
          {mintError}
        </p>
      )}
    </div>
  );
}

function RecoveryStatusLine({
  status,
  loading,
  error,
}: {
  status: RecoveryStatus | null;
  loading: boolean;
  error: string | null;
}): React.ReactElement {
  if (loading) {
    return <p style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Loading...</p>;
  }
  if (error === 'mfa_required') {
    return (
      <p style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
        Verify your authenticator app, then come back to manage recovery codes.
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" style={{ fontSize: 12, color: 'var(--color-danger)' }}>
        {error}
      </p>
    );
  }
  if (!status || status.remaining === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
        No recovery codes yet. Generate a set so you don't get locked out.
      </p>
    );
  }
  const minted = status.last_minted_at
    ? new Date(status.last_minted_at).toLocaleDateString()
    : 'unknown';
  return (
    <p style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
      {status.remaining} of 10 codes remaining (minted {minted}).
    </p>
  );
}
