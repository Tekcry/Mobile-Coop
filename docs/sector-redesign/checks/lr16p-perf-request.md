# LR16-P laptop perf: the queued requests (Sector Ops Build, 2026-10-23)

Three `alone` requests on the `laptop-queue` branch (status context `laptop-e2e/alone-<set>`; the step logs are the result:
`C:/NightShift/scratch/laptop-queue/runs/<id>/step<N>.log` on the laptop; the cvp JSON files under
`C:/NightShift/scratch/work/<set>/`). What to measure: `checks/lr16p-build.md` "Laptop perf request" and `briefs/LR16-P.md`.

| Run | Request id | sha | set | Steps |
| --- | --- | --- | --- | --- |
| A1 + A2 | `20261023T180826-night-shift-sector-o-1c22b913-029c` | 1c22b9136cfc768490e228b617217c17f57cb934 | lr16p-perf-a | 31 |
| C' | `20261023T180831-night-shift-sector-o-2798e57d-a3ca` | 2798e57df4afebf468a1814ea7ad96f77efd7118 (lr16pol-cf) | lr16p-perf-c | 18 |
| D | `20261023T180836-night-shift-sector-o-3306bdf5-f7f2` | 3306bdf528d0ef21611dd6df4021c9dcb963881c (lr16p) | lr16p-perf-d | 18 |

