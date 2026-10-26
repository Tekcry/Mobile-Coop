# CT core feel job - brief (Michael, 2026-10-18)

Michael: "I feel like I want to start fresh focusing on fine tuning first then gameplay." He chose "Core feel first":
keep the codebase; one job rebuilds and fine-tunes the core feel until he signs off; gameplay (co-op slices C1-C7)
comes after.

## Scope
CT movement, camera and aim, back-to-wall and doors, palm strike and grab, goggles, on Wren (both players), to "feels
like Chaos Theory" quality. Sources, in authority order: Michael > docs/DECISIONS.md (G25-G41, G96-G103, G107, G109,
G110; the D answers and 2026-10-18 picks in docs/ct-research/DECISIONS-PENDING.md once PR #4 merges) > the bible >
docs/archive/locomotion/PROTOTYPE-PLAN.md (P1-P4 with footage numbers) and docs/archive/locomotion/research/ct-measure-*.md (Michael's
CT footage, measured) > code.

## How it runs
1. **Code review first (read-only, one agent, about an hour):** the player controller, move state, animation graph, camera
   and their co-op wire fields. Decide per area: rewrite clean or adjust. Present the call to Michael with reasons
   before any rewrite.
2. **Build order:** body (speeds, starts, stops, turns, posture on Wren), camera and aim, wall and doors (with the CT
   pad layout, G96), strike and grab, goggles. Slice M1 (body logic on Sonnet, 2026-10-18) is the starting point.
3. **Tuning loop per area:** Michael plays on his PC (two tabs for co-op parity), compares with his footage, gives
   notes; the job tunes; repeat until he signs off that area. Implementer agents Sonnet, medium effort; Opus only when a piece is stuck (Michael, 2026-10-18: "I want a quicker prototype so we aren't wasting time");
   GPU checks on Michael's PC (E2E_GPU=1); the anim audit and perf trend come back here, as gates, not polish rounds.
4. Co-op parity in every area: the partner sees the same moves (MoveState); no rubber-banding.
5. After every area sign-off: commit, push, record his notes and numbers in docs/ct-prototype/LOG.md and
   docs/DECISIONS.md (at merge).

## Dependencies
- Wren replaces the player body via the operators PR (G123). Posture and pose tuning start once it merges; logic
  (speeds, stops, turns, camera, pad layout, doors, strike, goggles) can start before.
- The menu job (feature/menu) runs alongside; it owns src/ui/screens and the menu scene.

## Start prompt (paste into a brand new LOCAL session, not a fork, not cloud; Opus, medium effort)
```
CT core feel job: START (local). You are the orchestrator (docs/systems/session-method.md).
0. Branch guard: work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Push only feature/ct-prototype. Never merge into master; never touch other folders or branches.
1. Read CLAUDE.md, docs/ct-prototype/FEEL-BRIEF.md (this job), docs/ct-prototype/M1-FEEDBACK.md (Michael's notes, apply first), docs/ct-prototype/AGENT-PREAMBLE.md, docs/ct-prototype/M1.md (if present), docs/DECISIONS.md, and from the research branch (until PR #4 merges) C:\NightShift\Mobile-Coop-ct-research\docs\ct-research\DECISIONS-PENDING.md and docs\ct-prototype\PLAN.md.
2. Create the job docs per session-method.md (RULES, PLAN, STATE, LOG, OWNER-NOTES) in docs/ct-prototype/.
3. Run the read-only code review (step 1 of the brief) and bring Michael the rewrite-or-adjust call per area as native multiple-choice before building.
4. Work area by area; stop after each for Michael to play and give notes. Ask Michael (native multiple-choice) when something is unclear. No em dashes.
```
