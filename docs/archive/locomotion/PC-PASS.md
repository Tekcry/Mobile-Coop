# PC pass (Michael's PC, E2E_GPU=1)
n**M21 (2026-10-17): desktop only.** Every phone, touch and `--phone` item below is dropped (not run, not a pass condition). L2 / L3 run `--budget` and `--desktop --budget` only.

One ordered checklist for everything built in locomotion steps 01-14 (BRIEF section 7.3). Run top to bottom. Every
result here is pending a hardware-GPU run: cloud sessions never claim these results. Any contact sheet or screenshot
made in the cloud (software GL, SwiftShader) is PROVISIONAL: pose shape only, never a look, perf or contact pass.
Steps 15 onward add nothing here yet.

Conventions:
- Commands are bash (Git Bash on Windows), run from the repo root. Output PNGs go to `pc/` (make it once: `mkdir -p pc`).
- "Watch" in a suite means a headed debug run: prefix the suite with `E2E_HEADED=1` (single suite only, never under
  `run-e2e`); the window is parked off-screen at -32000,-32000, so drag it on-screen. The suite's numbers gate; the
  look is the PC check.
- `anim-audit --shots` writes a PNG only at the first failing frame of a failing scenario: a passing scenario gives no
  picture, so look items always name a sheet or a shot as well where one exists.
- Contact-sheet views: `side`, `front`, `ots` (BRIEF 7.3); `back` where noted.

## 0. Target laptop pass (M7: run on the RTX 4090 laptop only, budgets first)

Every `perf.mjs --budget` run (any profile) runs here, never on the secondary desktop. The desktop appends each
pending budget run (block ends, steps that touch anim / camera / vfx / render) to this list.

| # | Item | When | Status |
| --- | --- | --- | --- |
| L1 | PC-PASS items 4-8 (section 2) | Block D laptop check, then again before step 34 | pending target laptop |
| L2 | Block C end budgets: `--budget`, `--phone --budget` | Block D laptop check | pending target laptop |
| L3 | Block D end budgets: `--budget`, `--phone --budget`, `--desktop --budget` (D4: 0.04 ms per character anim, remotes too) | Block D laptop check | pending target laptop |
| L5 | Ray-traced checks (M8): `E2E_GPU=1 node scripts/e2e-desktop.mjs $URL` including "ray traced + TAAU + Panini" (the desktop GPU has no ray tracing; it fails there by design) | Block D laptop check | pending target laptop |
| L4 | Re-baseline perf-trend and the anim audit on the laptop; compare with the desktop baselines | Before step 34 | pending target laptop |

## 1. Setup

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 1 | Machine and browser: the RTX 4090 laptop on mains power, Windows; Chromium with the hardware GPU (ANGLE D3D11, GPU blocklist ignored), headless with a faked pointer lock. Use the preinstalled Chromium or playwright-core's own | `npx playwright-core install chromium` (only if no Chromium is installed; or set `E2E_BROWSER`) | The first GPU command below prints a hardware renderer, not SwiftShader | - |
| 2 | Clean install and build on the `feature/ct-locomotion` head | `git checkout feature/ct-locomotion && git pull && npm ci && npm run build` | Build passes (typecheck + `dist/`) | - |
| 3 | GPU flag and server: keep a preview of `dist/` up for `shot.mjs`, `anim-sheet.mjs`, `perf.mjs` and the single suites (`run-e2e` and `anim-audit` serve their own when none is up). Serve on 127.0.0.1 (`localhost` can resolve to a blocked `::1` behind a VPN adapter) | Terminal 2: `npx vite preview --port 4173 --strictPort --host 127.0.0.1`. Terminal 1: `export E2E_GPU=1 URL=http://127.0.0.1:4173/ && mkdir -p pc` | `curl -s $URL` returns the page; every command below still writes `E2E_GPU=1` explicitly | - |

## 2. Perf budgets (first)

