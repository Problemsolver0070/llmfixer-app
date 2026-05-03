import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignInForm } from '@/components/forms/SignInForm';

export default function Login() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  const expired = params.get('expired') === '1';
  const mfaRequired = params.get('mfa_required') === '1';

  useEffect(() => {
    if (params.get('reason') === 'expired') {
      toast.message('Session expired. Please sign in again.');
    }
  }, [params]);

  const subtitle = mfaRequired
    ? 'Re-authenticate with MFA to access admin'
    : 'to your console';

  return (
    <AuthShell title="Sign in" subtitle={subtitle}>
      {expired && (
        <p
          role="status"
          style={{
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '10px 12px',
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          Your admin session expired. Sign in again.
        </p>
      )}
      <SignInForm inviteToken={inviteToken} />
    </AuthShell>
  );
}
