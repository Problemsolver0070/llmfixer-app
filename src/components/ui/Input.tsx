import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, ...rest }: Props) {
  const inputId = id ?? `in-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        id={inputId}
        style={{
          width: '100%',
          background: 'var(--color-bg-elev)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          padding: '10px 12px',
          fontSize: 13,
          color: 'var(--color-text)',
          outline: 'none',
        }}
        {...rest}
      />
      {hint && !error && (
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 6 }}>{hint}</p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
