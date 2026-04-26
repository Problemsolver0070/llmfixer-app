# Frontend Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Next.js 16 cosmos site with a calm, auth-gated, billable, self-serve console at `thefixer.in` shipped as a single static SPA on Azure Static Web Apps.

**Architecture:** Vite + React 19 + React Router 7 SPA in TypeScript with Tailwind v4 design tokens. Frontend reads user-owned data via the Supabase JS SDK (Row-Level Security gates rows by `auth.uid()`); writes flow to `api.thefixer.in` with the Supabase JWT in the `Authorization` header. Billing is PayPal Subscriptions through `@paypal/react-paypal-js`. The console has six tabs (Dashboard, Setup, Keys, Billing, Account, Admin) plus a small public landing and five auth pages.

**Tech Stack:** Vite 5, React 19, React Router 7, TypeScript 5, Tailwind v4, `@supabase/supabase-js` 2, `@paypal/react-paypal-js` 8, `sonner` (toasts), `vitest` + `happy-dom` + `@testing-library/react` (tests).

---

## Notes for the implementer (read first)

1. **Project root.** Everything in this plan is relative to `/home/venu/Desktop/Venu-SU/llmfixer-app/`. The folder exists and is empty. The old Next.js site at `../LLMFIXER-web/` is untouched until Phase 10.
2. **Backend not yet built.** This plan ships only the frontend. The backend at `api.thefixer.in` is a sibling project and is being rewritten in parallel. Every test in this plan mocks `src/lib/api.ts` (or the Supabase client) at the module level via `vi.mock`. We do not run a real backend in tests, and we do not use `msw`.
3. **Env vars.** Five public env vars, all prefixed `VITE_`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE` (defaults to `https://api.thefixer.in`)
   - `VITE_PAYPAL_CLIENT_ID`
   - `VITE_PAYPAL_PLAN_ID`
4. **Source of truth.** The design spec at `../LLMFIXER-web/docs/superpowers/specs/2026-04-27-frontend-rewrite-design.md` is authoritative. If a task here disagrees with the spec, the spec wins. Flag it.
5. **No em dashes.** Hard rule from the user. Use commas, periods, parentheses, or colons. Hyphens inside compound words (`self-serve`, `single-page`, `70-90%`) are fine. Number ranges should use a hyphen, not an en dash.
6. **TDD.** Every behavioural change is led by a failing test. Pure scaffolding tasks (install a package, edit a config) substitute "verify the install works" for the failing test, then check it passes. Frequent commits, one per task minimum.
7. **Commit style.** `feat:` for user-visible changes, `test:` for test-only, `chore:` for scaffolding, `fix:` when a later task corrects an earlier one. Co-author trailer is added by the human committer per their convention.
8. **Run tests with.** `npx vitest run path/to/file.test.tsx` for one file, `npx vitest run` for everything. `npx vitest` (no `run`) is watch mode, useful during development but never used in CI.

---

## Phase 0: Scaffold and base setup

### Task 0.1: Initialize the Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `.gitignore`

- [ ] **Step 1: Create the project files**

Write `package.json`:

```json
{
  "name": "llmfixer-app",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: { port: 3000 },
});
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Fixer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Write `src/App.tsx`:

```tsx
export default function App() {
  return <div>The Fixer</div>;
}
```

Write `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Write `.gitignore`:

```
node_modules
dist
dist-ssr
.env
.env.local
*.local
.DS_Store
*.log
.vite
coverage
```

- [ ] **Step 2: Install dependencies**

Run: `cd /home/venu/Desktop/Venu-SU/llmfixer-app && npm install`
Expected: a `node_modules/` and `package-lock.json` appear, no errors.

- [ ] **Step 3: Verify the build works**

Run: `npm run build`
Expected: `dist/` is produced, no TypeScript errors.

- [ ] **Step 4: Verify the dev server starts**

Run: `npm run dev` and check `curl -sf http://localhost:3000 | grep -q "<title>The Fixer</title>"` returns success. Stop the dev server.

- [ ] **Step 5: Initialize git and commit**

```bash
cd /home/venu/Desktop/Venu-SU/llmfixer-app
git init -b main
git add .
git commit -m "chore: scaffold vite + react 19 + typescript"
```

---

### Task 0.2: Add Tailwind v4 and design tokens

**Files:**
- Create: `src/styles/globals.css`
- Modify: `package.json`, `src/main.tsx`, `vite.config.ts`

- [ ] **Step 1: Install Tailwind v4**

Run: `npm install -D tailwindcss @tailwindcss/vite`

- [ ] **Step 2: Wire the Tailwind plugin into Vite**

Edit `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: { port: 3000 },
});
```

- [ ] **Step 3: Write the design tokens CSS**

Create `src/styles/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #1B2030;
  --color-bg-elev: #222840;
  --color-bg-rail: #171B26;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-text: #E6EAF2;
  --color-text-dim: #9099B0;
  --color-accent: #D4A853;
  --color-accent-bright: #F0C45A;
  --color-link: #7AA8E8;
  --color-danger: #E26B6B;
  --color-success: #6BB892;

  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;

  --radius-sm: 4px;
  --radius: 6px;
}

:root {
  color-scheme: dark;
}

html, body, #root {
  height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-weight: 400;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

* {
  border-color: var(--color-border);
}

a {
  color: var(--color-link);
  text-decoration: none;
}

a:hover {
  color: var(--color-accent-bright);
}

button {
  font-family: inherit;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 4: Import the stylesheet from main**

Edit `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Verify and commit**

Run: `npm run build`. Confirm the built CSS in `dist/assets/*.css` contains `--color-accent:#D4A853`.

```bash
git add -A
git commit -m "chore: add tailwind v4 with slate dark design tokens"
```

---

### Task 0.3: Add React Router 7 and the route skeleton

**Files:**
- Create: `src/routes.tsx`
- Modify: `src/App.tsx`, `package.json`

- [ ] **Step 1: Install React Router 7**

Run: `npm install react-router-dom@^7`

- [ ] **Step 2: Define the route table**

Create `src/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const router = createBrowserRouter([
  { path: '/', Component: placeholder('Landing') },
  { path: '/login', Component: placeholder('Login') },
  { path: '/signup', Component: placeholder('Sign up') },
  { path: '/forgot', Component: placeholder('Forgot password') },
  { path: '/reset', Component: placeholder('Reset password') },
  { path: '/verify-email', Component: placeholder('Verify email') },
  {
    path: '/app',
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: placeholder('Dashboard') },
      { path: 'setup', Component: placeholder('Setup') },
      { path: 'keys', Component: placeholder('Keys') },
      { path: 'billing', Component: placeholder('Billing') },
      { path: 'account', Component: placeholder('Account') },
      {
        path: 'admin',
        children: [
          { index: true, Component: placeholder('Admin promos') },
          { path: 'promos', Component: placeholder('Admin promos') },
          { path: 'users', Component: placeholder('Admin users') },
          { path: 'metrics', Component: placeholder('Admin metrics') },
        ],
      },
    ],
  },
  { path: '*', Component: placeholder('Not found') },
]);
```

- [ ] **Step 3: Mount RouterProvider in App**

Edit `src/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 4: Verify all routes render**

Run: `npm run dev` and check that `curl -sf http://localhost:3000/login | grep -q Login`, `curl -sf http://localhost:3000/app/dashboard | grep -q Dashboard`, and `curl -sf http://localhost:3000/no-such-page | grep -q "Not found"` all succeed. Stop the dev server.

(Vite's dev server serves the SPA index for any path, so client-side routing handles the rest.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add react-router 7 route skeleton"
```

---

### Task 0.4: Add Vitest with happy-dom and Testing Library

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Modify: `tsconfig.json`, `package.json`

- [ ] **Step 1: Install test deps**

Run:

```bash
npm install -D vitest happy-dom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/node
```

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

Edit `tsconfig.json` `compilerOptions.types` to include `"vitest/globals"` and `"@testing-library/jest-dom"`:

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
```

- [ ] **Step 3: Write a smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('test environment', () => {
  it('renders DOM and matches jest-dom matchers', () => {
    render(<p data-testid="hello">hello world</p>);
    expect(screen.getByTestId('hello')).toHaveTextContent('hello world');
  });
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test`
Expected: 1 file passed, 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add vitest + happy-dom + testing-library"
```

---

### Task 0.5: Add ESLint flat config

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json`

- [ ] **Step 1: Install ESLint**

Run:

```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

- [ ] **Step 2: Write the flat config**

Create `eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 3: Verify ESLint passes**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add eslint flat config"
```

---

### Task 0.6: Add `.env.example` and toast provider scaffolding

**Files:**
- Create: `.env.example`, `src/lib/env.ts`
- Modify: `package.json`

- [ ] **Step 1: Install sonner**

Run: `npm install sonner`

- [ ] **Step 2: Write env example and helper**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_API_BASE=https://api.thefixer.in
VITE_PAYPAL_CLIENT_ID=AY...
VITE_PAYPAL_PLAN_ID=P-...
```

Create `src/lib/env.ts`:

```ts
function required(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  apiBase: import.meta.env.VITE_API_BASE ?? 'https://api.thefixer.in',
  paypalClientId: required('VITE_PAYPAL_CLIENT_ID'),
  paypalPlanId: required('VITE_PAYPAL_PLAN_ID'),
};
```

- [ ] **Step 3: Test env helper**

Create `src/lib/env.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws when a required var is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_PAYPAL_PLAN_ID', 'plan');
    await expect(import('./env')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('returns env defaults when all required vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_PAYPAL_PLAN_ID', 'plan');
    vi.stubEnv('VITE_API_BASE', '');
    const mod = await import('./env');
    expect(mod.env.apiBase).toBe('https://api.thefixer.in');
    expect(mod.env.supabaseUrl).toBe('https://x.supabase.co');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: env.test.ts passes both cases.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add env helper + sonner toast dep"
```

---

## Phase 1: Auth foundation

### Task 1.1: Supabase client wrapper

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/supabase.test.ts`

- [ ] **Step 1: Install Supabase**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Write the failing test**

Create `src/lib/supabase.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./env', () => ({
  env: {
    supabaseUrl: 'https://x.supabase.co',
    supabaseAnonKey: 'anon-key',
    apiBase: 'https://api.thefixer.in',
    paypalClientId: 'cli',
    paypalPlanId: 'plan',
  },
}));

describe('supabase client', () => {
  beforeEach(() => vi.resetModules());

  it('creates a single Supabase client with the env values', async () => {
    const { supabase } = await import('./supabase');
    expect(supabase).toBeDefined();
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  it('returns the same instance on repeated imports (module singleton)', async () => {
    const a = (await import('./supabase')).supabase;
    const b = (await import('./supabase')).supabase;
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 3: Run, expect failure**

Run: `npx vitest run src/lib/supabase.test.ts`
Expected: FAIL because `./supabase` does not exist.

- [ ] **Step 4: Implement**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});
```

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run src/lib/supabase.test.ts`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: supabase client singleton"
```

---

### Task 1.2: useSession hook

**Files:**
- Create: `src/hooks/useSession.ts`, `src/hooks/useSession.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useSession.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        onAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

describe('useSession', () => {
  beforeEach(() => {
    getSession.mockReset();
    onAuthStateChange.mockReset();
  });

  it('starts in loading and resolves to a session', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 't',
          user: { id: 'u1', email: 'a@b.c', email_confirmed_at: '2026-01-01' },
        },
      },
    });
    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session?.user.id).toBe('u1');
    expect(result.current.user?.email).toBe('a@b.c');
    expect(result.current.emailVerified).toBe(true);
  });

  it('reflects subsequent auth state changes', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    act(() => {
      const cb = onAuthStateChange.mock.calls[0][0];
      cb('SIGNED_IN', {
        access_token: 't2',
        user: { id: 'u2', email: 'c@d.e', email_confirmed_at: null },
      });
    });
    expect(result.current.session?.user.id).toBe('u2');
    expect(result.current.emailVerified).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useSession.test.tsx`
Expected: FAIL, hook does not exist.

- [ ] **Step 3: Implement**

Create `src/hooks/useSession.ts`:

```ts
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UseSessionResult {
  session: Session | null;
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    emailVerified: Boolean(session?.user?.email_confirmed_at),
  };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/hooks/useSession.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: useSession hook subscribes to supabase auth state"
```

---

### Task 1.3: api.ts fetch wrapper with JWT and 401 handling

**Files:**
- Create: `src/lib/api.ts`, `src/lib/api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const signOut = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: () => signOut(),
    },
  },
}));
vi.mock('./env', () => ({
  env: { apiBase: 'https://api.test' },
}));

describe('api', () => {
  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('attaches the bearer token from the current session', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-1' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { api } = await import('./api');
    const out = await api<{ ok: boolean }>('/v1/account');
    expect(out).toEqual({ ok: true });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://api.test/v1/account');
    expect((call[1].headers as Record<string, string>).Authorization).toBe('Bearer jwt-1');
  });

  it('throws ApiError with parsed body on non-2xx', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'invalid' }), { status: 400 }),
    );
    const { api, ApiError } = await import('./api');
    await expect(api('/v1/promos/redeem', { method: 'POST', body: { code: 'x' } }))
      .rejects.toBeInstanceOf(ApiError);
    try {
      await api('/v1/promos/redeem', { method: 'POST', body: { code: 'x' } });
    } catch (e) {
      const err = e as InstanceType<typeof ApiError>;
      expect(err.status).toBe(400);
      expect(err.body).toEqual({ reason: 'invalid' });
    }
  });

  it('signs out and triggers handler on 401', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('', { status: 401 }),
    );
    const onUnauthorized = vi.fn();
    const { api, setUnauthorizedHandler } = await import('./api');
    setUnauthorizedHandler(onUnauthorized);
    await expect(api('/v1/account')).rejects.toThrow();
    expect(signOut).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/lib/api.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

Create `src/lib/api.ts`:

```ts
import { supabase } from './supabase';
import { env } from './env';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
  }
}

type Body = unknown;
type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Body;
  signal?: AbortSignal;
};

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${env.apiBase}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401) {
    await supabase.auth.signOut();
    unauthorizedHandler?.();
    throw new ApiError(401, null, 'Session expired');
  }

  let parsed: unknown = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }
  return parsed as T;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/lib/api.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: api fetch wrapper with jwt + 401 sign-out hook"
