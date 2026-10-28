# Receipt Expense Tracker

Track spending without typing. Snap a receipt or upload a bank dekont (PDF/image); the app extracts amount, date, merchant, currency and category, you review, then save. Manual entry always works.

- Zero cost: local models via Ollama + Gemini free tier
- Privacy by document type: dekonts never leave the machine by default
- Mobile-first, installable PWA

## Docs
- [Product plan](docs/PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN.md)
- [Model routing](docs/MODEL_ROUTING.md)
- [Agentic dev loop](docs/AGENTIC_LOOP.md)
- [ADRs](docs/adr/)

Project memory for Claude Code lives in `CLAUDE.md`; agents and skills in `.claude/`.

## Setup
Not yet scaffolded (Phase 0). Copy `.env.example` to `.env` and fill in values.