(D is 3306bdf5 as ordered; `lr16p-build.md` still names 79d2e9b9 in its table.) Requester "Night Shift | Sector Ops Build".
Env on every request: `CVP_ONLY=guards`, `CVP_VIEWS=start,s5-worst` (as the Test Runner's lr16tri requests). The service sets
`E2E_PORT` (4189, the first slot; an alone request holds both slots) and `E2E_GPU=1`; steps run through `cmd.exe`
(`spawn(line, {shell: true})`) in `C:/NightShift/Mobile-Coop-testrun-4189` after `npm run build` at the sha. A step that
exits non-zero is counted but the rest still run.

## How the cells are made (two sources; per tier Epic = `CVP_GFX=epic` / `--desktop`, Medium = `CVP_GFX=medium` / `--preset=medium`)

1. **View harness, both views, 3 samples per tier**: the Test Runner's `C:/NightShift/scratch/work/campus-view-perf2.mjs`
   (laptop scratch; copied to `scripts/_cvp.mjs`), the same file and call shape as the lr16tri A/B (f8008542 and 273539ec,
   both `3/3 steps ok`): `set CVP_GFX=<tier>&& node scripts/_cvp.mjs <out>.json`. It serves and launches itself (no serve
   step in the lr16tri requests). It gives start (S1, 8 guards) and S5-worst (-50.25, 3.0, 62.25) facing 158 with 24
   guards: CPU p95 / median, GPU p95, draws (the numbers the brief quotes). Output JSON:
   `C:/NightShift/scratch/work/<set>/<run>-<tier>-<n>.json`.
2. **perf.mjs, start view only, 3 samples per tier**: `scripts/perf.mjs` is the same blob (2a86dbdf) on all four shas and
   on f8008542, and it has no view option (no position, yaw or guard count; MODE=sector uses the map's own guards), so the
   S5-worst cell cannot come from it. Fetched as `git show f8008542:scripts/perf.mjs > scripts/_perf-ab.mjs`, then
   patched to `scripts/_perf-probe.mjs` (step 3: a base64 node script that inserts, before the final `browser.close()`,
   one `PROBE {...}` line; it prints `PATCH FAIL` and exits 1 if its anchor is missing). It needs a server: `lq-serve.mjs` =
   master's `scripts/laptop-queue/serve.mjs` (blob 1dea4a4c via `git show`; none of the four shas has
   `scripts/laptop-queue/`; it serves the slot's `dist/` with `vite preview` on `E2E_PORT`, runs the script, stops).
   Command:
   `set MAP=campusOps&& set MODE=sector&& set PASSES=1&& node lq-serve.mjs scripts/_perf-probe.mjs http://127.0.0.1:%E2E_PORT%/ --desktop`
   (`--preset=medium` for Medium; A2 adds `set EXTRA=falloff=photo&& `). Text output (no `--json`, so `PASSES=1` prints
   draws per pass).

URL (perf.mjs): `...autostart=campusOps&mode=sector&debug=1&gfx=epic` (Epic) / `&gfx=medium`, A2 with `&falloff=photo`
appended; render size 640 x 360 (the `--desktop` viewport). The PROBE line prints the real `location.href` and
`engine.getRenderWidth() x getRenderHeight()`.

## What each log holds

- perf.mjs cell log: `CPU per frame @120 Hz ... p50 .. p95 .. p99` (sim only, no render); `main thread (sim p95 + render JS)`;
  `draw calls (every pass): N` (hooked `drawElementsType` / `drawArraysType`, all passes) and, with `PASSES=1`,
  `per pass: <target> <draws>, ...` (main pass vs slot / torch maps); `triangles`; `rendered frames: display <Hz> Hz,
  interval p50 p95 p99 ms, cpu p50 .. p95 ..` (cpu = the render frame's CPU; interval p95 = frame pacing, there is NO GPU
  time here); then
  `PROBE {"url":..,"size":"WxH","drawsAllPass":N,"drawsSamples":[9 per-frame deltas of engine._drawCalls.current],"charShadows":[{lamp,ready,casters,every}..],"torchShadows":[{id,ready,casters,every}..]|null}`.
  `charShadows` = `world.charShadows.stats()` (slot casters = `casters`); `torchShadows` = `world.torchShadows.stats()`, null on
  1c22b913 (the class is not there yet; A cells carry null by design).
- cvp cell log: whatever campus-view-perf2.mjs prints per view (start, s5-worst); its JSON file holds the same.
- The harness introspection step (7 in A, 6 in C' / D) prints `CVP env vars: ...` and `CVP> <line>` for the harness's env
  var names and the lines that mention falloff / EXTRA / draws / casters / viewport / autostart / sectorGuards, so the Test
  Runner can read what the harness records and which URL it builds (no measurement).
- Statuses: `laptop-e2e/alone-lr16p-perf-a|c|d` "N/N steps ok, <s> s". Expect 31/31 (A), 18/18 (C', D).

## Step map

Request A (`lr16p-perf-a`): 1 `git show 1dea4a4c > lq-serve.mjs`; 2 perf.mjs copy; 3 perf probe patch; 4 mkdir
`C:/NightShift/scratch/work/lr16p-perf-a`; 5 harness copy; 6 `_cvp_photo.mjs` (the A2 harness: every `autostart=` in the
copy becomes `falloff=photo&autostart=`; prints `patched ... occurrences N`, or `PATCH FAIL` and exit 1); 7 harness
introspection. Cells: 8-10 A1 Epic cvp, 11-13 A1 Medium cvp, 14-16 A1 Epic perf.mjs, 17-19 A1 Medium perf.mjs,
20-22 A2 Epic cvp (`_cvp_photo.mjs`), 23-25 A2 Medium cvp, 26-28 A2 Epic perf.mjs (EXTRA), 29-31 A2 Medium perf.mjs.

Requests C' / D: 1 serve copy; 2 perf copy; 3 perf patch; 4 mkdir `.../lr16p-perf-c` or `-d`; 5 harness copy; 6
introspection; 7-9 Epic cvp, 10-12 Medium cvp, 13-15 Epic perf.mjs, 16-18 Medium perf.mjs.
Output files `<c|d>-<tier>-<n>.json`; A: `a1-` / `a2-`.

## Gaps (not set up, or not verifiable from the desktop)

1. **S5-worst: only through the laptop harness.** perf.mjs cannot select it on any sha (identical blob, no view option), so
   the S5 cells (and the 24-guard count) rest on campus-view-perf2.mjs. It is laptop scratch (`C:/NightShift/scratch/work/`
   does not exist on the desktop), so I could not read it. Assumed from the lr16tri requests: the argument is its output
   file (a per-sha path there), one sample per invocation, `CVP_GFX` selects the tier, no server step needed, `E2E_PORT`
   honoured. A wrong assumption shows as a failed or odd step, not as a wrong number.
2. **Casters, all-pass draws, URL and render size for S5-worst**: nothing I can add without the harness source (PROBE only
   runs in the perf.mjs start cell). If the harness does not print them they stay open for S5; the introspection step shows
   whether it does. A follow-up probe on the S5 view needs that source.
3. **GPU p95**: only the harness gives it; perf.mjs has the frame-interval p95 (pacing) only.
4. **A2 in the harness** relies on `autostart=` appearing literally in campus-view-perf2.mjs (it builds the URL like
   perf.mjs). The step prints the occurrence count or `PATCH FAIL`; on `PATCH FAIL` the A2 cvp steps fail (file missing)
   and A2 start is still covered by perf.mjs (`EXTRA=falloff=photo`; the PROBE `url` shows `falloff=photo`). If the
   harness already reads `EXTRA` or a URL env, the patch is redundant, not harmful.
5. CPU p95 differs by source: perf.mjs `cpu120` is the sim at a simulated 120 Hz (no render); `rendered ... cpu p95` is the
   render frame's CPU; the harness's CPU p95 is its own definition (the brief's 4.5 / 5.0 / 6.4 / 7.6 series). Compare cvp
   with cvp across A1 / A2 / C' / D; do not mix sources.
6. Time: roughly 30 min for A, 15-20 min each for C' and D (the lr16tri pair ran 125-152 s for two harness calls). The
   three hold both slots; the service takes them one after another.
7. The files the steps drop into the slot worktree (`lq-serve.mjs`, `scripts/_perf-*.mjs`, `scripts/_cvp*.mjs`) are
   untracked and removed by the next run's `git clean`.
