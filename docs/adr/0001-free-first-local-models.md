# ADR 0001: Free-first, tiered extraction behind a provider interface

**Status:** accepted (2026-10-28), amended same day (see ADR 0002)

**Context:** The owner wants zero running cost and very high quality. Hardware is a MacBook M2 with 16 GB RAM. Financial documents are sensitive.

**Decision:** Extraction is layered (rules, PDF text, OCR, memory, local text model, free cloud model). All model access goes through an `LlmProvider` interface. Model names come from env and are chosen by golden-set evals.

**Consequences:** Cheap and quick by default. Slightly more code than a single API call. Swapping models or providers is a config change.
