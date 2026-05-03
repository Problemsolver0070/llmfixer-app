import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '@/lib/auth';
import { TrialGate } from '@/components/auth/TrialGate';
import { PostSignupGate } from '@/components/auth/PostSignupGate';
import { AppShell } from '@/components/shell/AppShell';
import { AdminLayout } from '@/pages/app/admin/AdminLayout';
import Landing from '@/pages/public/Landing';
import Login from '@/pages/public/Login';
import SignUp from '@/pages/public/SignUp';
import Forgot from '@/pages/public/Forgot';
import Reset from '@/pages/public/Reset';
import VerifyEmail from '@/pages/public/VerifyEmail';
import Pricing from '@/pages/public/Pricing';
import PricingEnterprise from '@/pages/public/PricingEnterprise';
import Dashboard from '@/pages/app/Dashboard';
import Setup from '@/pages/app/Setup';
import { Models } from '@/pages/app/Models';
import Keys from '@/pages/app/Keys';
import Billing from '@/pages/app/Billing';
import BillingUpgrade from '@/pages/app/BillingUpgrade';
import Workspace from '@/pages/app/Workspace';
import WorkspaceAccept from '@/pages/app/WorkspaceAccept';
import Account from '@/pages/app/Account';
import Profile from '@/pages/app/Profile';
import Refer from '@/pages/app/Refer';
import AdminPromos from '@/pages/app/admin/Promos';
import AdminUsers from '@/pages/app/admin/Users';
import AdminMetrics from '@/pages/app/admin/Metrics';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const routes: RouteObject[] = [
  { path: '/', Component: Landing },
  { path: '/login', Component: Login },
  { path: '/signup', Component: SignUp },
  { path: '/forgot', Component: Forgot },
  { path: '/reset', Component: Reset },
  { path: '/verify-email', Component: VerifyEmail },
  { path: '/pricing', Component: Pricing },
  { path: '/pricing/enterprise', Component: PricingEnterprise },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell><Outlet /></AppShell>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'post-signup', element: <PostSignupGate /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'setup', element: <TrialGate><Setup /></TrialGate> },
      { path: 'models', element: <TrialGate><Models /></TrialGate> },
      { path: 'keys', element: <TrialGate><Keys /></TrialGate> },
      { path: 'workspace', Component: Workspace },
      { path: 'workspace/accept', Component: WorkspaceAccept },
      { path: 'billing', Component: Billing },
      { path: 'billing/upgrade', element: <BillingUpgrade /> },
      { path: 'refer', Component: Refer },
      { path: 'account', Component: Account },
      { path: 'profile', Component: Profile },
      {
        path: 'admin',
        element: <RequireAdmin><AdminLayout /></RequireAdmin>,
        children: [
          { index: true, element: <Navigate to="/app/admin/promos" replace /> },
          { path: 'promos', Component: AdminPromos },
          { path: 'users', Component: AdminUsers },
          { path: 'metrics', Component: AdminMetrics },
        ],
      },
    ],
  },
  { path: '*', Component: placeholder('Not found') },
];
