# BiteRadar — Claude Code instructions

## Before any work
- Read `BITERADAR_BLUEPRINT.md`. It is the source of truth for scope, stack, and decisions.
- Respect the launch line (blueprint section 3): nothing marked POSLE LANSIRANJA gets built pre-release. If a task requires it, stop and say so.
- Decisions marked USVOJENO require an ADR (`docs/adr/`) to change. Propose the ADR; don't silently deviate.

## Project
- Next.js (App Router) + TypeScript + Tailwind, single app. No separate backend, no monorepo.
- Supabase (Postgres + PostGIS), RLS on by default — every new table needs explicit policies.
- The admin write path (`db` / storage service_role client) BYPASSES RLS by design (ADR 0001). The ONLY gate is `requireAdmin()`. Every `/admin` Server Action MUST call `await requireAdmin()` as its first line — before reading the payload — and any new one that touches `db` or Storage must do the same. No exceptions.
- Business logic lives in `src/services/`, never in components or route handlers (blueprint section 6).
- i18n: next-intl, `sr` default + `/en` routes. Every user-facing string goes through i18n from day one.
- Search normalization (latinica/ćirilica/diacritics) lives in `src/search/` and must keep unit tests green.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (must pass before any PR)
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests (search normalization; must stay green)
- `npm run db:search-smoke` — FTS + RLS round-trip against Supabase (needs `DATABASE_URL`)

## Git workflow
- NEVER commit or push to `main`. Always: feature branch → PR. Branch protection enforces review.
- Small, focused commits with clear messages. One feature per branch.

## Secrets & data
- Never read, print, or commit `.env.local` or any credentials. `.env.example` documents variable names only.
- The repo is PUBLIC: no real personal data anywhere, including seed/test fixtures.

## Working with this team
- We are students still learning TypeScript/React. When you make non-obvious changes, briefly explain the why — treat sessions as pair programming, not code generation.
- Prefer simple, readable solutions over clever ones.
