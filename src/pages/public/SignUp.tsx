import { useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  return (
    <AuthShell title="Create account" subtitle="24-hour free trial, card on file, cancel anytime">
      <SignUpForm inviteToken={inviteToken} />
    </AuthShell>
  );
}
