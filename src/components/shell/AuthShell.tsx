import type { ReactNode } from 'react';
import { Brand } from './Brand';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          background: 'var(--color-bg)',
        }}
      >
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <Brand />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: '-0.01em',
              margin: '0 0 6px',
              textAlign: 'center',
              color: 'var(--color-text)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim)',
              margin: '0 0 28px',
              textAlign: 'center',
            }}
          >
            {subtitle}
          </p>
          {children}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'radial-gradient(circle at 65% 35%, #2A3458 0%, #1B2030 70%)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <Brand />
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              color: 'var(--color-link)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Why we built this
          </div>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text)',
              lineHeight: 1.55,
              fontWeight: 300,
              margin: '0 0 16px',
            }}
          >
            Frontier models forget. The Fixer remembers, and only ever speaks the parts that matter for the question at hand.
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            70-90% fewer tokens. Same answers. One key, every model.
          </p>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>
          thefixer.in
        </div>
      </div>
    </div>
  );
}
