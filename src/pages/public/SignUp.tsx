import { useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  return (
    <AuthShell title="Create account" subtitle="48-hour free trial, no card required">
      <SignUpForm inviteToken={inviteToken} />
    </AuthShell>
  );
}
