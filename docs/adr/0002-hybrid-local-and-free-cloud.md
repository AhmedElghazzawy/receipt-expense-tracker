# ADR 0002: Hybrid local + free cloud models, privacy by document type

**Status:** accepted (2026-10-28)

**Context:** Local models on an M2 with 16 GB are limited to about 8B at 4-bit and are slow at vision. Free frontier-model tiers (Gemini) are far stronger at receipts and Turkish text but send the document to a third party and are rate-limited.

**Decision:** Local-first for sensitive, text-based documents (dekonts); free cloud (Gemini) for receipt photos when local OCR is uncertain. `PRIVACY_MODE` (`smart` default, `local_only`, `cloud_first`) controls this. Sensitive digits are masked before any text goes to the cloud. A daily cap and a fallback chain keep the app inside free limits and always usable.

**Consequences:** Best accuracy at zero cost, with the owner in control of what leaves the machine. We must monitor free-tier terms and limits, and re-run evals when models change.
