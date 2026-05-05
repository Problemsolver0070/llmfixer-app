const CHAT_HREF = 'https://chat.thefixer.in';

export function TheFixerAiCard() {
  return (
    <a
      href={CHAT_HREF}
      className="fixer-ai-card"
      data-testid="fixer-ai-card"
    >
      <div className="fixer-ai-card-eyebrow">CHAT</div>
      <div className="fixer-ai-card-title">The Fixer ai</div>
      <div className="fixer-ai-card-subtitle">
        Every model. Every tool. One place.
      </div>
      <div className="fixer-ai-card-cta">
        Open chat <span aria-hidden="true">{'→'}</span>
      </div>
    </a>
  );
}
