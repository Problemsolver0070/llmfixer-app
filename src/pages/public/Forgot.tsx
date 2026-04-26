import { AuthShell } from '@/components/shell/AuthShell';
import { ForgotForm } from '@/components/forms/ForgotForm';

export default function Forgot() {
  return (
    <AuthShell title="Forgot password" subtitle="we will email you a reset link">
      <ForgotForm />
    </AuthShell>
  );
}