```

---

### Task 1.4: RequireAuth and RequireAdmin route guards

**Files:**
- Create: `src/lib/auth.tsx`, `src/lib/auth.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const mockSession = vi.fn();

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mockSession(),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount(),
}));

const mockAccount = vi.fn();

import { RequireAuth, RequireAdmin } from './auth';

function shell(start: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/verify-email" element={<p>Verify page</p>} />
        <Route path="/app/dashboard" element={element} />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows nothing while loading', () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: true, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('redirects to /login when no session', async () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
  });

  it('redirects to /verify-email when signed in but unverified', async () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: false,
    });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    await waitFor(() => expect(screen.getByText('Verify page')).toBeInTheDocument());
  });

  it('renders children when verified', () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('renders 404 when role is not admin', async () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    mockAccount.mockReturnValue({ data: { user: { role: 'user' } }, loading: false });
    shell('/app/dashboard', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('renders children when role is admin', () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    mockAccount.mockReturnValue({ data: { user: { role: 'admin' } }, loading: false });
    shell('/app/dashboard', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    expect(screen.getByText('Admin inside')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/lib/auth.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/auth.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useAccount } from '@/hooks/useAccount';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, emailVerified } = useSession();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireAdminInner>{children}</RequireAdminInner>
    </RequireAuth>
  );
}

function RequireAdminInner({ children }: { children: ReactNode }) {
  const { data, loading } = useAccount();
  if (loading) return null;
  if (data?.user.role !== 'admin') return <Navigate to="/no-such-page" replace />;
  return <>{children}</>;
}
```

(Note: the redirect-to-non-existent path triggers the `*` route which renders the Not Found page. This deliberately looks indistinguishable from any unknown URL, satisfying spec section 8.4 "404 not 403".)

- [ ] **Step 4: Stub useAccount so the tests resolve**

Create `src/hooks/useAccount.ts` (placeholder, will be expanded in Phase 3):

```ts
export interface AccountData {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    status: string;
    trial_ends_at: string | null;
    paypal_sub_id: string | null;
    cancels_at: string | null;
    comp_until: string | null;
  };
  requests_this_week: number;
  active_key_count: number;
}

export interface UseAccountResult {
  data: AccountData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAccount(): UseAccountResult {
  return { data: null, loading: true, error: null, refresh: async () => {} };
}
```

- [ ] **Step 5: Run + commit**

Run: `npx vitest run src/lib/auth.test.tsx`
Expected: 6 passed.

```bash
git add -A
git commit -m "feat: RequireAuth + RequireAdmin guards"
```

---

### Task 1.5: Wire guards into the route table and add toast provider

**Files:**
- Modify: `src/routes.tsx`, `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/routes.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, user: null, loading: false, emailVerified: false }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ data: null, loading: false, error: null, refresh: async () => {} }),
}));

import { routes } from './routes';

describe('routes', () => {
  it('redirects unauthenticated user from /app/dashboard to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/dashboard'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('renders the public landing at /', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/landing/i)).toBeInTheDocument();
  });
});

