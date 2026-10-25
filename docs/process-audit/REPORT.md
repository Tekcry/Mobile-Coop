# Process audit - Phase 1 report

Report only, no changes made (BRIEF.md, Phase 1). Written 2026-10-19 on the laptop from the code, the docs and the
orchestrator's desktop evidence:
- the full run of 2026-10-19 (228d78e, `E2E_JOBS=2`, software GL, wall 3720 s, suites summed 7424 s; CT Core's runner
  and an orphan `npm run check` overlapped its first ~20 minutes);
- solo runs on master bd59f32.

Nothing here was run on the laptop. Every item marked **(approve)** needs Michael's yes before Phase 2. The goal it is
measured against: a fully functional 2-player co-op training level (Wren, animations, weapons, every co-op move, lights
and shadows). The training level is **Marlow Yard** (`ctcourse`, Course mode, CT prototype B1), not Fallow (see C1).

## Summary
1. **The full run can drop from 62 to about 28 minutes** with the same coverage of the training level (section 1):
   - trim e2e-pad and e2e-mouse, which take 31 of the 124 summed minutes, mostly re-running gameplay their own suites
     already check;
   - move the parked-content suites (Kestrel, Hunter / Mission, warehouse routes) to legacy;
   - move the pixel read-back suite (e2e-darkness) and the Epic boot to the PC's GPU tier;
   - run the anim-audit report and the audio suites only when their folders change.
2. **`e2e:quick` is not quick.** A change under `src/core/` picks about 50 minutes of suites; `src/config/` about 19
   minutes. The cause is e2e-pad and e2e-mouse sitting in `CORE`. Fix with section 1's trims and a finer folder map.
3. **The three co-op failures share one likely cause** (section 2): the suites wait in wall-clock time while the game's
   sim runs slower than real time on software GL. The loop gives at most 4 fixed steps (67 ms of sim) per rendered
   frame (`src/core/loop.ts:5`, `:113`), and two pages on SwiftShader render a few frames a second. Evidence:
   - ctcourse's own diagnostic shows the host already hanging on the ledge (`att on`, `kind ledge`, the exact condition
     waited for) when its 12 s timeout fired;
   - netmove's walk-off is also a stale speed: the client walks off crouched at the CT prototype's slower crouch speed.

   Fix plan: sim-time waits in the two-page helper, smaller two-page viewports, and two test corrections.
4. **The rules contradict each other in 20 places** (section 4). One set of rules (CLAUDE.md, shortened) and a 3-file job
   format replace today's spread of 7-9 files per job.
