# Model routing (free, tuned for a MacBook Air/Pro M2, 16 GB)

Principle: use no model if code can decide; otherwise the cheapest, smallest model that passes the eval. Everything here is free to run.

## Hardware budget (M2, 16 GB unified memory)
- macOS + browser + the app + SQLite use roughly 5 to 7 GB. Leave at least 8 GB for a model.
- **Local text models: 8B parameters or smaller at 4-bit (about 2.5 to 5.5 GB).** Do not go bigger.
- **Run one model at a time.** Set `OLLAMA_MAX_LOADED_MODELS=1` and `OLLAMA_KEEP_ALIVE=2m` so memory is released after use.
- **Avoid local vision models by default.** Even small ones are slow on this hardware (measured community reports: tens of seconds per image) and memory heavy. Vision is handled by the cloud provider instead (below).
- Do not run other heavy apps during bulk imports.

## Providers (tiered)
| Tier | Provider | Used for | Cost | Privacy |
|---|---|---|---|---|
| 0 | Code (regex, pdfjs text layer, tesseract.js `tur+eng`, merchant memory) | Most dekonts, simple receipts, repeat merchants | free | stays local |
| 1 | **Local Ollama text model**, up to 8B Q4 (families like Phi, Qwen, Gemma, Llama; pick by eval) | Structuring OCR/PDF text, category guess | free | stays local |
| 2 | **Gemini API free tier** (current Flash-class model, native image + PDF input, structured JSON output) | Receipt photos, messy scans, anything tier 0-1 is unsure about | free, rate-limited | **document is sent to Google** |
| 3 | Second free cloud provider (optional, e.g. another free-tier API) | Fallback when Gemini returns 429 or is down | free | sent to that provider |

Free-tier limits change and are not centrally published. Community trackers report on the order of 10 requests/min and about 1,500 requests/day for Flash-class models; treat those as indicative and read the real numbers in Google AI Studio. One person's receipts will stay far below this.

## Privacy policy (setting `PRIVACY_MODE`)
Free API tiers may use submitted content to improve the provider's products; check the provider's current terms before enabling. Bank dekonts contain names and IBANs, so the default protects them.

| Mode | Behaviour |
|---|---|
| `smart` (default) | Text-layer PDFs and dekonts never leave the machine (tiers 0 and 1 only). Receipt photos may go to tier 2 only when OCR confidence is low or tier 1 is unsure. Before any text is sent, mask IBANs, card numbers, and long digit runs. |
| `local_only` | Tiers 0 and 1 only. Hard-fail to manual entry rather than call the cloud. |
| `cloud_first` | Receipt photos and scans go straight to tier 2 for best accuracy. Dekonts still stay local. |

The review screen shows which tier produced each result.

## Routing rules
1. Cache by file hash; never re-extract the same file.
2. Text-layer PDF: tier 0, then tier 1 only for missing fields.
3. Image: tesseract OCR; if OCR confidence is good, treat like text (tier 0 then 1). If poor, tier 2 (subject to privacy mode).
4. Tier 2 call: one request, image or PDF attached, JSON schema output, temperature 0.
5. On 429 or 5xx: exponential backoff once, then tier 3, then tier 1 on whatever text exists, then manual entry with the file attached. Never block the user.
6. Keep a daily call counter in the DB; stop calling cloud at 80% of the configured daily cap (`CLOUD_DAILY_CAP`).

## Picking the actual models
Model names change monthly, so none are hard-coded. Process:
1. Read the provider's current free-tier model list (Google AI Studio for Gemini; the Ollama library for local).
2. Run `pnpm eval --provider ... --model ...` on the golden set (include Turkish receipts and dekonts).
3. Record accuracy, latency, and peak memory in `docs/model-results.md`.
4. Choose the smallest local model and the cheapest cloud model that hit the PLAN.md targets; set them in `.env`.

Notes from research: small specialised OCR models exist but some are English/Chinese only, which rules them out for Turkish documents unless the eval proves otherwise.

## Cost of development itself
Claude Code usage is the only non-free part and is not controlled by this repo; the kit keeps it low (short CLAUDE.md, scoped agents, on-demand skills, small tasks).
