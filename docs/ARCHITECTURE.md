# Architecture

## Stack (all free / open source)
| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript | One codebase for UI and API routes, mobile-responsive |
| UI | Tailwind CSS + shadcn/ui | Fast, accessible components |
| DB | SQLite via Drizzle ORM | Zero setup, single file, migrations in code |
| Validation | Zod | One schema for API input, model output, DB rows |
| OCR | tesseract.js (tur+eng) | Free, runs in Node, no service |
| PDF | pdfjs-dist (text layer) and a page-to-image fallback | Most bank dekonts have a text layer |
| Local LLM | Ollama, 8B Q4 or smaller | Free, private, fits 16 GB; JSON-schema constrained output |
| Cloud LLM | Gemini API free tier | Frontier quality, native image + PDF input, structured output, free |
| Tests | Vitest + Playwright | Unit/integration + mobile viewport E2E |

## Components
```
Browser (phone/desktop)
  | upload file / manual form
Next.js route handlers
  /api/expenses        CRUD
  /api/extract         file -> ExtractionResult (never writes expenses)
  /api/categories      list/add
        |
  extraction pipeline  (src/server/extraction)
        |        \
   SQLite       Provider interface (src/server/llm)
 (expenses,          |- OllamaProvider    (local text, tier 1)
  merchants,         |- GeminiProvider    (free tier, vision/PDF, tier 2, free API key)
  files cache)       |- FallbackProvider  (optional second free API, tier 3)
                     '- MockProvider      (tests)
   Router (src/server/llm/router.ts): privacy mode, daily cap, fallback chain
```

## Extraction pipeline (cheapest step that works wins)
1. **Hash** the file; if seen before, return cached result.
2. **Classify input**: PDF with text layer / scanned PDF / image.
3. **Get text**: PDF text layer (free, exact) or OCR for images and scanned PDFs.
4. **Rule pass**: regexes for TRY/EUR/USD amounts, dd.mm.yyyy / ISO dates, IBAN, "TOPLAM"/"TOTAL" keywords. Produces candidates with confidence.
5. **Merchant memory**: normalised merchant name looked up in `merchants` table (learned from user corrections) gives category with no model call.
6. **Local text LLM** (tier 1, 8B Q4 or smaller, JSON-schema output) only if fields are missing or ambiguous, receiving masked text plus rule candidates.
7. **Cloud LLM** (tier 2, Gemini free tier) only if OCR is poor or tier 1 is unsure, and only if `PRIVACY_MODE` allows it for this document type; one call with the image/PDF attached. Falls back per docs/MODEL_ROUTING.md.
8. **Validate** with Zod and sanity checks (amount > 0, date not in the future, currency known). Attach per-field confidence.
9. Return `ExtractionResult` to the review screen. Saving is a separate user action.

## Data model
- `expenses(id, amount_minor, currency, date, merchant, category_id, note, source, file_hash, created_at)`; amounts stored as integer minor units.
- `categories(id, name, color, is_default)`
- `merchants(id, normalized_name, category_id, hits)`: learned mapping
- `extractions(file_hash, result_json, provider, created_at)`: cache and eval trail

## Model routing
See `docs/MODEL_ROUTING.md`. Models and limits come from env (`LLM_LOCAL_MODEL`, `LLM_CLOUD_MODEL`, `PRIVACY_MODE`, `CLOUD_DAILY_CAP`, `GEMINI_API_KEY`), never hard-coded. `extractions` records provider and tier for each result.

## Security and privacy
- Uploads validated by type and size (default max 10 MB), never executed, stored in `./data/uploads` (gitignored) or discarded after extraction.
- No telemetry. No secrets in the repo; `.env.example` only; API keys only in `.env`.
- Before text goes to any cloud provider, mask IBANs, card numbers and long digit runs (`src/server/extraction/mask.ts`, unit-tested).
- Dekonts are never sent to the cloud in `smart` or `local_only` mode.
- Extraction output is untrusted input: always Zod-validated before it reaches the UI.

## Quality strategy
- Golden set: `evals/` with anonymised sample documents and expected JSON; `pnpm eval` reports field accuracy per model. A model change must not lower accuracy.
- Unit tests for rules and normalisation; integration tests with `MockProvider`; one mobile-viewport E2E for the upload-review-save flow.
- CI: lint, typecheck, tests on every PR (GitHub Actions free tier).
