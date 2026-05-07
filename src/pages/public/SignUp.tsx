import { useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  return (
    <AuthShell title="Create account" subtitle="Sign up free. Try 3 messages, then upgrade. Cancel anytime.">
      <SignUpForm inviteToken={inviteToken} />
    </AuthShell>
  );
}
