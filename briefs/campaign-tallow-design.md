status: blocked withdrawn by owner (plan first)

**WITHDRAWN after the claim (Campaign Build, 2026-10-25 ~14:05; Michael 13:53: "plan comes first").** Cloud Builder: stop
if you read this; push whatever you have to feature/tallow-design-docs as WIP, open no PR, set `status: blocked
withdrawn` and take the next brief. Nothing from this brief is merged until Michael signs off the folded plan.

# Campaign Build: Tallow Wharf design deliverables (docs only)
Owner: Night Shift | Campaign Build. Source: conformance review row TW12 (PR #419,
`docs/conformance-campaign/CONFORMANCE.md` on origin/feature/conformance-campaign).

## Base and branch
- Base: origin/feature/mission-engine 00b6cde9 (Tallow Wharf map files are only there).
- New branch: `feature/tallow-design-docs`. Push each sub-step.

## Only files to create / edit
- `docs/missions/prototypes/campaign-map/tallow-wharf-design.md` (new).
- Nothing else. No src, test, script, map, graph or config change. Do not edit SPEC.md, SIGNOFF.md or graph.json
  (Campaign Build is editing those on another branch).

## What to write
The Phase 1-2 deliverables of `docs/level-design.md` section 13 (read it whole, on origin/master), described FROM THE
BUILT FILES as they stand (not as you would design them): `src/world/maps/tallowWharf.ts`, `tallowWharfKit.ts`,
`tallowWharfW1.ts` .. `tallowWharfW4.ts`, `tallowWharfSectors.ts`, `tallowWharfMissions.ts`, and the spec
`docs/missions/prototypes/campaign-map/SPEC.md` + `graph.json`, BEATs in `docs/missions/prototypes/three-grey-coats/`
and `two-key-ledger/`. Sections, in the order section 13 lists them:
1. Building brief (purpose, era, site, who works there and when, why quiet tonight, construction, every room with its
   original purpose and size).
2. Space sheets per encounter space (the 9 in graph.json): size, function, guards (ids from tallowWharfSectors.ts),
   vantage, LOS break, hide spots, takedown spots, entries.
3. Guard sheets: every guard with job, employer, post / patrol, reason, isolation moment (4.4).
4. Security register (the W3 keypad and anything else that locks), light plan (each lamp group with its reason and
   whether it can be cut; state plainly that the map is "lit by default" today and that this is a known gap, G329),
   sound plan, checkpoint plan (the 4 restart points; known gap: no checkpoint per encounter space), co-op plan (each
   forced gate with its kit move and the validator's way back time), medkit plan (known gap: none placed), civilian
   plan (known gap: none modelled; G353).
5. Coverage table and tool / problem matrix (section 13 formats).
6. Element register (level-design 16.9): every ladder, stair, hatch, duct, door, shutter, drop with its file:line and
   its real-world reason. A missing row fails review.
7. 16.10 review checklist: answer each question with a file:line or "gap: <what>".
Every claim cites file:line @00b6cde9. Mark every place the build breaks a rule as "Known gap (CONFORMANCE TWn)" using
the TW rows in the review; do not fix anything. Never use reference-game names (G6). Plain language, hyphens not em
dashes.

## Checks (cloud: no e2e, no npm run check)
- None needed for code; run `node scripts/level-validate.mjs <abs path to graph.json>` only if it runs with plain node
  and paste its summary line in the report.

## Done when
- The file has all 7 sections, every guard and every element of the built map appears, and each known gap names its TW
  row. Report at the end of this brief: commits, line count, anything you could not determine.

## Report (Cloud Builder 1, stopped on the orchestrator's word)
- Withdrawn mid-research. WIP pushed: `feature/tallow-design-docs` 917974d3, one file of notes
  (`docs/missions/prototypes/campaign-map/tallow-wharf-design.md`, not the 7 sections).
- It holds: master's validator result on the graph (3 ERR = TW3, 6 WARN) with the way-back time of every co-op gate; every
  guard's takedown spot and estimated walk time; the lamp groups and bolts; and build gaps with no TW row (no surface
  marks, no handrails, missing parapets, an unnamed roof screen, a lightwell drain built for gameplay only, open duct
  ends, four vantages that look blocked in plan, the chute hatch at 4.4 m not 2.2 m, no brass-plate intel, the
  crane legs inside shed three, a hardened lamp over C7).
