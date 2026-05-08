import { Link } from 'react-router-dom';
import { Brand } from '@/components/shell/Brand';
import { useSession } from '@/hooks/useSession';

export default function Landing() {
  const { session, emailVerified } = useSession();
  const signedIn = Boolean(session && emailVerified);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 50% 35%, rgba(42, 52, 88, 0.45) 0%, var(--color-bg) 70%)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
        }}
      >
        <Brand />
        <nav style={{ display: 'flex', gap: 18 }}>
          {signedIn ? (
            <Link to="/app/dashboard" style={{ color: 'var(--color-accent-bright)', fontSize: 13 }}>
              Open console
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>Sign in</Link>
              <Link to="/signup" style={{ color: 'var(--color-accent-bright)', fontSize: 13 }}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 32px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
            maxWidth: 880,
            color: 'var(--color-text)',
          }}
        >
          Frontier models forget. The Fixer remembers.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--color-text-dim)',
            maxWidth: 560,
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}
        >
          One drop-in API key for OpenAI, Anthropic, and Gemini. Context-on-Demand cuts token use 70-90% on the same answers.
        </p>
        <div style={{ display: 'flex', gap: 14 }}>
          {signedIn ? (
            <Link
              to="/app/dashboard"
              style={{
                color: 'var(--color-accent-bright)',
                border: '1px solid var(--color-accent)',
                padding: '11px 20px',
                fontSize: 13,
                letterSpacing: '0.04em',
              }}
            >
              Open console
            </Link>
          ) : (
            <>
              <Link
                to="/pricing"
                style={{
                  color: 'var(--color-accent-bright)',
                  border: '1px solid var(--color-accent)',
                  padding: '11px 20px',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                Subscribe
              </Link>
              <Link
                to="/login"
                style={{
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border)',
                  padding: '11px 20px',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>

      <footer
        style={{
          padding: '20px 32px',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          letterSpacing: '0.04em',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <span>thefixer.in</span>
        <a href="/privacy-policy" style={{ color: 'var(--color-text-dim)', textDecoration: 'none' }}>
          Privacy policy
        </a>
        <a href="/refund-policy" style={{ color: 'var(--color-text-dim)', textDecoration: 'none' }}>
          Refund policy
        </a>
      </footer>
    </div>
  );
}
