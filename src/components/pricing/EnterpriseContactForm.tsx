import { useState } from 'react';

export function EnterpriseContactForm() {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [body, setBody] = useState('');
  const subject = encodeURIComponent('Enterprise inquiry, thefixer.in');
  const text = encodeURIComponent(
    `Name: ${name}\nTeam size: ${size}\n\n${body}\n`,
  );
  const href = `mailto:venu-kumar@thefixer.in?subject=${subject}&body=${text}`;

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 540 }}
      onSubmit={(e) => e.preventDefault()}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Your name
        <input
          placeholder="your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Team size
        <input
          placeholder="team size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Notes
        <textarea
          placeholder="anything we should know"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, resize: 'vertical', textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <a
        href={href}
        style={{ alignSelf: 'flex-start', color: 'var(--color-accent-copper-bright)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: 2 }}
      >
        Send →
      </a>
    </form>
  );
}
