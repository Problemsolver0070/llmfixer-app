/**
 * Closed set of error codes the activate hook returns when validating a
 * `discount_code` (R5.T5.1). Mirrors the backend's `app.billing.discounts`
 * module errors. Kept in a non-component module so the helper functions
 * can be imported from tests and pages without breaking React fast-refresh.
 */
export type DiscountCodeErrorCode =
  | 'discount_code_not_found'
  | 'discount_code_expired'
  | 'discount_code_exhausted'
  | 'discount_code_not_applicable_to_plan'
  | 'discount_code_already_redeemed_by_user';

const ERROR_MESSAGES: Record<DiscountCodeErrorCode, string> = {
  discount_code_not_found: "We couldn't find that code.",
  discount_code_expired: 'This code has expired.',
  discount_code_exhausted: 'This code has reached its usage limit.',
  discount_code_not_applicable_to_plan:
    "This code doesn't apply to the plan you selected.",
  discount_code_already_redeemed_by_user: "You've already used this code.",
};

export function isKnownDiscountErrorCode(
  value: unknown,
): value is DiscountCodeErrorCode {
  return typeof value === 'string' && value in ERROR_MESSAGES;
}

/**
 * Resolve a known discount-code error code to user-facing copy, or null if
 * the code is unknown / not a discount-code error (caller can then surface
 * the activate-level generic error message).
 */
export function discountErrorMessage(
  code: DiscountCodeErrorCode | null | undefined,
): string | null {
  if (!code) return null;
  if (!isKnownDiscountErrorCode(code)) return null;
  return ERROR_MESSAGES[code];
}
