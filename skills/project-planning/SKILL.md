---
name: Project planning
description: >-
  Use when starting a new project, scoping an idea, choosing a stack, or
  producing an MVP implementation plan — an opinionated Bun/shadcn planning
  skill.
---

Turn a fresh project idea into a focused, MVP-first plan that favors prebuilt solutions and opinionated frameworks over custom complexity.

## Workflow

1. Clarify the goal in one sentence and define the single-user MVP boundary.
2. Decompose into manageable tasks grouped by user-visible outcome.
3. Research frameworks/libraries that absorb whole tasks; prefer prebuilt.
4. Start from official scaffold via bunx create-*.
5. Before install, bunfig.toml with [install] minimumReleaseAge = 259200.
6. Pick one opinionated framework when it removes wiring decisions.
7. UI: shadcn/ui minimalist preset; add components on demand.
8. Lay out structure before code.
9. Minimum useful tests and git hooks.
10. Produce short plan: goal, MVP, tasks, stack, deferred.

## Planning Rules

* One user first. Bun by default. Official scaffolds. Prefer prebuilt. Boring defaults. Cut features before clarity.

## Output Shape

Goal · Single-user MVP + outs · Outcome-oriented tasks · Stack with one-line rationale · Deferred items
