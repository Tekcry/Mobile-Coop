# Phase 0 - Foundation (version 3.5.0)

Start from `docs/prompts/phase-0-handover.md` (the handover). It tells you when to begin this file.

## Branch state when this spec was written (2026-10-08)

| Branch | Head | Notes |
| --- | --- | --- |
| `master` | `df87240` | Release 3.4.0. Same game code as `dev`, plus the Pages workflow and `vite.config.ts` changes for the `/ct/` slot. |
| `dev` | `c6ea547` | 3.4.0. Light phone renderer, baked lamps, Phone check. |
| `ct-movement` | `ba21dc9` | CT movement (3.2.0-ct) plus the OLD Kestrel Exchange blockout (superseded). 19 commits ahead of `dev`, 26 behind. |
| `feature/exchange-map` | `87fc0a7` (plus the pause commit from handover Step 0a) | Branched from `ct-movement`; 6 ahead, 0 behind. Contains: the old Exchange blockout removed (`e51f9fb`), the level design standard and map spec template (`f45cbb2`), Exchange paper design phases 0-2 (docs and SVG only), and the split jump fix `8a364c4` ("jumping out of it is back"). |

If the heads have moved, re-check before Step 1. Follow the STOP rules if anything below no longer holds.

---

## Goal

Prepare the repository for the Chaos Theory campaign build described in `docs/design-bible.md`. This phase has five parts:

1. **Integrate.**
   - Bring the Exchange branch's docs and split jump fix into `ct-movement`. This also removes the superseded Exchange blockout.
   - Merge `master` (3.4.0) into `ct-movement`.
   - Then STOP so Michael can test and promote `ct-movement` to `dev` and `master`.
2. **Install** the design bible as the authority on design.
3. **Shrink** `CLAUDE.md` from ~125 KB to a lean core. Every Claude Code session loads it, so its size is pure token cost. Move the detail into `docs/systems/` without losing any information.
4. **Hide** parked content (Wave, Hunter, old Mission, PvP, the economy and cosmetics) behind `?legacy=1`.
5. **Start** `docs/progress.md` as the single place that says where the project stands.

**This phase changes no gameplay and no feel.** The only player-visible change is that parked modes and screens are hidden unless `?legacy=1` is in the URL.

---

## Rules for this phase

- **Branch:**
  - Work on `ct-movement` (preview at `/ct/` on GitHub Pages, own save).
  - Run `git fetch --all --prune` and `git pull` first.
  - Never push to `dev` or `master`.
  - Push to `feature/exchange-map` only for the pause commit in the handover's Step 0a.
  - Bringing `origin/feature/exchange-map` and `origin/master` INTO `ct-movement` (Step 1) are the only merges this phase makes. Michael approved them.
- **Read only what each step lists.** Do not read the whole repo. Use `grep` and line ranges for large files.
- **Rules:** the hard rules in `CLAUDE.md` apply throughout (no runtime network, no external art or audio, Babylon only via `src/core/babylon.ts`, IndexedDB saves, `src/net` only by dynamic import, strict TS, no hot-path allocations).
- **Ambiguity:** if this spec is ambiguous or conflicts with the code, choose the option closest to existing patterns. Log it under "Decisions" in your report (and in `docs/progress.md` once it exists) and carry on.
- **Order of work:**
  - Work through the steps in order.
  - Commit and push at the end of each step, with the commit message given.
  - Write a short step report in bible Appendix B format.
- **STOP and report to Michael immediately if:**
  - a merge conflict cannot be resolved while keeping both sides' behaviour
  - a test still fails after two honest fix attempts, or the only fix you can see changes gameplay or feel
  - a performance budget is missed after the merge and the cause is not obvious
  - anything would delete user save data or need a `SAVE_VERSION` bump (none should)
  - `feature/exchange-map` contains code changes beyond those listed in Step 1b
- **Reports:** short and plain. Use hyphens, not em dashes.

---

## Step 1 - Integrate (then STOP for Michael)

**Read first:**

- `git log --oneline origin/ct-movement..origin/feature/exchange-map`
- `git log --oneline $(git merge-base origin/master origin/ct-movement)..origin/master`
- the top of `CHANGELOG.md` on `master` (`git show origin/master:CHANGELOG.md | head -120`)
- the "Performance budget" and "Phone look" sections of `CLAUDE.md` on `master` (grep for the headings)

