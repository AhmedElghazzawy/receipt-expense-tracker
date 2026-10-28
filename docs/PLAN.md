# Receipt Expense Tracker: Product Plan

## Vision
Track spending without typing. Snap a receipt or upload a bank dekont (PDF/image); the app extracts amount, date, merchant, currency and category. The user reviews and edits, then saves. Manual entry always works.

## Hard constraints
1. **Zero cost.** No paid APIs, no paid hosting. Free only: local open models via Ollama plus free-tier frontier APIs (Gemini). Target machine for local models: MacBook M2, 16 GB.
2. **Cheap by design.** Deterministic code first (text-layer PDF parsing, OCR, rules, merchant memory). A model runs only when cheaper steps cannot decide.
3. **Human in the loop.** Nothing is saved from AI output without the review screen.
4. **Phone friendly.** Responsive web app, camera upload from the phone browser, installable as a PWA.
5. **Privacy by document type.** Bank dekonts stay on the machine. Receipt photos may use a free cloud model when local OCR is unsure, with sensitive digits masked. User can switch to `local_only` at any time.

## Open questions (defaults used until answered)
| Question | Default |
|---|---|
| Currency/language | TRY default, per-expense currency field; Turkish + English documents |
| Categories | Fixed starter list, user can add/rename; corrections are remembered |
| Users | Single user, no login in MVP; auth in a later phase |
| Statements with many rows | Out of MVP (Phase 3) |

## Phases
**Phase 0, Foundation:** repo, tooling, CI, DB schema, provider interface, CLAUDE.md kit.
**Phase 1, Manual MVP:** add/edit/delete expenses, list with filters, category totals, month chart. Fully usable with no AI.
**Phase 2, AI extraction:** upload image/PDF, pipeline (see ARCHITECTURE.md), review screen, merchant memory, confidence flags.
**Phase 3, Depth:** multi-row bank statement import, budgets, CSV export, recurring expenses, PWA offline.
**Phase 4, Optional:** login + multi-user, cloud deployment on a free tier, receipt image storage.

## Acceptance criteria (Phase 2)
- Clear receipt photo: amount, date, merchant correct in at least 90% of a 30-document test set; category correct in at least 80%.
- Text-layer dekont PDF: extraction under 3 s on a laptop CPU without invoking a vision model.
- Low-confidence fields are visibly flagged on the review screen.
- Editing a category for a merchant makes the next expense from that merchant pre-categorised.
- In `local_only` mode the app works with no network; in default mode, a Gemini outage or rate limit degrades to local extraction or manual entry, never a dead end.

## Risks
| Risk | Mitigation |
|---|---|
| Small local models misread Turkish receipts | OCR with Turkish data first; cloud tier for hard photos; golden test set; provider swap behind one interface |
| Free cloud tier changes limits/terms or trains on data | Provider interface, daily cap, privacy modes, dekonts never sent by default, re-check terms each phase |
| 16 GB RAM pressure | Local models 8B Q4 or smaller, one loaded at a time, short keep-alive, no local vision by default |
| Phone cannot reach the laptop | Run the app on the MacBook, open it from the phone over home Wi-Fi or a free VPN mesh (Tailscale free tier) |
| Wrong data silently saved | Review screen mandatory, confidence flags, amount sanity checks |
