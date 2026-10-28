---
name: extraction-pipeline
description: How the receipt/dekont extraction pipeline works and how to change it safely. Load when editing src/server/extraction, src/server/llm, prompts, or evals.
---

# Extraction pipeline

Order (stop at the first step that gives confident fields): hash cache, classify input, PDF text layer or OCR, rule pass, merchant memory, local text LLM (tier 1), cloud LLM (tier 2, privacy-gated), validate. Routing, caps and fallbacks: docs/MODEL_ROUTING.md.

## Rules
- Each step is a pure-ish function in its own file returning `{ fields, confidence }`. Steps merge; later steps only fill gaps or raise doubt.
- LLM calls go through the `LlmProvider` interface only. Use JSON-schema constrained output and temperature 0.
- The prompt receives OCR text plus rule candidates, not the raw file, whenever possible.
- Output type is `ExtractionResult` (Zod). Every field has a confidence 0 to 1; below 0.7 is flagged in the UI.
- Amounts: parse Turkish formats (`1.234,56`) and English (`1,234.56`) into integer minor units.
- Dates: accept `dd.mm.yyyy`, `dd/mm/yyyy`, ISO; reject future dates.
- Merchant names are normalised (lowercase, strip punctuation and branch/store numbers) before lookup.

## Changing a prompt or model
1. Add the failing document to `evals/`.
2. `pnpm eval --model <name>` before and after.
3. Keep the change only if overall accuracy does not drop and latency is acceptable.
4. Log the result in `docs/model-results.md`.

## Never
Save an expense from this pipeline, call a paid API, send a dekont to the cloud, or send unmasked sensitive digits to any cloud provider. Never load more than one local model at a time or exceed 8B Q4 locally.