5. **Decision at risk:** D36 (Moth's goggle is purple) and the goggle job's M1-M3 exist only on the unmerged
   `feature/goggle` branch (section 5).

## 1. e2e inventory and verdicts

Times are from the 2026-10-19 full run (load-inflated in its first 20 minutes, so pad / mouse / ctcourse / course, which
start first, read high). "Training level" = what the suite proves for Marlow Yard co-op play.

| Suite | s | What it checks | Covers the training level? | Verdict |
| --- | --- | --- | --- | --- |
| smoke | 16 | boots, no console errors | yes (boot) | keep |
| e2e-mouse | 955 | KBM input, pointer lock, then palm strike, medkit, wall, difficulty, edge verb, door menu, loadout, remap | input yes; the gameplay sections repeat other suites | **trim** to input mapping, pointer lock, remap (target ~3 min) |
| e2e-pad | 944 | pad nav, hot-plug, play flow, palm strike, gears, wall, door menu, edge verb, remap, disconnect | input yes; the gameplay sections repeat other suites | **trim** as e2e-mouse (target ~3 min) |
| e2e-ctcourse | 742 FAIL | Marlow Yard: 8 stations in co-op, leg-up, relay, jammer, laser, hang-down, scanners, rope, exit | **yes: the training level itself** | **fix** (section 2) |
| e2e-course | 623 | Course framework on `courselab` (debug map): airlock, every gate kind, restart, friendly fire, revive | framework yes; the gate walk repeats ctcourse | **merge**: keep airlock, restart, friendly fire, revive and the gate kinds ctcourse lacks; drop the rest (~200 s) |
| e2e-desktop (4 parts) | 1027 | 1080p window, menu scale, KBM rebinding, Graphics menu, **Epic renderer boot** (part 3, 538 s), 16:10 / 21:9 / 32:9 | partly | **trim**: Epic boot to the GPU tier; rebinding is in e2e-mouse and e2e-menus already |
| e2e-darkness | 366 | final-pixel luminance at Epic, NV off / on, on the Warehouse | lights yes, but it is a **visual read-back on SwiftShader** | **move to GPU tier** (CLAUDE.md: no visual result from SwiftShader); leaves KNOWN_FLAKY |
| e2e-menus | 294 | menu parity: keyboard, mouse, pad, tabs, sliders, remap capture, device switch | yes (menus to start the course) | keep |
| e2e-wall | 234 | back-to-wall on Proving; Warehouse flanker AI grenade (Clear mode) | wall yes; the flanker section is Hunter AI | **trim**: flanker section to legacy (~130 s) |
| anim-audit | 192 REPORT | animation realism metrics, report only | yes, but nothing reads it per run | **run only** in quick for `src/anim` / `src/player` and in animation jobs; not in the full run |
| e2e-lightbake | 159 | light bake identical across presets (Warehouse) | lights yes (engine-level) | keep (later: bake `ctcourse` instead of the Warehouse) |
| e2e-enemies | 151 | archetypes: heavy, enforcer, sniper, dog, drone operator, officer (Warehouse, Clear) | no (no archetypes on the course) | **legacy**; also check the roster against pure CT (G1, G180) |
| e2e-move | 141 | controller, gears, top speed | yes | keep |
| e2e-modes | 131 | ragdolls, Mission objectives to victory, enemy types | no (Mission parked) | **legacy** |
| e2e-kestrel | 129 FAIL | Kestrel B0 massing walk, camera rays | no (Kestrel paused, G53) | **legacy** (failing on master) |
| e2e-netmove | 126 FAIL | networked move state: every anchor kind, team moves, the host copy's pose within 10 cm | **yes (co-op moves)** | **fix** (section 2) |
| e2e-ct-warehouse | 112 | CT routes on the Warehouse (drainpipe, rappel, drop attack, boost target, fence) | moves yes; e2e-ct proves the same moves on Proving | **legacy** |
| e2e-coop | 108 FAIL | lobby, join, ready, a **Hunter** match (`?legacy=1`), hits, revive, results, host leaving, bad messages, offline | co-op yes, but on a parked mode | **fix** and move its match onto Course / Free Roam (section 2) |
| e2e-anchors | 88 | every placed anchor on every listed map is usable | yes | keep; limit the map list to Proving and `ctcourse` |
| e2e-stealth-ai | 84 | light vs shadow detection, noise, search, patrols (Warehouse) | light parity yes | keep |
| e2e-missions | 82 | Hunter and Infiltration missions, objectives, ratings | no (Hunter parked; missions are after the course) | **legacy** |
| e2e-weapon-audio | 78 | weapon sound sprite, voices, noise unchanged | weapons' noise yes (small) | **audio group**: quick on `src/audio` only |
| e2e-ct | 73 | split jump, wall jump, pipe sub-states, rappel, fence (Proving CT course) | yes (CT moves) | keep |
| e2e-foley | 71 | footstep sprite, one step per plant, noise unchanged | no (cosmetic) | **audio group**; leaves KNOWN_FLAKY (Michael: park the rest) |
| e2e-combat | 54 | hitscan, headshots, reload, swap, grenades, damage, respawn | yes (weapons) | keep |
| e2e-traverse | 52 | ladder, drainpipe, ledge, pipe; hands locked, speeds | yes | keep |
| e2e-score | 41 | in-game music states | no | **audio group** |
| e2e-offline | 35 | service worker, offline boot, save migration, co-op offline | yes (PWA) | keep |
| e2e-security | 33 | Kestrel S1 CCTV on `seclab` | no (Kestrel paused) | **legacy** |
| e2e-camera-bounds | 32 FAIL | the shoulder camera never behind a wall (on the Kestrel map) | camera yes, but the map is Kestrel | **legacy** (failing on master); later a case on `ctcourse` |
| e2e-music | 31 | music lab stems | no | **audio group** |
| e2e-weapons-carry | 30 | carry slots, hands on grips, no clipping | yes (weapons) | keep; leaves KNOWN_FLAKY after clean runs (it passed) |
| e2e-stealth | 29 | free-orbit camera, stealth movement | yes | keep |
| e2e-gadgets | 27 | wheel, gas, flash, EMP, noisemaker, cam, mine (Warehouse) | wheel yes | keep (check the gadget list against G76 / G180 later) |
| e2e-feedback | 27 | playtest notes, photo mode | yes (Michael's playtest tool) | keep |
| e2e-park | 24 | legacy gating of parked content | yes (keeps parked things out) | keep |
| e2e-takedown | 20 | takedowns, grab (Warehouse, Clear rules) | yes (core verb) | keep |
| e2e-anim | 20 | responsiveness, stance, foot lock, camera blends, Hz parity | yes | keep |
| e2e-levels | 19 | multi-storey nav | partly | keep (cheap) |
| e2e-tactics | 14 | hit volumes, suppression, exposure HUD, noise | yes | keep |
| e2e-clip | 10 | gun vs world and legs | yes | keep |
| LEGACY: progression, cosmetics, clear, bunker | - | parked content | no | stay legacy; remove e2e-bunker from KNOWN_FLAKY (a legacy suite never fails a run anyway) |

**Suites that check the same thing twice:**
- **Remap:** in e2e-pad, e2e-mouse, e2e-desktop and e2e-menus (four times).
- **Wall, door menu, edge verb and palm strike:** in e2e-pad and e2e-mouse, again in e2e-wall and e2e-takedown.
- **The course gates:** e2e-course on `courselab` and e2e-ctcourse on the real stations.
- **CT moves:** e2e-ct (Proving) and e2e-ct-warehouse (Warehouse).
- **Anchor use:** e2e-anchors, e2e-traverse and e2e-netmove.
- **The lobby:** e2e-coop (Hunter), e2e-course and e2e-ctcourse.

**Result (approve):** the kept suites sum to about 3370 s. At 2 jobs that is about 28 minutes, with e2e-ctcourse (12 min)
the long pole. That is well under the hour, and it drops further once section 2's sim-time waits stop the co-op suites
from waiting out their timeouts.

**`e2e:quick` (approve):**
- Take e2e-pad and e2e-mouse out of `CORE`; a slimmed pad suite may come back.
- Map `src/core/` by file: quality and display to e2e-desktop, the loop to CORE, the rest to smoke.
- Let quick add a legacy or audio suite (report only) when its own folder changes: today an audio change runs no
  audio suite at all once those move out of REQUIRED.
- Cap target: about 10 minutes for any single-folder change.
- Keep `docs/systems/testing-tools.md` in step, as the runner says.

## 2. Known flaky and failing suites

### Co-op (fix plan; the fix job runs on the desktop after Phase 2)
**Shared cause (likely):** the game loop advances the sim by at most 4 fixed steps per rendered frame, with `dt` clamped
at 0.1 s (`src/core/loop.ts:5`, `:113`). On SwiftShader two pages each render a scene at 1280 x 640
(`e2e-lib.mjs:84`) and get a few frames a second (the suites' own comments: "software GL runs a few frames a second").
So the sim runs at a fraction of real time, while every `until(..., 5000-12000 ms)` counts wall time. A 2-3 s game move
(the leg-up boost, a holster) then outlasts its timeout. The more the scene costs, the worse it gets; Wren, weapon meshes
and the CT prototype added cost since these suites were tuned.

- **e2e-ctcourse**, station 2: "the host hangs on the ledge" times out at 12 s. The diagnostic printed right after
  shows `att "on"`, `kind ledge`, `y 2.45-2.52` mid-boost: the host was still being boosted and reached the hang just
  after the timeout. In the full run it got further (station 5), which fits timing, not logic.
- **e2e-netmove**, two separate items:
  - **Walk-off** (:356, with #12 merged): the client stands down with B, which ends the offer but leaves crouch on
    (diagnostic `crouched: true`). It then walks off at the CT prototype's crouch speed: 1.2 m in 6 s (27.05 to 25.82)
    against the 1.55 m the test asks for. The test is stale against a tuning change, plus the slow sim.
  - **Ledge hang 10 cm** (master bd59f32, wrists 23 / 18 cm): fixed by #12. Anim-cleanup's world grips put the host
    copy's hands on the lip, and the step passed on the branch. Expect it to pass on master now.
- **e2e-coop**, two forms:
  - On bd59f32: "host sees the client drawn".
  - On anim-cleanup: "host sees the client holstered", with the client frozen mid-holster (dw 3, progress 0.76, swapT
    0.0855, no errors).

  Reading the code, nothing in `PlayerWeapons` can hold the draw state short of its target while the sim steps
  (`drawState.ts`: progress moves by dt / time every step). So the client's sim is barely stepping. Since #12 merged,
  e2e-coop's timeout prints each page's sim clock 0.5 s apart, plus paused / ended / menu / loop flags and page
  visibility (00f25103). The fix job's first run will confirm the cause or name another (a paused or ended Hunter
  match is the other candidate).
  - Separately, e2e-coop plays a **Hunter** match behind `?legacy=1`: the required co-op suite depends on parked
    content.

**Fix plan (approve):**
1. `e2e-net-lib.mjs`: an `untilSim(page, cond, simSeconds, wallCapMs)` that waits on the page's own sim clock
   (`__app.current.time`) instead of wall time. Use it in e2e-coop, e2e-netmove, e2e-ctcourse and e2e-course for every
   wait on a game action. Wall caps stay as a hang guard.
2. Two-page suites open at 960 x 480 (fewer pixels per frame on SwiftShader). No assert reads pixels in these suites.
3. Every two-page timeout prints both sims' clocks and frame rates, so a slow sim is visible at once.
4. Netmove walk-off: clear the crouch toggle before walking off (as `placeTeam` does).
5. e2e-coop: play its match in Free Roam or Course instead of Hunter; keep the lobby, hits, revive, leave and malformed
   checks.
6. Remove e2e-coop and e2e-netmove from KNOWN_FLAKY once they pass 3 solo and 2 full runs.

Done looks like: coop, netmove and ctcourse pass alone and in a full run on the desktop, with nothing else running.

### Not co-op (Michael: park, don't fix)
| Suite | Evidence | Verdict |
| --- | --- | --- |
| e2e-darkness | passed in the full run; backlog: driver shader compile on first draw, fixed in the test | GPU tier (it reads final pixels: a visual check) |
| e2e-weapons-carry | passed; one old failure, reason not captured | stays required (weapons are the goal); leaves KNOWN_FLAKY after 2 clean full runs |
| e2e-pad | passed; one old failure, not investigated | stays required, trimmed; leaves KNOWN_FLAKY after the trim runs clean |
| e2e-foley | passed; walk-plants check sits on its threshold (3-4 plants against >= 4 at the walk speed) | audio group, report only (parked) |
| e2e-bunker | legacy, not run; teleported-partner solid frames | stays legacy (Fallow parked) |
| e2e-kestrel | "133 inside them go to P04": camera rays collide at Kestrel's stair core and tight opening | legacy (Kestrel paused, G53) |
| e2e-camera-bounds | level U: 1673 / 1673 frames below the floor bound, camera y -34.55 against floor -1.50: a stale bound (the level sits about 33 m lower than the case's floor value); every other case 0 bad | legacy; note the stale bound for whoever resumes Kestrel |

Parking e2e-pad, e2e-weapons-carry or e2e-darkness outright would drop coverage of the goal (input, weapons, lights).
Hence the verdicts above. **Michael to confirm.**

## 3. Test tiers (approve)

One rule per kind of change:

| Change | Runs | Where |
| --- | --- | --- |
| Docs only (`*.md`, `docs/**`) | nothing; CI's `npm run check` on the PR is enough | any machine |
| A step (one commit-sized change in a job) | `npm run check` once at the step's end + the suites the step names (or `e2e:quick` after its re-map) | desktop; the laptop runs `check` only |
| A slice (a playtestable batch pushed to a preview) | `e2e:quick` + e2e-ctcourse, plus e2e-coop / e2e-netmove when `src/net`, `src/player` or `src/game` changed | desktop |
| A PR / merge to master | the full `npm run e2e` once on the PR head (`E2E_JOBS=2`, nothing else running), CI `check`; after the merge nothing more unless a conflict fix touched `src/` (then quick) | desktop |
| Visual or perf work | `E2E_GPU=1` suites, perf budgets, contact sheets | Michael's PC only |

Rules:
- **One runner per machine:** never two e2e runners or a `check` beside a full run. The 2026-10-19 run overlapped
  CT Core's runner and an orphan `check`.
- **Perf budgets:** only for jobs that touch rendering or hot paths, until Michael lifts the no-refining rule (today
  "every job" in the definition of done).

**Asserts a tuning table can make stale** (each should read the number from the game's own table, e.g. through
`window.__app`, not a literal):
- holster time: fixed in 4c465e3c (400 ms against `HOLSTER_TIME` 0.55);
- netmove walk-off: 1.55 m in 6 s, crouched;
- ctcourse leg-up wait: 12 s wall;
- traverse: pipe climb 0.85 m/s, ledge shimmy 1.2, crawl 0.9; the drainpipe settle window (frames);
- e2e-ct: legs-up shimmy 0.5, rappel 1.6 / 1.0, fence 0.9 / 0.6;
- e2e-move: top speed 4.2;
- e2e-wall: shuffle 0.27 / 0.35;
- e2e-anim: 95 % speed in 0.08 s, 720 deg/s turns;
- e2e-foley: >= 4 plants at the walk speed;
- every wall-clock `until` timeout in the two-page suites (section 2).

## 4. Session and prompting rules

### Contradictions found
1. **Training level.**
   - CLAUDE.md:28-29 and the module map: Fallow (`bunker`) is "the only training (G78, G111)".
   - CT prototype B1: Marlow Yard (`ctcourse`) is the training course; Fallow is parked behind `?legacy=1`
     (`run-e2e.mjs:25`, ROADMAP item 4).
2. **Who merges.**
   - CLAUDE.md "Orchestrator": the orchestrator merges.
   - `docs/systems/deploy.md`: "Claude never merges; Michael does".
   - Auto mode blocks the orchestrator's merge (PR #12), so Michael merged in practice.
3. **Retired branches still deploy.** CLAUDE.md and deploy.md: `ct-movement` and `dev` are retired (G83). ROADMAP:
   `/preview/` = `dev` = master and `/ct/` = `ct-movement` = feature/ct-prototype, moved after every merge or slice.
4. **Preview slots.** G85 says one preview slot; three exist (`/preview/`, `/ct/`, `/kestrel/` in deploy.md).
5. **Phones.** CLAUDE.md "Desktop only: no phone or touch work (G12)" against G182 (a phone launches for testing). The
   brief's "M21" and "`npm run dev` LAN" items are already gone from master's CLAUDE.md; only the G12 line remains.
6. **Versions.** The definition of done sets versions "when Michael says he is merging"; the orchestrator now merges.
7. **The job list.** The definition of done says to update `docs/archive/progress.md (job list)`; the doc index calls
   progress.md "history and the older follow-up backlog"; the job list is `docs/ROADMAP.md`.
8. **Two meanings of "orchestrator".** CLAUDE.md: one session for the whole build. session-method.md: "One
   orchestrator session per job".
9. **Fix rounds.** session-method.md: up to 3. CLAUDE.md "Current goal": at most 1 per slice.
10. **Step or slice.** CLAUDE.md: "e2e:quick per step"; "Current goal": "Quick e2e per slice"; tiers undefined
    (section 3).
11. **Visual check on SwiftShader.** e2e-darkness is a required software-GL suite that reads final pixels. CLAUDE.md:
    never claim a visual result from SwiftShader.
12. **Flaky suites.** CLAUDE.md: known-flaky suites always run. Michael: park the non-co-op ones.
13. **Parked content in the required run.** e2e-coop, e2e-wall's flanker, e2e-missions and e2e-modes run Hunter /
    Mission behind `?legacy=1` in REQUIRED. CLAUDE.md: parked systems get no new work. Yet a failure there blocks
    every PR.
14. **Redundant flaky entry.** KNOWN_FLAKY lists e2e-bunker, which is LEGACY (it never fails a run anyway).
15. **Doc index.** It points the CT prototype job at `docs/archive/locomotion/`; the job's docs are `docs/ct-prototype/`.
16. **Legacy list.** CLAUDE.md says `e2e:legacy` covers "Hunter, progression, cosmetics"; it also runs e2e-bunker.
17. **Machines rule.** The laptop "light work only" rule (Michael, 2026-10-19) lives only in job STATE files and
    ROADMAP, not in CLAUDE.md.
18. **New suites.** The definition of done: "each new player-facing system has an e2e suite or extends one". This
    drives suite sprawl; prefer extending the training-level or system suite.
19. **Missing file.** The brief names `docs/orchestrator/STATE.md`; it is not on master (it may live on the
    orchestrator's branch only).
20. **Main folder off master.** The plain folder `C:/NightShift/Mobile-Coop` is on `feature/training-bunker` (merged,
    upstream gone); CLAUDE.md says it stays on master. Local `master` there is at 2026-10-09.

### One set of rules (approve; CLAUDE.md wording comes in Phase 2 for Michael's approval)
- **CLAUDE.md is the only rules file.** It holds:
  - the project facts;
  - the current goal;
  - one "Sessions" section: the global orchestrator, the job lead loop (from session-method.md), the machines
    (desktop: e2e and GPU; laptop: docs, planning, small edits, `check` only), merges, test tiers;
  - the hard rules and the definition of done.

  `docs/systems/session-method.md` shrinks to the job lead's loop detail (implementer, checker, at most 1 fix round
  while the goal rule holds, prompts) and loses everything CLAUDE.md says.
- **`docs/ROADMAP.md` is state only:** now / next / waiting on Michael / done, plus the machines table. No rules.
- **Names:** "the orchestrator" means the one global session; a job's lead session is "the job lead".
- **Merging:** the orchestrator merges green PRs; when auto mode blocks it, Michael merges. Versions are set by
  whoever merges (deploy.md and the definition of done follow).
- **Previews:** say what exists: `/preview/` follows master, `/ct/` the active prototype branch (moved by its job);
  `dev` and `ct-movement` are pointer branches for those slots, not work branches. Either record that as G85's
  current form or rewrite the Pages workflows (Michael's choice).

### One per-job file format (approve)
Three files in `docs/<job>/`, replacing BRIEF / RULES / PLAN / STATE / LOG / DECISIONS / OWNER-NOTES / AGENT-PREAMBLE:
1. **BRIEF.md:** the ask with Michael's words, goal, limits; Michael's answers M1, M2, ... and assumed decisions A1,
   A2, ... with how to undo (today's DECISIONS.md).
2. **PLAN.md:** the steps or slices (only for multi-step jobs).
3. **STATE.md:** the resume point (now, next, open), a dated done list (today's LOG, short), and the resume prompt in
   one fenced block (today's OWNER-NOTES).

Retire per job:
- **RULES.md:** the rules are global; job-specific limits go in BRIEF.
- **The per-job AGENT-PREAMBLE:** one shared `docs/systems/agent-preamble.md` with the branch guard filled in by the job
  lead.
- **Per-step files:** optional, for long steps only.

Existing jobs keep their files as history (no renames); the format applies to new jobs.

## 5. Docs, branches and worktrees

### Docs that read as current but are not (mark as history with a one-line banner; approve)
| File | Says | Is |
| --- | --- | --- |
| `docs/archive/locomotion/STATE.md` | "Consolidation to master ... then the CT prototype" | done (PR #3, #9) |
| `docs/archive/consolidation/HANDOVER.md` | resume point for the consolidation run | done (PR #3) |
| `docs/archive/training/STATE.md` | "PAUSED for Michael's walk 2" | Fallow parked (CT prototype B1) |
| `docs/menu-ui/STATE.md` | "The run has not started" | merged (PR #8, #11) |
| `docs/kestrel/progress.md`, `handover.md` | live stage table | paused (G53) |
| `docs/operators/STATE.md` | cleanup, then Moth next | the cleanup job waits on the playtest (ROADMAP); Moth later |
| `docs/archive/goggle/PLAN.md` | parked (already marked) | parked; branch not merged (below) |
| `docs/archive/anim-cleanup/STATE.md` | "waits for Michael to merge" | merged (#12) |
| `docs/ct-prototype/STATE.md` on master | "Updated 2026-10-18" | the live state is on feature/ct-prototype |
| `docs/archive/progress.md` | job list in places (the definition of done still says so) | history; ROADMAP is the job list |
| CLAUDE.md doc index rows for `docs/archive/locomotion/` and `docs/archive/training/` | current jobs | history / parked |

### Branches (remote; nothing deleted, deletion is Michael's)
| Branch | Status | Evidence | Suggestion |
| --- | --- | --- | --- |
| `feature/goggle` | 4 ahead, docs only | **D36 (Moth purple) and goggle M1-M3 exist only here** | merge its docs into master (Phase 2 or a tiny PR) before anything else |
| `feature/ct-prototype` | 4 ahead | active (CT Core) | keep |
| `feature/ct-research` | 6 ahead | content merged as PR #4 (squash: G124-G160 and `docs/ct-research` on master); tag `archive/ct-research-raw` holds the raw first commit only | delete (ROADMAP Waiting 8) |
| `feature/process-audit` | 1 ahead | this job | keep |
| `ct-movement`, `dev` | merged | Pages pointer branches for `/ct/` and `/preview/` | keep while Pages uses them |
| `docs/prototype-goal`, `feature/anim-cleanup`, `feature/menu`, `feature/phone-launch`, `feature/weapons` | merged | PRs #6, #12, #8 / #11, #13, #7 | delete |
| `feature/operators` | merged | PR #5; D35 keeps it for the cleanup and Moth | keep until the cleanup job, or cut those from master and delete |

### Local branches and worktrees (on the laptop's shared repo)
- **Merged, local only:** `feature/training-bunker`, `feature/ct-locomotion`, `feature/footsteps`, `feature/kestrel`,
  `feature/menu-ui-spec`, `feature/music`, `claude/cool-mendeleev-ddd8c2` (safe to remove with their worktrees).
- **`feature/weapon-audio`:** 1 commit ahead and never pushed (21a4f3d0: TESTING.md and weapon-audio-progress.md,
  "desktop only (M21)"). Either push and merge the note or drop it (Michael).
- **Worktrees:**
  - Mobile-Coop (on training-bunker; switch it to master);
  - `.claude/worktrees/cool-mendeleev-ddd8c2` (detached);
  - anim-cleanup, audit, goggle, kestrel, locomotion;
  - menu-mock (detached), menu-ui, music, operators, weapon-audio, weapons.

  All but audit, goggle (until merged) and the active jobs can go.
- **`C:/NightShift/Mobile-Coop-phone`** (worktree on `feature/phone-launch`, merged as #13): its `node_modules` is a
  junction to Mobile-Coop-anim-cleanup's. Remove the junction first, never the target, before removing either folder.
- **Tags kept:** `archive/character-model`, `archive/ct-locomotion-state`, `archive/ct-movement-99da75b`,
  `archive/ct-research-raw`, `archive/weapon-audio-late-docs`, `music-v2-archive`.

## Phase 2 scope if approved
- `run-e2e.mjs`: the lists, KNOWN_FLAKY, CORE and COVERS (section 1).
- The trims of e2e-pad, e2e-mouse, e2e-desktop, e2e-wall and e2e-course; the GPU-tier move of e2e-darkness and the
  Epic boot.
- Doc banners and the doc index (section 5).
- `deploy.md`; session-method.md shrunk; CLAUDE.md wording quoted for Michael (section 4).

Not in Phase 2:
- the co-op fixes (their own desktop job, section 2);
- branch deletions (Michael);
- the goggle merge (needs only a yes).

## Phase 2 - applied (2026-10-19)
Michael approved sections 1, 3, 4 and 5 as written (relayed by the orchestrator); section 2 (the co-op fixes) is its own
desktop job. Applied on `feature/process-audit`:
- **Section 1:**
  - `run-e2e.mjs` lists (REQUIRED, LEGACY, AUDIO, GPU, REPORT), KNOWN_FLAKY, CORE and COVERS;
  - `npm run e2e:audio` and `e2e:gpu`;
  - the e2e-pad / e2e-mouse trims with a new pad verb table;
  - e2e-course down to one gate walk; `e2e-wall:flanker`; e2e-anchors on Proving.
- **Section 3:**
  - the tiers in CLAUDE.md "Sessions" and `docs/systems/testing-tools.md`;
  - the stale-literal list in testing-tools.md, for whoever next touches each suite;
  - TESTING.md's release check.
- **Section 4:**
  - CLAUDE.md "Sessions" (replaces "Orchestrator", "Every session", "Running a job", "Branches"), with the changed lines
    elsewhere;
  - `docs/systems/session-method.md` (the job lead's loop) and `docs/systems/agent-preamble.md` (new);
  - `docs/systems/deploy.md`, bible sections 9-10.
- **Section 5:**
  - history banners on locomotion, consolidation, training, menu-ui, kestrel (2), operators and anim-cleanup docs, and
    `docs/archive/progress.md`;
  - `docs/backlog.md`'s flaky section;
  - the goggle job's docs merged (D36, M1-M3).

Where the work differs from the report's wording, and why:
- **e2e-anchors:** Proving only, not Proving and `ctcourse`. Marlow Yard places no traversal anchors (its walls are
  team moves and generated lips), so the suite would check nothing new there and boot an untried mode. Add it when the
  map places one.
- **`docs/ct-prototype/STATE.md`:** no banner. The job is live, and its branch replaces master's copy at its merge.
- **`docs/ROADMAP.md`:** not edited, because the orchestrator owns it. The rules it carried now live in CLAUDE.md; the
  orchestrator trims it to state only.
- **The stale literal asserts:** listed, not rewritten. They pass today; each is changed when its suite is next
  touched (the co-op ones in the co-op fix job).
- **Previews:** recorded as what exists (G85's current form: `/preview/` and `/ct/` through the `dev` and
  `ct-movement` pointer branches), not a workflow rewrite.
- **Moved suites keep their old behaviour:** only the four original legacy suites get `LEGACY=1`; the others moved to
  LEGACY run exactly as they did in REQUIRED.

Not verified here (laptop, light work): no e2e run. The orchestrator runs the full e2e on the desktop before merging (the
PR tier). Expect the full run at about 28 minutes, with e2e-coop and e2e-netmove still KNOWN FLAKY until the fix job.
