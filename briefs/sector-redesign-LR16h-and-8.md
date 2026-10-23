status: claimed Night Shift | Cloud Builder 1 2026-10-23T08:44Z

Lead note (Sector Ops Build ~20:40): build PART 1 ONLY (the docs edit table) from feature/sector-redesign-lr16int @ f8008542; new branch feature/sector-redesign-lr16h. coop.md:24,34 and TESTING.md:49 are already fixed at f8008542 - skip those rows. Part 2 is the lead's laptop request text: do not act on it. No tests needed beyond a grep that no doc names the removed Lamp falloff setting / Classic path.

# LR16h docs (Haiku) + LR16-8 showcase sheets request (Test Runner)

Planner: Opus 5.5, 2026-10-23. Part 1 is a cloud docs slice. Part 2 is NOT for a cloud builder: it is the request text
the lead pastes to "Night Shift | Test Runner" once the LR16 train branch exists.

## Goal (Michael's words)
- ~18:12: "Disable returning to original lighting system, focus on only the one new system".
- ~18:15: "I want to make sure we emphasis the light/shadow system like chaos theory did, like a showcase no matter
  where you look."

## Part 1 - LR16h docs and chores (Haiku)
### Base and branch
- Base: `feature/sector-redesign-lr16int` @ c7a26ca7 (rebase onto the merged LR16 head before the PR only if the lead
  asks). New branch: `feature/sector-redesign-lr16h`.
- Cloud build: docs plus one script line; run `npx tsc --noEmit` (unchanged) and nothing else.

### Edits (only these files, only these lines; file:line at c7a26ca7)
| File:line | Now | Write |
|---|---|---|
| `TESTING.md:49-50` | "Lamp falloff (LR13, test): Settings > Gameplay > Lamp falloff > Realistic ... back to Classic" | One item: "Lighting (LR16): start Sector Ops: lamp edges soft on walls and floors, a hard edge only where something cuts the light near the surface; the meter agrees with what you see; a guard torch stops at walls and shut doors." |
| `docs/systems/coop.md:24` | "38: the host's lamp falloff ... `start.lf` ... `NetSession.hostLampFalloff`, `StartInfo.lampFalloff`, `GameOptions.lampFalloff`" | "38: was the host's lamp falloff `start.lf` (LR13); removed in LR16a (one light model), an old `lf` is ignored; the number is reassigned at the train build." Keep the rest of the line. |
| `docs/systems/coop.md:34` | "`start` also the host's lamp falloff `lf` (38, LR13)." | delete that clause |
| `docs/systems/lighting.md:30-50` | names the Classic mode as removed (LR16a) | keep one paragraph naming the one model: photometric falloff with the smooth near term and feathered cone (LR16b, `lampMath.ts`), contact-hardening penumbra in the bake (LR16e), one-bounce fill in the ambient grid's G channel (LR16-1), torch shadow atlas (LR16t), character shadows on every tier (LR16-7 / LR16f / LR16-3). One line per item, file names only (no line numbers: they move). Drop the history sentences about Classic. |
| `docs/systems/ui.md:53-55` | Settings > Gameplay > "Lamp falloff" | delete the item (Character shadows Auto / On / Off stays where it is) |
| `docs/systems/testing-tools.md:323-324` | "## Lamp falloff (lightrev LR13)", `E2E_FALLOFF=photo` | delete the section |
| `docs/lighting-review/PROPOSAL.md` | sections 7.x describe LR13's toggle | append "## 8. LR16 (2026-10-23): one light model" with 5 lines: Michael's ~18:08 / ~18:12 quotes, the toggle and Classic removed (LR16a), what LR16b / e / 1 / t / g changed, pointer to `docs/sector-redesign/checks/lr16-plan.md`. Do not rewrite 7.x (history). |
| `scripts/lamp-audit.mjs:34` | `lampMath.setLampFalloff?.('photometric');` | delete the line (the function no longer exists; the audit already runs the one model) |
| `changes/feature-sector-redesign-lr16.md` | the LR16 fragment | add one bullet: "Docs name one light model (no Lamp falloff setting)." |
Before writing, grep `-i "lampFalloff\|lamp falloff\|classic\|falloff=photo\|E2E_FALLOFF"` over `docs/systems`,
`TESTING.md`, `docs/level-design.md`, `scripts/*.mjs` and list any other hit in the report (do not edit hits under
`docs/archive`, `docs/sector-redesign/checks`, or `lampFalloff(` function calls: that is the flashlight's linear
falloff, still used).

### Acceptance
The grep above returns only history files, `lampFalloff(` calls and `scripts/e2e-menus.mjs:672-680` (it asserts the row
is gone). `npx tsc --noEmit` clean. Report: `docs/sector-redesign/checks/lr16h-build.md` (files, the grep before /
after).

### Do NOT touch
Any `src/` file, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/sector-redesign/STATE.md` / `PLAN.md`.

### Model
Haiku 5.5. ~0.25 window.

## Part 2 - LR16-8 showcase sheets: request text for Test Runner (laptop, GPU, port 4189)
Send after the LR16 train branch has LR16t, e, 1 and g merged (the lead fills `<branch>` and `<sha>`). Paste as is:

```
Night Shift | Test Runner - LR16-8 showcase sheets (GPU, port 4189, E2E_GPU=1, the GPU slot alone; heavy.lock)
Branch <branch> @ <sha>. `npm ci` only if package-lock.json changed; `npm run build`; free 4189 before and after.
Settings: default graphics on the laptop (Auto), then Epic for the starred shots. Realistic is the only model.
Maps: campusOps Workshop + S1..S5 (6 sectors), warehouseOps, ctcourse, warehouse, proving, kestrel.
Ten shots per sector / map (110 total), named <map>-<sector>-<nn>.png, into scratch/lighting/lr16-8/:
 1-3. 4-way spin from 3 fixed spots per sector (N/E/S/W into one 2x2 sheet per spot): every frame holds a lit pool and
      a readable dark. Mark any frame with no pool or no dark.
 4. Wall behind a lamp (the old arc spot) and the ceiling above it: soft gradient, ceiling not black (bounce).
 5. A character at 1 m and 4 m from the nearest lamp*: shape shadow, sharp feet, soft head.
 6. Crate / rack contact shadow, and an open door leaf under a lamp: sharp at contact, soft with distance.
 7. Guard torch*: behind a wall, behind a shut door, round a corner; then 4 torches on at once: nothing through walls,
    soft beam rim.
 8. Shoot a lamp, then switch its group off: pool AND wall / ceiling glow go, meter drops (screenshot + meter value).
 9. Night vision and thermal in the sector's darkest room (thermal ghost through a shut door).
10. Partner beacon read: co-op pair (two pages), player B stands in the sector's darkest spot, player A 20 m away:
    is B's goggle beacon readable at 20 m? Yes / no + crop.
Also per map: meter vs shader readback at 5 seeded points (the parity probe, |diff| < 0.02), bake time and atlas MB
at epic and low, frame time p95 on campus S2 and S5-worst (24 guards).
Reply with one message: per map pass / flag list (shot number + one line), the probe table, the perf numbers, and the
sheet folder path.
```
Darkest spot per map: from `docs/sector-redesign/checks/lr16-lamp-audit.md` (the LR16-2 framing table: the view with
the highest dark share in each sector); the lead adds the coordinates under each map in the request if known.
