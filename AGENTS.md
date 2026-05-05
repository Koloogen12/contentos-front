# Agent notes — ContentOS frontend

Stack:

- Next.js 15 (App Router), TypeScript strict
- Tailwind CSS v3 + shadcn-style UI primitives in `components/ui/`
- Zustand (auth store, persists refresh token only)
- TanStack Query v5 (server state)
- react-hook-form + zod (forms)
- lucide-react (icons), next-themes (dark default)

The backend contract is in `../content-os-backend/CONTRACTS.md`. The visual
spec is in `../content-os/DESIGN-SPEC.md`. The throwaway Lovable prototype in
`../content-os/THE CONTENT-2/` is a vibe reference only — never copy code from
it.

Iter 1 ships: auth, dashboard with canvases CRUD, canvas detail placeholder.
Iter 2 ships: the React Flow canvas editor.
