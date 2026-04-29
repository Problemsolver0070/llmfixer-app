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
- `src/pages/app/Models.tsx` renders the model catalog from `GET /v1/models/catalog` via the `useModels` hook (module-level cache). Two card variants: `ModelCard` for available models (with copy-to-clipboard), `ComingSoonCard` for provider teasers (greyed, no interactive elements).
- `src/pages/app/Setup.tsx` is a 50/50 split: `components/setup/SetupReference.tsx` on the left (existing reference content), `components/support/SupportChat.tsx` on the right. The chat uses `useSupportThreads`, `useSupportMessages`, `useStreamMessage`, and `useUploadAttachment` to render multi-thread streaming conversations against `GET/POST /v1/support/*`. Markdown rendered via `react-markdown` + `remark-gfm` + `rehype-highlight`. SSE consumed via `fetch` + `ReadableStream` (not `EventSource`, because we need the JWT in the Authorization header). Cancel-mid-stream uses the `assistant_message_id` from the SSE `started` event. Error categorization reads the `error_type` field on `error` events (set by the backend per the support spec, e.g. `upstream_error`, `attachment_too_large`).
- The Setup surface uses the terminal-editorial direction (Fraunces serif body + JetBrains Mono accents, copper accent) defined in `src/styles/globals.css`. `AppShell` exposes a width context (`narrow`, `wide`, `full`); pages opt into a variant via the `useAppShellWidth` hook in `src/components/shell/appShellWidth.ts` and the hook restores `narrow` on unmount. Long-thread compression in the chat is server-side only; the frontend renders whatever Postgres-backed history the backend returns. See `llmfixer-api/CLAUDE.md` for the compression contract and ADR 008 in the api repo for the proxy compat changes.

## Conventions

- No em dashes anywhere (prose, code, UI). Use commas, periods, colons, parentheses.
- Design tokens live in `src/styles/globals.css`. Components reference them as `var(--color-...)`.
- Do not introduce new state libraries. Hooks + module-level singletons are sufficient.

## Required env (see `.env.example`)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYPAL_CLIENT_ID`, `VITE_PAYPAL_PLAN_ID`, `VITE_API_BASE` (defaults to `https://api.thefixer.in`).
