# Night Shift - progress

Where the project stands: the ordered job list (G90) and the current state. Michael's decisions: `docs/DECISIONS.md`.
Design: `docs/design-bible.md`. Each job updates its row when it starts, opens its PR and is merged. The old Phase 0-7
table and the phase logs are history: `docs/archive/progress-phases.md`; phase numbers survive only as chapter names.

Every job runs as `CLAUDE.md` "Running a job" says: branch `feature/<job>` from master, folder
`C:/NightShift/Mobile-Coop-<job>`, its docs in `docs/<job>/`, one PR to master, Michael merges.

## Job list (in order, G95)

| # | Job | Branch | Folder | Status |
| --- | --- | --- | --- | --- |
| 0 | Consolidation: every branch into one 4.0.0 PR, non-CT deletions, docs rewritten to one vision (loco M26, M27) | `integrate/consolidate` | `Mobile-Coop-integrate` | In progress: merges and deletions done; docs rewrite, full e2e, version 4.0.0, PR |
| 1 | CT co-op research: every CT co-op level's design, flow and moves (G3); settles friendly fire and heavies (G49), CT's gadget and attachment set incl. the ring airfoil and the knife (G76), Kestrel's future (G53), which movement-run ideas survive (G11) | `feature/ct-research` (name proposed) | `Mobile-Coop-ct-research` | Not started; first after the merge |
| 2 | CT prototype: the playable CT movement, camera and verbs (`docs/locomotion/PROTOTYPE-PLAN.md` P1-P4, G4); Michael plays it and its numbers are tuned (G10); room sizes re-measured after the camera part (G54); SWAT-turn and lean-out wire fields removed (G52) | `feature/ct-prototype` | `Mobile-Coop-ct-prototype` | Not started; after the research |

Follow-ups, after the research and the prototype (one line each; their order is not fixed yet). Folder:
`Mobile-Coop-<job>` for each.

| Job | Branch | Status |
| --- | --- | --- |
| Pages preview: replace the `/preview/`, `/ct/` and `/kestrel/` slots with one slot for the job branch Michael chooses (G85); the workflows still build the retired branches | `feature/pages-preview` (proposed) | Not started; right after the merge |
| Wall medkit stations in every map (G98): after the carried-kit deletion only Proving Grounds has a station; it heals +40, single use (ASSUMED amount, Michael to confirm against CT) | each map's job | Not started |
| CT pad layout (G96): CT's default layout button for button; also settles the X hold (now does nothing when not aiming; a slow press loses the reload) and builds the remap cancel on Menu / Start or Esc (G22), the CT door menu (G97) and the CT grab menu (G23) | `feature/ct-pad-layout` (proposed) | Not started |
| No aim assist (G16): `weapons/aimAssist.ts` still runs on the pad (setting default "standard"); remove it and its setting | with the pad layout job | Not started |
| Test fixes: e2e-coop "client strike denied" (pre-existing; wait until the client strike can start and assert `begin()` returns true); e2e-foley walk-plants threshold (known flaky since the step-22 speeds); kbm flashbang white-out reads 0.00 (pre-existing, likely the pointer-lock pause); the co-op suites made reliable, then required (G51) | `feature/test-fixes` (proposed) | Not started |
| Perf: re-measure the `?gfx=min` budgets on the desktop test context | with the test fixes | Pending PC run |
| Operators: `feature/operators` merges master and opens its own PR (G75); its open items stay there | `feature/operators` | Running on its own branch, not in 4.0.0 |
| Wren integration behind a dev switch, then the weapon step (G70); body proportion fixes for every character (G72) | after Michael approves the prototype | Not started |
| Original goggle and menu symbol (G69, "soon"); goggle on the brow when off, over the eyes when on (G73) | `feature/goggle` (proposed) | Not started |
| Fallow bunker rebuilt on the CT moves, every jump and reach re-checked (G79), starting from Michael's walkthrough notes | `feature/bunker-walkthrough` | After the prototype |
| Missing sounds: guards' footsteps, then ambience, then the rest (G66) | - | After the prototype |
| Music revision: direction, briefing / results / pause music, the long menu theme (G64; AUDIO-03, AUDIO-09) | `feature/music-revision` | After the prototype (G113) |
| Menus: the Arkham Knight style plan (G77, `docs/menu-ui/`); UI-04 to UI-10 are decided there | `feature/menu-ui-spec` | After the prototype (G113) |
| Art guide (G113) | - | After the prototype |
| Kestrel: decided after the research (G53); its deferred items (LEVEL-01, LEVEL-08 to LEVEL-10) wait with it | `feature/kestrel` (merged into 4.0.0) | Paused |
| One folder per map; Kestrel and the bunker move there (G55) | - | After the merge |
| Awake-character limit reviewed for desktop (G46; how it is set, FU-11, is open) | - | Not started |
| After Michael merges 4.0.0: branch clean-up per `docs/locomotion/CONSOLIDATE.md` "After Michael merges" | - | Only with Michael's go-ahead |

## Current state (2026-10-18)
- `integrate/consolidate` holds every branch except `feature/operators`: `feature/ct-locomotion` (with Kestrel),
  `feature/footsteps`, `feature/weapon-audio`, `feature/music`, `feature/training-bunker`, `feature/menu-ui-spec`.
  The one `ct-movement` commit not merged ("phone loads and plays on Low") is superseded by desktop only.
- Deleted in this merge (logs: `docs/consolidation/deleted-*.md`): the retired maps, phone and touch code (tests run as a
  desktop), Wave / deathmatch / free-for-all / PvP, emotes, the old solo Training mode, every gun outside the CT kit,
  the player drone, the custom difficulty sliders, carried medkits.
- `package.json` says 3.5.1 until the PR's version commit sets 4.0.0 (G84). `SAVE_VERSION` 9, `PROTOCOL_VERSION` 13.
- Known test state: e2e-course failed once under load (lever door 1994 ms > 500) and passed solo; legacy e2e-progression
  fails at "Y customises the weapon" (report only); the items in the "Test fixes" row above.
