# Receipt Expense Tracker

Responsive web app: add expenses by hand, or upload a receipt photo / bank dekont (PDF or image); AI extracts amount, date, merchant, category; user reviews before saving.

## Non-negotiables
- **Everything free.** Never add a paid API, paid service, or paid hosting. Free-tier APIs (Gemini) are allowed, inside their limits. Ask first if unsure.
- **Hardware:** local models must fit a MacBook M2 with 16 GB: 8B Q4 or smaller, one loaded at a time, no local vision by default.
- **Privacy:** respect `PRIVACY_MODE`. Dekonts never go to the cloud by default; mask sensitive digits before any cloud call.
- **Cheapest step first.** Rules, PDF text layer, OCR, and merchant memory before any model call. See docs/ARCHITECTURE.md.
- **AI output is untrusted.** Validate with Zod. Extraction never saves; only the user's review action does.
- **Money is integer minor units** plus a currency code. Never floats.
- **No secrets in the repo.** Env vars only; keep `.env.example` current.

## Stack
Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, SQLite + Drizzle, Zod, tesseract.js, pdfjs-dist, Ollama (local, small) + Gemini free tier (cloud), Vitest, Playwright. Package manager: pnpm.

## Layout
- `src/app/` routes and UI; `src/app/api/` route handlers (thin)
- `src/server/extraction/` pipeline steps, one file per step
- `src/server/llm/` provider interface, router, Ollama/Gemini/Mock providers
- `src/server/db/` Drizzle schema, queries, seed; migrations in `src/server/db/migrations/`
- `src/lib/` shared pure helpers (money, dates, normalisation)
- `evals/` golden documents and expected JSON
- `docs/` plan, architecture, design system, ADRs, model routing, agentic loop

## Commands
- `pnpm dev` run app; `pnpm test`; `pnpm lint`; `pnpm typecheck`; `pnpm test:e2e` (Playwright, 375 px, throwaway DB)
- `pnpm eval [--model name]` extraction accuracy on the golden set (`evals/`); log results in docs/model-results.md
- `pnpm db:generate` after schema changes; `pnpm db:migrate` applies migrations and seeds default categories
- Node 24+. Next.js 16: read `AGENTS.md` and `node_modules/next/dist/docs/` before using Next APIs

## Design
Top-notch, modern, mobile-first UI is a core requirement. Read docs/DESIGN.md and use the `designer` agent for any UI work. Tailwind tokens only, shadcn/ui, light and dark.

## Conventions
- TypeScript strict, no `any`. Small pure functions; route handlers only parse, call, respond.
- Tests next to code (`*.test.ts`). Bug fix = failing test first.
- Models and limits come from env (`LLM_LOCAL_MODEL`, `LLM_CLOUD_MODEL`, `PRIVACY_MODE`, `CLOUD_DAILY_CAP`); never hard-code names.
- Mobile first: design at 375 px width, then scale up.
- Conventional commits; one small commit per task, pushed straight to `main` (solo project, no PRs). CI re-runs every check on each push; fix a red build before anything else.

## Workflow
Follow docs/AGENTIC_LOOP.md. Agents live in `.claude/agents/`, skills in `.claude/skills/`. Run lint + typecheck + tests before saying a task is done, and show the output.

## Do not
- Read or print `.env`, `data/`, or uploaded files.
- Rewrite files outside the task scope or reformat unrelated code.
- Add dependencies without stating why and confirming it is free and maintained.