### 1a. Baseline

On `ct-movement`, before any merge:

- Run `npm ci` and `npm run check`. Record the unit test count and the result.
- Record `node scripts/perf.mjs --budget`.
- Then on a temporary worktree of `origin/master` (`git worktree add ../master-base origin/master`, then `npm ci` there):
  - record `node scripts/perf.mjs --budget`
  - record the phone-path perf command documented in `master`'s `CLAUDE.md`
- These are the "before" numbers. Remove the worktree afterwards.

### 1b. Bring in the Exchange branch

**Verify first:**

- `git diff --stat origin/ct-movement origin/feature/exchange-map -- src scripts tests` may show only:
  - `src/player/attachController.ts` (the split jump fix)
  - `scripts/e2e-ct.mjs`, `scripts/e2e-anchors.mjs`, `scripts/run-e2e.mjs`
  - removal of the old Exchange map: `src/world/maps/exchange.ts`, `src/world/maps/index.ts`, `src/world/maps/listed.ts`, `scripts/e2e-exchange.mjs`, `tests/exchangeMap.test.ts`, `tests/rooms.test.ts`
- Anything else in `src/`, `scripts/` or `tests/` (for example, the map's Phase 3 build has started): STOP and ask Michael.
- Changes under `docs/` are expected (the map documents and the pause note).

**Then:**

1. Run `git merge --no-edit origin/feature/exchange-map`.
   - It is a fast-forward unless `ct-movement` already has the handover's docs commit; then it is a plain merge with no conflicts.
   - Any conflict: STOP and ask Michael.
2. Run `npm run check`.
3. Push.

The Exchange is now a paper design only. There is no Exchange map in the game until the map's build phases resume (bible Section 10, Phase 7).

### 1c. Merge `origin/master` into `ct-movement`

`master` is 3.4.0: `dev`'s game code plus the Pages configuration.

Run `git merge origin/master`. Use a normal merge: no squash, no rebase.

**Conflict policy (by area).**

**Rendering, graphics and performance - prefer `master`, then re-apply any movement, input or traversal parts from `ct-movement`:**

- `src/core/quality*.ts`, `governor.ts`, `display.ts`, `spikes.ts`, `viewRotation.ts`, `deviceTier.ts`
- `src/world/bakedLamps.ts`, `lightRig.ts`, `renderOpts.ts`
- the rendering parts of `src/world/world.ts`
- `src/voxel/*`, `src/vfx/*`
- `src/game/benchmark.ts`
- graphics and display parts of the settings screens
- `src/ui/screens/resolutionPicker.ts`

**Movement, traversal, takedowns, team moves, input and maps - prefer `ct-movement`, then re-apply any `master` changes:**

- `src/player/*`, `src/anim/*`, `config/movement.ts`, `config/camera.ts`
- `game/takedown*.ts`, `game/teamController.ts`, `game/teamMoves.ts`, `game/localMoveState.ts`
- `src/input/*`
- `src/net/*`
- `src/world/anchors.ts`
- `src/world/maps/*` (the Warehouse CT routes; the old Exchange stays removed)

**Union - keep both sides' features:**

- `src/game/gameState.ts`, `src/core/app.ts`, `src/core/settings.ts`, `src/core/flags.ts`
- `src/input/touchControls.ts`
- `scripts/e2e-lib.mjs`, `scripts/run-e2e.mjs` (the suite list is the union of both, without `e2e-exchange`)
- every test file

**Workflows and Vite config:** take `master`'s `.github/workflows/*` and `vite.config.ts`. They already carry the `/ct/` slot.

**Docs:**

- `package.json` version: take `master`'s for now (Step 5 sets 3.5.0).
- `CHANGELOG.md`: keep every entry from both sides, newest first.
  - Both lines used 3.2.0. Keep `master`'s headings as they are.
  - Rename the `ct-movement` heading to `## 3.2.0-ct - Chaos Theory movement (ct-movement branch)`.
  - Place it after `master`'s 3.2.0 entries.
- `CLAUDE.md`, `TESTING.md`: keep both sides' text in full (union). Step 3 restructures them, so do not tidy now.

### 1d. Make it build and pass

1. Run `npm run check`.
2. Fix type and lint errors from the integration without changing either side's behaviour.
3. Run `npm run build`, then `npm run e2e` (the full union suite list).

**Integration risks to check specifically:**

- **The 3.4 phone light renderer with every CT move.** Run `e2e-ct`, `e2e-ct-warehouse`, `e2e-netmove`, `e2e-touch` (speed rocker, touch action button), `e2e-traverse`, `e2e-anchors` and `e2e-clip`.
- **The split jump fix** (`8a364c4`): jumping out of a split works. Its checks in `e2e-ct` pass.
- **The benchmark / Phone check flight on the Warehouse.** `master` 3.2.5 made the flight follow the walking routes, and `ct-movement` changed Warehouse routes and geometry. Check the flight does not pass through new geometry (`e2e-desktop` benchmark checks plus one Phone check run under phone emulation). If it does, adjust the flight's waypoints only.
- **Settings migrations:** `master` removed graphics settings on phones (3.3.0) and `ct-movement` added touch layout v4 (the speed rocker). Both must survive and migrate in a sane order.
- **Phone emulation boot:** `?autostart=warehouse` and `?autostart=proving` boot without console errors.

**Fixing failures:**

- A failing test from either side is fixed by integrating correctly, never by weakening its assertion.
- If an assertion must change because the two features genuinely interact (for example the benchmark route), log it under Decisions with the before and after values.

### 1e. Performance after the merge

- Run `node scripts/perf.mjs --budget` and the phone-path command.
- All budgets must pass. Record the numbers against the baselines.

### 1f. Commit, report, STOP

**Commit:** `Merge master (3.4.0: phone renderer, baked lamps) into ct-movement`. Push.

**Report to Michael** (Appendix B format):

- conflicts and how each was resolved
- Decisions
- the test and performance results against the baselines

**Then STOP.** Michael will:

1. test `/ct/` on his iPhone and desktop (moves, frame rate, menus);
2. merge `ct-movement` into `dev`, then `dev` into `master` on GitHub;
3. say "continue with Step 2".

---

## Step 2 - Install the design bible and progress file

**Read first:** `docs/design-bible.md`, in full, once. It was committed in the handover's Step 0. Do not edit it in this phase.

### Create `docs/progress.md`

**Sections:**

1. **Status table:** roadmap Phases 0-7 from bible Section 10, with columns Phase, Name, Status (`not started` / `in progress` / `done`), Version, Spec file.
2. **Current state** (8-12 lines):
   - `master`, `dev` and `ct-movement` integrated at 3.4.0 + CT movement.
   - The phone look (3.4 light renderer). Baked lamps on desktop.
   - The three separate light calculations that roadmap Phase 1 replaces (bible 5.1).
   - CT movement complete (`docs/ct-movement-progress.md`).
   - Kestrel Exchange:
     - a paper design only (map phases 0-2 done; Phase 2 awaiting Michael's approval);
     - no map code;
     - build phases held until roadmap Phase 3 and an alignment pass (bible Section 10, Phase 7).
   - Parked content behind `?legacy=1` (after Step 4).
3. **Phase 0 log:** Step 1's report (copy it in), later step reports, Decisions, Measurements, Open issues.
4. **Links:**
   - `docs/ct-movement.md`, `docs/ct-movement-progress.md`
   - `docs/level-design.md`, `docs/templates/map-spec.md`
   - `docs/prompts/exchange-map.md`, `exchange-design.md`, `exchange-map-progress.md`, `exchange-plans/`

**Commit:** `Phase 0: design bible and progress file`. Push.

---

## Step 3 - Restructure the docs (no information lost)

**Goal:**

- `CLAUDE.md` is 12 KB or less (hard limit 15 KB).
- Everything else moves, unchanged in wording, into `docs/systems/*.md`, read on demand.
- `CHANGELOG.md` and `TESTING.md` keep only 3.0.0 onwards. Older material is archived.
- `docs/level-design.md`, `docs/templates/map-spec.md` and `docs/prompts/*` are NOT moved or edited.

**Read first:** the merged `CLAUDE.md` (in chunks), and `grep -n "^#" TESTING.md CHANGELOG.md`.

### 3a. Move sections into `docs/systems/`

Map by topic, using the merged `CLAUDE.md`'s actual headings. Move text **verbatim**: you may change heading levels and fix relative links, nothing else.

| Topic in `CLAUDE.md` | New file |
| --- | --- |
| Commands: the long e2e suite descriptions, helper scripts (`shot`, `rig-shot`, `anim-sheet`, `perf`, `soak`), debug overlay | `docs/systems/testing-tools.md` |
| Branches and deploy (full detail, Pages slots `/`, `/preview/`, `/ct/`) | `docs/systems/deploy.md` |
| Game loop, Input | `docs/systems/input-and-loop.md` |
| UI | `docs/systems/ui.md` |
| World and player, Characters | `docs/systems/world-and-characters.md` |
| Movement and camera, Traversal anchors and attached states, Corners and doorways, all CT movement sections | `docs/systems/movement.md` |
| Light model, Baked lamps, Phone look, lamp volume | `docs/systems/lighting.md` |
| Cover, Combat around cover | `docs/systems/cover.md` |
| Stealth AI, Enemy archetypes, AI and modes | `docs/systems/ai.md` |
| Takedowns and Mark & Execute (and CT takedowns / grab) | `docs/systems/takedowns.md` |
| Gadgets | `docs/systems/gadgets.md` |
| Modes (Hunter, Infiltration), Arsenal / suit / HQ / economy, Cosmetics | `docs/systems/modes-and-progression.md` |
| Progression and saves (the save schema part) | `docs/systems/saves.md` |
| Combat | `docs/systems/combat.md` |
| Coop (including 3.1 crossplay and CT team moves) | `docs/systems/coop.md` |
| Audio and quality: the audio part | `docs/systems/audio.md` |
| Audio and quality: graphics, presets, auto graphics, governor, phone look settings | `docs/systems/graphics-quality.md` |
| Performance budget | `docs/systems/performance.md` |
| Robustness rules, Conventions (full text) | `docs/systems/conventions.md` |

- Any section not listed goes in the closest file. Name it in the report.
- Every `docs/systems/*.md` file starts with:
  - a one-line purpose
  - a line `Design authority: docs/design-bible.md (Section X)` naming the relevant bible section

**Status banners.** Add these as the second line, exactly as written:

- `cover.md`: `> Status: scheduled for removal in Phase 3 (back-to-wall replaces it - bible 5.3). Do not extend.`
- `takedowns.md`: `> Status: Mark & Execute is removed in Phase 3 (bible 5.4). Takedowns, grab and human shield stay.`
- `gadgets.md`: `> Status: sonar is removed in Phase 3; the tri-rotor drone is parked (bible 6).`
- `modes-and-progression.md`: `> Status: Hunter, Wave, Mission, PvP, credits, unlocks, suit, HQ and cosmetics are parked behind ?legacy=1 (bible 6). Infiltration becomes the campaign mission framework in Phase 4.`
- `lighting.md`: `> Status: Phase 1 replaces the three light calculations with one source of truth (bible 5.1).`

### 3b. Write the new `CLAUDE.md`

Use this order and these contents.

**1. Identity (6 lines or fewer):**

- Silent But Deadly is an original third-person stealth game modelled on Splinter Cell: Chaos Theory.
- It has a solo campaign that is also playable in 2-4 player co-op.
- Light and shadow is the core.
- It is a PWA on GitHub Pages: iPhone 17 Pro Max at 60 fps and desktop.
- `docs/design-bible.md` decides design questions. Text anywhere describing Blacklist systems (snap cover, Mark & Execute, sonar, Ghost / Panther / Assault, PvP, Wave) is history.
- The internal ids keep the old name (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id).

**2. Every session:**

1. Read this file.
2. Read `docs/progress.md` (status table and current state only).
3. Read the current phase spec.
4. Open only the files and `docs/systems/*` sections the spec lists.
5. Authority order: Michael > bible > phase spec > `docs/level-design.md` and the map's documents > these docs > code.

**3. Commands:** `dev`, `build`, `test`, `lint`, `check`, `e2e`, `e2e:legacy` (from Step 4), one line each, plus `see docs/systems/testing-tools.md`.

**4. Branches:**

- `ct-movement` is the working branch (preview `/ct/`, own save).
- Work flows one way only: `ct-movement`, then `dev` (`/preview/`), then `master` (live). Nothing is committed directly to `dev` or `master`.
- Claude never merges into `dev` or `master`; Michael merges.
- Map projects use their own branch off `ct-movement` (for example `feature/exchange-map`).
- Full detail is in `docs/systems/deploy.md`.

**5. Hard rules:** the existing list, verbatim, plus these new lines:

- Gameplay never reads graphics state: presets, LOD, voxel layers, the governor, the phone look. It reads collision, occupancy, anchors, the light bake and the noise model only.
- Light parity: what the player sees, the light meter and guard perception must agree (bible 5.1).
- No Splinter Cell IP: names, characters, organisations, story, logos, UI art.
- Removed and parked systems (bible 6) get no new work.
- No voice. Story is text radio and subtitles only.
- A phase that changes an engine fact listed in `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact (bible 7).

**6. Definition of done:** 6-8 lines summarising bible Section 9.

**7. Module map:** one line per `src/` folder (shorten the existing table).

**8. Doc index:** a table with columns File, Covers, Read when. List:

- every `docs/systems/*.md`
- `docs/design-bible.md`, `docs/progress.md`
- `docs/level-design.md`, `docs/templates/map-spec.md`
- `docs/ct-movement.md`
- `docs/prompts/` (phase specs and map documents)
- `TESTING.md`

### 3c. Prove nothing was lost

Write a throwaway Node one-liner or script (do not commit it). It checks that every non-empty, non-heading line of the merged `CLAUDE.md` from the Step 1 merge commit appears in either the new `CLAUDE.md` or a `docs/systems/*.md` file.

- **Target:** zero missing lines.
- List any intentionally dropped lines (duplicates only) in the report.

### 3d. Archive old history

- Move `CHANGELOG.md` entries older than 3.0.0, verbatim, to `docs/archive/CHANGELOG-pre-3.0.md`. Add a link at the bottom of `CHANGELOG.md`.
- Move `TESTING.md` checklists for versions before 3.0.0 to `docs/archive/TESTING-pre-3.0.md`.
  - Keep in `TESTING.md` the release checklist (the "Phase 10" section that the robustness rules reference) and everything from 3.0.0 onwards.
  - Add a link to the archive.
- Update `README.md`'s "Architecture, conventions and module layout" sentence to point to `CLAUDE.md` and `docs/systems/`.

**Report** the sizes in KB before and after for `CLAUDE.md`, `CHANGELOG.md` and `TESTING.md`.

**Commit:** `Phase 0: lean CLAUDE.md, docs/systems, archived history`. Push.

---

## Step 4 - Park legacy content behind `?legacy=1`

**Read first:**

- `src/core/flags.ts`
- `src/ui/screens/playScreen.ts`, `mainMenu.ts`, `loadoutScreen.ts` (structure only: grep for the pages and rows), `resultsScreen.ts`, `rewardsPanel.ts`, `profileBadge.ts`
- `src/net/coopUi.ts` (mode list)
- `scripts/e2e-lib.mjs` (`openPage`), `scripts/run-e2e.mjs`

### 4a. The flag

- Add `legacy: boolean` to `Flags`, read from `?legacy=1`. It comes from the URL only and is not saved.
- Add a pure module `src/core/legacy.ts`:
  - `PARKED_MODES` (Wave, Mission, Hunter / `clear`, Team Deathmatch, Free-for-all, using the real mode ids in the code)
  - `visibleModes(all, legacy)`
  - `campaignUnlocked(legacy)`, which returns true when legacy is off
- Unit tests in `tests/legacy.test.ts`.

### 4b. With legacy off (the default)

**Play screen:**

- Show Infiltration, Training and Free Roam only. The default mode is Infiltration (today it is `wave`).
- Infiltration lists its missions as now.

**Co-op lobby:**

- Show Infiltration, Training (if it is offered in co-op today) and Free Roam.
- Hide Team Deathmatch and Free-for-all. Keep 4 players maximum.

**Loadout screen:**

- **Keep:** primary and secondary weapon choice, attachments, gadget, loadout presets.
- **Hide:** Suit, Appearance, patterns / camos, upgrade purchases, mastery, challenges, HQ and emotes.
- Any weapon, attachment or gadget that would show as locked or buyable is selectable when `campaignUnlocked()` is true.
- Never write unlocks, credits or purchases to the save because of this.

**Results screen:**

- Hide credits, XP, the rewards panel and the Ghost / Panther / Assault bars.
- Keep the mission stats and the mission rating.

**Main menu / profile badge:** hide level and credits, and any entry that leads only to parked content.

**Unchanged in this phase:**

- Training is unchanged; it is rewritten in roadmap Phase 3.
- Gameplay is unchanged: snap cover, Mark & Execute, sonar and the drone all still work until roadmap Phase 3.
- `?autostart=...&mode=...` works for every mode regardless of the flag (tests and development need it).

### 4c. With `?legacy=1`

Everything is exactly as before this step.

### 4d. Saves

- No schema change and no `SAVE_VERSION` bump.
- Progression keeps recording as it does now.
- Nothing is deleted.

### 4e. Tests

**Two suite lists:**

- Split `scripts/run-e2e.mjs` into `REQUIRED` and `LEGACY`.
- `npm run e2e` runs `REQUIRED`. Add `"e2e:legacy": "node scripts/run-e2e.mjs --legacy"`, which runs `LEGACY` with the env `LEGACY=1`.
- In `e2e-lib.mjs` `openPage`, when `process.env.LEGACY === '1'`, append `legacy=1` to the params, the same way `gfx=min` is appended.

**Classification:**

- A suite goes in `LEGACY` only if everything it tests is parked. Expected: `e2e-progression`, `e2e-cosmetics`, `e2e-clear`. Verify each.
- Mixed suites stay in `REQUIRED`:
  - `e2e-modes` (ragdolls, enemy types)
  - `e2e-coop` (PvP sections)
  - `e2e-missions` (the Hunter alarm part)
  - `e2e-desktop`, `e2e-pad`, `e2e-touch`
- In mixed suites:
  - Parts reached through `autostart` keep working unchanged.
  - Parts that navigate menus to parked content open their page with `legacy=1` in the params.

**Menu-walking suites** (`e2e-pad`, `e2e-touch`, `e2e-mouse`, `e2e-desktop`, `e2e-progression`) are updated to the new legacy-off menus. This is an expected change, not a behaviour change. Keep their legacy-on checks by opening a page with `legacy=1` where the parked screens were checked.

**Report** the final classification of every suite.

**Commit:** `Phase 0: park legacy modes and economy behind ?legacy=1`. Push.

---

## Step 5 - Version, docs, final verification

### 5a. Version and changelog

- `package.json` version `3.5.0`.
- `CHANGELOG.md` gets `## 3.5.0 - Chaos Theory foundation`, with bullets for:
  - the integration (Exchange paper design and split jump fix in; old Exchange blockout out; `master` 3.4.0 in)
  - the design bible
  - the docs restructure (with sizes)
  - the `?legacy=1` flag and what it hides
  - the e2e split

### 5b. `TESTING.md` - add "3.5.0 manual check" for Michael

**On the iPhone, at the `/ct/` preview:**

- [ ] The Play menu shows only Infiltration, Training and Free Roam.
- [ ] Free Roam on the Warehouse and the Proving Grounds loads and runs smoothly.
- [ ] The CT moves work by touch: split jump (including jumping out of it), wall jump, rappel, pipes, the speed rocker.
- [ ] Settings > Display > Phone check. Run it and send the feedback note.
- [ ] The Loadout screen shows weapons, attachments, gadget and presets only; everything is selectable.

**On desktop:**

- [ ] Same menu checks.
- [ ] `?legacy=1` brings back Wave, Hunter, Mission, PvP and the Loadout economy.

**Co-op (two devices):** Infiltration on the Warehouse; Free Roam on the Warehouse with boost and human ladder where it offers them.

### 5c. `docs/progress.md`

Mark Phase 0 done, with the Decisions, Measurements and Open issues sections filled.

### 5d. Final verification - all must pass

- `npm run check`
- `npm run build && npm run e2e` (required suites)
- Performance: the test path (`node scripts/perf.mjs --budget`) and the phone path, from `docs/systems/performance.md`. Compare against the Step 1 baselines.

`npm run e2e:legacy` is report only: list any failures as open issues, but do not fix parked features.

**Commit:** `3.5.0: Chaos Theory foundation`. Push `ct-movement`.

### 5e. Final report

Post it in chat and in `docs/progress.md`, using bible Appendix B. Include:

- the sizes of `CLAUDE.md`, `CHANGELOG.md` and `TESTING.md` before and after
- the list of `docs/systems/` files
- the suite classification
- every Decision
- the test and performance results
- Open issues
- the line: "Next: Phase 1 spec (Light parity) to be written by Opus."

Then **STOP**.