Local profile (`LOCAL_BUDGET` in `scripts/perf.mjs`, docs/systems/performance.md): no machine-speed scaling, main
thread and frame pacing enforced. D4: animation <= 0.04 ms per character holds for remotes too.

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 4 | Test-path budget (`?gfx=min`, Warehouse, 10 enemies) after steps 01-14 | `E2E_GPU=1 node scripts/perf.mjs $URL --budget` | Local profile: sim p95 <= 1.1 ms, animation <= 0.03 ms per character, main thread <= 3.6 ms, frame pacing <= 1.15x; draws <= 55, triangles <= 0.2 M, allocations <= 11.5 MB/s. Exits 0 | 01-14 |
| 5 | Phone-look budget (the real phone light look, vision off) | `E2E_GPU=1 node scripts/perf.mjs $URL --phone --budget` | Local phone profile: sim p95 <= 1.1 ms, animation <= 0.03 ms per character, main <= 3.4 ms, pacing <= 1.15x; draws / triangles / allocations at the script's phone limits (measured 3.5.0: ~30 draws). Exits 0 | 01-14 |
| 6 | Desktop Epic budget (step 14 put the thermal / electro branches into the cinematic pass) | `E2E_GPU=1 node scripts/perf.mjs $URL --desktop --budget` | Local Epic profile: sim p95 <= 2.9 ms, animation <= 0.075 ms per character, main <= 5.5 ms, pacing <= 1.2x; draws <= 520, triangles <= 1.7 M, allocations <= 11.5 MB/s | 14 |
| 7 | Phone frame budget with each vision mode on (night, thermal, electro; the thermal branch adds 4 texture taps to the existing pass, no new target). `perf.mjs` has no vision switch and no URL param sets the mode | No exact command. Partial: the in-game Settings > Graphics > Benchmark phone check runs "light look + night vision" (night only). Thermal and electro need a `perf.mjs` vision hook (not built in steps 01-14) | Phone budget (item 5) holds in every mode; thermal within 0.3 ms of night; add a Phone check line "each vision mode" to TESTING.md | 14 |
| 8 | Host per-remote anim cost on walls (step 12b fix r2): the host refreshes each wall-bound remote's posed head every render frame (`coopHost.frameUpdate` -> `rig.posedHead`, a neck-chain world-matrix refresh; the rig comment still says 4-10 Hz) and perception / the light meter read it. `perf.mjs` has no `?net=local` remotes | No exact command for the cost (needs a perf scenario with 3 `?net=local` clients on walls). The parity half: `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "wall edge: peek, lean, swat" and "wall edge open side and low side lean") | Remote anim <= 0.04 ms per character with 3 clients on walls (D4); the copy's head and the remote's light / exposure agree by eye (cloud: host head within ~0.5 cm of the owner at the peek, 0.953 m on a 1.00 m low wall both sides) | 12b (checker r2) |

## 3. Animation audit on the PC

The committed baseline `docs/locomotion/audit/anim-baseline.json` was cut on software GL in the cloud (undrawn remote
pages, 2-12 frames/s for drawn match scenes). The PC run draws the pages, so it gets its own banded baseline.

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 9 | Re-baseline, run 1 (local + remote, full) | `E2E_GPU=1 node scripts/anim-audit.mjs --out=test-results/aa-pc1` | Completes; prints the summary table and wall time | 07-08 |
| 10 | Re-baseline, run 2, banded on run 1 and compared with the cloud baseline | `E2E_GPU=1 node scripts/anim-audit.mjs --out=test-results/aa-pc2 --band=test-results/aa-pc1/baseline.json --compare=docs/locomotion/audit/anim-baseline.json` | Local rows: the same fails in both PC runs (local is deterministic; 0 flips). Any local metric that differs from the cloud baseline is listed for review (the cloud decides pass / fail; the PC only reports). Remote gated rows: a regression counts only if it reproduces on a rerun (A39). Keep `test-results/aa-pc2/baseline.json` as the PC baseline (`docs/locomotion/audit/anim-baseline-pc.json`) for steps 21-31 on this machine | 07-08 |
| 11 | Remote poses on the host (step 08): the host's copy of the client in every remote scenario (flat stand 2 / 4 / 6, crouch 3, stairs, ramp, stopidle, stance, strike, wall, walledge, wallopenL / R, walllowL, braceboost, doorpeek; 60 Hz and the 120 Hz pump rows). On the PC the pages draw, so the run also re-checks that drawing keeps both loops at the display rate | `E2E_GPU=1 E2E_HEADED=1 node scripts/anim-audit.mjs --remote --out=test-results/aa-pc-remote` (watch page A; compare `remote.json` with the cloud baseline) | Client and host loops near 60 fps; the 8 ms pump's p95 jitter <= 2 ms (cloud 0.6-1.4 ms); `lodSkip` 0 in every row (at a Detail scale under ~0.75 the 22 m LOD distance drops below 16 m: a `lodSkip` fail there is the setting, not the rig); remote feet, pelvis and the brace + boost hand-foot contact look as the cloud numbers say (no claim beyond them). Look past the first ~0.7 s after each placement (teleport recovery: head up to 41 cm low, feet up to 89 cm forward; stance@60, stand4@60, stand6@120) | 08 |
| 12 | Fail-frame shots, local player, full run: PNG at the first failing frame of every failing scenario (all gears, flat / stairs / slopes, 60 and 120 Hz, transitions). Must be a full run: `--only` runs start from a different state and give other numbers | `E2E_GPU=1 node scripts/anim-audit.mjs --local --shots --out=test-results/aa-pc-shots` | Shots match the fails in `test-results/aa-pc-shots/fails.txt` (numbers are decided in the cloud; the PC only adds the pictures) | 07 |
| 13 | Boot through the floor (checker 07 r2): planted-foot sink is read on the lowest sole corner (rigid foot, no toe bend). Crouch rear foot on its toes (pitch -49 to -69 deg) reads a 6.0-6.5 cm toe sink (rounded boot mesh, superellipsoid 2.6, goes ~4.5-6.6 cm under); 35 deg slope sprint touchdown reads 18 cm (toe pitched 20 deg down on the uphill slope, ankle 4 cm under the surface; against the slope under the toe ~30 cm) | Item 12's shots: fails `footSinkR` in `flat-crouch*`, `stance`, `slope35-stand6` | Toe / boot visibly under the floor at those frames confirms the cloud numbers; no visible sink means the sole model is wrong (report it) | 07 (checker r2) |
| 14 | Level foot on ramps and stairs (checker 07 r3): planted feet stay level (footPlanner pitch 0 when planted) with the ankle at rest height over the ground under the ankle, so the uphill toe reads 0.78 x 0.27 m x tan(slope) under: 7.8 cm on the 20.4 deg ramp and stairs, 14.75 cm on the 35 deg slope (heel ~2.2 / 4.2 cm above). The stairs collide as an invisible 20.4 deg ramp through the inner tread corners (levelBuilder.ts: step boxes collide=false), so the visible treads stand up to 28.9 cm above the collision surface | Item 12's shots: fails `footSinkL/R` in `ramp-*`, `stairs-*`, `slope35-*` | Toe visibly into the ramp / slope at those frames confirms the cloud numbers; on the stairs, note whether the feet sit inside the visible treads (collision vs visual mismatch: report it) | 07 (checker r3) |
| 15 | Wrist and grip pose (checker 07 r1): the audit reads wrists as the change from the standing low-ready grip (the right grip is ~140 deg sideways from a straight forearm continuation, so the standing grip is the only usable zero); crouch low-ready reads about -40 deg flex / -22 to -27 deg side from it. Right hand on the grip, left on the foregrip at standing and crouch low ready, ADS and sprint, side and top views | `E2E_GPU=1 node scripts/anim-audit.mjs --only=flat-stand2 --shots --out=test-results/aa-pc-stand2` and `E2E_GPU=1 node scripts/anim-audit.mjs --only=flat-crouch3 --shots --out=test-results/aa-pc-crouch3` (both include the `-aim` rows), plus `for v in side front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/aim-$v.png aim 12 0.1 $v; done` | The standing low-ready wrist reads as a natural pistol / support grip; the crouch wrist <= 25 deg sideways / 70 deg flex-extension from a natural grip | 07 (checker r1) |

