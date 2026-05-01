import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { useAccount } from '@/hooks/useAccount';

type Branch = 'clean' | 'solo_cancel' | 'leave_other_workspace' | 'reject_admin_of_own';

interface Preview {
  branch: Branch;
  inviter_email: string;
  workspace_plan_id: string;
  refund_amount_cents: number | null;
  leaving_workspace_admin_email: string | null;
}

type ErrorKind = 'expired' | 'unrecognized';

export default function WorkspaceAccept(): ReactNode {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { data: account, loading: accountLoading } = useAccount();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorState, setErrorState] = useState<ErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (accountLoading || !account) return;
    let cancelled = false;
    api<Preview>(`/v1/workspace/accept-invite?token=${encodeURIComponent(token)}`)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 410) setErrorState('expired');
        else setErrorState('unrecognized');
      });
    return () => {
      cancelled = true;
    };
  }, [account, accountLoading, token]);

  if (accountLoading) {
    return (
      <div className="workspace-accept-page">
        <p className="workspace-accept-loading">Loading...</p>
      </div>
    );
  }

  if (!account) {
    return <AuthGate token={token} />;
  }

  if (errorState) return <ErrorCard kind={errorState} />;

  if (!preview) {
    return (
      <div className="workspace-accept-page">
        <p className="workspace-accept-loading">Loading invite...</p>
      </div>
    );
  }

  if (preview.branch === 'reject_admin_of_own') {
    return <AdminOfOwnCard onGo={() => navigate('/app/workspace')} />;
  }

  async function onConfirm(): Promise<void> {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api('/v1/workspace/accept-invite', { method: 'POST', body: { token } });
      navigate('/app/workspace');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not accept invite. Try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function onCancel(): void {
    navigate(-1);
  }

  if (preview.branch === 'clean') {
    return (
      <CleanCard
        preview={preview}
        onConfirm={onConfirm}
        onCancel={onCancel}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }
  if (preview.branch === 'solo_cancel') {
    return (
      <SoloCard
        preview={preview}
        onConfirm={onConfirm}
        onCancel={onCancel}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }
  return (
    <LeaveOtherCard
      preview={preview}
      onConfirm={onConfirm}
      onCancel={onCancel}
      submitting={submitting}
      submitError={submitError}
    />
  );
}

interface CardShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  submitError?: string | null;
}

function CardShell({ eyebrow, title, children, actions, submitError }: CardShellProps): ReactNode {
  return (
    <div className="workspace-accept-page">
      <p className="workspace-accept-eyebrow">{eyebrow}</p>
      <h1 className="workspace-accept-title">{title}</h1>
      <div>{children}</div>
      <div className="workspace-accept-actions">{actions}</div>
      {submitError ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 12.5, marginTop: 16, fontFamily: 'var(--font-mono)' }}>
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

interface ConfirmCardProps {
  preview: Preview;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitError: string | null;
}

function CleanCard({ preview, onConfirm, onCancel, submitting, submitError }: ConfirmCardProps): ReactNode {
  return (
    <CardShell
      eyebrow="Workspace invitation"
      title={`Join ${preview.inviter_email}'s workspace on The Fixer`}
      submitError={submitError}
      actions={
        <>
          <button
            type="button"
            className="workspace-accept-cta"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Joining...' : 'Join workspace'}
          </button>
          <button type="button" className="workspace-accept-cta-quiet" onClick={onCancel}>
            Cancel
          </button>
        </>
      }
    >
      <p className="workspace-accept-sub">{preview.inviter_email} invited you to their Workspace.</p>
      <div className="workspace-accept-block">
        <div className="workspace-accept-block-label">What this means</div>
        <div className="workspace-accept-block-body">
          <ul>
            <li>You share their pool access. No separate billing for you.</li>
            <li>Your API keys stay yours. New keys you mint also draw from the pool.</li>
            <li>You can leave anytime.</li>
          </ul>
        </div>
      </div>
    </CardShell>
  );
}

function SoloCard({ preview, onConfirm, onCancel, submitting, submitError }: ConfirmCardProps): ReactNode {
  const refundDollars =
    preview.refund_amount_cents != null
      ? `$${(preview.refund_amount_cents / 100).toFixed(2)}`
      : 'a prorated portion';
  return (
    <CardShell
      eyebrow="Workspace invitation"
      title={`Join ${preview.inviter_email}'s workspace on The Fixer`}
      submitError={submitError}
      actions={
        <>
          <button
            type="button"
            className="workspace-accept-cta"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Joining...' : 'Cancel Solo and join'}
          </button>
          <button type="button" className="workspace-accept-cta-quiet" onClick={onCancel}>
            Not now
          </button>
        </>
      }
    >
      <p className="workspace-accept-sub">{preview.inviter_email} invited you to their Workspace.</p>
      <div className="workspace-accept-block workspace-accept-block-warn">
        <div className="workspace-accept-block-label">Heads up</div>
        <p className="workspace-accept-block-body">
          You currently have a Solo subscription. Joining will cancel that subscription. PayPal will refund <strong>{refundDollars}</strong> for the unused portion of this billing cycle.
        </p>
      </div>
      <div className="workspace-accept-block">
        <div className="workspace-accept-block-label">After joining</div>
        <div className="workspace-accept-block-body">
          <ul>
            <li>Your usage moves to the workspace pool.</li>
            <li>Your existing keys keep working without changes.</li>
            <li>You can leave anytime; you would then need a new subscription to keep using The Fixer.</li>
          </ul>
        </div>
      </div>
    </CardShell>
  );
}

function LeaveOtherCard({ preview, onConfirm, onCancel, submitting, submitError }: ConfirmCardProps): ReactNode {
  const oldAdmin = preview.leaving_workspace_admin_email ?? 'your current workspace';
  return (
    <CardShell
      eyebrow="Workspace invitation"
      title={`Join ${preview.inviter_email}'s workspace on The Fixer`}
      submitError={submitError}
      actions={
        <>
          <button
            type="button"
            className="workspace-accept-cta"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Joining...' : `Leave ${oldAdmin} and join`}
          </button>
          <button type="button" className="workspace-accept-cta-quiet" onClick={onCancel}>
            Not now
          </button>
        </>
      }
    >
      <p className="workspace-accept-sub">{preview.inviter_email} invited you to their Workspace.</p>
      <div className="workspace-accept-block workspace-accept-block-warn">
        <div className="workspace-accept-block-label">Heads up</div>
        <p className="workspace-accept-block-body">
          You're currently a member of <strong>{oldAdmin}</strong>'s workspace. Joining {preview.inviter_email}'s workspace will leave that one automatically. Their admin won't be charged for your seat anymore.
        </p>
      </div>
    </CardShell>
  );
}

function AdminOfOwnCard({ onGo }: { onGo: () => void }): ReactNode {
  return (
    <div className="workspace-accept-page">
      <p className="workspace-accept-eyebrow">Workspace invitation</p>
      <h1 className="workspace-accept-error-title">You can't join this workspace</h1>
      <p className="workspace-accept-error-body">
        You're already the admin of your own workspace. Cancel or wind down your workspace first, then ask the inviter for a fresh invite.
      </p>
      <div className="workspace-accept-actions">
        <button type="button" className="workspace-accept-cta-quiet" onClick={onGo}>
          Go to my workspace
        </button>
      </div>
    </div>
  );
}

function ErrorCard({ kind }: { kind: ErrorKind }): ReactNode {
  if (kind === 'expired') {
    return (
      <div className="workspace-accept-page">
        <p className="workspace-accept-eyebrow">Workspace invitation</p>
        <h1 className="workspace-accept-error-title">This invite has expired</h1>
        <p className="workspace-accept-error-body">Ask the inviter to send a new one.</p>
      </div>
    );
  }
  return (
    <div className="workspace-accept-page">
      <p className="workspace-accept-eyebrow">Workspace invitation</p>
      <h1 className="workspace-accept-error-title">Link not recognized</h1>
      <p className="workspace-accept-error-body">
        This invite link doesn't match an active invitation. It may have been used already or the URL is incomplete.
      </p>
    </div>
  );
}

function AuthGate({ token }: { token: string }): ReactNode {
  const signupUrl = `/signup?invite=${encodeURIComponent(token)}`;
  const loginUrl = `/login?invite=${encodeURIComponent(token)}`;
  return (
    <div className="workspace-accept-page">
      <p className="workspace-accept-eyebrow">Workspace invitation</p>
      <h1 className="workspace-accept-title">You've been invited to a workspace on The Fixer</h1>
      <div className="workspace-accept-block">
        <p className="workspace-accept-block-body">
          Sign in or sign up using the email this invite was sent to. The invite is bound to that email; using a different one will not work.
        </p>
      </div>
      <div className="workspace-accept-actions">
        <a className="workspace-accept-cta" href={signupUrl}>
          Sign up
        </a>
        <a className="workspace-accept-cta-quiet" href={loginUrl}>
          Sign in
        </a>
      </div>
    </div>
  );
}
