import { Input } from '@/components/ui/Input';
import {
  discountErrorMessage,
  type DiscountCodeErrorCode,
} from './discountCodeErrors';

const MAX_LENGTH = 64;

interface Props {
  value: string;
  onChange: (next: string) => void;
  /**
   * Backend-returned error code from the most recent activate attempt.
   * Surfaces inline below the field. Pass `null` when there's no error.
   */
  errorCode?: DiscountCodeErrorCode | null;
  disabled?: boolean;
}

/**
 * Optional discount-code apply field shown above the PayPal subscribe button
 * on the Billing Upgrade page. v1: the user types the code blindly; we don't
 * call a live validate endpoint. The activate hook validates server-side and
 * we render any backend error inline below the field via `errorCode`.
 *
 * Auto-uppercases input and caps it at 64 chars, matching the redeem flow
 * (`RedeemCodeForm`). The `errorCode` -> copy mapping lives in
 * `discountCodeErrors.ts` so it can be reused by `BillingUpgrade`'s
 * activate-error narrowing.
 */
export function DiscountCodeField({
  value,
  onChange,
  errorCode,
  disabled,
}: Props) {
  const message = discountErrorMessage(errorCode ?? null);

  return (
    <div>
      <Input
        label="Discount code (optional)"
        value={value}
        onChange={(e) => {
          const next = e.currentTarget.value
            .toUpperCase()
            .slice(0, MAX_LENGTH);
          onChange(next);
        }}
        placeholder="Have a code? Enter it here"
        maxLength={MAX_LENGTH}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={disabled}
      />
      {message ? (
        <p
          role="alert"
          data-testid="discount-code-error"
          style={{
            fontSize: 11,
            color: 'var(--color-danger)',
            margin: '-4px 0 12px',
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
