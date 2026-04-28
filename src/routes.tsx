import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import { AdminLayout } from '@/pages/app/admin/AdminLayout';
import Landing from '@/pages/public/Landing';
import Login from '@/pages/public/Login';
import SignUp from '@/pages/public/SignUp';
import Forgot from '@/pages/public/Forgot';
import Reset from '@/pages/public/Reset';
import VerifyEmail from '@/pages/public/VerifyEmail';
import Dashboard from '@/pages/app/Dashboard';
import Setup from '@/pages/app/Setup';
import { Models } from '@/pages/app/Models';
import Keys from '@/pages/app/Keys';
import Billing from '@/pages/app/Billing';
import Account from '@/pages/app/Account';
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
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell><Outlet /></AppShell>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'setup', Component: Setup },
      { path: 'models', Component: Models },
      { path: 'keys', Component: Keys },
      { path: 'billing', Component: Billing },
      { path: 'account', Component: Account },
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