## 4. Visual and contact-sheet items, by step

### Steps 01-06: removals (HUD, touch layout, results, cover)

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 16 | HUD tactical row (light, gear, goggles, exposure, noise) with the Execute charge pips gone; no chevrons over guards while aiming | `E2E_GPU=1 node scripts/shot.mjs pc/hud01.png "autostart=warehouse&mode=clear" 120` | Tactical row evenly spaced, no gap where the pips were; nothing drawn over guards | 01 |
| 17 | Phone touch layout (default and claw) with Mark / Execute removed; Ping keeps its chevron icon | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-touch.mjs $URL` (watch the layout) plus a real phone pass (TESTING.md) | No empty slot or overlap; Ping icon renders in co-op | 01 |
| 18 | Night vision look with sonar gone: green gain, bloom, flip housing, lens glow; no orange pulse ring or enemy marks | `E2E_GPU=1 node scripts/e2e-darkness.mjs $URL` plus `E2E_GPU=1 node scripts/shot.mjs pc/nv02.png "autostart=warehouse&mode=clear&gfx=epic&platform=desktop" 120 "new Promise((r) => { __app.current.vision.set('night'); setTimeout(r, 2000); })"` | Same image as before step 02 in a dark room; nothing orange drawn | 02 |
| 19 | HUD vitals with the shield bar gone: health bar alone, no gap above it; the screen-edge damage vignette still reddens (no-hbar mode) | `E2E_GPU=1 node scripts/shot.mjs pc/hud03.png "autostart=warehouse&mode=clear" 120` | Health bar flush, no empty bar slot; vignette at < 35% hp | 03 |
| 20 | Results screen (normal and `?legacy=1`) without the style bars: grid, mission rating and rewards stack with no gap | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-missions.mjs $URL` and `LEGACY=1 E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-missions.mjs $URL` (watch the results) | Rating row directly above rewards; no empty block | 04 |
| 21 | World prompts and the touch action button with snap cover gone: no "Take cover" / "Round corner" / "Move to cover" / "Flanked" badges; vault / climb / grab prompts sit on the obstacle and the action button reads them | `E2E_GPU=1 node scripts/e2e-touch.mjs $URL` and `E2E_GPU=1 node scripts/shot.mjs pc/wp05.png "autostart=proving&mode=sandbox" 120` (at the low crate) | Only traversal / use prompts drawn; action button idle (dimmed) at a wall with nothing to vault | 05 |
| 22 | Weapon ready position at doorways and corners without the corner controller: no compressed-ready snap or check sweep at a doorway, no contextual lean at a wall end; carry stays low-ready and does not clip the frame | `E2E_GPU=1 node scripts/e2e-clip.mjs $URL` plus a manual walk through the Proving doorway (x=-20, z=8) at `$URL?autostart=proving&mode=sandbox` on desktop and phone | No weapon through the door frame; no pose pop at the doorway plane | 05 |
| 23 | Guards in high cover with the rig's cover poses gone: `Enemy` drives `rp.wall` (src/ai/enemy.ts:1690), so they show the kept flat-back `WALL_STANCE` + `WALL_READY` tuck (A6) and lean (`coverPeek`); guards at low cover only crouch (no curl / lift hide pose); the support hand settles on the wall only when `wallHand` is set | `E2E_GPU=1 node scripts/shot.mjs pc/guardcover06.png "autostart=warehouse&mode=clear&gfx=epic&platform=desktop" 600` after alerting a guard, plus `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-stealth-ai.mjs $URL` (watch) | Hips and shoulder into the wall, muzzle down along it and away, no weapon through the wall (<= 2 cm), no pop entering / leaving cover or peeking; low-cover guard head below the cover top | 06 |
| 24 | Player and remote free movement after the cover rig removal: no residual lean, mirrored weapon or tuck in idle, crouch, aim and reload; remote (`?net=local`) matches local | `E2E_GPU=1 node scripts/e2e-anim.mjs $URL`, `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch), `for s in aim reload crouch; do for v in side front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/$s-$v.png $s 12 0.1 $v; done; done` | Weapon in the right hand, grips < 2 cm, no pop; remote joints < 10 cm from local | 06 |

### Step 09: holster, ready hands, draw / holster

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 25 | Holstered silhouette in every gear (holstered is the default unless aiming): idle, sneak, walk, jog, sprint, crouch, crouch run, start, stop, strafe, back, turn, with every gun slotted and the hands free in the A42 ready hands (no swap overlay, nothing through the body). PROVISIONAL if only cloud sheets exist | `for s in sneak walk jog sprint crouchrun crouch start stop crouchstop walkstop strafe back turn; do for v in side front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/$s-$v.png $s 12 0.1 $v; done; done` | Hands empty at the belt line (not hanging at the sides), guns in their carry slots, no pop when the match starts | 09 |
| 26 | Ready hands (A42, checker 09): elbows soft and bent (about 60-90 deg), hands in front at the belt line a little inside the shoulders, clear of the slung long gun and the hip holster; they follow the chest through a crouch, a start and a stop without folding, and ease in / out over ~0.25 s on a draw, a holster, a reload, a grenade and a weapon-to-weapon swap | Item 25's `crouch`, `start`, `stop` sheets plus `for s in swap grenade reload; do for v in side front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/$s-$v.png $s 16 0.05 $v; done; done` and item 15's audit runs (flat-stand2 / crouch3 holstered and `-aim` rows) | Elbow 60-90 deg, hands not through the thighs, pouches or the slung gun, no pop at the 0.25 s ease | 09 (checker) |
| 27 | Remote ready hands and draw: the host's copy shows the same pose (`rig.carrier`); its weapon goes in / out of the hand as a snap on `dw` (no draw clip on remotes) | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "drawn state (step 09)") | Remote hands match local within 10 cm (suite: drawn / holstered <= 2 cm); the weapon pop into the remote's hand reads acceptable at play distance (else log it for step 25) | 09 (checker) |
| 28 | Draw and holster look: pistol 0.3 s and rifle 0.4 s draw, 0.4 s holster, a release mid-draw reversing; hands on the grip < 2 cm once drawn, settle <= 0.2 s | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=raise --shots --out=test-results/aa-pc-raise` plus a manual look at `$URL?autostart=proving&mode=sandbox` (hold aim, release mid-draw). No contact-sheet scenario starts holstered and draws (`aim` is drawn before its first frame) | The hand reaches the slot, the gun comes up into the aim pocket without a snap; holster mirrors it | 09 |
| 29 | Reload from holstered and aim released mid-reload (A43, checker 09 r1): reload pressed holstered draws to the low / compressed ready, reloads, then holsters with no raise and no shot; releasing aim mid-reload keeps the gun out until the mag is seated, then holsters. Cloud e2e-pad proves the timing and the no-fire rule only | Item 26's `reload` sheets (the scenario taps reload while holstered) plus a manual look at `$URL?autostart=proving&mode=sandbox` (aim, reload, release aim mid-reload) | No pop between the ready hands and the low-ready reload, hands on the gun through the reload, the holster after it mirrors a normal holster | 09 (checker r1) |

