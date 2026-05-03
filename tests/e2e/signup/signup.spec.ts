import { test, expect, type Page } from '@playwright/test';

/**
 * Post-R4 signup E2E smoke (T9.1).
 *
 * Exercises the new signup form (name + email + password + optional
 * referral code) against either a local vite dev server or live prod,
 * driven by PLAYWRIGHT_BASE_URL. The suite must NOT assume Supabase
 * email-verify is off: live prod has it ON, so we accept either a
 * "check your inbox" prompt OR an automatic redirect into the app.
 *
 * Throwaway emails use the e2e.thefixer.in domain so they are easy to
 * filter out in the users table. The suite does not clean them up:
 * see ./README.md for the manual cleanup query.
 */

// ABCD1234 is a deliberately invalid placeholder for Test 1: the user
// never enters a referral. Tests 2 and 3 use real / known-bad codes.
const FALLBACK_REFERRAL_CODE = '7CAC6F37';
const INVALID_REFERRAL_CODE = 'XXXXXXXX';

function uniqueEmail(slug: string): string {
  // e2e-<slug>-<ms>-<rand>@e2e.thefixer.in keeps the local-part unique
  // across parallel workers and avoids any chance of collision across
  // re-runs. The domain is intentionally non-deliverable.
  const ms = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-${slug}-${ms}-${rand}@e2e.thefixer.in`;
}

async function fillCoreFields(page: Page, email: string, name = 'E2E Smoke') {
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  // Password input is uniquely "Password" (the form has no
  // "Confirm password" field today).
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
}

/**
 * Accept either of the two valid post-submit states:
 *  - "Check your inbox" confirmation prompt (email-verify ON, prod).
 *  - Automatic redirect into the app (email-verify OFF, dev).
 *
 * The expected redirect target depends on whether a referral was
 * applied: with a valid referral the user lands on /app/setup once
 * the demo is open, without one they land on /app/billing/upgrade.
 */
async function expectPostSignupOutcome(
  page: Page,
  expectedRedirect: RegExp,
): Promise<'confirm' | 'redirect'> {
  // Wait until either the confirmation copy appears OR the URL changes
  // away from /signup. The form's confirmation prompt anchors on the
  // literal "Check your inbox at" text rendered in the success state.
  const confirmPrompt = page.getByText(/check your inbox at/i);
  const settled = await Promise.race([
    confirmPrompt
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'confirm' as const)
      .catch(() => null),
    page
      .waitForURL(expectedRedirect, { timeout: 15_000 })
      .then(() => 'redirect' as const)
      .catch(() => null),
  ]);
  expect(settled, 'signup did not produce confirmation or redirect').not.toBeNull();
  return settled as 'confirm' | 'redirect';
}

test.describe('signup smoke', () => {
  test('signup without referral lands on confirm or billing/upgrade', async ({ page }) => {
    const email = uniqueEmail('no-ref');
    await page.goto('/signup');
    await fillCoreFields(page, email);
    await page.getByRole('button', { name: /create account/i }).click();
    // No referral applied, so the dev-mode redirect target is the
    // billing/upgrade gate (PostSignupGate routes a new user with no
    // demo and no subscription there).
    await expectPostSignupOutcome(page, /\/(app\/billing\/upgrade|app\/post-signup)(\?|$|#)/i);
    // Also check we did not land on /app/setup without a referral.
    await expect(page).not.toHaveURL(/\/app\/setup(\?|$|#)/i);
  });

  test('signup with referral code prefilled from URL', async ({ page }) => {
    const referralCode = process.env.E2E_REFERRAL_CODE ?? FALLBACK_REFERRAL_CODE;
    test.skip(
      process.env.E2E_REFERRAL_CODE === '',
      'E2E_REFERRAL_CODE explicitly empty, skipping referral happy path.',
    );
    const email = uniqueEmail('ref');
    await page.goto(`/signup?ref=${encodeURIComponent(referralCode)}`);
    // The form should prefill the referral code field from the URL
    // param (uppercased) and set data-prefilled="true" on the input.
    const referralInput = page.getByLabel(/referral code/i);
    await expect(referralInput).toHaveValue(referralCode.toUpperCase());
    await expect(referralInput).toHaveAttribute('data-prefilled', 'true');
    await fillCoreFields(page, email);
    await page.getByRole('button', { name: /create account/i }).click();
    // With a valid referral the demo is open: PostSignupGate routes to
    // /app/setup. With email-verify ON the user sees the confirmation
    // prompt instead. Either is acceptable.
    await expectPostSignupOutcome(page, /\/app\/(setup|post-signup)(\?|$|#)/i);
  });

  test('signup with invalid referral still creates the account', async ({ page }) => {
    const email = uniqueEmail('bad-ref');
    await page.goto(`/signup?ref=${INVALID_REFERRAL_CODE}`);
    const referralInput = page.getByLabel(/referral code/i);
    await expect(referralInput).toHaveValue(INVALID_REFERRAL_CODE);
    await fillCoreFields(page, email);
    await page.getByRole('button', { name: /create account/i }).click();
    // Account creation must succeed regardless of referral failure.
    // Either the confirmation prompt OR a redirect into /app/* is fine.
    const outcome = await expectPostSignupOutcome(
      page,
      /\/(app\/billing\/upgrade|app\/post-signup|app\/setup)(\?|$|#)/i,
    );
    if (outcome === 'confirm') {
      // The form surfaces a referral-claim error message inside the
      // confirmation panel. Copy varies by error_code; we just look for
      // any text that mentions "referral" near the confirm prompt.
      await expect(page.getByText(/referral/i).first()).toBeVisible();
    }
  });

  // Skipped in v1: self-referral is detected by email match between
  // the new signup and the referrer account, which requires a
  // pre-existing account whose email handle we can sign up under
  // again. Hard to E2E without a Supabase admin reset, and the
  // backend unit tests already cover the self_referral error_code.
  //
  // Manual repro:
  //   1. Sign in as a user with a known referral code (eg
  //      problemsolver0070, code 7CAC6F37).
  //   2. Sign out.
  //   3. Open /signup?ref=7CAC6F37 in an incognito window and sign
  //      up using the SAME email address as step 1.
  //   4. Confirm the email; expect the form to surface the
  //      "self_referral" copy: "You can't refer yourself..." and
  //      the user lands on /app/billing/upgrade (no demo started).
  // TODO(r9.t9.2+): wire a Supabase admin client into a fixture so
  // we can reset the seed account between runs and exercise this path.
  test.skip('self-referral attempt is blocked', () => {
    // Intentionally empty. See comment block above.
  });
});
