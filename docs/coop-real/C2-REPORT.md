# coop-real - C2 REPORT (part 3, R7)

Builder: Opus, 2026-10-25. Branch `feature/coop-real-c2` (off feature/coop-real 92edc3e5). File: new
`scripts/e2e-coop-real/part3.mjs` (no lib / part1 / part2 / sweep edits). Registered already (H2b): `run-e2e.mjs` PARTS
`e2e-coop-real: ['1','2','3']`, `e2e-times.json` `e2e-coop-real:3` 120; `node scripts/run-e2e.mjs --list` prints `:3`.
`BOOT = { netdrop: 8, realBackground: true }` (A6, A7).

## What each case checks
| Case | Input / page life | Asserts |
| --- | --- | --- |
| route | host (kbm) opens the lounge door, crouches on the striped mark and offers (F); client (pad) takes the leg-up (RB), climbs (Y), lowers into a hang on the yard face (B held), lets go (B), Unbolt + Open door on the wicket; host through; host opens L1-near; both on L1's pad; host opens L1-far; both crouched into A2 (host to 39.2, 12.5, client to 31, 10.4) | leg-up hang on the apron-face lip; yard-face hang; landed in the yard; Unbolt opens `g-a1-wicket` on the host; each door row opens its door on the host in 3 s; L1 cycles (bay 1, checkpoint L1); before any drop: checkpoint L1, host > 10 m past x 28, A2 set restarts unchanged |
| B1 hidden 5 s | `spoofHidden` + window minimized 5 s (< netdrop 8), restore | in play before; the hide opened the co-op pause menu and B closes it; same session (client player and transport ids, host never lost the remote in 400 ms polls); position kept <= 0.5 m; walks 2 m by stick, host copy <= 0.5 m |
| B2 frozen | `Debugger.pause` on the client, host walks on 2.8 m (to 42, 12.5), 10.5 s wall (netdrop + 2.5), `Debugger.resume` | setup: the host dropped the client; then the placed checks |
| B3 reload | reload without autostart (`?net=local&netsim=typical&netdrop=8`), title / brightness by pad, "Rejoin <code>" by pad | setup: the row reads `Rejoin [A-Z0-9]{5}`; back in the match; then the placed checks |
| B4 new tab | tab closed, new tab without autostart, Co-op > Join with code > the on-screen keyboard by D-pad + A, Start | setup: the code typed equals the host's room code; in the match; then the placed checks |
| placed checks (B2-B4) | - | placed inside L1 (the checkpoint's slots; L1 has no `spawns`, so slot 1 is a spot beside its middle) or <= 3 m from the host within 30 s; > 10 m from the lounge spawns; the host runs the client again; the hash's `d.*` and `lamps` equal on both pages within 5 host s; 2 m walk by stick with the host copy <= 0.5 m; a client "Open door" / "Close door" row on L1-far moves the host's door target in 3 s |

Assert texts start with `route:` / `B1:` ... `B4:` (setup ones `B2 setup:` etc.), so M1's `knownBug` `expect` regexes
can name one assert. No marks set here (M1's job after run 1). B2-B4 are skipped (one fail line each) when the route
failed, since there is no L1 checkpoint to rejoin at; B1 runs regardless.

## B1 / B2 picks (probe 2, H1-REPORT "Lifecycle probe")
- B1 = window minimized + `spoofHidden`: the only mechanism with rAF stopped and timers alive is the minimized window,
  which still reads `visible`; the spoof adds `hidden` and `visibilitychange` (pause menu, bgTick sim). Both tabs share
  the window, so the host's rAF stalls too and the pump steps it (allowed: it stands for a visible host window).
- B2 = `Debugger.pause`: the only row with rAF, timers, worker, channel and bgTick all 0. CDP `frozen` is ignored by
  headless (also minimized). While paused the client is never read; `setSimPages([A])` for the window, then both again.

## lib changes wanted (local helpers in part3.mjs, for the lead to move)
- `windowState(P, 'minimized' | 'normal')`: CDP `Browser.getWindowForTarget` + `Browser.setWindowBounds` (probe.mjs has
  the same code inline).
- `hideReal(P)` -> restore: `spoofHidden(P, true)` + minimized; restore = normal + `spoofHidden(P, false)` (replaces
  `hideBehind`, a no-op headless).
- `freeze(P)` -> resume: `Debugger.enable` + `Debugger.pause`; resume = `Debugger.resume` + `Debugger.disable`
  (replaces `lifecycle(P, 'frozen')`, ignored headless). It should also do the `setSimPages([A])` / back dance, since
  lib's `until` / `waitSim` read every clock page and block on a paused one.
- `setCrouch(P, who, on)`: crouch press until the controller shows it (toggle default).
- `toMainMenu(P, who)`: past the title (one press, then wait out `ts-seq`) and the first-run brightness screen to the
  main menu; `reloadClient` / `reopenClient` with `menu: true` land on the title, not the menu, under `hideAutomation`
  (main.ts:174: the title shows whenever `navigator.webdriver` is false).
- `menuPick(P, who, css)`: `menuFocus` + confirm.
- `oskType(P, who, code)`: the join screen's on-screen keyboard by D-pad (steps by key rects) + A, then Start.
- `reloadClient` / `reopenClient`: optionally return the wall time the page was back, for the 30 s placement window.

## Wall time
Not measured (no run, below). Estimate: boot 20-25 s, route ~60 s, B1 ~15 s, B2 ~25-45 s, B3 / B4 ~30-60 s each: well
over 120 s. PLAN: "Part 3 over 120 s: B4 moves to a part 4". `run(h)` is one function today; the split is mechanical
(export `toA2` and the B4 step, a part4.mjs that boots, runs `toA2`, then B4). Likely B3 also has to move.

## Local run
Not run: the desktop's `C:/NightShift/heavy2.lock` was held by the laptop-queue (guard-ai run 49b2b05b) and the
worktree has no `dist/` build. Untested paths the first run decides: the leg-up / climb / lower by input (the
ctcourse e2e teleports for these), the client's Unbolt from (13.2, 11), the L1 cycle by walking, A2 spot-fail while
crouched, the title / brightness press path, the OSK D-pad stepping. Static: `node --check` passes; no `.evaluate(`,
`stepHeadless`, teleport, `onUse` or e2e-ctcourse import in part3.mjs (`typecheck:fast` does not cover `scripts/`).