### Step 10: elbow strike and the lethal takedown blow

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 30 | Elbow strike, local: wind-up, elbow arc with hip turn and left-hand guard, recovery to the ready hands; no arm through the torso, elbow out to the side at contact. `anim-sheet` has no strike scenario | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=strike --shots --out=test-results/aa-pc-strike` plus `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-takedown.mjs $URL --only=elbow` (watch) and a look in a Warehouse Hunter match (`$URL?autostart=warehouse&mode=clear`) | Joint rate <= 25 deg / frame (cloud 22.9), self-intersection 0, settle < 1 cm, elbow <= 150 deg (cloud 128) | 10 |
| 31 | Elbow strike, remote: the host's copy of a client strike under real latency, no snap at the start or after a denial | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "elbow strike") plus item 11's `strike` row | Suite strike pose <= 2 cm (cloud 0.5 cm); remote joint rate within the A39 remote excess (cloud 30.8, baseline band 23.6 deg / frame) | 10 |
| 32 | Lethal takedown blow on the shared elbow arc (A44): the takedown's `melee` overlay uses the step 10 arc (hand sweep, lifted right-elbow pole, hip / spine / head turn); the audit has no takedown scenario, so only the strike rows cover the blow | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-takedown.mjs $URL --only=ground` (watch the held, lethal takedown, front and rear) | No arm through the victim or own torso, right elbow <= 150 deg, no snap into or out of the blow | 10 (checker) |

