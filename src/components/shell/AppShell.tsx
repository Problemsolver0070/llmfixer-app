import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Brand } from './Brand';
import { UserMenu } from './UserMenu';
import { useAccount } from '@/hooks/useAccount';
import {
  AppShellWidthContext,
  type AppShellWidth,
  type AppShellWidthContextValue,
} from './appShellWidth';

const TABS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/setup', label: 'Setup' },
  { to: '/app/models', label: 'Models' },
  { to: '/app/keys', label: 'Keys' },
  { to: '/app/billing', label: 'Billing' },
  { to: '/app/account', label: 'Account' },
];

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
  const tabs = isAdmin ? [...TABS, { to: '/app/admin', label: 'Admin' }] : TABS;

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
          </nav>
          {data && <UserMenu email={data.user.email} />}
        </header>
        <main className="app-shell-main" data-width={width}>
          {children}
        </main>
      </div>
    </AppShellWidthContext.Provider>
  );
}
