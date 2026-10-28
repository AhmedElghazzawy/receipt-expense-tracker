# Design System

Goal: a calm, premium, fast finance app that feels native on a phone. Zero licence cost: every tool below is free/open source.

## Principles
1. **Capture in two taps.** The camera/upload action is always one tap away (floating action button on mobile).
2. **Numbers are the hero.** Large tabular figures, generous whitespace, one clear total per screen.
3. **Review beats surprise.** AI results appear in an editable card with per-field confidence; uncertain fields get a subtle highlight, not alarm colours.
4. **Motion with purpose.** Short, springy transitions that explain state changes (scan, extract, confirm). Respect `prefers-reduced-motion`.
5. **Mobile first, thumb zone first.** Primary actions in the bottom third; touch targets at least 44 px.
6. **Accessible by default.** WCAG AA contrast, visible focus, labels on every control, screen-reader friendly charts (table fallback).

## Tech (all free)
| Need | Choice |
|---|---|
| Styling | Tailwind CSS v4 with design tokens as CSS variables |
| Components | shadcn/ui on Radix primitives (accessible, owned in-repo) |
| Icons | Lucide |
| Motion | Motion (framer-motion successor) for transitions; CSS for micro-interactions |
| Charts | Recharts or visx, themed from tokens |
| Fonts | Inter (UI) + Geist Mono or Inter tabular-nums for figures, self-hosted via `next/font` |
| Theming | Light and dark from day one, system default, tokens swap via `data-theme` |
| PWA | Web app manifest + service worker so it installs on the phone home screen |

## Tokens (starting point, tune visually)
- **Neutrals:** slate scale, background `#0B0D12` dark / `#F7F8FA` light, surface cards one step lighter/darker.
- **Brand:** one accent, a confident emerald/teal (`#10B981` family) for positive/primary actions.
- **Semantic:** expense/negative uses a warm coral, never pure red; warning amber; info blue.
- **Category colours:** 8 to 10 distinct, colour-blind-safe hues generated once and stored with the category.
- **Radius:** 16 px cards, 12 px inputs, full pills for chips. **Shadows:** soft, low-contrast; prefer borders in dark mode.
- **Type scale:** 12/14/16/20/28/40; amounts use `font-variant-numeric: tabular-nums`.
- **Spacing:** 4 px base grid.

## Key screens
1. **Home / dashboard:** month total, delta vs last month, category ring chart, recent expenses, big capture button.
2. **Capture sheet:** bottom sheet with Camera, Upload file, Manual entry.
3. **Review (the signature screen):** document preview on top, extracted fields below with confidence hints, category chips, Save / Discard. Skeleton shimmer while extracting; fields fill in progressively.
4. **Expenses list:** grouped by day, search, filter chips (category, month), swipe to edit/delete.
5. **Insights:** category breakdown, trend line, top merchants.
6. **Settings:** currency, categories, model/provider status (shows whether Ollama is reachable), data export.

## States to design explicitly
Empty (first run with a friendly prompt to scan the first receipt), loading skeletons, extraction low-confidence, extraction failed (fall back to manual with the file attached), offline, Ollama not running.

## Quality bar
- Lighthouse mobile: Performance, Accessibility, Best Practices at or above 95.
- Layout verified at 375, 768, 1280 px, light and dark.
- No layout shift on data load; images lazy-loaded; first load JS budget tracked.
- Every interactive element has hover, focus, active, and disabled states.

## Process
Design in code with Tailwind and shadcn; use Figma (free plan) only if the owner wants mockups first. Before building a screen, the `designer` agent writes a short spec (layout, states, copy, tokens used). After building, verify with Playwright screenshots at the three widths.
