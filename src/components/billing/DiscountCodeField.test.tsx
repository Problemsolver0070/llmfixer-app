import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DiscountCodeField } from './DiscountCodeField';
import {
  discountErrorMessage,
  isKnownDiscountErrorCode,
} from './discountCodeErrors';

describe('DiscountCodeField', () => {
  it('uppercases input as the user types', async () => {
    const onChange = vi.fn();
    render(<DiscountCodeField value="" onChange={onChange} />);
    const input = screen.getByLabelText(/discount code/i) as HTMLInputElement;
    await userEvent.type(input, 'promo10');
    // userEvent fires onChange per keystroke; the last call carries the full
    // accumulated value typed so far, uppercased.
    expect(onChange).toHaveBeenCalled();
    const lastCallValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallValue).toBe('PROMO10'.slice(-1));
    // All emitted values should be uppercase.
    for (const call of onChange.mock.calls) {
      expect(call[0]).toEqual(call[0].toString().toUpperCase());
    }
  });

  it('forwards the parent value into the input verbatim', () => {
    const onChange = vi.fn();
    render(<DiscountCodeField value="GIFT30" onChange={onChange} />);
    const input = screen.getByLabelText(/discount code/i) as HTMLInputElement;
    expect(input.value).toBe('GIFT30');
  });

  it('caps emitted value at 64 chars', async () => {
    const onChange = vi.fn();
    const long = 'A'.repeat(80);
    render(<DiscountCodeField value="" onChange={onChange} />);
    const input = screen.getByLabelText(/discount code/i);
    // Simulate paste of a long string in one shot by using fireEvent through
    // userEvent.paste, which delivers the full string in a single change.
    await userEvent.click(input);
    await userEvent.paste(long);
    const lastCallValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallValue.length).toBe(64);
  });

  it('renders inline backend error copy for known discount error codes', () => {
    const onChange = vi.fn();
    render(
      <DiscountCodeField
        value="NOPE"
        onChange={onChange}
        errorCode="discount_code_not_found"
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/couldn't find that code/i);
  });

  it.each([
    ['discount_code_expired', /code has expired/i],
    ['discount_code_exhausted', /usage limit/i],
    ['discount_code_not_applicable_to_plan', /doesn't apply to the plan/i],
    ['discount_code_already_redeemed_by_user', /already used this code/i],
  ] as const)('renders message for %s', (code, expected) => {
    render(
      <DiscountCodeField value="X" onChange={vi.fn()} errorCode={code} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(expected);
  });

  it('does not render the alert when errorCode is null', () => {
    render(<DiscountCodeField value="X" onChange={vi.fn()} errorCode={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('discountErrorMessage returns null for unknown codes', () => {
    expect(discountErrorMessage(null)).toBeNull();
    expect(
      discountErrorMessage('not_a_real_code' as unknown as never),
    ).toBeNull();
  });

  it('isKnownDiscountErrorCode narrows correctly', () => {
    expect(isKnownDiscountErrorCode('discount_code_not_found')).toBe(true);
    expect(isKnownDiscountErrorCode('something_else')).toBe(false);
    expect(isKnownDiscountErrorCode(42)).toBe(false);
  });
});
