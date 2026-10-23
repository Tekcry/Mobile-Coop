You are the dressing builder for one set of the Night Shift job marlow-final (Marlow Yard redesign): PLAN.md slice <N> step 5 "Dressing (M5)" for set <SET> (<NAME>). Its greybox is built and passed a fresh checker. First read C:/NightShift/Mobile-Coop-marlow-final/docs/systems/agent-preamble.md (job = marlow-final) and follow it: work only in C:/NightShift/Mobile-Coop-marlow-final, branch feature/marlow-final, guard before every write:
cd /c/NightShift/Mobile-Coop-marlow-final && test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-final && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-marlow-final"
Never commit, push, stash, reset or checkout. Several agents work in this folder at once, each on its own set: touch ONLY your owned files.

OWNED FILES (only these):
- src/world/maps/ctcourseSets/<SET>.ts (append the dressing after the greybox; the greybox geometry, lamps, doors, devices, guards, steps stay exactly as they are - the test pins a greybox checksum where one exists)
- tests/ctcourse/<SET>.test.ts (add the dressing tests)
- scripts/e2e-ctcourse/<SET>.mjs (only for the e2e items listed under EXTRA below)
- docs/marlow-final/slices/S<N>.md (append a "## Dressing (PLAN slice <N>, step 5)" section)
A needed change in any other file (a new prop or kit piece, types.ts, facility.ts, props / kit code, marlowCircuits.ts) is NOT made: list it under "Requests for shared files" in your section and use what exists.

WHAT TO BUILD: the set's dressing per docs/marlow-final/SPEC.md section 6 (Facility look, M5: luxury training facility; each mock-up set keeps its own "real site" materials inside the hall, the hall walls above the set walls take the kit's charcoal panels and LED coves), the set doc docs/marlow-final/sets/<SET>.md (its dressing / look rows and section 13), docs/marlow-final/PROPS.md section 3 "<PROPS HEADING>" (the props built for this set) and section 5 (placement helper), docs/marlow-final/KIT.md (kit pieces, section 5 "Left for per-area dressing"). Accent LED lines sit on their circuit's light group (so a cut circuit darkens them too).
WORKED EXAMPLES (copy their structure, idioms and tests exactly): A1 dressing (a1Gate.ts dressing section, tests/ctcourse/a1Gate.test.ts dressing cases, slices/S1.md "Dressing", commit 8b260100) and A2 dressing (a2CarriageShed.ts, its test, slices/S2.md "Dressing", commit 4827cc7d). Read `git show 4827cc7d --stat` and the A2 dressing code first.

RULES (binding):
- Dressing is visual over the greybox collision: it must not change where players can stand, jump, hang or see. Any prop with collision gets a written collision box and must not create a new top a player can reach (noLedge where 1.9 m or taller), must not narrow a door or corridor below the set's tested widths, must not block a camera, guard or jam line the greybox tests rely on, must not create a solo boost onto a co-op lip (soloJumpThreats stays empty; GREY_KEEP_CLEAR).
- Budgets per set: kitTriangles 60 k or less; props 60 k triangles and 12 draws or less (as A1 / A2 test them). Thin skins in one mesh as A2 does (levelBuilder boxes are thin instances).
- Light parity: dressing that emits light is on a circuit group; no new lamp unless the set doc lists it; the light test (tests/ctcourse/<SET>.light.json and tests/ctcourseLight.test.ts) must stay green - if a skin shadows a light spot, move the skin, never the spot.
- Cameras see in the dark (IR). Glass stops sight (P17).
CHECKS you run (light only; never npm run check, never e2e, never the whole vitest suite): `npx tsc --noEmit` (timeout 600 s); `npx eslint` on your files; `npx vitest run tests/ctcourse/<SET>.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityProps.test.ts tests/facilityKit.test.ts tests/voxelFit.test.ts tests/levelFillParity.test.ts` (names that exist); `node --check` on the e2e module if you touched it. A failure caused by another agent's in-progress set file: note it, do not fix it. Never loosen a test.
EXTRA for this set (from the checkers, docs/marlow-final/slices/<CHECK>.md; read its "Polish" list for your set and fold in what belongs to dressing):
<EXTRA>
REPORT: the Dressing section in S<N>.md in the shape of S2.md's (what was placed per register row with numbers, budgets measured, decisions, checks with summary lines, requests for shared files, GPU shots still pending, manual desktop checks for Michael). Final message, short: done / not done, tests passed, budgets, open items.
