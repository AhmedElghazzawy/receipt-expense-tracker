# Agentic development loop

Goal: ship each task with the least tokens and the least rework.

## Loop for every task
1. **Scope**: one task = one small PR (under about 300 changed lines). Write acceptance criteria first (a failing test or checklist).
2. **Plan** (only for tasks touching more than 2 files): the `architect` agent proposes file-level steps. Skip for small fixes.
3. **Implement**: the `designer` agent for UI, the `implementer` agent for everything else, works test-first, touching only files in the plan.
4. **Verify**: run `pnpm lint && pnpm typecheck && pnpm test`. Never claim done without output.
5. **Review**: the `reviewer` agent reads the diff only, against the checklist in the `review-pr` skill.
6. **Evals**: if extraction code or prompts changed, run `pnpm eval` and paste the before/after.
7. **Ship**: commit, open PR, link acceptance criteria.

## Token discipline
- Start each session by reading `CLAUDE.md` only. Open other docs when the task needs them.
- Reference files by path and symbol; do not paste large files into chat.
- Use `/clear` between unrelated tasks; use `/compact` at natural breakpoints.
- Prefer Grep/Glob over reading whole directories. Read ranges, not whole files.
- Do not spawn subagents for work that fits in one context.
- Keep prompts for the local models short; shorter prompts are faster and fit the 16 GB budget. Never run evals on several local models in parallel.

## Stop conditions
Stop and ask the human when: a decision changes scope or cost, a dependency would add a paid service, tests cannot be made to pass after two attempts, or a change touches the DB schema destructively.
