# ContentOS — Frontend

Production frontend for **ContentOS**, a node-based canvas SaaS for content
pipelines. Built on Next.js 15 (App Router) + TypeScript strict mode, Tailwind
v3 with a shadcn/ui-style component library, Zustand for client state, and
TanStack Query v5 for server state.

The backend lives in `../content-os-backend/`. This app talks to it via the
REST contract documented in `../content-os-backend/CONTRACTS.md`.

## Getting started

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env.local
# edit if your backend isn't on http://localhost:8000

# 3. run dev server (port 3000)
npm run dev
```

Open <http://localhost:3000>. The root path (`/`) redirects to `/dashboard`,
which redirects to `/login` when no session is found.

### Build / type-check

```bash
npm run build      # type-checks the whole project as part of the build
```

## Environment variables

| Var                          | Default                  | Notes                                              |
| ---------------------------- | ------------------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`   | `http://localhost:8000`  | Base URL of the FastAPI backend. No trailing slash. |

CORS on the backend already allows `http://localhost:3000` and
`http://localhost:5173`. Stay on port 3000 in dev unless you also add the new
origin to `CORS_ORIGINS` in the backend `.env`.

## What's implemented in Iter 1

- **Auth flow**
  - `/login`, `/register` pages with `react-hook-form` + `zod` validation.
  - `POST /api/v1/auth/{login,register}` → tokens stored in Zustand.
  - `GET /api/v1/auth/me` → user/organization rehydrated into the store.
  - `refresh_token` persisted to `localStorage`. `access_token` lives only in
    memory; on hard reload it's re-fetched via `POST /api/v1/auth/refresh`
    before any guarded page renders.
  - 401 on any request triggers a single refresh attempt; on second failure the
    store is cleared and the user is sent to `/login`.

- **Dashboard** (`/dashboard`)
  - `GET /api/v1/canvases` with skeleton, empty state, and error retry.
  - "+ New canvas" modal → `POST /api/v1/canvases` → navigates to the new
    canvas.
  - Per-card menu: rename (`PATCH`) and delete (`DELETE`) with a
    confirmation dialog.

- **Canvas detail** (`/canvas/[id]`)
  - Placeholder. Fetches `GET /api/v1/canvases/{id}` and renders the
    `nodes` / `edges` payload as JSON in `<pre>` blocks.
  - Top bar with inline-editable canvas title (commits via `PATCH`) and a
    "Back to dashboard" link.
  - **Iter 2 will replace the placeholder with a React Flow canvas editor.**

- **Layout chrome** (`components/AppShell.tsx`)
  - Left sidebar: logo, Dashboard, Knowledge (placeholder), Settings
    (placeholder).
  - Top bar: org name + user menu with logout.
  - Used on `/dashboard` and `/canvas/[id]`. `/login` and `/register` are bare.

- **Theme & polish**
  - Dark by default via `next-themes` (`class="dark"` on `<html>`).
  - Tailwind tokens defined as HSL CSS vars in `app/globals.css`. Indigo
    `#6366f1` is the accent.
  - Error boundary at the provider level + segment `error.tsx` files.
  - Custom `not-found.tsx`.
  - Skeletons for every async list/detail surface; no raw "Loading…" strings.

## Project structure

```
frontend/
├── app/
│   ├── (app)/              # routes that mount AppShell + AuthGuard
│   │   ├── canvas/[id]/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── error.tsx
│   │   └── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx            # redirects to /dashboard
├── components/
│   ├── ui/                 # shadcn-style primitives (Button, Dialog, …)
│   ├── AppShell.tsx
│   ├── AppErrorBoundary.tsx
│   ├── AuthBootstrap.tsx
│   ├── AuthCard.tsx
│   ├── AuthGuard.tsx
│   ├── CreateCanvasDialog.tsx
│   ├── DeleteCanvasDialog.tsx
│   ├── EmptyState.tsx
│   ├── Providers.tsx
│   └── RenameCanvasDialog.tsx
├── lib/
│   ├── api.ts              # apiFetch + auth helpers (refresh-on-401)
│   ├── canvases.ts         # canvas CRUD wrappers
│   ├── types.ts            # API DTOs mirroring CONTRACTS.md
│   └── utils.ts
├── stores/
│   └── auth.ts             # Zustand auth store, persists refresh_token only
├── public/
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
├── tsconfig.json
└── .env.example
```

## Deferred to Iter 2

- The canvas editor itself (React Flow / `@xyflow/react`): rendering source /
  extract / format nodes, edges, the floating toolbar, the node picker, and
  drag-to-connect handles. Design tokens for it already live in
  `../content-os/DESIGN-SPEC.md`.
- Skill-run wiring (`POST /nodes/{id}/run`, SSE stream on
  `/api/v1/skill-runs/{id}/stream`).
- Knowledge layer UI (`/knowledge` is a sidebar placeholder for now).
- Settings UI (`/settings` is a sidebar placeholder).
- Publishing (Telegram targets) and templates.
- Autosave / debounced PATCHing of node payloads.

## Notes & decisions

- The brief asked for `pnpm`; this machine doesn't have pnpm available, so
  `npm` is used. The lockfile is `package-lock.json`.
- `npx shadcn@latest init` is interactive; instead, the equivalent shadcn UI
  primitives are inlined under `components/ui/` (MIT-licensed copy-paste
  pattern) and Tailwind is configured to match.
- Access tokens are kept in memory only — they never touch `localStorage`,
  matching the recommendation in `CONTRACTS.md`. The refresh token does live in
  `localStorage` because we don't have an httpOnly cookie path on the backend
  yet.
- Token refresh is concurrency-safe: simultaneous 401s share a single in-flight
  refresh promise.
