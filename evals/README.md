# Golden set

- `cases.json`: each document and its expected fields (merchant matches by normalised prefix).
- `fixtures/`: synthetic documents. Regenerate with `node evals/fixtures/make-fixtures.mjs`.
- Run `pnpm eval`; record results in `docs/model-results.md`.

Adding a real document: **anonymise it first** (names, IBANs, card and ID numbers), add the file under `fixtures/`, and add its expected fields to `cases.json`.
