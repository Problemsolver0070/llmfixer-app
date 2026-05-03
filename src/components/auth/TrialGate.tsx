import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { useUserMe } from '@/hooks/useUserMe';

/**
 * TrialGate (Round 4, T4.4).
 *
 * Wraps auth'd surfaces that should be denied to users who are not in an
 * access window (no demo, no trial, no active subscription). Renders the
 * children only when at least one of the three windows is open.
 *
 * The gate is intentionally NOT mounted around `/app/billing/*` (callers
 * need a way to add a payment method) or `/app/account` /
 * `/app/profile` (callers can update their name regardless).
 *
 * Loading and error states render the wall layout's spinner and a soft
 * error rather than flashing the children. A 401 from `useUserMe` is
 * already handled by the api wrapper (sign-out + redirect), so this
 * component only ever sees 5xx-ish errors.
 */
export function TrialGate({ children }: { children: ReactNode }) {
  const { loading, error, hasAccess, refresh } = useUserMe();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: 'var(--color-text-dim)',
        }}
      >
        Checking access...
      </div>
    );
  }

  if (error && !hasAccess) {
    return <TrialWall variant="error" onReferralClaimed={refresh} />;
  }

  if (!hasAccess) {
    return <TrialWall variant="default" onReferralClaimed={refresh} />;
  }

  return <>{children}</>;
}

interface TrialWallProps {
  variant: 'default' | 'error';
  onReferralClaimed: () => void;
}

function TrialWall({ variant, onReferralClaimed }: TrialWallProps) {
  const [showReferralModal, setShowReferralModal] = useState(false);

  return (
    <div className="trial-gate">
      <div className="trial-gate-monogram" aria-hidden="true">
        F.
      </div>
      <h1 className="trial-gate-title">
        Add a payment method to start your 24-hour trial
      </h1>
      <p className="trial-gate-body">
        {variant === 'error'
          ? 'We could not confirm your access just now. Add a payment method to start your trial, or try again in a minute.'
          : 'Your access is paused. Add a payment method and we will start your trial right away. Cancel any time before the trial ends and you will not be charged.'}
      </p>
      <div className="trial-gate-actions">
        <Link to="/app/billing/upgrade" className="trial-gate-cta">
          Add payment method
        </Link>
      </div>
      <p className="trial-gate-secondary">
        Already have a referral code?{' '}
        <button
          type="button"
          className="trial-gate-secondary-link"
          onClick={() => setShowReferralModal(true)}
        >
          Click here to apply.
        </button>
      </p>
      {showReferralModal ? (
        <ReferralClaimModal
          onClose={() => setShowReferralModal(false)}
          onClaimed={() => {
            setShowReferralModal(false);
            onReferralClaimed();
          }}
        />
      ) : null}
    </div>
  );
}

interface ReferralClaimModalProps {
  onClose: () => void;
  onClaimed: () => void;
}

function ReferralClaimModal({ onClose, onClaimed }: ReferralClaimModalProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api('/v1/referrals/claim', {
        method: 'POST',
        body: { code: code.trim() },
      });
      onClaimed();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: { message?: string } } | null;
        setErrorMessage(body?.error?.message ?? 'That code did not work. Try again.');
      } else {
        setErrorMessage('Network error. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="trial-gate-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="trial-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-gate-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="trial-gate-modal-title" className="trial-gate-modal-title">
          Apply a referral code
        </h2>
        <p className="trial-gate-modal-body">
          Paste the code you were given. Valid codes unlock a 12-hour demo.
        </p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            placeholder="REFERRAL CODE"
            autoFocus
            className="trial-gate-modal-input"
            aria-label="Referral code"
          />
          {errorMessage ? (
            <p role="alert" className="trial-gate-modal-error">
              {errorMessage}
            </p>
          ) : null}
          <div className="trial-gate-modal-actions">
            <button
              type="button"
              className="trial-gate-modal-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="trial-gate-modal-submit"
              disabled={submitting || !code.trim()}
            >
              {submitting ? 'Applying...' : 'Apply code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TrialGate;
