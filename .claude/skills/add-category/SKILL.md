---
name: add-category
description: Steps to add or rename a default expense category consistently. Load when changing the category list.
---

1. Edit the default list in `src/server/db/seed.ts` (name, color).
2. Add a Drizzle migration if existing rows need renaming (`pnpm db:generate`).
3. Add keywords to `src/server/extraction/keywords.ts` so rule-based categorisation knows it.
4. Update `evals/` expected categories if the change affects existing cases.
5. Add or adjust tests in `keywords.test.ts`; run `pnpm test`.
