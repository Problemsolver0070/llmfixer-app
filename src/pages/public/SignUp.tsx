import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  return (
    <AuthShell title="Create account" subtitle="48-hour free trial, no card required">
      <SignUpForm />
    </AuthShell>
  );
}
