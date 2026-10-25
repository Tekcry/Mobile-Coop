status: claimed Cloud Builder 1 2026-10-25T02:56Z

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
