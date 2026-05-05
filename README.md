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

## What's implemented in Iter 2 (current)

- **Canvas editor** (`/canvas/[id]`)
  - React Flow v12 (`@xyflow/react`) with dark dot-grid background, MiniMap,
    and Controls.
  - Three custom node types in `components/canvas/nodes/`:
    `SourceNode` (textarea bound to `data.content`, autosaves on blur),
    `ExtractNode` (Run button + viral_score-tagged talking points,
    selectable via `selected_index`), `FormatNode` (platform picker,
    radio-style hook selection, body, CTA, copy-to-clipboard).
  - Status border colors: idle / running (indigo pulse) / done (emerald) /
    error (red). Each node has a compact / expanded toggle.
  - Floating top toolbar: + Source / + Extract / + Format buttons that
    `POST /canvases/{id}/nodes` at the current viewport center, plus a
    "Templates" stub dialog.
  - Edge validation: only `source→extract`, `extract→format`,
    `source→format` allowed. Optimistic add → on 422 the edge reverts and a
    toast appears.
  - Position autosave: `onNodeDragStop` PATCHes `position_x` / `position_y`
    debounced 300ms per node.
  - Backspace on a selected node opens a confirm dialog → DELETE.
    Selected-edge delete is immediate.
- **Skill runs** (`lib/skill-runs.ts`)
  - `runNode(nodeId)` → `POST /nodes/{id}/run`.
  - `subscribeSkillRun(id, handlers)` polls `GET /skill-runs/{id}` every 1.5s
    until `completed` or `failed`. SSE is documented in the contract but
    EventSource cannot send `Authorization` headers — see comment in that
    file. On `completed`, the canvas is refetched and React Flow re-renders
    from the fresh `data` payload.
- **Knowledge sidebar** (`components/canvas/KnowledgeSidebar.tsx`)
  - Right rail of the canvas. Lists a node's attached items, provides
    search + type-filter to attach more, and a "+ New" modal that POSTs to
    `/api/v1/knowledge`. With no node selected, shows the org library
    (read-only browse).
- **Knowledge page** (`/knowledge`) — full CRUD list with search + type
  filter, create / edit / delete dialogs.
- **Settings page** (`/settings`) — Brand Context editor backed by
  `GET/PUT /api/v1/brand-context` (author name/handle, voice rules, taboos,
  manifesto, CTA keywords).
- **Toasts** via `sonner` mounted in `Providers.tsx` (`<Toaster />`).

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
  - Inline-editable canvas title (commits via `PATCH`) and a
    "Back to dashboard" link in the top bar. Iter 2 replaces the placeholder
    body with the React Flow editor.

- **Layout chrome** (`components/AppShell.tsx`)
  - Left sidebar: logo, Dashboard, Knowledge, Settings.
  - Top bar: org name + user menu with logout.
  - Used on every `(app)` route. `/login` and `/register` are bare.

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
│   │   ├── knowledge/page.tsx
│   │   ├── settings/page.tsx
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
│   ├── canvas/
│   │   ├── nodes/
│   │   │   ├── NodeShell.tsx
│   │   │   ├── SourceNode.tsx
│   │   │   ├── ExtractNode.tsx
│   │   │   └── FormatNode.tsx
│   │   ├── canvasContext.ts
│   │   ├── CanvasEditor.tsx
│   │   ├── CanvasToolbar.tsx
│   │   └── KnowledgeSidebar.tsx
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
│   ├── brand-context.ts    # GET/PUT /api/v1/brand-context
│   ├── canvases.ts         # canvas CRUD wrappers
│   ├── edges.ts            # edge create/delete
│   ├── knowledge.ts        # knowledge CRUD + node attach/detach
│   ├── nodes.ts            # node create/update/delete
│   ├── skill-runs.ts       # runNode + polling-based subscribe
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

## Deferred to Iter 3+

- Real-time skill-run updates via SSE — currently we poll
  `GET /skill-runs/{id}` every 1.5s. EventSource cannot send the JWT
  `Authorization` header, so SSE needs either a `?token=` query param or a
  cookie-based auth path on the backend (locked for now).
- Transcription UI: YouTube URL → `POST /nodes/{id}/transcribe-youtube`,
  audio upload → `POST /nodes/{id}/upload-audio`, with progress UI. The
  Source node currently only supports the plain-text path.
- Publishing (Telegram targets, `POST /nodes/{id}/publish` and the
  `publish_logs` polling).
- Voice training onboarding (the multi-step author voice profile wizard).
- Templates: the toolbar button opens a "Coming soon" dialog. Backend has
  `POST /canvases/{id}/save-as-template` and
  `POST /canvases/from-template/{id}` — not wired here.
- Project sidebar / multi-project switcher. Knowledge currently lists at
  the org level only.
- Visual generation node (V2 in PRD).
- Mobile / touch optimization for the canvas (desktop-only by design).

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
- **SSE vs polling for skill runs.** The backend exposes
  `GET /skill-runs/{id}/stream`, but the browser EventSource API can't send
  the `Authorization: Bearer …` header that the rest of the app uses. The
  workaround would be a `?token=…` query param, which requires a backend
  change. Instead, `subscribeSkillRun` polls `GET /skill-runs/{id}` every
  1.5s and refetches the parent canvas on completion. The API surface is
  shaped like a subscription so swapping to real SSE later is one file.
