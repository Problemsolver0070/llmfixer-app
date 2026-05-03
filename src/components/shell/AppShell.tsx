import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Brand } from './Brand';
import { ChatNavLink } from './ChatNavLink';
import { UserMenu } from './UserMenu';
import { TrialBanner } from '@/components/trial/TrialBanner';
import { useAccount } from '@/hooks/useAccount';
import {
  AppShellWidthContext,
  type AppShellWidth,
  type AppShellWidthContextValue,
} from './appShellWidth';

const BASE_TABS_BEFORE_WORKSPACE = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/setup', label: 'Setup' },
  { to: '/app/models', label: 'Models' },
  { to: '/app/keys', label: 'Keys' },
];

const BASE_TABS_AFTER_WORKSPACE = [
  { to: '/app/billing', label: 'Billing' },
  { to: '/app/account', label: 'Account' },
];

const WORKSPACE_TAB = { to: '/app/workspace', label: 'Workspace' };

function Tab({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + '/');
  return (
    <NavLink
      to={to}
      data-active={active ? 'true' : 'false'}
      className="app-nav-tab"
      data-active-tab={active ? 'true' : 'false'}
    >
      {label}
    </NavLink>
  );
}

type Props = {
  width?: AppShellWidth;
  children: ReactNode;
};

export function AppShell({ width: initialWidth = 'narrow', children }: Props) {
  const { data } = useAccount();
  const [width, setWidth] = useState<AppShellWidth>(initialWidth);
  const isAdmin = data?.user.role === 'admin';
  const planId = data?.user.plan_id ?? null;
  const workspaceAdminId = data?.user.workspace_admin_id ?? null;
  const showWorkspace =
    Boolean(planId?.startsWith('workspace-') && !workspaceAdminId) ||
    Boolean(workspaceAdminId);
  const tabs = [
    ...BASE_TABS_BEFORE_WORKSPACE,
    ...(showWorkspace ? [WORKSPACE_TAB] : []),
    ...BASE_TABS_AFTER_WORKSPACE,
  ];
  const adminTab = isAdmin ? { to: '/app/admin', label: 'Admin' } : null;

  const setWidthStable = useCallback((w: AppShellWidth) => setWidth(w), []);
  const ctxValue = useMemo<AppShellWidthContextValue>(
    () => ({ width, setWidth: setWidthStable }),
    [width, setWidthStable],
  );

  return (
    <AppShellWidthContext.Provider value={ctxValue}>
      <div className="app-shell">
        <header className="app-shell-header">
          <Brand />
          <nav className="app-shell-nav">
            {tabs.map((t) => (
              <Tab key={t.to} to={t.to} label={t.label} />
            ))}
            <ChatNavLink />
            {adminTab && <Tab to={adminTab.to} label={adminTab.label} />}
          </nav>
          {data && <UserMenu email={data.user.email} />}
        </header>
        <main className="app-shell-main" data-width={width}>
          <TrialBanner />
          {children}
        </main>
      </div>
    </AppShellWidthContext.Provider>
  );
}
