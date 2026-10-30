---
name: review-pr
description: Review checklist for diffs in this repo. Load when reviewing a change before committing it.
---

Check in this order:
1. **Correctness**: edge cases, money as integers, dates and time zones, null model output.
2. **Cost**: any paid dependency or API? Any model call that rules or memory could have avoided?
3. **Privacy and security**: secrets, file upload validation (type, size), documents leaving the machine, unvalidated model output reaching DB or UI.
4. **Tests**: new behaviour covered, bug has regression test, evals run if extraction changed.
5. **Scope**: only task-related files changed, no drive-by refactors.
6. **Mobile**: layout works at 375 px, touch targets at least 44 px.
