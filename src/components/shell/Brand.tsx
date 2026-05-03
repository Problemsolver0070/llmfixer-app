import { Link } from 'react-router-dom';

export function Brand({
  size = 'sm',
  to = '/app/dashboard',
}: {
  size?: 'sm' | 'lg';
  to?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span
        data-testid="brand-dot"
        className="h-2 w-2 rounded-full"
        style={{ background: 'var(--color-accent)' }}
      />
      <span
        style={{
          color: 'var(--color-text)',
          fontSize: size === 'lg' ? 18 : 14,
          letterSpacing: '0.04em',
          fontWeight: 400,
        }}
      >
        The Fixer
      </span>
    </Link>
  );
}