### Step 11: back-to-wall stance, entry, slide, stacking

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 33 | Back-to-wall contact sheets, local: standing and crouched on a high wall, crouched on a low wall, mid-slide both ways, at an outside end (the scenarios find a free Proving wall at run time; the old `cover` / `highcover` / `lowpeek` / `peek` scenarios are gone). PROVISIONAL if only cloud sheets exist | `for s in wall wallcrouch wallslide wallslideleft walledge walledgeleft lowwall; do for v in side front back ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/$s-$v.png $s 12 0.1 $v; done; done` | Reads as back-to-wall: back and shoulder blades on the wall (gap <= 3 cm, no clip), head turned along the slide, off hand flat on the wall when still, sidesteps with planted feet sliding < 1 cm | 11 (row from 06) |
| 34 | Entry glide and audit wall rows | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=wall --shots --out=test-results/aa-pc-wall` (also runs walledge / wallopen / walllow) plus `E2E_GPU=1 node scripts/e2e-wall.mjs $URL` | `wallGap` / `wallClip` <= 3 cm; foot slide < 1 cm; no overshoot or pop on entry | 11 |
| 35 | Remote wall pose and two-player stacking (>= 0.62 m apart, host and client) | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "back to a wall") plus item 11's `wall` row | The copy sits on the wall with feet pinned under the pushed root, same pose as local within 10 cm; stacked players do not overlap | 11 |

### Step 12: peek swing, lean-out framing, SWAT, corner takedown

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 36 | Peek camera swing (25 deg, 0.2 s, never inside geometry) and head / near-shoulder lean; lean-out framing (body 0.35 m past the end, camera on the open-side shoulder, gun up, no clip into the corner) | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=walledge --shots --out=test-results/aa-pc-walledge`, `for v in side front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/walledge-$v.png walledge 16 0.1 $v; done` plus `E2E_GPU=1 node scripts/e2e-wall.mjs $URL` | The audit gates; no joint through the wall; peek head offset <= 0.25 m; camera never inside geometry | 12 |
| 37 | SWAT turn: crouched dash across the 1.1 m Proving doorway | Item 36's audit `walledge` shots plus `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-wall.mjs $URL` (watch the SWAT) | 0.5-0.8 s, no pop on landing on the far wall | 12 |
| 38 | Corner takedown from the wall edge | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-takedown.mjs $URL --only=corner` (watch) | No arm through the wall or the victim; no pop leaving the wall | 12 |
| 39 | Wall edge verbs, remote (r1) | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "wall edge: peek, lean, swat") plus item 11's `walledge` row | The copy's yaw eases back to the face (12 rad/s, no snap) when the lean drops; the remote peek eases in over 0.2 s; peek / lean / SWAT settled <= 2.2 cm. Remote SWAT mid-move is a known deviation (item 49): look only | 12 |

### Step 12b: open-side weapon at edges, low-wall side lean (D9 / D10)

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 40 | Open-side edges, both weapons, local, PROVISIONAL (cloud audit rows fail grips 17-70 cm, A47 / step 27): left and right high-wall edges with the pistol and the rifle, peek and lean-out | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=wallopen --shots --out=test-results/aa-pc-wallopen` (wallopenL / R x rifle / pistol) plus `for s in walledge walledgeleft; do for v in front ots; do E2E_GPU=1 node scripts/anim-sheet.mjs pc/$s-$v.png $s 16 0.1 $v; done; done` (rifle only: the sheet has no pistol option) | Mirrored grip clean (both hands on the weapon at a left edge, pistol and rifle), no weapon through the wall (<= 2 cm), the switch blends without a pop (0.25 s) | 12b |
| 41 | Low-wall side lean and over-the-top at both ends, local | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=walllow --shots --out=test-results/aa-pc-walllow` plus item 33's `lowwall` sheets | Head below the low-wall top (cloud 0.953 m on a 1.00 m wall); no weapon through the wall (<= 2 cm) | 12b |
| 42 | Mid-switch reversal: a peek / lean released or re-pushed within 0.25 s of the push | `E2E_GPU=1 node scripts/e2e-wall.mjs $URL` plus item 40's shots | No weapon jump; the hand switch rewinds without a pop | 12b |
| 43 | Open side and low side lean, remote | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "wall edge open side and low side lean") plus item 11's `wallopenL`, `wallopenR`, `walllowL` rows | The host's copy matches (cloud: left-edge lean 1.1 cm, low-wall head 0.953 m local and host, peek heads 1 mm apart) | 12b |

### Step 13: door peek

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 44 | Crack view framing, local: eye at the crack (3 cm in from the free edge, 0.16 m off the leaf, 0.27 m when the leaf swings toward the body), FOV x0.85, look +-35 deg; standing and crouched, both swing directions; hand on the handle, no arm or shoulder through the leaf | `E2E_GPU=1 node scripts/anim-audit.mjs --local --only=doorpeek --shots --out=test-results/aa-pc-doorpeek` plus a photo-mode look at the Proving shed north door (`$URL?autostart=proving&mode=sandbox`), pad and KBM | The crack shows the room beyond, framed by the leaf edge and the jamb; camera never inside the leaf or the jamb | 13 |
| 45 | Door peek, remote: hand on the handle on the host's copy | `E2E_GPU=1 E2E_HEADED=1 node scripts/e2e-netmove.mjs $URL` (watch page A at "doorPeek") plus item 11's `doorpeek` row | Joints <= 2 cm (cloud), leaf at 0.120 on both pages; no arm through the leaf | 13 |

### Step 14: vision modes

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 46 | Thermal look, desktop (Epic) and phone, PROVISIONAL until run here: cold blue-grey scene, softened, readable shapes; player, team-mates, guards and dogs white-hot where in view (A26: no see-through walls), a fresh body cooling over 60 s in 1/16 steps, lamps warm; the goggle flip covers the switch | `E2E_GPU=1 node scripts/shot.mjs pc/thermal-epic.png "autostart=warehouse&mode=clear&gfx=epic&platform=desktop" 120 "new Promise((r) => { __app.current.vision.set('thermal'); setTimeout(r, 2000); })"` and `E2E_GPU=1 node scripts/shot.mjs pc/thermal-phone.png "detect=1&platform=mobile&renderer=Apple%20GPU&gfx=user&autostart=warehouse&mode=clear" 120 "new Promise((r) => { __app.current.vision.set('thermal'); setTimeout(r, 2000); })"` | Bodies clearly the brightest thing after lamps; no halo or banding from the 4-tap soften; no colour leak at the vignette; phone and desktop read the same | 14 |
| 47 | Electro look, desktop and phone, PROVISIONAL until run here: dark desaturated green; security cameras, alarm panels, switches, terminals, laser sights and lamps glow; people stay dim | Item 46's two commands with `'electro'` and `pc/electro-epic.png` / `pc/electro-phone.png` | Devices read at 20 m; people darker than devices; lamps not blown into a full-screen wash | 14 |
| 48 | Night look on the phone after the step 14 pass change (desktop night is item 18) | `E2E_GPU=1 LOOK=phone node scripts/e2e-darkness.mjs $URL` plus item 46's phone command with `'night'` and `pc/night-phone.png` | Same as before step 14; phone frame per mode is item 7 | 14 |

## 5. Known deviations (look by eye, not gated)

| # | Item | Command | Pass limit | Step |
| --- | --- | --- | --- | --- |
| 49 | Wall / SWAT / door pose polish carried to step 27 under A47: wall pose polish (step 11), remote SWAT mid-move pose (D8 deviation: joints 70-103 cm, root <= 10 cm; REVIEW-NOTES), doorpeek pose fails (step 13) | Pictures from items 33, 37, 39, 44, 45 | Record what you see for step 27; no pass / fail here | 11-13 |
| 50 | D9 grip deviation: audit grips at open-side edges 17-70 cm against the 2 cm D9 limit, carried to step 27 | Pictures from items 40 and 43 | Note where the hands leave the weapon (which edge, which weapon, which frame) for step 27 | 12b |
| 51 | Other carried look items from steps 09-10: holstered neckTwist and crouch balance (step 21); inertializer swap trigger and remote hip drop (step 22); remote draw clip, weapon snaps into the hand (step 25); remote poseError report-only (A40, step 22) | Pictures from items 25-27 and 11 | Note anything worse than "known, carried"; no pass / fail here | 09-10 |

## 6. PC1 results (secondary desktop, M7, 2026-10-15)

E2E_GPU=1 (hardware GPU), E2E_PORT=4189, headless (no E2E_HEADED: nobody watches), HEAD 5c0190d. Items 1-3: setup done
(build passes, hardware renderer). Items 4-8 are budget items: section 0 (L1), pending target laptop. Pictures in `pc/`
(gitignored), audit output in `test-results/aa-pc*`. PASS = the numbers pass here; MICHAEL = needs his eyes, a phone or
a headed watch; carried = a known deviation owned by the named step (its step file has the PC1 numbers).

| # | Result | Numbers / evidence |
| --- | --- | --- |
| 9-10 | PASS | Desktop baseline (STATE.md): local 541 fails both runs, 0 local flips; remote 165 / 171 (A39 noise); `--compare` cloud: no regression. `audit/anim-baseline-desktop.json` |
| 11 | PASS (numbers); look MICHAEL | Client 62.5 fps all rows, host 56.2-56.8 (60 Hz) / 123.5-125 (120 Hz); pump p95 jitter 1.5-1.6 ms; lodSkip 0 everywhere; pops@60 <= cloud in every row; braceboost pairAlign 16.6 cm (cloud 16.8, N01 carried to 29); wall rows carried to 27 |
| 12 | PASS (coverage); shots fixed in PC1 fix round | 541 fails = run 2 line for line, 91 shots. Shots were unusable (follow camera, HUD, TAA ghosting, one shot per scenario): harness fixes, see LOG |
| 13 | MICHAEL | footSinkR 6.03-6.45 cm crouch (as cloud); judge on the fixed shots |
| 14 | MICHAEL | stairs / ramp footSink 7.26-9.05 cm (as cloud); judge on the fixed shots |
| 15 | carried to 25 | aim wrists stand2 26.9 / 86.5 / 129.6 deg, crouch3 30.2 / 82.2 / 116.3 (same as cloud) |
| 16 | PASS | pc/hud01*.png; no pips, nothing over guards. Empty `.tac-vision` gap fixed in PC1 |
| 17 | MICHAEL | e2e-touch 49 ok; real phone, claw layout and Ping icon in co-op by hand |
| 18 | PASS (numbers); look MICHAEL | e2e-darkness 28 ok, NV 98.3%; pc/nv02.png no orange ring or marks |
| 19 | PASS | pc/hud03.png (no-hbar, vignette 0.78 at 28 hp), pc/hud03-hbar.png (bar flush) |
| 20 | PASS (numbers); look MICHAEL | e2e-missions 26 ok, normal and LEGACY=1 |
| 21 | PASS | pc/wp05.png: only VAULT on the crate face, action button "Vault", no cover badges |
| 22 | MICHAEL | e2e-clip 79 ok (gun into world 0 frames); Proving doorway walk by hand |
| 23 | MICHAEL | no capture: alerted guards leave cover before a shot; no suite covers guard cover poses |
| 24 | PASS (numbers) | e2e-anim 49 ok; netmove drawn / holstered max 4.7 cm (< 10); aim / crouch sheets clean |
| 25 | carried to 21 | standing gears pass (walk / jog / sprint / start / stop / back sheets); crouched hands hang straight to the knees (elbow 5.1 deg, = cloud) |
| 26 | carried to 21 | standing ready-hands elbow 104-109 deg (A42: 60-90); crouch 5.1; self-intersection 0; grenade-side sling swing 0.0-0.1 s MICHAEL |
| 27 | PASS (numbers); look MICHAEL | netmove drawn wrists 0.3 / 0.4 cm, holster receipt 450 / 552 ms; remote weapon snap carried to 25 |
| 28 | carried to 25 | holster pop 0.12-0.23 s after release: jointRate 150.7 deg / frame, grips 19.6 / 24.0 cm, right arm 12-13 cm through the torso (= cloud baseline) |
| 29 | MICHAEL | reload sheet now draws first (PC1 harness fix); manual sandbox look |
| 30 | PASS (numbers); look MICHAEL | aa strike: jointRate 22.92 @60 / 11.46 @120, elbowR 128.3, self-intersection 0, 0 fails |
| 31 | PASS (numbers); look MICHAEL | remote strike jointRate 23.2 (band 23.6); netmove wrists 0.4 / 0.1 cm, ankles 6.1 cm |
| 32 | MICHAEL | e2e-takedown ground 9/9, alignment 2.0 cm; no blow metrics |
| 33 | carried to 27 | back on the wall (wall / wallcrouch / lowwall side); D9 left-edge weapon left. Misses: off hand not on the wall, legs cross in the slide, body off the wall at the edge, slung rifle between back and wall |
| 34 | carried to 27 | wall@60 gap 1.7 / clip 2.3 cm, @120 2.9 / 2.3; footSlideR 1.5 / 1.1, exit pelvisJump 8.4, entry jointRate 44.5, selfShanks 8.8 |
| 35 | PASS (numbers); look MICHAEL | wall copy <= 3.3 cm; stacked 0.75 m apart (>= 0.62) |
| 36 | PASS (numbers); look MICHAEL | peek head 0.250 m, lean-out 0.350 m, camera outside the wall (pc/walledge16-ots.png); walledge wallClip 13.4 carried to 27 |
| 37 | PASS (numbers); look MICHAEL | SWAT 0.527 s, far wall 0.350 m standoff |
| 38 | PASS (numbers); look MICHAEL | e2e-takedown corner: aligned 0.02 m |
| 39 | FAIL -> PC1 fix | remote peek settled ankle 3.9 / 4.3 cm (2 of 3 runs, limit 2.2); lean / SWAT 2.0; SWAT mid-move 74-104 cm carried to 27 |
| 40 | carried to 27 | grips L-rifle 29.4 / 11.2, R-rifle 27.7 / 30.7, L-pistol 57.4 / 63.4, R-pistol 17.3 / 50.8 cm; e2e-wall 12b open-side checks pass |
| 41 | PASS (numbers) | head 0.941 / 0.945 m left, 0.996 right on a 1.00 m wall; netmove 0.953; grips / clip carried to 27 |
| 42 | carried to 27 | new e2e-wall midSwitch() case: hand switch rewinds; weapon jumps 27-50 cm, wrists 10-12 cm in one frame (limit 5); report-only until step 27 (PC42_STRICT=1) |
| 43 | PASS | left-edge lean wrists <= 0.6 cm, low-wall head 0.953 m both pages, peek heads 2-4 mm apart |
| 44 | PASS (numbers); framing MICHAEL | doorHand 0, doorClip 0; entry pelvisJump 3.15 / jointRate 25.1 carried to 27 |
| 45 | PASS | doorPeek joints <= 2.1 cm, leaf 0.120 both pages |
| 46 | MICHAEL | pc/thermal-*.png: player white-hot, no vignette leak or banding; lamps not warm in frame; cooling, dogs, flip not shown |
| 47 | MICHAEL | pc/electro-*.png: people dim; phone frame near black vs epic; devices at 20 m not in view |
| 48 | PASS | LOOK=phone e2e-darkness OK (NV 98.3%); pc/night-phone.png no wash |
| 49-51 | recorded | in steps/21, 25, 27 "From PC1" lines |

New finding: Warehouse gfx=epic desktop with alerted guards failed the PBR compile ("texture image units exceeds
MAX_TEXTURE_IMAGE_UNITS(16)", 14 times; meshes not drawn). Fixed in the PC1 fix round (LOG.md).

PC1 checker notes: the new aimed edge sheets (`walledgeaim`, `walledgeleftaim`, pistol `...p`) show the body stepping off the wall at 0.1-0.2 s and standing in the open with the weapon near the face; the front view never shows the aim line along the wall and a wall column hides the body from 0.3 s (walledgeleftaimp). Judge whether that is the intended lean-out (Michael) and fix the camera / warm-up in step 27's sheet work. `--shots` side camera can sit inside geometry (doorpeek-60-pelvisJump-f32.png shows only a wall).

### Step 15: medkits (Michael's eyes / phone)

| # | Item | Pass limit |
| --- | --- | --- |
| 52 | Medkit pose standing and crouched, local and the host's copy of a client (pc/s15b-medkit-crouch-*.png): off hand in front of the belt, injector to the thigh, no prop mesh (A58); elbows flare wide from the front | Reads as using a medkit, no arm through torso or thigh |
| 53 | Pad X held 0.4 s for the medkit (A55); tap stays reload, held while aiming stays swap | Feels right on the pad |
| 54 | Phone HUD: health bar, kit count ("+N kits") and the heal fill (pc/s15-medkit-hud.png) | Legible at arm's length |
| 55 | Co-op: a client uses and cancels a medkit as the host sees it | No pop, health and kits agree on both screens |

### Step 16: arsenal (Michael's eyes / phone)

| # | Item | Pass limit |
| --- | --- | --- |
| 56 | A62: the campaign rifle is issued suppressed; a bare barrel is not possible in the campaign (a compensator swaps it) | Accept, or pick an alternative (A62) |
| 57 | Phone: loadout screen with the new names and the Sidearm label (pc/s16-loadout-root2.png, s16-loadout-primary2.png); the longest name "SPOTTER 7.62 MARKSMAN" not truncated | Readable at phone width |
| 58 | Internal weapon ids `p90` / `tavor` remain in docs/systems/combat.md's id column (A28 keeps ids) | Accept or rename ids |

### Step 17: pad input (Michael's hands / phone)

| # | Item | Pass limit |
| --- | --- | --- |
| 59 | Rumble feel on a real pad for every table entry and the Rumble strength slider | Felt, not annoying; heavy landings stronger than footfalls |
| 60 | Analog thresholds by hand: 50 / 80 / 100% -> gears 2 / 4 / 5 (A63), no chatter, rocker cap | Feels deliberate on the pad |
| 61 | Phone touch: basic layout (v7 reset), tilt gears 1-5 (A66), takedown on the context button, training without the gadget step (A67) | Playable one-handed-stick plus buttons |
| 62 | HUD gear pips: dim (cap) vs off contrast (pc/s17-gear-pips.png) | Distinct at a glance |

### Step 18: remap and hold / toggle (Michael's hands)

| # | Item | Pass limit |
| --- | --- | --- |
| 63 | Real-pad remap: capture binds on release, B held 1 s cancels (A69); a shared input fires both verbs with a warning (A71) | Clear and safe to use |
| 64 | Hold-mode grab: release knocks out, no lethal finish from behind in hold mode (A70; bible 5.4 asks for the lethal / non-lethal choice in every position) | Accept, or add a lethal input in hold mode (e.g. fire while holding, takedownController.ts ~:328) |
| 65 | Controls screen over the live scene (pc/s18-controls-pad.png): the hint line sits on a bright floor | Readable |

### Step 19: custom difficulty (Michael)

| # | Item | Pass limit |
| --- | --- | --- |
| 66 | Each slider's effect is felt in play (perception, aim, alarm tolerance = reaction delays, A72); presets as bases (A74) | Noticeable and sensible ranges (0.5-2.0) |
| 67 | Phone: play screen sliders usable | Fit and drag cleanly |
| 68 | Stick feel: since step 17 a part-pushed stick (gear 2, 1.3 m/s) is a silent walk, full stick (gear 4 default max) is audible | Intended stealth control on the pad |
