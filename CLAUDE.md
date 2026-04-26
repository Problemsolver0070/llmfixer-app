# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Self-serve console for **The Fixer** at `thefixer.in`. Static SPA on Azure Static Web Apps. Auth via Supabase (email + password), data via the Supabase JS SDK with Row-Level Security, mutating writes via `api.thefixer.in`. Billing via PayPal Subscriptions.

## Commands

```bash
npm run dev          # vite dev server on :3000
npm run build        # type-check then vite build into dist/
npm run preview      # preview the built bundle locally
npm run lint         # eslint flat config
npm test             # vitest run
npm run test:watch   # vitest watch mode
```

## Architecture

- `src/main.tsx` mounts `<StrictMode><App /></StrictMode>`.
- `src/App.tsx` wraps `<RouterProvider />` in `<AppPayPalProvider />` and registers a 401 sign-out handler.
- `src/routes.tsx` is the single declarative route table. `RequireAuth` gates `/app/*`; `RequireAdmin` gates `/app/admin/*`.
- `src/lib/supabase.ts` is the singleton Supabase JS client; `src/lib/api.ts` is the `fetch` wrapper that attaches the JWT and signs out on 401.
- Hooks in `src/hooks/*` own server state. Components consume hooks; never call `fetch` from a component.
- Tests are co-located: `Foo.tsx` / `Foo.test.tsx`. Module-level `vi.mock` stubs `@/lib/supabase`, `@/lib/api`, and `@paypal/react-paypal-js` where they're used.

## Conventions

- No em dashes anywhere (prose, code, UI). Use commas, periods, colons, parentheses.
- Design tokens live in `src/styles/globals.css`. Components reference them as `var(--color-...)`.
- Do not introduce new state libraries. Hooks + module-level singletons are sufficient.

## Required env (see `.env.example`)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYPAL_CLIENT_ID`, `VITE_PAYPAL_PLAN_ID`, `VITE_API_BASE` (defaults to `https://api.thefixer.in`).
