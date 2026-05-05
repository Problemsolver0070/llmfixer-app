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
  // Launch-promo strikethrough. When introPromoActive is true and
  // originalPrice is provided, renders the original price with a
  // strikethrough and a "50% OFF" badge below the headline price.
  originalPrice?: string;
  introPromoActive?: boolean;
}

export function TierCard({
  name, price, period, tagline, features,
  extraSeat, ctaLabel, onCtaClick, ctaQuiet,
  originalPrice, introPromoActive,
}: TierCardProps) {
  const showPromo = Boolean(introPromoActive && originalPrice);
  return (
    <article className="pricing-tier" data-tier={name.toLowerCase()}>
      <div className="pricing-tier-head">
        <h2 className="pricing-tier-name">{name}</h2>
        <div className="pricing-tier-price-row">
          <span className="pricing-tier-price">{price}</span>
          {period ? <span className="pricing-tier-period">{period}</span> : null}
        </div>
        {showPromo ? (
          <div
            className="pricing-tier-promo"
            data-testid={`pricing-tier-${name.toLowerCase()}-promo`}
            style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}
          >
            <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: 13 }}>
              {originalPrice}
            </span>
            <span
              style={{
                color: 'var(--color-accent-copper-bright)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border: '1px solid var(--color-accent-copper)',
                padding: '2px 7px',
              }}
            >
              50% off launch
            </span>
          </div>
        ) : null}
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
