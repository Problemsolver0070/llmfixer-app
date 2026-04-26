import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, style, ...rest }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elev)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: 22,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