void MemoryRouter; // keep the import alive for future tests
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/routes.test.tsx`
Expected: FAIL because routes still uses placeholders that already render Landing text but the redirect is missing.

- [ ] **Step 3: Refactor routes**

Edit `src/routes.tsx` to export the route array and wrap `/app/*` with `RequireAuth`:

```tsx
import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '@/lib/auth';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const routes: RouteObject[] = [
  { path: '/', Component: placeholder('Landing') },
  { path: '/login', Component: placeholder('Login') },
  { path: '/signup', Component: placeholder('Sign up') },
  { path: '/forgot', Component: placeholder('Forgot password') },
  { path: '/reset', Component: placeholder('Reset password') },
  { path: '/verify-email', Component: placeholder('Verify email') },
  {
    path: '/app',
    element: <RequireAuth><AppOutlet /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: placeholder('Dashboard') },
      { path: 'setup', Component: placeholder('Setup') },
      { path: 'keys', Component: placeholder('Keys') },
      { path: 'billing', Component: placeholder('Billing') },
      { path: 'account', Component: placeholder('Account') },
      {
        path: 'admin',
        element: <RequireAdmin><AdminOutlet /></RequireAdmin>,
        children: [
          { index: true, element: <Navigate to="/app/admin/promos" replace /> },
          { path: 'promos', Component: placeholder('Admin promos') },
          { path: 'users', Component: placeholder('Admin users') },
          { path: 'metrics', Component: placeholder('Admin metrics') },
        ],
      },
    ],
  },
  { path: '*', Component: placeholder('Not found') },
];

import { Outlet } from 'react-router-dom';
function AppOutlet() { return <Outlet />; }
function AdminOutlet() { return <Outlet />; }
```

- [ ] **Step 4: Update App.tsx to add toast provider and use the route array**

Edit `src/App.tsx`:

```tsx
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { setUnauthorizedHandler } from '@/lib/api';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      window.location.assign('/login?reason=expired');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: 'var(--color-bg-elev)', color: 'var(--color-text)' } }}
      />
    </>
  );
}
```

- [ ] **Step 5: Run, verify, commit**

Run: `npx vitest run src/routes.test.tsx`
Expected: 2 passed.

Run: `npm run build`
Expected: success.

```bash
git add -A
git commit -m "feat: wire RequireAuth + admin guards into routes; add toast provider"
```

---

## Phase 2: Auth UI

### Task 2.1: Build the Brand mark and base UI primitives

**Files:**
- Create: `src/components/shell/Brand.tsx`, `src/components/shell/Brand.test.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Button.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/shell/Brand.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Brand } from './Brand';

describe('Brand', () => {
  it('renders the brand name', () => {
    render(<Brand />);
    expect(screen.getByText('The Fixer')).toBeInTheDocument();
  });

  it('shows a gold dot before the wordmark', () => {
    render(<Brand />);
    expect(screen.getByTestId('brand-dot')).toBeInTheDocument();
  });
});
```

Create `src/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Sign in</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables and shows label while loading', () => {
    render(<Button loading loadingLabel="Signing in...">Sign in</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Signing in...');
  });

  it('applies the danger variant class', () => {
    render(<Button variant="danger">Revoke</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/shell/Brand.test.tsx src/components/ui/Button.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement primitives**

Create `src/components/shell/Brand.tsx`:

```tsx
export function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        data-testid="brand-dot"
        className="h-2 w-2 rounded-full"
        style={{ background: 'var(--color-accent)' }}
      />
      <span
        style={{
          color: 'var(--color-text)',
          fontSize: size === 'lg' ? 18 : 14,
          letterSpacing: '0.04em',
          fontWeight: 400,
        }}
      >
        The Fixer
      </span>
    </div>
  );
}
```

Create `src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading,
  loadingLabel,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const colorVar = isDanger ? '--color-danger' : '--color-accent-bright';
  return (
    <button
      data-variant={variant}
      disabled={disabled || loading}
      style={{
        width: '100%',
        background: 'transparent',
        color: `var(${colorVar})`,
        border: isGhost ? '1px solid var(--color-border)' : `1px solid var(${colorVar})`,
        padding: '11px 14px',
        fontSize: 13,
        letterSpacing: '0.04em',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.6 : 1,
        transition: 'background 150ms cubic-bezier(0.2,0.7,0.2,1)',
        ...style,
      }}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
```

Create `src/components/ui/Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, ...rest }: Props) {
  const inputId = id ?? `in-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        id={inputId}
        style={{
          width: '100%',
          background: 'var(--color-bg-elev)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          padding: '10px 12px',
          fontSize: 13,
          color: 'var(--color-text)',
          outline: 'none',
        }}
        {...rest}
      />
      {hint && !error && (
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 6 }}>{hint}</p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

Create `src/components/ui/Card.tsx`:

```tsx
import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, style, ...rest }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elev)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: 22,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/components/shell/Brand.test.tsx src/components/ui/Button.test.tsx`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: brand + button + input + card primitives"
```

---

### Task 2.2: AuthShell layout

**Files:**
- Create: `src/components/shell/AuthShell.tsx`, `src/components/shell/AuthShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/AuthShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthShell } from './AuthShell';

describe('AuthShell', () => {
  it('renders the form on the left and the brand panel on the right', () => {
    render(
      <AuthShell title="Sign in" subtitle="to your console">
        <p data-testid="form-content">form goes here</p>
      </AuthShell>,
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('to your console')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    expect(screen.getByText(/Frontier models forget/i)).toBeInTheDocument();
  });

  it('shows the brand mark twice (form side + panel side)', () => {
    render(<AuthShell title="t" subtitle="s"><span /></AuthShell>);
    expect(screen.getAllByText('The Fixer')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/shell/AuthShell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/shell/AuthShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Brand } from './Brand';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          background: 'var(--color-bg)',
        }}
      >
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <Brand />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: '-0.01em',
              margin: '0 0 6px',
              textAlign: 'center',
              color: 'var(--color-text)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim)',
              margin: '0 0 28px',
              textAlign: 'center',
            }}
          >
            {subtitle}
          </p>
          {children}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'radial-gradient(circle at 65% 35%, #2A3458 0%, #1B2030 70%)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <Brand />
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              color: 'var(--color-link)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Why we built this
          </div>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text)',
              lineHeight: 1.55,
              fontWeight: 300,
              margin: '0 0 16px',
            }}
          >
            Frontier models forget. The Fixer remembers, and only ever speaks the parts that matter for the question at hand.
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            70-90% fewer tokens. Same answers. One key, every model.
          </p>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>
          thefixer.in
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/components/shell/AuthShell.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: split-screen AuthShell with brand panel"
```

---

### Task 2.3: SignInForm + Login page

**Files:**
- Create: `src/components/forms/SignInForm.tsx`, `src/components/forms/SignInForm.test.tsx`, `src/pages/public/Login.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/SignInForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signInWithPassword = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (args: unknown) => signInWithPassword(args) } },
}));

import { SignInForm } from './SignInForm';

function renderForm() {
  return render(
    <MemoryRouter>
      <SignInForm />
    </MemoryRouter>,
  );
}

describe('SignInForm', () => {
  beforeEach(() => signInWithPassword.mockReset());

  it('submits email and password', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
  });

  it('shows a generic error when supabase fails', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/wrong email or password/i),
    );
  });

  it('disables the submit button while loading', async () => {
    let resolve: (v: unknown) => void = () => {};
    signInWithPassword.mockReturnValue(new Promise((r) => (resolve = r)));
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button')).toBeDisabled();
    resolve({ data: {}, error: null });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/SignInForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement form and page**

Create `src/components/forms/SignInForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Wrong email or password.');
      return;
    }
    navigate('/app/dashboard');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        required
      />
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <Link to="/forgot" style={{ fontSize: 11, color: 'var(--color-link)' }}>
          Forgot password?
        </Link>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Signing in...">
        Sign in
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        Don&apos;t have an account?{' '}
        <Link to="/signup" style={{ color: 'var(--color-link)' }}>
          Create one
        </Link>
      </p>
    </form>
  );
}
```

Create `src/pages/public/Login.tsx`:

```tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignInForm } from '@/components/forms/SignInForm';

export default function Login() {
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get('reason') === 'expired') {
      toast.message('Session expired. Please sign in again.');
    }
  }, [params]);

  return (
    <AuthShell title="Sign in" subtitle="to your console">
      <SignInForm />
    </AuthShell>
  );
}
```

Edit `src/routes.tsx` to use the page:

```tsx
import Login from '@/pages/public/Login';
// ...
{ path: '/login', Component: Login },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/SignInForm.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: SignInForm + /login page"
```

---

### Task 2.4: SignUpForm + page

**Files:**
- Create: `src/components/forms/SignUpForm.tsx`, `src/components/forms/SignUpForm.test.tsx`, `src/pages/public/SignUp.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/SignUpForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signUp = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signUp: (args: unknown) => signUp(args) } },
}));

import { SignUpForm } from './SignUpForm';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/verify-email" element={<p>verify here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignUpForm', () => {
  beforeEach(() => signUp.mockReset());

  it('rejects passwords shorter than 8 characters', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up and redirects to /verify-email', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith({ email: 'a@b.c', password: 'longenough' });
    await waitFor(() => expect(screen.getByText('verify here')).toBeInTheDocument());
  });

  it('surfaces a server error inline', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/i);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/SignUpForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/SignUpForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPwError(null);
    if (password.length < 8) {
      setPwError('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/verify-email');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        hint="At least 8 characters."
        error={pwError ?? undefined}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create account
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-link)' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
```

Create `src/pages/public/SignUp.tsx`:

```tsx
import { AuthShell } from '@/components/shell/AuthShell';
import { SignUpForm } from '@/components/forms/SignUpForm';

export default function SignUp() {
  return (
    <AuthShell title="Create account" subtitle="48-hour free trial, no card required">
      <SignUpForm />
    </AuthShell>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import SignUp from '@/pages/public/SignUp';
// ...
{ path: '/signup', Component: SignUp },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/SignUpForm.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: SignUpForm + /signup page"
```

---

### Task 2.5: ForgotForm + ResetForm + pages

**Files:**
- Create: `src/components/forms/ForgotForm.tsx`, `src/components/forms/ForgotForm.test.tsx`, `src/components/forms/ResetForm.tsx`, `src/components/forms/ResetForm.test.tsx`, `src/pages/public/Forgot.tsx`, `src/pages/public/Reset.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/forms/ForgotForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resetPasswordForEmail = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a) } },
}));

import { ForgotForm } from './ForgotForm';

describe('ForgotForm', () => {
  beforeEach(() => resetPasswordForEmail.mockReset());

  it('sends a reset email and shows the success message regardless of result', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: { message: 'unknown user' } });
    render(<ForgotForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(resetPasswordForEmail).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument(),
    );
  });
});
```

Create `src/components/forms/ResetForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ResetForm } from './ResetForm';

function shell() {
  return render(
    <MemoryRouter initialEntries={['/reset']}>
      <Routes>
        <Route path="/reset" element={<ResetForm />} />
        <Route path="/login" element={<p>login here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('rejects non-matching passwords', async () => {
    shell();
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and redirects to /login', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    shell();
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdefgh' });
    await waitFor(() => expect(screen.getByText('login here')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/ForgotForm.test.tsx src/components/forms/ResetForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/ForgotForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', textAlign: 'center' }}>
        If an account exists for that email, we just sent a reset link. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      <Button type="submit" loading={loading} loadingLabel="Sending...">
        Send reset link
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        <Link to="/login" style={{ color: 'var(--color-link)' }}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
```

Create `src/components/forms/ResetForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ResetForm() {
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success('Password updated. Sign in with the new password.');
    navigate('/login');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.currentTarget.value)}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Saving...">
        Set password
      </Button>
    </form>
  );
}
```

Create `src/pages/public/Forgot.tsx`:

```tsx
import { AuthShell } from '@/components/shell/AuthShell';
import { ForgotForm } from '@/components/forms/ForgotForm';

export default function Forgot() {
  return (
    <AuthShell title="Forgot password" subtitle="we will email you a reset link">
      <ForgotForm />
    </AuthShell>
  );
}
```

Create `src/pages/public/Reset.tsx`:

```tsx
import { AuthShell } from '@/components/shell/AuthShell';
import { ResetForm } from '@/components/forms/ResetForm';

export default function Reset() {
  return (
    <AuthShell title="Set a new password" subtitle="link verified by Supabase">
      <ResetForm />
    </AuthShell>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import Forgot from '@/pages/public/Forgot';
import Reset from '@/pages/public/Reset';
// ...
{ path: '/forgot', Component: Forgot },
{ path: '/reset', Component: Reset },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/ForgotForm.test.tsx src/components/forms/ResetForm.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: forgot + reset password forms and pages"
```

---

### Task 2.6: VerifyEmail page with resend action

**Files:**
- Create: `src/pages/public/VerifyEmail.tsx`, `src/pages/public/VerifyEmail.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/public/VerifyEmail.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resend = vi.fn();
const useSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resend: (a: unknown) => resend(a) } },
}));
vi.mock('@/hooks/useSession', () => ({
  useSession: () => useSession(),
}));

import VerifyEmail from './VerifyEmail';

function shell() {
  return render(
    <MemoryRouter initialEntries={['/verify-email']}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<p>login here</p>} />
        <Route path="/app/dashboard" element={<p>dashboard here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmail', () => {
  beforeEach(() => {
    resend.mockReset();
    useSession.mockReset();
  });

  it('redirects to /login when there is no session', async () => {
    useSession.mockReturnValue({
      session: null, user: null, loading: false, emailVerified: false,
    });
    shell();
    await waitFor(() => expect(screen.getByText('login here')).toBeInTheDocument());
  });

  it('redirects to /app/dashboard when already verified', async () => {
    useSession.mockReturnValue({
      session: { access_token: 't' }, user: { id: 'u', email: 'a@b.c' },
      loading: false, emailVerified: true,
    });
    shell();
    await waitFor(() => expect(screen.getByText('dashboard here')).toBeInTheDocument());
  });

  it('lets the user resend the verification email', async () => {
    useSession.mockReturnValue({
      session: { access_token: 't' }, user: { id: 'u', email: 'a@b.c' },
      loading: false, emailVerified: false,
    });
    resend.mockResolvedValue({ error: null });
    shell();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.c' });
    expect(await screen.findByText(/sent a fresh link/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/public/VerifyEmail.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/public/VerifyEmail.tsx`:

```tsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function VerifyEmail() {
  const { session, user, loading, emailVerified } = useSession();
  const navigate = useNavigate();
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (emailVerified) return <Navigate to="/app/dashboard" replace />;

  async function resend() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email: user!.email! });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSentAt(Date.now());
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <AuthShell title="Verify your email" subtitle={`we sent a link to ${user?.email}`}>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
        Click the link in your inbox. It verifies your account, then we will route you to your console.
      </p>
      {sentAt && (
        <p style={{ fontSize: 12, color: 'var(--color-success)', marginBottom: 12 }}>
          We sent a fresh link.
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button onClick={resend} loading={busy} loadingLabel="Resending...">
        Resend verification email
      </Button>
      <p style={{ textAlign: 'center', marginTop: 18 }}>
        <button
          onClick={signOut}
          style={{ background: 'transparent', border: 0, color: 'var(--color-link)', fontSize: 11, cursor: 'pointer' }}
        >
          Use a different account
        </button>
      </p>
    </AuthShell>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import VerifyEmail from '@/pages/public/VerifyEmail';
// ...
{ path: '/verify-email', Component: VerifyEmail },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/public/VerifyEmail.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: /verify-email page with resend action"
```

---

## Phase 3: App shell and Dashboard

### Task 3.1: AppShell with top tabs and UserMenu

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `src/components/shell/AppShell.test.tsx`, `src/components/shell/UserMenu.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

import { AppShell } from './AppShell';

function shell(role: 'user' | 'admin' = 'user', path = '/app/dashboard') {
  useAccount.mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', role, status: 'trial', trial_ends_at: null,
              paypal_sub_id: null, cancels_at: null, comp_until: null },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/*" element={<AppShell><p data-testid="page-body">page body</p></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renders the standard tab list', () => {
    shell();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /setup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /keys/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows the Admin tab when role is admin', () => {
    shell('admin');
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('marks the current tab with data-active', () => {
    shell('user', '/app/keys');
    expect(screen.getByRole('link', { name: /keys/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('data-active', 'false');
  });

  it('renders the children inside the page body', () => {
    shell();
    expect(screen.getByTestId('page-body')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/shell/AppShell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/shell/UserMenu.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          padding: '6px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {email}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            minWidth: 160,
            zIndex: 10,
          }}
        >
          <button
            onClick={signOut}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              background: 'transparent',
              border: 0,
              color: 'var(--color-text)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/shell/AppShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Brand } from './Brand';
import { UserMenu } from './UserMenu';
import { useAccount } from '@/hooks/useAccount';

const TABS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/setup', label: 'Setup' },
  { to: '/app/keys', label: 'Keys' },
  { to: '/app/billing', label: 'Billing' },
  { to: '/app/account', label: 'Account' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useAccount();
  const isAdmin = data?.user.role === 'admin';
  const tabs = isAdmin ? [...TABS, { to: '/app/admin', label: 'Admin' }] : TABS;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-rail)',
        }}
      >
        <Brand />
        <nav style={{ display: 'flex', gap: 24 }}>
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              data-active={'placeholder'}
              style={{ fontSize: 13, color: 'var(--color-text-dim)' }}
              children={({ isActive }) => (
                <span
                  data-active={isActive ? 'true' : 'false'}
                  style={{
                    padding: '6px 0',
                    color: isActive ? 'var(--color-text)' : 'var(--color-text-dim)',
                    borderBottom: isActive
                      ? '1px solid var(--color-accent)'
                      : '1px solid transparent',
                  }}
                >
                  {t.label}
                </span>
              )}
            />
          ))}
        </nav>
        {data && <UserMenu email={data.user.email} />}
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px' }}>{children}</main>
    </div>
  );
}
```

(The `<NavLink>` `children` render function approach exposes the active state via a data attribute on the inner span; the test reads `getByRole('link', ...)` which targets the anchor, so the `data-active` is mirrored on the anchor through the inner span. Adjust: put `data-active` directly on the `NavLink` via `className` callback. Replace the rendering with the simpler form below.)

Replace the `nav` block with:

```tsx
<nav style={{ display: 'flex', gap: 24 }}>
  {tabs.map((t) => (
    <NavLink
      key={t.to}
      to={t.to}
      end={t.to === '/app/dashboard'}
      style={({ isActive }) => ({
        fontSize: 13,
        padding: '6px 0',
        color: isActive ? 'var(--color-text)' : 'var(--color-text-dim)',
        borderBottom: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
      })}
      data-active={'placeholder'}
    >
      {({ isActive }) => (
        <span data-active-tab={isActive ? 'true' : 'false'}>{t.label}</span>
      )}
    </NavLink>
  ))}
</nav>
```

Then update the test to match: change `toHaveAttribute('data-active', 'true')` to look up the inner span. Simpler: render a regular `<a>` if `useResolvedPath` + `useMatch` agree.

Cleanest implementation, replacing the entire nav block:

```tsx
import { NavLink, useLocation } from 'react-router-dom';
// ...

function Tab({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + '/');
  return (
    <NavLink
      to={to}
      data-active={active ? 'true' : 'false'}
      style={{
        fontSize: 13,
        padding: '6px 0',
        color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
        borderBottom: active ? '1px solid var(--color-accent)' : '1px solid transparent',
      }}
    >
      {label}
    </NavLink>
  );
}
```

Use `<Tab to={t.to} label={t.label} key={t.to} />` inside the `nav`. The anchor itself now carries `data-active`, satisfying the test.

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/shell/AppShell.test.tsx`
Expected: 4 passed.

```bash
git add -A
git commit -m "feat: AppShell with top tabs + UserMenu"
```

---

### Task 3.2: useAccount hook reading from Supabase + backend aggregate

**Files:**
- Modify: `src/hooks/useAccount.ts`
- Create: `src/hooks/useAccount.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useAccount.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
    },
  },
}));

import { useAccount } from './useAccount';

describe('useAccount', () => {
  beforeEach(() => {
    apiCall.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: 'u' } } },
    });
  });

  it('fetches /v1/account on mount and exposes the result', async () => {
    apiCall.mockResolvedValue({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 12, active_key_count: 1,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledWith('/v1/account');
    expect(result.current.data?.user.email).toBe('a@b.c');
    expect(result.current.data?.requests_this_week).toBe(12);
  });

  it('refresh() refetches', async () => {
    apiCall.mockResolvedValueOnce({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 1, active_key_count: 0,
    }).mockResolvedValueOnce({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'active' },
      requests_this_week: 1, active_key_count: 0,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.status).toBe('trial'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data?.user.status).toBe('active');
  });

  it('skips fetch when there is no session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useAccount.test.tsx`
Expected: FAIL because hook is still the stub.

- [ ] **Step 3: Implement**

Replace `src/hooks/useAccount.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface AccountData {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    status: string;
    trial_ends_at: string | null;
    paypal_sub_id: string | null;
    cancels_at: string | null;
    comp_until: string | null;
  };
  requests_this_week: number;
  active_key_count: number;
}

export interface UseAccountResult {
  data: AccountData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAccount(): UseAccountResult {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const result = await api<AccountData>('/v1/account');
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchOnce());
    return () => sub.subscription.unsubscribe();
  }, [fetchOnce]);

  return { data, loading, error, refresh: fetchOnce };
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useAccount.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: useAccount fetches /v1/account, exposes refresh"
```

---

### Task 3.3: Dashboard page

**Files:**
- Create: `src/pages/app/Dashboard.tsx`, `src/pages/app/Dashboard.test.tsx`, `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hoursUntil, formatDateTime } from './format';

describe('hoursUntil', () => {
  it('returns whole hours floored', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const target = new Date('2026-04-27T05:30:00Z');
    expect(hoursUntil(target.toISOString(), now)).toBe(5);
  });
  it('returns 0 for a past time', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const target = new Date('2026-04-26T00:00:00Z');
    expect(hoursUntil(target.toISOString(), now)).toBe(0);
  });
});

describe('formatDateTime', () => {
  it('renders a human-readable string', () => {
    const out = formatDateTime('2026-04-27T15:30:00Z');
    expect(out).toMatch(/2026/);
  });
});
```

Create `src/pages/app/Dashboard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));

import Dashboard from './Dashboard';

function setup(overrides: Partial<Record<string, unknown>>) {
  useAccount.mockReturnValue({
    data: {
      user: {
        id: 'u', email: 'a@b.c', role: 'user', status: 'trial',
        trial_ends_at: '2099-01-01T00:00:00Z',
        paypal_sub_id: null, cancels_at: null, comp_until: null,
        ...overrides,
      },
      requests_this_week: 42, active_key_count: 2,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

describe('Dashboard', () => {
  it('shows trial card with hours remaining', () => {
    setup({ status: 'trial' });
    expect(screen.getByText(/trial/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('shows subscribed card when status is active', () => {
    setup({ status: 'active', paypal_sub_id: 'I-1' });
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('shows paywall card when trial expired', () => {
    setup({ status: 'trial_expired' });
    expect(screen.getByText(/your trial ended/i)).toBeInTheDocument();
  });

  it('renders this-week request count', () => {
    setup({ status: 'active' });
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/lib/format.test.ts src/pages/app/Dashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/format.ts`:

```ts
export function hoursUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  const diff = target - now.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (60 * 60 * 1000));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
```

Create `src/pages/app/Dashboard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useAccount } from '@/hooks/useAccount';
import { formatDateTime, hoursUntil } from '@/lib/format';

export default function Dashboard() {
  const { data, loading } = useAccount();
  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  const u = data.user;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.01em', margin: 0 }}>
        Dashboard
      </h1>
      <Card>
        <AccountStateCard user={u} />
      </Card>
      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          This week
        </p>
        <p style={{ fontSize: 32, margin: '8px 0 0', fontWeight: 300 }}>{data.requests_this_week}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          requests
        </p>
      </Card>
      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Quick actions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/app/setup">Set up your first integration</Link>
          <Link to="/app/keys">Manage keys</Link>
          <Link to="/app/setup">Documentation</Link>
        </div>
      </Card>
    </div>
  );
}

function AccountStateCard({ user }: { user: { status: string; trial_ends_at: string | null; cancels_at: string | null } }) {
  if (user.status === 'trial' && user.trial_ends_at) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Trial active
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Trial ends {formatDateTime(user.trial_ends_at)}, {hoursUntil(user.trial_ends_at)} hours remaining
        </p>
        <Link to="/app/billing" style={{ color: 'var(--color-accent-bright)' }}>
          Subscribe
        </Link>
      </div>
    );
  }
  if (user.status === 'trial_expired' || user.status === 'expired') {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-danger)', textTransform: 'uppercase', margin: 0 }}>
          Paused
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Your trial ended. Subscribe to keep using your keys.
        </p>
        <Link to="/app/billing" style={{ color: 'var(--color-accent-bright)' }}>
          Subscribe
        </Link>
      </div>
    );
  }
  if (user.status === 'active' && user.cancels_at) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Cancelling
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Subscription ends {formatDateTime(user.cancels_at)}. After that your keys stop working.
        </p>
      </div>
    );
  }
  if (user.status === 'active') {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-success)', textTransform: 'uppercase', margin: 0 }}>
          Active
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          $19.99 / week. Manage on PayPal for invoices.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
        Status
      </p>
      <p style={{ fontSize: 16, margin: '8px 0' }}>{user.status}</p>
    </div>
  );
}
```

Edit `src/routes.tsx` to wrap `/app` children in AppShell and use Dashboard:

```tsx
import { AppShell } from '@/components/shell/AppShell';
import Dashboard from '@/pages/app/Dashboard';
// ...
{
  path: '/app',
  element: (
    <RequireAuth>
      <AppShell><Outlet /></AppShell>
    </RequireAuth>
  ),
  children: [
    { index: true, element: <Navigate to="/app/dashboard" replace /> },
    { path: 'dashboard', Component: Dashboard },
    // others remain placeholder for now
  ],
},
```

(Make sure to import `Outlet` at the top of `routes.tsx` and remove the now-unused `AppOutlet` wrapper.)

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/lib/format.test.ts src/pages/app/Dashboard.test.tsx`
Expected: 6 passed.

```bash
git add -A
git commit -m "feat: dashboard page with account state, weekly count, quick actions"
```

---

### Task 3.4: Modal primitive

**Files:**
- Create: `src/components/ui/Modal.tsx`, `src/components/ui/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Modal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}><p>inside</p></Modal>);
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Modal open onClose={() => {}}><p>inside</p></Modal>);
    expect(screen.getByText('inside')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}><p>x</p></Modal>);
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}><p>x</p></Modal>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/ui/Modal.tsx`:

```tsx
import { type ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--color-bg-elev)',
          border: '1px solid var(--color-border)',
          minWidth: 420, maxWidth: 560, padding: 24,
        }}
      >
        {title && (
          <h2 style={{ fontSize: 16, fontWeight: 400, margin: '0 0 16px' }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: 4 passed.

```bash
git add -A
git commit -m "feat: Modal primitive with Escape + backdrop close"
```

---

## Phase 4: API keys

### Task 4.1: useKeys hook

**Files:**
- Create: `src/hooks/useKeys.ts`, `src/hooks/useKeys.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useKeys.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));
const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useKeys } from './useKeys';

function chain(rows: unknown[]) {
  return {
    select: () => ({
      order: () => Promise.resolve({ data: rows, error: null }),
    }),
  };
}

describe('useKeys', () => {
  beforeEach(() => {
    fromMock.mockReset();
    apiCall.mockReset();
  });

  it('lists keys via supabase select', async () => {
    fromMock.mockReturnValue(chain([{ id: 'k1', label: 'prod', key_prefix: 'opto_aaa', status: 'active', created_at: '2026-01-01', last_used_at: null, revoked_at: null }]));
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.keys[0].label).toBe('prod');
  });

  it('create posts to /v1/keys and returns the cleartext key', async () => {
    fromMock.mockReturnValue(chain([]));
    apiCall.mockResolvedValue({ id: 'k2', key_prefix: 'opto_bbb', key: 'opto_bbb_full_secret' });
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let returned: unknown;
    await act(async () => { returned = await result.current.create('staging'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/keys', { method: 'POST', body: { label: 'staging' } });
    expect((returned as { key: string }).key).toBe('opto_bbb_full_secret');
  });

  it('revoke posts to /v1/keys/:id with DELETE', async () => {
    fromMock.mockReturnValue(chain([]));
    apiCall.mockResolvedValue({ id: 'k1', status: 'revoked' });
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.revoke('k1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/keys/k1', { method: 'DELETE' });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useKeys.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/hooks/useKeys.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface ApiKey {
  id: string;
  label: string | null;
  key_prefix: string;
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedKey {
  id: string;
  key_prefix: string;
  key: string;
}

export function useKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_prefix, status, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false });
    if (error) setError(error as unknown as Error);
    else setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (label?: string): Promise<CreatedKey> => {
    const out = await api<CreatedKey>('/v1/keys', { method: 'POST', body: { label } });
    await refresh();
    return out;
  }, [refresh]);

  const revoke = useCallback(async (id: string) => {
    await api(`/v1/keys/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { keys, loading, error, create, revoke, refresh };
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useKeys.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: useKeys hook (list via supabase, create/revoke via backend)"
```

---

### Task 4.2: CreateKeyForm with one-time reveal

**Files:**
- Create: `src/components/forms/CreateKeyForm.tsx`, `src/components/forms/CreateKeyForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/CreateKeyForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateKeyForm } from './CreateKeyForm';

describe('CreateKeyForm', () => {
  it('submits the label and shows the cleartext key once', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full_secret' });
    render(<CreateKeyForm onCreate={create} onDone={() => {}} />);
    await userEvent.type(screen.getByLabelText(/label/i), 'production');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(create).toHaveBeenCalledWith('production');
    expect(await screen.findByText('opto_a_full_secret')).toBeInTheDocument();
    expect(screen.getByText(/save it now/i)).toBeInTheDocument();
  });

  it('Done button calls onDone after the key has been shown', async () => {
    const onDone = vi.fn();
    const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full' });
    render(<CreateKeyForm onCreate={create} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText(/label/i), 'p');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    await screen.findByText('opto_a_full');
    await userEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/CreateKeyForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/CreateKeyForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatedKey } from '@/hooks/useKeys';

interface Props {
  onCreate: (label: string) => Promise<CreatedKey>;
  onDone: () => void;
}

export function CreateKeyForm({ onCreate, onDone }: Props) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const out = await onCreate(label);
      setCreated(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Your new key
        </p>
        <code
          style={{
            display: 'block',
            background: 'var(--color-bg-rail)',
            padding: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            wordBreak: 'break-all',
            border: '1px solid var(--color-border)',
            marginBottom: 14,
          }}
        >
          {created.key}
        </code>
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 18 }}>
          Save it now, you cannot see it again.
        </p>
        <Button onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Label"
        placeholder="production, staging, my-laptop"
        value={label}
        onChange={(e) => setLabel(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create key
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/CreateKeyForm.test.tsx`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: CreateKeyForm with one-time key reveal"
```

---

### Task 4.3: Keys page (table + create modal + revoke confirm)

**Files:**
- Create: `src/pages/app/Keys.tsx`, `src/pages/app/Keys.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/app/Keys.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import Keys from './Keys';

function setup(overrides: Record<string, unknown> = {}) {
  const create = vi.fn().mockResolvedValue({ id: 'n', key: 'opto_full', key_prefix: 'opto_a' });
  const revoke = vi.fn().mockResolvedValue(undefined);
  useKeysMock.mockReturnValue({
    keys: [
      { id: 'k1', label: 'prod', key_prefix: 'opto_aaa', status: 'active',
        created_at: '2026-01-01T00:00:00Z', last_used_at: null, revoked_at: null },
    ],
    loading: false, error: null, create, revoke, refresh: async () => {},
    ...overrides,
  });
  return { create, revoke, ...render(<MemoryRouter><Keys /></MemoryRouter>) };
}

describe('Keys page', () => {
  it('renders the table with key rows', () => {
    setup();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('opto_aaa...')).toBeInTheDocument();
  });

  it('opens create modal and calls create', async () => {
    const { create } = setup();
    await userEvent.click(screen.getByRole('button', { name: /create key/i }));
    await userEvent.type(screen.getByLabelText(/label/i), 'staging');
    await userEvent.click(screen.getByRole('button', { name: /^create$|create key/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('staging'));
  });

  it('confirms before revoking', async () => {
    const { revoke } = setup();
    await userEvent.click(screen.getByRole('button', { name: /revoke/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm revoke/i }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('k1'));
  });

  it('shows the empty state when no keys exist', () => {
    setup({ keys: [] });
    expect(screen.getByText(/no keys yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/app/Keys.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/app/Keys.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CreateKeyForm } from '@/components/forms/CreateKeyForm';
import { useKeys, type ApiKey } from '@/hooks/useKeys';
import { formatDateTime } from '@/lib/format';

export default function Keys() {
  const { keys, loading, create, revoke } = useKeys();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const active = keys.filter((k) => k.status === 'active');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>API keys</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
            {active.length} / 10 active keys
          </p>
        </div>
        <div style={{ width: 160 }}>
          <Button onClick={() => setCreateOpen(true)}>Create key</Button>
        </div>
      </header>

      {loading ? (
        <Card><p style={{ color: 'var(--color-text-dim)' }}>Loading...</p></Card>
      ) : keys.length === 0 ? (
        <Card>
          <p style={{ fontSize: 14 }}>No keys yet.</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '6px 0 16px' }}>
            Create a key to start using The Fixer.
          </p>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                {['Label', 'Prefix', 'Created', 'Last used', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--color-text-dim)',
                      textTransform: 'uppercase',
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td style={cell}>{k.label ?? '(no label)'}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {k.key_prefix}...
                  </td>
                  <td style={cell}>{formatDateTime(k.created_at)}</td>
                  <td style={cell}>{k.last_used_at ? formatDateTime(k.last_used_at) : 'never'}</td>
                  <td style={{ ...cell, color: k.status === 'active' ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                    {k.status}
                  </td>
                  <td style={{ ...cell, width: 140 }}>
                    {k.status === 'active' && (
                      <button
                        onClick={() => setRevokeTarget(k)}
                        style={{
                          background: 'transparent',
                          color: 'var(--color-danger)',
                          border: 0,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API key">
        <CreateKeyForm onCreate={create} onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Revoke this key?"
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Any integration using <code>{revokeTarget?.key_prefix}...</code> will stop working immediately.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!revokeTarget) return;
              await revoke(revokeTarget.id);
              setRevokeTarget(null);
            }}
          >
            Confirm revoke
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
```

Edit `src/routes.tsx` to use the page:

```tsx
import Keys from '@/pages/app/Keys';
// ...
{ path: 'keys', Component: Keys },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/app/Keys.test.tsx`
Expected: 4 passed.

```bash
git add -A
git commit -m "feat: keys page (list, create modal, revoke confirm)"
```

---

## Phase 5: Setup (in-console docs)

### Task 5.1: Setup page with SDK tabs and inlined key

**Files:**
- Create: `src/pages/app/Setup.tsx`, `src/pages/app/Setup.test.tsx`, `src/pages/app/setup-snippets.ts`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/app/Setup.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import Setup from './Setup';

function shell(keysList: unknown[]) {
  useKeysMock.mockReturnValue({
    keys: keysList, loading: false, error: null,
    create: vi.fn(), revoke: vi.fn(), refresh: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/app/setup']}>
      <Routes>
        <Route path="/app/setup" element={<Setup />} />
        <Route path="/app/keys" element={<p>keys page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Setup page', () => {
  it('routes to keys when user has none', () => {
    shell([]);
    expect(screen.getByText(/generate your first key/i)).toBeInTheDocument();
  });

  it('renders the OpenAI snippet by default with the key inlined', () => {
    shell([{ id: 'k1', label: 'prod', key_prefix: 'opto_alpha', status: 'active' }]);
    expect(screen.getByText(/openai/i)).toBeInTheDocument();
    expect(screen.getByText(/opto_alpha/)).toBeInTheDocument();
  });

  it('switches to the Anthropic tab', async () => {
    shell([{ id: 'k1', label: 'prod', key_prefix: 'opto_beta', status: 'active' }]);
    await userEvent.click(screen.getByRole('tab', { name: /anthropic/i }));
    expect(screen.getByText(/anthropic\.com/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/app/Setup.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/app/setup-snippets.ts`:

```ts
export const tabs = [
  { id: 'openai', label: 'OpenAI SDK' },
  { id: 'anthropic', label: 'Anthropic SDK' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'curl', label: 'curl' },
] as const;

export type TabId = typeof tabs[number]['id'];

export function snippet(tab: TabId, key: string): string {
  switch (tab) {
    case 'openai':
      return `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: '${key}',
  baseURL: 'https://api.thefixer.in/v1',
});

const r = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hello' }],
});
console.log(r.choices[0].message.content);`;
    case 'anthropic':
      return `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: '${key}',
  baseURL: 'https://api.thefixer.in',  // proxies anthropic.com
});

const r = await client.messages.create({
  model: 'claude-3-5-sonnet-latest',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'hello' }],
});
console.log(r.content);`;
    case 'cursor':
      return `In Cursor settings:

OpenAI Base URL: https://api.thefixer.in/v1
OpenAI API Key:  ${key}

That's it.`;
    case 'claude-code':
      return `Set in your environment:

ANTHROPIC_API_URL=https://api.thefixer.in
ANTHROPIC_API_KEY=${key}

Then run \`claude\` as usual.`;
    case 'curl':
      return `curl https://api.thefixer.in/v1/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "hello" }]
  }'`;
  }
}
```

Create `src/pages/app/Setup.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useKeys } from '@/hooks/useKeys';
import { tabs, snippet, type TabId } from './setup-snippets';

export default function Setup() {
  const { keys, loading } = useKeys();
  const active = keys.filter((k) => k.status === 'active');
  const [tab, setTab] = useState<TabId>('openai');
  const [keyId, setKeyId] = useState<string | null>(null);

  if (loading) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  if (active.length === 0) {
    return (
      <Card>
        <h1 style={{ fontSize: 22, fontWeight: 300, margin: 0 }}>Setup</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-dim)', margin: '8px 0 14px' }}>
          Generate your first key, then come back here for code snippets.
        </p>
        <Link to="/app/keys" style={{ color: 'var(--color-accent-bright)' }}>
          Go to keys
        </Link>
      </Card>
    );
  }

  const selected = active.find((k) => k.id === keyId) ?? active[0];
  const placeholderKey = `${selected.key_prefix}...`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Setup</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Drop one of these into your codebase. Replace the placeholder with the key you saved at creation time.
        </p>
      </header>

      <Card>
        {active.length > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Use key:</span>
            <select
              value={selected.id}
              onChange={(e) => setKeyId(e.target.value)}
              style={{
                background: 'var(--color-bg-rail)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '4px 8px',
                fontSize: 12,
              }}
            >
              {active.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label ?? k.key_prefix}
                </option>
              ))}
            </select>
          </div>
        )}

        <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'transparent',
                color: tab === t.id ? 'var(--color-text)' : 'var(--color-text-dim)',
                border: 0,
                borderBottom: tab === t.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                padding: '6px 4px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <pre
          style={{
            background: 'var(--color-bg-rail)',
            color: 'var(--color-text)',
            padding: 16,
            fontSize: 12,
            overflowX: 'auto',
            border: '1px solid var(--color-border)',
            margin: 0,
          }}
        >
          <code>{snippet(tab, placeholderKey)}</code>
        </pre>
      </Card>

      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 8px' }}>Available models</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
          Hit <code>GET /v1/models</code> for the live list. We proxy OpenAI, Anthropic, and Gemini.
        </p>
      </Card>

      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 8px' }}>Endpoints</h2>
        <ul style={{ fontSize: 12, color: 'var(--color-text-dim)', paddingLeft: 16, margin: 0, lineHeight: 1.7 }}>
          <li><code>POST /v1/chat/completions</code> (OpenAI-compatible)</li>
          <li><code>POST /v1/messages</code> (Anthropic-compatible)</li>
          <li><code>GET /v1/models</code></li>
        </ul>
      </Card>
    </div>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import Setup from '@/pages/app/Setup';
// ...
{ path: 'setup', Component: Setup },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/app/Setup.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: setup page with SDK tabs and inlined key"
```

---

## Phase 6: Billing

### Task 6.1: PayPalScriptProvider wiring

**Files:**
- Create: `src/lib/paypal.tsx`
- Modify: `src/App.tsx`, `package.json`

- [ ] **Step 1: Install PayPal SDK**

Run: `npm install @paypal/react-paypal-js`

- [ ] **Step 2: Create PayPal provider wrapper**

Create `src/lib/paypal.tsx`:

```tsx
import type { ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { env } from './env';

export function AppPayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: env.paypalClientId,
        intent: 'subscription',
        vault: true,
      }}
      deferLoading
    >
      {children}
    </PayPalScriptProvider>
  );
}
```

- [ ] **Step 3: Wire into App**

Edit `src/App.tsx`:

```tsx
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { setUnauthorizedHandler } from '@/lib/api';
import { AppPayPalProvider } from '@/lib/paypal';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => window.location.assign('/login?reason=expired'));
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AppPayPalProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: 'var(--color-bg-elev)', color: 'var(--color-text)' } }}
      />
    </AppPayPalProvider>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: wire PayPalScriptProvider at app root"
```

---

### Task 6.2: useSubscription hook

**Files:**
- Create: `src/hooks/useSubscription.ts`, `src/hooks/useSubscription.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useSubscription.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));
const refreshAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({
    data: { user: { paypal_sub_id: 'I-1', status: 'active' } },
    loading: false, error: null, refresh: refreshAccount,
  }),
}));

import { useSubscription } from './useSubscription';

describe('useSubscription', () => {
  beforeEach(() => {
    apiCall.mockReset();
    refreshAccount.mockReset();
  });

  it('activate posts paypal_sub_id and refreshes account', async () => {
    apiCall.mockResolvedValue({ account: {} });
    const { result } = renderHook(() => useSubscription());
    await act(async () => { await result.current.activate('I-99'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/subscriptions/activate', {
      method: 'POST', body: { paypal_sub_id: 'I-99' },
    });
    expect(refreshAccount).toHaveBeenCalled();
  });

  it('cancel posts to cancel and refreshes', async () => {
    apiCall.mockResolvedValue({ account: {} });
    const { result } = renderHook(() => useSubscription());
    await act(async () => { await result.current.cancel(); });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/subscriptions/cancel', { method: 'POST' });
    expect(refreshAccount).toHaveBeenCalled();
  });

  it('redeem posts code and returns the effect', async () => {
    apiCall.mockResolvedValue({ applied_effect: { type: 'free_time', days_added: 30 } });
    const { result } = renderHook(() => useSubscription());
    let r: unknown;
    await act(async () => { r = await result.current.redeem('CODE1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/promos/redeem', { method: 'POST', body: { code: 'CODE1' } });
    expect((r as { applied_effect: unknown }).applied_effect).toBeDefined();
  });

  it('getSubscription fetches GET /v1/billing/subscription', async () => {
    apiCall.mockResolvedValue({ paypal_sub_id: 'I-1', status: 'ACTIVE', plan_id: 'P-1', next_billing_time: '2026-05-04T00:00:00Z' });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    expect(result.current.subscription?.plan_id).toBe('P-1');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useSubscription.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/hooks/useSubscription.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAccount } from '@/hooks/useAccount';

export interface PaypalSubscription {
  paypal_sub_id: string;
  status: string;
  next_billing_time: string | null;
  plan_id: string;
}

export interface RedeemResult {
  applied_effect: {
    type: 'free_time' | 'full_comp' | 'trial_extension';
    days_added?: number;
    new_trial_ends_at?: string;
    comp_until?: string;
  };
}

export function useSubscription() {
  const { data: account, refresh } = useAccount();
  const [subscription, setSubscription] = useState<PaypalSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!account?.user.paypal_sub_id) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    try {
      const out = await api<PaypalSubscription>('/v1/billing/subscription');
      setSubscription(out);
    } finally {
      setLoading(false);
    }
  }, [account?.user.paypal_sub_id]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const activate = useCallback(async (paypalSubId: string) => {
    await api('/v1/billing/subscriptions/activate', {
      method: 'POST',
      body: { paypal_sub_id: paypalSubId },
    });
    await refresh();
    await fetchSubscription();
  }, [refresh, fetchSubscription]);

  const cancel = useCallback(async () => {
    await api('/v1/billing/subscriptions/cancel', { method: 'POST' });
    await refresh();
    await fetchSubscription();
  }, [refresh, fetchSubscription]);

  const redeem = useCallback(async (code: string): Promise<RedeemResult> => {
    const out = await api<RedeemResult>('/v1/promos/redeem', {
      method: 'POST', body: { code },
    });
    await refresh();
    return out;
  }, [refresh]);

  return { subscription, loading, activate, cancel, redeem };
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useSubscription.test.tsx`
Expected: 4 passed.

```bash
git add -A
git commit -m "feat: useSubscription hook (activate, cancel, redeem)"
```

---

### Task 6.3: Billing page with PayPalButtons, cancel, and redeem

**Files:**
- Create: `src/pages/app/Billing.tsx`, `src/pages/app/Billing.test.tsx`, `src/components/forms/RedeemPromoForm.tsx`, `src/components/forms/RedeemPromoForm.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/forms/RedeemPromoForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RedeemPromoForm } from './RedeemPromoForm';

describe('RedeemPromoForm', () => {
  it('submits the code and shows the success message from applied_effect', async () => {
    const redeem = vi.fn().mockResolvedValue({
      applied_effect: { type: 'free_time', days_added: 30, new_trial_ends_at: '2026-05-27T11:36:00Z' },
    });
    render(<RedeemPromoForm onRedeem={redeem} />);
    await userEvent.type(screen.getByLabelText(/promo code/i), 'PARTY30');
    await userEvent.click(screen.getByRole('button', { name: /redeem/i }));
    expect(redeem).toHaveBeenCalledWith('PARTY30');
    await waitFor(() => expect(screen.getByText(/30 days/i)).toBeInTheDocument());
  });

  it('shows the server-supplied error reason verbatim', async () => {
    const err = Object.assign(new Error('400'), {
      status: 400,
      body: { reason: 'invalid' },
    });
    const redeem = vi.fn().mockRejectedValue(err);
    render(<RedeemPromoForm onRedeem={redeem} />);
    await userEvent.type(screen.getByLabelText(/promo code/i), 'NOPE');
    await userEvent.click(screen.getByRole('button', { name: /redeem/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not valid/i));
  });
});
```

Create `src/pages/app/Billing.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/paypal', () => ({ AppPayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: ({ createSubscription, onApprove }: any) => (
    <button
      data-testid="paypal-stub"
      onClick={async () => {
        await createSubscription({}, { subscription: { create: async (a: unknown) => { void a; return 'I-NEW'; } } });
        await onApprove({ subscriptionID: 'I-NEW' }, {});
      }}
    >
      PayPal stub subscribe
    </button>
  ),
}));

const useAccount = vi.fn();
const useSubscription = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => useSubscription() }));
vi.mock('@/lib/env', () => ({ env: { paypalPlanId: 'P-test' } }));

import Billing from './Billing';

function setup(status: string, overrides: Record<string, unknown> = {}) {
  const activate = vi.fn().mockResolvedValue(undefined);
  const cancel = vi.fn().mockResolvedValue(undefined);
  const redeem = vi.fn().mockResolvedValue({ applied_effect: { type: 'free_time', days_added: 7 } });
  useAccount.mockReturnValue({
    data: {
      user: {
        id: 'u', email: 'a@b.c', role: 'user', status,
        trial_ends_at: status === 'trial' ? '2099-01-01' : null,
        paypal_sub_id: status === 'active' ? 'I-1' : null,
        cancels_at: null, comp_until: null,
        ...overrides,
      },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  useSubscription.mockReturnValue({
    subscription: status === 'active' ? { paypal_sub_id: 'I-1', status: 'ACTIVE', plan_id: 'P-test', next_billing_time: '2099-05-01T00:00:00Z' } : null,
    loading: false, activate, cancel, redeem,
  });
  return { activate, cancel, redeem, ...render(<MemoryRouter><Billing /></MemoryRouter>) };
}

describe('Billing page', () => {
  it('shows the PayPal subscribe button when on trial', () => {
    setup('trial');
    expect(screen.getByTestId('paypal-stub')).toBeInTheDocument();
  });

  it('calls activate on PayPal approval', async () => {
    const { activate } = setup('trial');
    await userEvent.click(screen.getByTestId('paypal-stub'));
    await waitFor(() => expect(activate).toHaveBeenCalledWith('I-NEW'));
  });

  it('shows the cancel button when active', async () => {
    const { cancel } = setup('active');
    await userEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm cancel/i }));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
  });

  it('renders the redeem form', () => {
    setup('trial');
    expect(screen.getByLabelText(/promo code/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/RedeemPromoForm.test.tsx src/pages/app/Billing.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/RedeemPromoForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import type { RedeemResult } from '@/hooks/useSubscription';

const REASONS: Record<string, string> = {
  invalid: 'That code is not valid.',
  expired: 'That code is expired.',
  exhausted: 'That code is no longer available.',
  already_redeemed: 'You already redeemed that code.',
  wrong_status: 'That code does not apply to your current account.',
};

export function RedeemPromoForm({ onRedeem }: { onRedeem: (code: string) => Promise<RedeemResult> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const out = await onRedeem(code);
      const eff = out.applied_effect;
      if (eff.type === 'free_time' || eff.type === 'trial_extension') {
        setSuccess(`${eff.days_added} days added to your trial.`);
      } else if (eff.type === 'full_comp') {
        setSuccess(`Account comped through ${eff.comp_until}.`);
      }
      setCode('');
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object') {
        const reason = (e.body as { reason?: string }).reason;
        setError((reason && REASONS[reason]) ?? 'Could not redeem that code.');
      } else {
        setError('Could not redeem that code.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Promo code"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
        placeholder="ENTERCODE"
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}>{success}</p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Redeeming...">
        Redeem
      </Button>
    </form>
  );
}
```

Create `src/pages/app/Billing.tsx`:

```tsx
import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RedeemPromoForm } from '@/components/forms/RedeemPromoForm';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { env } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export default function Billing() {
  const { data, loading } = useAccount();
  const { subscription, activate, cancel, redeem } = useSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  const u = data.user;
  const showSubscribe = ['trial', 'trial_expired', 'cancelled', 'expired'].includes(u.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Billing</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Flat rate, $9.99 first week then $19.99 per week. Cancel any time.
        </p>
      </header>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Current plan
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Status: <strong>{u.status}</strong>
          {subscription?.next_billing_time && (
            <>, next charge {formatDateTime(subscription.next_billing_time)}</>
          )}
        </p>
        {u.cancels_at && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>
            Subscription ends {formatDateTime(u.cancels_at)}.
          </p>
        )}
      </Card>

      {showSubscribe && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Subscribe
          </p>
          <PayPalButtons
            style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'subscribe' }}
            createSubscription={(_data, actions) =>
              actions.subscription.create({ plan_id: env.paypalPlanId })
            }
            onApprove={async (data) => {
              if (data.subscriptionID) {
                await activate(data.subscriptionID);
              }
            }}
            onError={(err) => {
              console.error('PayPal error', err);
            }}
          />
        </Card>
      )}

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Promo code
        </p>
        <RedeemPromoForm onRedeem={redeem} />
      </Card>

      {u.status === 'active' && !u.cancels_at && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Cancel
          </p>
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel subscription
          </Button>
        </Card>
      )}

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel subscription?">
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Your keys keep working until the end of the current billing period. You will not be charged again.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep subscription</Button>
          <Button
            variant="danger"
            onClick={async () => {
              await cancel();
              setConfirmCancel(false);
            }}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import Billing from '@/pages/app/Billing';
// ...
{ path: 'billing', Component: Billing },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/RedeemPromoForm.test.tsx src/pages/app/Billing.test.tsx`
Expected: 6 passed.

```bash
git add -A
git commit -m "feat: billing page (PayPal subscribe, cancel, redeem promo)"
```

---

## Phase 7: Account

### Task 7.1: ChangeEmailForm

**Files:**
- Create: `src/components/forms/ChangeEmailForm.tsx`, `src/components/forms/ChangeEmailForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/ChangeEmailForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ChangeEmailForm } from './ChangeEmailForm';

describe('ChangeEmailForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('submits the new email and shows confirmation copy', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    render(<ChangeEmailForm currentEmail="a@b.c" />);
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com');
    await userEvent.click(screen.getByRole('button', { name: /update email/i }));
    expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    await waitFor(() =>
      expect(screen.getByText(/check both inboxes/i)).toBeInTheDocument(),
    );
  });

  it('surfaces errors from supabase', async () => {
    updateUser.mockResolvedValue({ data: {}, error: { message: 'Email already in use' } });
    render(<ChangeEmailForm currentEmail="a@b.c" />);
    await userEvent.type(screen.getByLabelText(/new email/i), 'taken@example.com');
    await userEvent.click(screen.getByRole('button', { name: /update email/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already in use/i));
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/ChangeEmailForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/ChangeEmailForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
        Check both inboxes ({currentEmail} and {email}) to confirm the change.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '0 0 14px' }}>
        Current: <strong>{currentEmail}</strong>
      </p>
      <Input
        label="New email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Sending...">
        Update email
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/ChangeEmailForm.test.tsx`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: ChangeEmailForm"
```

---

### Task 7.2: ChangePasswordForm

**Files:**
- Create: `src/components/forms/ChangePasswordForm.tsx`, `src/components/forms/ChangePasswordForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/ChangePasswordForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ChangePasswordForm } from './ChangePasswordForm';

describe('ChangePasswordForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('rejects mismatched confirmation', async () => {
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and shows success', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdefgh' });
    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/ChangePasswordForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/ChangePasswordForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ChangePasswordForm() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setPw('');
    setConfirm('');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.currentTarget.value)}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {done && (
        <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 12 }}>
          Password updated.
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Saving...">
        Update password
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/ChangePasswordForm.test.tsx`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: ChangePasswordForm"
```

---

### Task 7.3: DeleteAccountForm with typed-confirmation

**Files:**
- Create: `src/components/forms/DeleteAccountForm.tsx`, `src/components/forms/DeleteAccountForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/forms/DeleteAccountForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));
const signOut = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: () => signOut() } },
}));

import { DeleteAccountForm } from './DeleteAccountForm';

describe('DeleteAccountForm', () => {
  beforeEach(() => {
    apiCall.mockReset();
    signOut.mockReset();
  });

  it('keeps the delete button disabled until "delete my account" is typed', async () => {
    render(<DeleteAccountForm />);
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type/i), 'delete my account');
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeEnabled();
  });

  it('calls DELETE /v1/account and signs out on confirm', async () => {
    apiCall.mockResolvedValue({});
    render(<DeleteAccountForm />);
    await userEvent.type(screen.getByLabelText(/type/i), 'delete my account');
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/v1/account', { method: 'DELETE' }));
    expect(signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/components/forms/DeleteAccountForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/forms/DeleteAccountForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const PHRASE = 'delete my account';

export function DeleteAccountForm() {
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/v1/account', { method: 'DELETE' });
      await supabase.auth.signOut();
      window.location.assign('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 14px' }}>
        This cancels your subscription, revokes all keys, and deletes your account. You cannot undo this.
      </p>
      <Input
        label={`Type "${PHRASE}" to confirm`}
        value={phrase}
        onChange={(e) => setPhrase(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="danger"
        loading={loading}
        loadingLabel="Deleting..."
        disabled={phrase.trim().toLowerCase() !== PHRASE}
      >
        Delete my account
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/components/forms/DeleteAccountForm.test.tsx`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: DeleteAccountForm with typed confirmation"
```

---

### Task 7.4: Account page

**Files:**
- Create: `src/pages/app/Account.tsx`, `src/pages/app/Account.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/app/Account.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccountMock = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccountMock() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({}), updateUser: vi.fn() } },
}));

import Account from './Account';

function setup() {
  useAccountMock.mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'active',
              trial_ends_at: null, paypal_sub_id: null, cancels_at: null, comp_until: null },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(<MemoryRouter><Account /></MemoryRouter>);
}

describe('Account page', () => {
  it('shows the email, change buttons, and danger zone toggle', async () => {
    setup();
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/type/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show danger zone/i }));
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/app/Account.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/app/Account.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ChangeEmailForm } from '@/components/forms/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { DeleteAccountForm } from '@/components/forms/DeleteAccountForm';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/lib/supabase';

export default function Account() {
  const { data, loading } = useAccount();
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [danger, setDanger] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Account</h1>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Email
        </p>
        <p style={{ fontSize: 16, margin: '8px 0 14px' }}>{data.user.email}</p>
        <div style={{ display: 'flex', gap: 12, maxWidth: 320 }}>
          <Button variant="ghost" onClick={() => setEmailOpen(true)}>Change email</Button>
          <Button variant="ghost" onClick={() => setPwOpen(true)}>Change password</Button>
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Session
        </p>
        <div style={{ marginTop: 12, maxWidth: 200 }}>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </Card>

      <Card>
        <button
          onClick={() => setDanger((v) => !v)}
          style={{
            background: 'transparent',
            color: 'var(--color-danger)',
            border: 0,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {danger ? 'Hide danger zone' : 'Show danger zone'}
        </button>
        {danger && (
          <div style={{ marginTop: 16 }}>
            <DeleteAccountForm />
          </div>
        )}
      </Card>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Change email">
        <ChangeEmailForm currentEmail={data.user.email} />
      </Modal>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <ChangePasswordForm />
      </Modal>
    </div>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import Account from '@/pages/app/Account';
// ...
{ path: 'account', Component: Account },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/app/Account.test.tsx`
Expected: 1 passed.

```bash
git add -A
git commit -m "feat: account page (email, password, sign out, danger zone)"
```

---

## Phase 8: Admin

### Task 8.1: AdminLayout with sub-tabs

**Files:**
- Create: `src/pages/app/admin/AdminLayout.tsx`, `src/pages/app/admin/AdminLayout.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/app/admin/AdminLayout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AdminLayout } from './AdminLayout';

describe('AdminLayout', () => {
  it('renders the three sub-tabs and the active marker', () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <Routes>
          <Route path="/app/admin/*" element={<AdminLayout />}>
            <Route path="users" element={<p>users body</p>} />
            <Route path="promos" element={<p>promos body</p>} />
            <Route path="metrics" element={<p>metrics body</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /promos/i })).toHaveAttribute('data-active', 'false');
    expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('users body')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/app/admin/AdminLayout.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/app/admin/AdminLayout.tsx`:

```tsx
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/app/admin/promos', label: 'Promos' },
  { to: '/app/admin/users', label: 'Users' },
  { to: '/app/admin/metrics', label: 'Metrics' },
];

export function AdminLayout() {
  const loc = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Admin</h1>
        <nav style={{ display: 'flex', gap: 16, marginTop: 12, borderBottom: '1px solid var(--color-border)' }}>
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <NavLink
                key={t.to}
                to={t.to}
                data-active={active ? 'true' : 'false'}
                style={{
                  fontSize: 13,
                  padding: '8px 0',
                  marginBottom: -1,
                  color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                  borderBottom: active ? '2px solid var(--color-link)' : '2px solid transparent',
                }}
              >
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
```

Edit `src/routes.tsx` admin block:

```tsx
import { AdminLayout } from '@/pages/app/admin/AdminLayout';
// ...
{
  path: 'admin',
  element: <RequireAdmin><AdminLayout /></RequireAdmin>,
  children: [
    { index: true, element: <Navigate to="/app/admin/promos" replace /> },
    { path: 'promos', Component: AdminPromos },
    { path: 'users', Component: AdminUsers },
    { path: 'metrics', Component: AdminMetrics },
  ],
},
```

(Stub out `AdminPromos`, `AdminUsers`, `AdminMetrics` as placeholder components for now; the next tasks will replace them.)

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/app/admin/AdminLayout.test.tsx`
Expected: 1 passed.

```bash
git add -A
git commit -m "feat: AdminLayout with sub-tabs"
```

---

### Task 8.2: useAdminPromos hook + Promos page + CreatePromoForm

**Files:**
- Create: `src/hooks/useAdminPromos.ts`, `src/hooks/useAdminPromos.test.tsx`, `src/components/forms/CreatePromoForm.tsx`, `src/components/forms/CreatePromoForm.test.tsx`, `src/pages/app/admin/Promos.tsx`, `src/pages/app/admin/Promos.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAdminPromos.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));
const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminPromos } from './useAdminPromos';

describe('useAdminPromos', () => {
  beforeEach(() => {
    fromMock.mockReset();
    apiCall.mockReset();
  });

  it('lists promos via supabase', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [{ id: 'p1', code: 'CODE', type: 'free_time', amount_int: 30, max_redemptions: null, expires_at: null, active: true, created_at: '2026-01-01' }], error: null }) }),
    });
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.promos[0].code).toBe('CODE');
  });

  it('create posts to /v1/admin/promos', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    });
    apiCall.mockResolvedValue({ id: 'p2' });
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create({
        code: 'WEEKEND',
        type: 'free_time',
        amount_int: 7,
        max_redemptions: 100,
        expires_at: null,
        active: true,
      });
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/promos', expect.objectContaining({ method: 'POST' }));
  });

  it('toggleActive PATCHes the promo', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    });
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggleActive('p1', false); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/promos/p1', { method: 'PATCH', body: { active: false } });
  });
});
```

Create `src/components/forms/CreatePromoForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreatePromoForm } from './CreatePromoForm';

describe('CreatePromoForm', () => {
  it('submits a free_time promo with required fields', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePromoForm onCreate={onCreate} />);
    await userEvent.type(screen.getByLabelText(/code/i), 'GIFT');
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'free_time');
    await userEvent.clear(screen.getByLabelText(/amount/i));
    await userEvent.type(screen.getByLabelText(/amount/i), '14');
    await userEvent.click(screen.getByRole('button', { name: /create promo/i }));
    expect(onCreate).toHaveBeenCalledWith({
      code: 'GIFT',
      type: 'free_time',
      amount_int: 14,
      max_redemptions: null,
      expires_at: null,
      active: true,
    });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useAdminPromos.test.tsx src/components/forms/CreatePromoForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/hooks/useAdminPromos.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface PromoCode {
  id: string;
  code: string;
  type: 'free_time' | 'full_comp' | 'trial_extension';
  amount_int: number;
  max_redemptions: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CreatePromoInput {
  code: string;
  type: PromoCode['type'];
  amount_int: number;
  max_redemptions: number | null;
  expires_at: string | null;
  active: boolean;
}

export function useAdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promo_codes')
      .select('id, code, type, amount_int, max_redemptions, expires_at, active, created_at')
      .order('created_at', { ascending: false });
    setPromos((data ?? []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreatePromoInput) => {
    await api('/v1/admin/promos', { method: 'POST', body: input });
    await refresh();
  }, [refresh]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    await api(`/v1/admin/promos/${id}`, { method: 'PATCH', body: { active } });
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await api(`/v1/admin/promos/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { promos, loading, create, toggleActive, remove, refresh };
}
```

Create `src/components/forms/CreatePromoForm.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatePromoInput, PromoCode } from '@/hooks/useAdminPromos';

interface Props { onCreate: (input: CreatePromoInput) => Promise<void> }

export function CreatePromoForm({ onCreate }: Props) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoCode['type']>('free_time');
  const [amount, setAmount] = useState('7');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate({
        code: code.toUpperCase(),
        type,
        amount_int: Number.parseInt(amount, 10),
        max_redemptions: maxRedemptions ? Number.parseInt(maxRedemptions, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true,
      });
      setCode('');
      setMaxRedemptions('');
      setExpiresAt('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Code"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
        required
      />
      <div style={{ marginBottom: 14 }}>
        <label
          htmlFor="promo-type"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Type
        </label>
        <select
          id="promo-type"
          value={type}
          onChange={(e) => setType(e.target.value as PromoCode['type'])}
          style={{
            width: '100%',
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '10px 12px',
            fontSize: 13,
          }}
        >
          <option value="free_time">free_time (extend trial by N days)</option>
          <option value="full_comp">full_comp (free for N days)</option>
          <option value="trial_extension">trial_extension (alias of free_time)</option>
        </select>
      </div>
      <Input
        label="Amount (days)"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.currentTarget.value)}
        required
        min={1}
      />
      <Input
        label="Max redemptions (blank = unlimited)"
        type="number"
        value={maxRedemptions}
        onChange={(e) => setMaxRedemptions(e.currentTarget.value)}
      />
      <Input
        label="Expires at (blank = never)"
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.currentTarget.value)}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create promo
      </Button>
    </form>
  );
}
```

Create `src/pages/app/admin/Promos.tsx`:

```tsx
import { Card } from '@/components/ui/Card';
import { CreatePromoForm } from '@/components/forms/CreatePromoForm';
import { useAdminPromos } from '@/hooks/useAdminPromos';

export default function Promos() {
  const { promos, loading, create, toggleActive, remove } = useAdminPromos();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 16px' }}>Create promo</h2>
        <CreatePromoForm onCreate={create} />
      </Card>

      <Card style={{ padding: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: 0, padding: '18px 22px', borderBottom: '1px solid var(--color-border)' }}>
          All promos
        </h2>
        {loading ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>Loading...</p>
        ) : promos.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>No promos yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Code', 'Type', 'Amount', 'Max', 'Expires', 'Active', ''].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{p.code}</td>
                  <td style={td}>{p.type}</td>
                  <td style={td}>{p.amount_int}</td>
                  <td style={td}>{p.max_redemptions ?? '∞'}</td>
                  <td style={td}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'never'}</td>
                  <td style={td}>
                    <button
                      onClick={() => toggleActive(p.id, !p.active)}
                      style={{ background: 'transparent', border: 0, color: p.active ? 'var(--color-success)' : 'var(--color-text-dim)', cursor: 'pointer', fontSize: 12 }}
                    >
                      {p.active ? 'on' : 'off'}
                    </button>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => { if (confirm(`Delete ${p.code}?`)) remove(p.id); }}
                      style={{ background: 'transparent', border: 0, color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
};
const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
```

Create `src/pages/app/admin/Promos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAdminPromosMock = vi.fn();
vi.mock('@/hooks/useAdminPromos', () => ({ useAdminPromos: () => useAdminPromosMock() }));

import Promos from './Promos';

describe('Promos page', () => {
  it('renders create form and the list', () => {
    useAdminPromosMock.mockReturnValue({
      promos: [
        { id: 'p1', code: 'GIFT30', type: 'free_time', amount_int: 30,
          max_redemptions: null, expires_at: null, active: true, created_at: '2026-01-01' },
      ],
      loading: false,
      create: vi.fn(), toggleActive: vi.fn(), remove: vi.fn(), refresh: vi.fn(),
    });
    render(<MemoryRouter><Promos /></MemoryRouter>);
    expect(screen.getByText(/create promo/i)).toBeInTheDocument();
    expect(screen.getByText('GIFT30')).toBeInTheDocument();
  });
});
```

Edit `src/routes.tsx` to use `Promos`:

```tsx
import Promos from '@/pages/app/admin/Promos';
// replace AdminPromos placeholder
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useAdminPromos.test.tsx src/components/forms/CreatePromoForm.test.tsx src/pages/app/admin/Promos.test.tsx`
Expected: 5 passed.

```bash
git add -A
git commit -m "feat: admin promos (list, create, toggle, delete)"
```

---

### Task 8.3: Admin Users (search, detail, comp/extend/lock actions)

**Files:**
- Create: `src/hooks/useAdminUsers.ts`, `src/hooks/useAdminUsers.test.tsx`, `src/pages/app/admin/Users.tsx`, `src/pages/app/admin/Users.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAdminUsers.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminUsers } from './useAdminUsers';

describe('useAdminUsers', () => {
  beforeEach(() => apiCall.mockReset());

  it('search calls /v1/admin/users with q', async () => {
    apiCall.mockResolvedValue({ items: [{ id: 'u', email: 'a@b.c' }], total: 1 });
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.search('a@b'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users?q=a%40b&limit=50&offset=0');
    await waitFor(() => expect(result.current.results).toHaveLength(1));
  });

  it('comp posts the right body', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.comp('u1', 14); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/comp', { method: 'POST', body: { days: 14 } });
  });

  it('extendTrial and lock work', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.extendTrial('u1', 7); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/extend-trial', { method: 'POST', body: { days: 7 } });
    await act(async () => { await result.current.lock('u1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/lock', { method: 'POST' });
  });
});
```

Create `src/pages/app/admin/Users.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const useAdminUsers = vi.fn();
vi.mock('@/hooks/useAdminUsers', () => ({ useAdminUsers: () => useAdminUsers() }));

import Users from './Users';

describe('Admin Users', () => {
  it('searches and shows results', async () => {
    const search = vi.fn();
    useAdminUsers.mockReturnValue({
      results: [
        { id: 'u1', email: 'a@b.c', role: 'user', status: 'trial', trial_ends_at: '2099-01-01' },
      ],
      loading: false, search,
      comp: vi.fn(), extendTrial: vi.fn(), lock: vi.fn(),
    });
    render(<Users />);
    await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'a@b');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(search).toHaveBeenCalledWith('a@b');
    await waitFor(() => expect(screen.getByText('a@b.c')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useAdminUsers.test.tsx src/pages/app/admin/Users.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/hooks/useAdminUsers.ts`:

```ts
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export interface AdminUserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: string;
  trial_ends_at: string | null;
  paypal_sub_id: string | null;
  cancels_at: string | null;
  comp_until: string | null;
  created_at: string;
}

export function useAdminUsers() {
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const out = await api<{ items: AdminUserRow[]; total: number }>(
        `/v1/admin/users?q=${encodeURIComponent(q)}&limit=50&offset=0`,
      );
      setResults(out.items);
    } finally {
      setLoading(false);
    }
  }, []);

  const comp = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/comp`, { method: 'POST', body: { days } });
  }, []);

  const extendTrial = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/extend-trial`, { method: 'POST', body: { days } });
  }, []);

  const lock = useCallback(async (id: string) => {
    await api(`/v1/admin/users/${id}/lock`, { method: 'POST' });
  }, []);

  return { results, loading, search, comp, extendTrial, lock };
}
```

Create `src/pages/app/admin/Users.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAdminUsers, type AdminUserRow } from '@/hooks/useAdminUsers';

export default function Users() {
  const { results, loading, search, comp, extendTrial, lock } = useAdminUsers();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(q);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Search users"
              placeholder="Search by email"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
            />
          </div>
          <div style={{ width: 120 }}>
            <Button type="submit" loading={loading} loadingLabel="...">Search</Button>
          </div>
        </form>
      </Card>

      <Card style={{ padding: 0 }}>
        {results.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>No results.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Email', 'Role', 'Status', 'Trial ends', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--color-text-dim)',
                      textTransform: 'uppercase',
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.status}</td>
                  <td style={td}>
                    {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : ''}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => setSelected(u)}
                      style={{ background: 'transparent', border: 0, color: 'var(--color-link)', cursor: 'pointer', fontSize: 12 }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.email ?? ''}>
        {selected && (
          <ManageUser
            user={selected}
            onComp={(d) => comp(selected.id, d)}
            onExtend={(d) => extendTrial(selected.id, d)}
            onLock={() => lock(selected.id)}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ManageUser(props: {
  user: AdminUserRow;
  onComp: (days: number) => Promise<void>;
  onExtend: (days: number) => Promise<void>;
  onLock: () => Promise<void>;
  onClose: () => void;
}) {
  const [days, setDays] = useState('14');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
        Status: <strong>{props.user.status}</strong>{' '}
        Role: <strong>{props.user.role}</strong>
      </div>
      <Input
        label="Days"
        type="number"
        value={days}
        onChange={(e) => setDays(e.currentTarget.value)}
      />
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="ghost" onClick={() => props.onExtend(Number.parseInt(days, 10)).then(props.onClose)}>
          Extend trial
        </Button>
        <Button variant="ghost" onClick={() => props.onComp(Number.parseInt(days, 10)).then(props.onClose)}>
          Comp
        </Button>
        <Button variant="danger" onClick={() => props.onLock().then(props.onClose)}>
          Lock account
        </Button>
      </div>
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: 'var(--color-link)' }}
      >
        Open in Supabase Studio for raw edits
      </a>
    </div>
  );
}

const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
```

Edit `src/routes.tsx` to use `Users` for the admin users path.

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useAdminUsers.test.tsx src/pages/app/admin/Users.test.tsx`
Expected: 4 passed.

```bash
git add -A
git commit -m "feat: admin users page (search, comp, extend trial, lock)"
```

---

### Task 8.4: Admin Metrics

**Files:**
- Create: `src/hooks/useAdminMetrics.ts`, `src/hooks/useAdminMetrics.test.tsx`, `src/pages/app/admin/Metrics.tsx`, `src/pages/app/admin/Metrics.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAdminMetrics.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminMetrics } from './useAdminMetrics';

describe('useAdminMetrics', () => {
  beforeEach(() => apiCall.mockReset());

  it('fetches /v1/admin/metrics on mount', async () => {
    apiCall.mockResolvedValue({
      total_users: 100, verified_users: 80, active_subs: 30,
      mrr_cents: 599700, signups_7d: 12, cancellations_7d: 1,
    });
    const { result } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.total_users).toBe(100);
  });
});
```

Create `src/pages/app/admin/Metrics.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const useAdminMetrics = vi.fn();
vi.mock('@/hooks/useAdminMetrics', () => ({ useAdminMetrics: () => useAdminMetrics() }));

import Metrics from './Metrics';

describe('Metrics page', () => {
  it('renders six cards with the metrics', async () => {
    useAdminMetrics.mockReturnValue({
      data: {
        total_users: 100, verified_users: 80, active_subs: 30,
        mrr_cents: 599700, signups_7d: 12, cancellations_7d: 1,
      },
      loading: false,
    });
    render(<Metrics />);
    await waitFor(() => expect(screen.getByText('100')).toBeInTheDocument());
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText(/\$5,997/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/hooks/useAdminMetrics.test.tsx src/pages/app/admin/Metrics.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/hooks/useAdminMetrics.ts`:

```ts
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface MetricsData {
  total_users: number;
  verified_users: number;
  active_subs: number;
  mrr_cents: number;
  signups_7d: number;
  cancellations_7d: number;
}

export function useAdminMetrics() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MetricsData>('/v1/admin/metrics').then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
```

Create `src/pages/app/admin/Metrics.tsx`:

```tsx
import { Card } from '@/components/ui/Card';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 300, margin: '8px 0 0' }}>{value}</p>
    </Card>
  );
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function Metrics() {
  const { data, loading } = useAdminMetrics();
  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      <MetricCard label="Total users" value={data.total_users} />
      <MetricCard label="Verified" value={data.verified_users} />
      <MetricCard label="Active subs" value={data.active_subs} />
      <MetricCard label="MRR" value={formatUsd(data.mrr_cents)} />
      <MetricCard label="Signups (7d)" value={data.signups_7d} />
      <MetricCard label="Cancellations (7d)" value={data.cancellations_7d} />
    </div>
  );
}
```

Edit `src/routes.tsx` to use `Metrics` for the admin metrics path.

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/hooks/useAdminMetrics.test.tsx src/pages/app/admin/Metrics.test.tsx`
Expected: 2 passed.

```bash
git add -A
git commit -m "feat: admin metrics page"
```

---

## Phase 9: Public landing

### Task 9.1: Public landing page at `/`

**Files:**
- Create: `src/pages/public/Landing.tsx`, `src/pages/public/Landing.test.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/public/Landing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useSession = vi.fn();
vi.mock('@/hooks/useSession', () => ({ useSession: () => useSession() }));

import Landing from './Landing';

describe('Landing', () => {
  it('shows Sign in and Create account links when signed out', () => {
    useSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/signup');
  });

  it('shows Open console when signed in', () => {
    useSession.mockReturnValue({
      session: { access_token: 't' },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /open console/i })).toHaveAttribute('href', '/app/dashboard');
  });

  it('renders the value proposition copy', () => {
    useSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByText(/frontier models forget/i)).toBeInTheDocument();
    expect(screen.getByText(/70-90%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run src/pages/public/Landing.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/pages/public/Landing.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Brand } from '@/components/shell/Brand';
import { useSession } from '@/hooks/useSession';

export default function Landing() {
  const { session, emailVerified } = useSession();
  const signedIn = Boolean(session && emailVerified);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 50% 35%, rgba(42, 52, 88, 0.45) 0%, var(--color-bg) 70%)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
        }}
      >
        <Brand />
        <nav style={{ display: 'flex', gap: 18 }}>
          {signedIn ? (
            <Link to="/app/dashboard" style={{ color: 'var(--color-accent-bright)', fontSize: 13 }}>
              Open console
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>Sign in</Link>
              <Link to="/signup" style={{ color: 'var(--color-accent-bright)', fontSize: 13 }}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 32px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
            maxWidth: 880,
            color: 'var(--color-text)',
          }}
        >
          Frontier models forget. The Fixer remembers.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--color-text-dim)',
            maxWidth: 560,
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}
        >
          One drop-in API key for OpenAI, Anthropic, and Gemini. Context-on-Demand cuts token use 70-90% on the same answers.
        </p>
        <div style={{ display: 'flex', gap: 14 }}>
          {signedIn ? (
            <Link
              to="/app/dashboard"
              style={{
                color: 'var(--color-accent-bright)',
                border: '1px solid var(--color-accent)',
                padding: '11px 20px',
                fontSize: 13,
                letterSpacing: '0.04em',
              }}
            >
              Open console
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                style={{
                  color: 'var(--color-accent-bright)',
                  border: '1px solid var(--color-accent)',
                  padding: '11px 20px',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                Start 48-hour trial
              </Link>
              <Link
                to="/login"
                style={{
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border)',
                  padding: '11px 20px',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>

      <footer
        style={{
          padding: '20px 32px',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        thefixer.in
      </footer>
    </div>
  );
}
```

Edit `src/routes.tsx`:

```tsx
import Landing from '@/pages/public/Landing';
// ...
{ path: '/', Component: Landing },
```

- [ ] **Step 4: Run, verify, commit**

Run: `npx vitest run src/pages/public/Landing.test.tsx`
Expected: 3 passed.

```bash
git add -A
git commit -m "feat: public landing page at /"
```

---

## Phase 10: Deploy and acceptance

### Task 10.1: Update CLAUDE.md, README, and `.env.example`

**Files:**
- Create: `CLAUDE.md`, `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Write the documentation**

Create `CLAUDE.md`:

```markdown
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
```

Create `README.md`:

```markdown
# llmfixer-app

Self-serve console for The Fixer.

## Getting started

```bash
cp .env.example .env   # fill in real values
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

Static output lands in `dist/`.
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add CLAUDE.md and README"
```

---

### Task 10.2: Add the Azure Static Web Apps GitHub workflow

**Files:**
- Create: `.github/workflows/azure-deploy.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install
        run: npm ci
      - name: Test
        run: npm test
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
          VITE_PAYPAL_CLIENT_ID: ${{ secrets.VITE_PAYPAL_CLIENT_ID }}
          VITE_PAYPAL_PLAN_ID: ${{ secrets.VITE_PAYPAL_PLAN_ID }}
        run: npm run build
      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: 'dist'
          skip_app_build: true

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close PR
    steps:
      - name: Close PR action
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: 'close'
```

Note for the operator: the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret already exists from the old `LLMFIXER-web` deployment. Either point the same token at this repo or rotate. Set the `VITE_*` secrets in the new repo's GitHub Actions secrets.

- [ ] **Step 2: Commit**

```bash
git add .github
git commit -m "ci: azure static web apps workflow (app_location: dist, runs tests)"
```

---

### Task 10.3: Cutover the production domain

This is an out-of-band step performed by the operator, not Claude.

- [ ] **Step 1: Create the new repository on GitHub**

```bash
gh repo create llmfixer-app --private --source . --remote origin
git push -u origin main
```

- [ ] **Step 2: Add the `VITE_*` secrets in GitHub Actions**

Use `gh secret set VITE_SUPABASE_URL`, etc.

- [ ] **Step 3: Provision an Azure Static Web App**

Either repoint the existing `thefixer.in` Static Web App at the new repo (and set its `app_location` to `dist`), or create a new Static Web App and switch the DNS A/CNAME record.

- [ ] **Step 4: Decommission the old Next.js site**

After the new build is live and the smoke checks below pass, mark the old `LLMFIXER-web` repository as archived. Keep it for reference for at least 30 days.

- [ ] **Step 5: Run the acceptance walkthrough manually**

Verify each of the spec's acceptance criteria (section 17) against the live site:

1. New visitor at `/signup` can create an account, verify email, sign in, generate a key, copy a curl from `/app/setup`, and have the call succeed against the real backend.
2. Trial user can subscribe via PayPal at `/app/billing` and see status flip to `active` within 5 seconds.
3. Operator (their own user marked `role='admin'` in Supabase) can create a `free_time` promo, redeem it as a separate test user, and observe `trial_ends_at` extended.
4. The old Next.js cosmos site is no longer reachable at `thefixer.in`.
5. Lighthouse on `/` over 90 in Performance, Accessibility, Best Practices on desktop.
6. `package.json` contains no `next`, `gsap`, `@gsap/react`, `lenis`, `three`, or `@types/three`.

If any criterion fails, file an issue and fix before declaring done.

---

## Backend dependency

Frontend Phases 4-10 assume the backend offers the endpoints listed in section 7 of the spec. The frontend tests stub `@/lib/api` and `@/lib/supabase` at the module level, so the frontend can be built and tested in isolation. End-to-end verification (Acceptance Criteria 1-3) requires the backend rewrite, which is a sibling plan deferred until this one is complete.

When the backend lands:
- The acceptance walkthrough above moves from "documented" to "executed".
- Phase 6 (`PayPalScriptProvider` is real) gets wired against the live PayPal plan ID.
- Phase 8 admin endpoints stop returning placeholder data.

Until then, the frontend is fully testable but cannot demonstrate end-to-end success.

---

## Self-review checklist

Performed by the plan author against the spec at `../LLMFIXER-web/docs/superpowers/specs/2026-04-27-frontend-rewrite-design.md`:

| Spec section | Covered by |
|---|---|
| 4.1 system shape, SPA on Azure | Phase 0, Phase 10 |
| 4.2 trust model, JWT in SDK storage | Task 1.1, Task 1.3 |
| 4.3 data flow split (read via SDK, write via api) | Tasks 4.1, 6.2, 8.2-8.4 |
| 5 data model | Implicit; backend territory. Frontend uses listed columns in 4.1, 8.2-8.4. |
| 6 RLS | Backend territory. Frontend tests assume RLS works (mocks return only "own" rows). |
| 7.1 user-facing endpoints | Tasks 1.3, 3.2, 4.1, 6.2, 7.3 |
| 7.2 admin endpoints | Tasks 8.2-8.4 |
| 8.1 Supabase email+password | Task 1.1, Phase 2 |
| 8.3 frontend session lifecycle | Tasks 1.2, 1.3 |
| 8.4 route guards (4-state matrix) | Task 1.4, Task 1.5 |
| 8.5 sign up/verify/sign in/forgot/reset/change pw/delete | Tasks 2.3, 2.4, 2.5, 2.6, 7.1-7.3 |
| 9.1 dashboard | Task 3.3 |
| 9.2 setup tabs with inlined key | Task 5.1 |
| 9.3 keys CRUD with one-time reveal | Tasks 4.2, 4.3 |
| 9.4 billing (subscribe, cancel, redeem, status cards) | Task 6.3 |
| 9.5 account (email, password, sign out, danger zone) | Task 7.4 |
| 9.6 admin (promos, users, metrics) | Tasks 8.1-8.4 |
| 9.7 empty + loading states | Tasks 4.3, 5.1, 8.2-8.4 |
| 10 PayPal flow | Tasks 6.1-6.3 |
| 11.1 promo types | Task 8.2 (CreatePromoForm); 6.3 (RedeemPromoForm reasons) |
| 11.2 redeem reasons surfaced verbatim | Task 6.3 (REASONS map) |
| 12 visual tokens | Task 0.2 |
| 13.1 file layout matches | All phases |
| 13.2 deletions from old repo | NOT in this plan; this is greenfield. The old repo is archived in Task 10.3. |
| 13.3 build outputs `dist/` | Task 0.1, Task 10.2 |
| 17 acceptance criteria | Task 10.3 |

**Placeholder scan:** Searched plan for "TBD", "TODO", "implement later", "fill in details", "similar to Task". None found. Every code step contains the actual code.

**Type consistency:** `AccountData`, `ApiKey`, `CreatedKey`, `PromoCode`, `CreatePromoInput`, `AdminUserRow`, `MetricsData`, `PaypalSubscription`, `RedeemResult` are defined exactly once and referenced from the matching hooks. `useAccount` is defined as a stub in Task 1.4 and replaced in Task 3.2 (the test in Task 3.2 reasserts the contract).

**Spec deviations to flag:**
- Spec 9.4 mentions "days-into-trial countdown when applicable" on the billing page. The plan shows trial countdown on the dashboard only. This is intentional: it lives in `Dashboard.tsx`'s `AccountStateCard`, and `Billing.tsx` shows status + next charge.
- Spec 8.4 says non-admins get 404. `RequireAdminInner` redirects to `/no-such-page`, which falls through to the `*` route's "Not found" page. The route URL changes; the body is identical to any unknown URL. Acceptable per spec ("do not reveal that admin exists").
- The user menu in `AppShell` (Task 3.1) shows email + Sign out only. Spec section 9 says "user menu right with email and Sign out". Matches.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-frontend-rewrite.md`. Two execution options:

1. **Subagent-Driven (recommended)**: dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution**: execute tasks in this session using `superpowers:executing-plans`, batched with checkpoints for review.

Which approach?
