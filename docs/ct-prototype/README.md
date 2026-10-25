# CT prototype job - history

This folder is the history of the CT prototype and CT core feel jobs (2026-10-18 to 2026-10-20). Nothing in it is a
current rule or a build target. Current rules: docs/DECISIONS.md, then docs/design-bible.md and docs/systems/.

- The job ended when Michael said "Can you ignore CT movement references" (G210, 2026-10-20); Michael now tunes
  movement himself (G227). Its movement and camera targets are replaced (docs/systems/movement.md).
- `AGENT-PREAMBLE.md` here is void. The subagent preamble every job uses is `docs/systems/agent-preamble.md`.
- `RULES.md` and `STATE.md` here are the job's own history; the resume point moved to docs/anim-rework/STATE.md.
- `CTCOURSE-SPEC.md` (Marlow Yard, B1) is superseded by the marlow-final docs: the build contract
  `docs/marlow-final/SPEC.md` and the build plan `docs/marlow-final/PLAN.md`; the map is `src/world/maps/ctcourse.ts`
  with `src/world/maps/ctcourseSets/`.
