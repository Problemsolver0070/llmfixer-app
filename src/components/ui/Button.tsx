import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading,
  loadingLabel,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const colorVar = isDanger ? '--color-danger' : '--color-accent-bright';
  return (
    <button
      data-variant={variant}
      disabled={disabled || loading}
      style={{
        width: '100%',
        background: 'transparent',
        color: `var(${colorVar})`,
        border: isGhost ? '1px solid var(--color-border)' : `1px solid var(${colorVar})`,
        padding: '11px 14px',
        fontSize: 13,
        letterSpacing: '0.04em',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.6 : 1,
        transition: 'background 150ms cubic-bezier(0.2,0.7,0.2,1)',
        ...style,
      }}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
