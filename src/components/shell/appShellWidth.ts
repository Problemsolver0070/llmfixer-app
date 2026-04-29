import { createContext, useContext, useLayoutEffect } from 'react';

export type AppShellWidth = 'narrow' | 'wide' | 'full';

export type AppShellWidthContextValue = {
  width: AppShellWidth;
  setWidth: (w: AppShellWidth) => void;
};

export const AppShellWidthContext = createContext<AppShellWidthContextValue | null>(null);

/**
 * Pages call this with their preferred width variant. The hook installs the
 * variant on mount and restores the default ('narrow') on unmount, so
 * navigating between pages does not leak width state across routes.
 *
 * Uses useLayoutEffect so the parent re-renders with the correct width
 * before the browser paints. Without this the user sees a one-frame flash
 * of the narrow layout when navigating into a wider page.
 */
export function useAppShellWidth(width: AppShellWidth): void {
  const ctx = useContext(AppShellWidthContext);
  useLayoutEffect(() => {
    if (!ctx) return;
    ctx.setWidth(width);
    return () => ctx.setWidth('narrow');
  }, [ctx, width]);
}
