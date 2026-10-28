---
name: write-tests
description: Testing conventions for this repo. Load when writing or fixing tests.
---

- Vitest for unit/integration, tests next to code as `*.test.ts`. Playwright for E2E at a 375 px viewport.
- Use `MockProvider` for anything touching the LLM; tests must never need Ollama running.
- Money tests cover both `1.234,56` and `1,234.56`, zero, and rounding.
- Extraction tests are table-driven: input text, expected fields.
- One E2E covers upload, review edit, save, appears in the list with correct category total.
- A bug fix starts with a failing test that reproduces it.
