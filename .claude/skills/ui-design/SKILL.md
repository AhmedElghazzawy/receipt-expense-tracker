---
name: ui-design
description: Visual and interaction rules for this app. Load when building or changing any UI.
---

- Source of truth: docs/DESIGN.md (principles, tokens, screens, quality bar).
- Mobile first at 375 px; primary action in the thumb zone; targets at least 44 px.
- Amounts: large, `tabular-nums`, currency symbol subdued, negative in coral not red.
- Review screen: low-confidence fields get a soft amber outline and a short hint; never block saving.
- Use shadcn/ui + Radix primitives, Lucide icons, Motion for transitions (150 to 250 ms, spring), skeleton loaders for extraction.
- Every component: hover, focus-visible, active, disabled, and dark-mode variants.
- Charts take colours from category tokens and ship a table fallback for screen readers.
- Done means: screenshots at 375/768/1280 in light and dark, Lighthouse mobile at or above 95.
