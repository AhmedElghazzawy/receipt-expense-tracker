# Model results

Golden-set runs (`pnpm eval`). A model or prompt change must not lower accuracy (docs/MODEL_ROUTING.md).
Hardware: MacBook M2, 16 GB.

| Date | Provider / model | Docs | Amount | Currency | Date | Merchant | Category | Doc type | Mean latency | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-30 | rules only (tier 0) | 3 | 100% | 100% | 100% | 100% | 100% | 100% | 264 ms | OCR `tur+eng` best_int on the image; pdfjs text layer on PDFs |
| 2026-10-30 | ollama `qwen3:4b` alone (tier 1) | 3 | 100% | 100% | 100% | 100% | 67% | – | 6.3 s | Q4, ~2.5 GB on disk, ~3.2 GB loaded, 100% GPU; `think:false`, schema output, temp 0; text only, no rule hints. Missed "Ekim kirası" → Bills (rules catch it) |
| 2026-10-30 | pipeline + `qwen3:4b` (smart) | 3 | 100% | 100% | 100% | 100% | 100% | 100% | 107 ms | Rules settle all three, so the model is never called |

Gemini (tier 2) is not measured yet: no API key on this machine. Run `pnpm eval --provider gemini --model <id>` once `GEMINI_API_KEY` and a current free-tier Flash model id are set.

The golden set is small and synthetic (`evals/fixtures/make-fixtures.mjs`). Add anonymised real receipts and dekonts as they come; aim for the 30-document set in docs/PLAN.md.
