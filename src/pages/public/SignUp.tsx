import { useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  return (
    <AuthShell title="Create account" subtitle="Subscribe to The Fixer. First charge in 24 hours. Cancel anytime.">
      <SignUpForm inviteToken={inviteToken} />
    </AuthShell>
  );
}
