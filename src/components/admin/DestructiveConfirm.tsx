import { type CSSProperties, type ChangeEvent } from 'react';

interface Props {
  /** The keyword the operator must type literally to enable the submit button. */
  expected: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Tiny "type CANCEL to confirm" primitive shared across the destructive
 * UserDetail modals (clear-plan, cancel-sub, refund, delete-user).
 *
 * Renders a label + input. The parent owns the value state and gates the
 * Confirm button on `value === expected`. The input intentionally does not
 * use the shared Input component because we want the case-sensitive monospace
 * affordance for the keyword.
 */
export function DestructiveConfirm({ expected, value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor={`destructive-${expected}`}
        style={{
          display: 'block',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginBottom: 6,
        }}
      >
        Type <code style={kbdStyle}>{expected}</code> to confirm
      </label>
      <input
        id={`destructive-${expected}`}
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.currentTarget.value)
        }
        autoComplete="off"
        spellCheck={false}
        style={inputStyle}
      />
    </div>
  );
}

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  background: 'var(--color-bg)',
  padding: '2px 6px',
  border: '1px solid var(--color-border)',
  fontSize: 11,
  letterSpacing: '0.08em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  letterSpacing: '0.04em',
};
