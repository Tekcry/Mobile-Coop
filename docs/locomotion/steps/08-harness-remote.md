# Step 08 - anim-audit harness, remote poses; joins run-e2e (report only); baseline

Block B. Deps: 07. Bible 5.12.2.11 (`docs/design-bible.md:857-859`), 5.17 D2 (:1258 "local and remote"), D8 (:1317); RULES Step loop.

## Model
Implementer: opus. Checker: opus (network measurement). (all subagents opus from step 06, Michael 2026-10-13)

## Read
- scripts/anim-audit.mjs and src/anim/audit/*.ts (as built in 07); docs/locomotion/AUDIT.md section 4 (:214-245) and Baselines (:7-10).
- scripts/e2e-netmove.mjs:20-80 (`localJoints`, `remoteJoints`, `compare`), :96-106 (`reset`), :109-135 (host / join / `startMode`).
- scripts/e2e-lib.mjs:83-110 (`launch`, `openPage`), :128-150 (`window.__pad`).
- src/net/coopHost.ts:35-40 (`INTERP_DELAY` 0.1 s), :430-440 (snapshot buffer, `performance.now()`), :1008-1016 (interpolation clock).
- src/net/remoteAvatar.ts:195-300 (remote rig input); scripts/run-e2e.mjs:1-120 (REQUIRED, KNOWN_FLAKY, quick map, `SCRIPT` regex).
- docs/locomotion/PC-PASS.md; docs/systems/testing-tools.md (e2e-netmove and anim-audit rows).

## Task
1. Move the lobby helpers out of e2e-netmove into `scripts/e2e-net-lib.mjs`: `until`, `hostAndJoin(url, n = 2)` (returns pages A, B),
   `startMode(mode, map)`, `localJoints`, `remoteJoints`, `allowTeleport`. e2e-netmove imports them; its checks and tolerances are
   unchanged (rerun it to prove it).
2. anim-audit.mjs `--remote` (and the default full run = local + remote): host A and client B over `?net=local`, sandbox on 'proving'.
   B (client) moves with scripted input in real time (B's loop not manual: snapshots are timed by `performance.now()`); A records its copy
   of B (`net.remotes.values().next().value.avatar.rig`) every rendered frame through a page-side rAF recorder with measured dt.
   `A.bringToFront()` while recording (a background page's frames are throttled).
3. Same record layout and the same metric functions as local (07); limits that scale with dt use the measured dt per frame.
4. Remote 120 Hz: drive A with `loop.manual = true` and a page-side frame pump (`setInterval` 8 ms calling `hooks.beforeFrame` /
   `frameUpdate`, fixed steps via `stepHeadless(1/60)` when 1/60 s of real time has passed). If the pump's dt p95 jitter is over 2 ms,
   record the 120 Hz remote rows as "pending PC" in PC-PASS.md with the command, and keep the 60 Hz rows.
5. Remote scenarios (sampled; real time): flat stand 2 / 4 / 6 and crouch 3; stairs stand 3; 20.4 deg ramp stand 3; stop + 1.5 s idle;
   stand -> crouch -> stand; one brace + boost (paired move: host-side alignment <= 3 cm at contact, bodies <= 3 cm interpenetration).
6. Remote-only metrics: pose error vs the owner's own pose at matched timestamps (B's joints, `INTERP_DELAY` shifted), worst <= 10 cm
   (e2e-netmove limit); pops = frames where a joint jumps more than the continuity limit (rubber-banding; RULES: fails the step from 09 on).
7. Output `<out>/remote.json` and remote lines in `<out>/fails.txt` (tag `remote`, frame numbers in A's frames).
8. run-e2e.mjs: new `REPORT = ['anim-audit']` list: runs in `npm run e2e`, results printed as REPORT ONLY, never fails the run (becomes
   REQUIRED at step 32). Extend `SCRIPT` (:68) to `^scripts\/(smoke|anim-audit|e2e-[\w-]+)\.mjs$`. Quick map: 'src/anim/', 'src/player/'
   and 'src/net/' add 'anim-audit'; run-e2e passes `--quick` to it in a quick run. Add it to e2e-times.json.
9. Runtime: full local + remote under 4 min on software GL (local ~3 min budget from 07, remote <= 60 s plus lobby); print both.
10. Committed baseline: `docs/locomotion/audit/anim-baseline.json` (worst value per scenario x metric, local and remote) and
    `--compare=<file>`: prints regressions (worse by > 10% or a new fail). Steps 21-31 run `--compare` and must show no regression.
11. AUDIT.md section 4: fill the baseline column with today's local and remote worst values (60 / 120 Hz, which scenario), and replace
    "Animation harness baseline: pending Block B" (:10) with the summary (fail count local / remote, runtime).
12. docs/systems/testing-tools.md: anim-audit row (local, remote, quick, compare, report-only status); coop.md: one line on remote audit.
13. STATE.md "Next action" untouched (the orchestrator updates it); LOG.md entry by the orchestrator after commit.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-netmove.mjs` (unchanged results after the helper move, worst <= 10 cm);
  `node scripts/e2e-coop.mjs`; `node scripts/anim-audit.mjs` (local + remote, JSON + fail list, < 4 min); `node scripts/anim-audit.mjs
  --compare=docs/locomotion/audit/anim-baseline.json` prints no regression against itself.
- `node scripts/run-e2e.mjs anim-audit` shows REPORT ONLY and exits 0 even with metric fails.
- Co-op check (PLAN): remote metrics recorded in AUDIT.md section 4 for every remote scenario.
- No perf, visual or contact-sheet claims; `--shots` and any pending 120 Hz remote rows listed in PC-PASS.md.

## Commit
`locomotion 08: anim-audit on ?net=local remote poses, report-only suite in run-e2e, baseline in AUDIT.md`

## Numbers
- Remote limits = local limits (bible :858 "Remote poses obey the same continuity limits"); paired moves <= 3 cm (:859).
- Pose error limit 10 cm (e2e-netmove.mjs:43 `compare` tol 0.1); netmove worst today 3.7 cm (STATE.md, low peek; gone with cover in 05),
  non-cover worst 1.1 cm (split aim). Interpolation delay 0.1 s (coopHost.ts:37).
- Harness budget: <= 240 s total (local <= 180 s, remote <= 60 s); `--quick` <= 60 s.

## Carried from step 07 checks
- Find the wall-clock leak between scenarios (something advances outside stepHeadless between page.evaluate calls: render loop, rAF or timers); freeze / reset it per scenario; two full runs with zero flips before taking the baseline.
- --compare tolerances: continuous metrics max(1e-4 m, 2%); gait angles 0.5 deg; wrist 2 deg; durations 1 frame; grip / self-clip 0.5 cm; traversal and drop scenarios (vault, mantle, drop09, drop24, turn180) joint rate 25 deg, selfWeapon / grip 1.5 cm (or excluded until the leak is fixed); any pass / fail flip is flagged; compare like modes only (--only and --quick are not comparable with full runs).
- AUDIT.md: the corner sole model overstates steep toe-down sinks by ~1.5 cm (boot is rounded, partLibrary.ts ~157); slope35 sinks are toe sinks. raiseTime 0.225 s at 120 Hz may need the F4 sim-step rounding.
- Record the real rig findings listed in steps/07-fixes-r1.md and 07-fixes-r2.md in AUDIT.md section 4.
- Stairs: step boxes are collide=false; collision is a 20.4 deg ramp slab through the back corner of each tread (levelBuilder.ts ~181-193), so feet-on-treads (D5.10) is measured against the visual tread tops computed from the stairs geometry (A36), not the collision ray. Record in AUDIT.md: planted feet are not pitched to slopes (toe sink 7.8 cm at 20.4 deg, 14.75 cm at 35 deg; footPlanner.ts ~140, ~453 set pitch 0).
