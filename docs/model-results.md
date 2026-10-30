# Model results

Golden-set runs (`pnpm eval`). A model or prompt change must not lower accuracy (docs/MODEL_ROUTING.md).
Hardware: MacBook M2, 16 GB.

| Date | Provider / model | Docs | Amount | Currency | Date | Merchant | Category | Doc type | Mean latency | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-30 | rules only (tier 0) | 3 | 100% | 100% | 100% | 100% | 100% | 100% | 264 ms | OCR `tur+eng` best_int on the image; pdfjs text layer on PDFs |

The golden set is small and synthetic (`evals/fixtures/make-fixtures.mjs`). Add anonymised real receipts and dekonts as they come; aim for the 30-document set in docs/PLAN.md.
