# Golden set

- `cases.json`: each document and its expected fields (merchant matches by normalised prefix).
- `fixtures/`: synthetic documents. Regenerate with `node evals/fixtures/make-fixtures.mjs`.
- Run `pnpm eval` (rules only) or `pnpm eval --provider ollama|gemini --model <name>` (model alone, then the full pipeline with it); record results in `docs/model-results.md`.
- Gemini evals skip dekonts, as the app does: they never go to the cloud.

Adding a real document: **anonymise it first** (names, IBANs, card and ID numbers), add the file under `fixtures/`, and add its expected fields to `cases.json`.
