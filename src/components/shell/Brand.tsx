export function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <div className="flex items-center gap-2.5">
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
    </div>
  );
}
