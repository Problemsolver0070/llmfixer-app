export interface TierCardProps {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  extraSeat?: { price: string; period: string; minSeats: number };
  ctaLabel: string;
  onCtaClick: () => void;
  ctaQuiet?: boolean;
}

export function TierCard({
  name, price, period, tagline, features,
  extraSeat, ctaLabel, onCtaClick, ctaQuiet,
}: TierCardProps) {
  return (
    <article className="pricing-tier" data-tier={name.toLowerCase()}>
      <div className="pricing-tier-head">
        <h2 className="pricing-tier-name">{name}</h2>
        <div className="pricing-tier-price-row">
          <span className="pricing-tier-price">{price}</span>
          {period ? <span className="pricing-tier-period">{period}</span> : null}
        </div>
        <p className="pricing-tier-tagline">{tagline}</p>
      </div>

      <ul className="pricing-tier-features">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {extraSeat ? (
        <div className="pricing-tier-extra" data-testid="extra-seat">
          <span className="copper">{extraSeat.price}</span>
          <span>{extraSeat.period}</span> beyond {extraSeat.minSeats} seats.
        </div>
      ) : null}

      <button
        type="button"
        className={`pricing-tier-cta${ctaQuiet ? ' pricing-tier-cta-quiet' : ''}`}
        onClick={onCtaClick}
      >
        {ctaLabel} →
      </button>
    </article>
  );
}
