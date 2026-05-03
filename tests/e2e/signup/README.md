# Signup E2E smoke (T9.1)

Standalone Playwright suite that exercises the post-R4 signup flow
(name, email, password, optional referral code) end-to-end. Lives
outside the vitest tree so the unit suite stays fast and Playwright is
opt-in.

## Run locally (vite dev server)

In one terminal:

```bash
npm run dev
```

In another:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test --config=playwright.signup.config.ts
```

Local dev typically has Supabase email-verify ON when pointed at the
shared project, so most tests assert the "check your inbox" prompt
rather than an auto-redirect. The suite accepts either outcome.

## Run against prod

```bash
PLAYWRIGHT_BASE_URL=https://thefixer.in \
  E2E_REFERRAL_CODE=7CAC6F37 \
  npx playwright test --config=playwright.signup.config.ts
```

Set `E2E_REFERRAL_CODE` to a referral code that the backend currently
recognizes. The default fallback is `7CAC6F37` (problemsolver0070).
Set `E2E_REFERRAL_CODE=` (empty string) to explicitly skip the
referral happy-path test.

## Test cases

1. Signup without referral, expect confirm prompt or redirect to
   `/app/billing/upgrade` (no demo, no subscription).
2. Signup with a valid referral code passed via `?ref=...`, expect the
   field to be prefilled and the post-confirm landing to be either the
   confirm prompt or `/app/setup` (demo opened).
3. Signup with an invalid referral code, expect the account to be
   created anyway with a referral-claim error message.
4. Self-referral attempt: skipped in v1, see the inline comment in
   `signup.spec.ts` for the manual repro steps.

## Throwaway accounts and cleanup

Every run creates one or more accounts under
`e2e-<slug>-<ms>-<rand>@e2e.thefixer.in`. The suite intentionally does
NOT clean up: a delete loop would need the Supabase service-role key,
which is out of scope for a smoke harness.

DBA-only manual cleanup, run from the Supabase SQL editor against the
`btzaudxujnodtikhemar` project:

```sql
delete from auth.users where email like '%@e2e.thefixer.in';
```

(Cascades through `users`, `referral_claims`, `pending_workspace_cleanups`,
etc. via the FK chain.)

## CI policy

These tests are NOT wired into the default `npm test` step or the
GitHub Actions workflow. They require either a running vite dev server
or a live prod deploy, and they leave throwaway rows behind. Run them
manually as a pre-deploy and post-deploy gate.
