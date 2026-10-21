# Orchestrator - resume point (2026-10-22 ~09:30 Sydney)

Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first (its "Decided" list holds Michael's answers verbatim).
Work folder C:/NightShift/Mobile-Coop-menu, branch feature/menu (orchestrator docs; merge origin/master before each
docs batch; a docs PR when convenient). Scratch worktree for version / merge steps: C:/NightShift/Mobile-Coop-phone-native
(detached checkouts; reset --hard there is safe).

## Master
v4.48.0 (#101, f1c4a6c6) plus #104 docs (ea3399ed). /preview/ = dev = ea3399ed. Merged 2026-10-21/22 in order:
4.33.0 #80 tuner pad layout, 4.33.1 #79 GL warnings, 4.34.0 #81 co-op guard torches, 4.35.0 #82 tuner free mouse,
4.36.0 #83 T1a keys / playback, 4.37.0 #84 J1 base table, 4.38.0 #85 bays B+M (cloud), 4.39.0 #86 T2 redesign,
4.40.0 #87 key timing, 4.41.0 #89 phone tuner, 4.42.0 #88 skeleton S1+S2, 4.43.0 #91 add / delete keys, 4.43.1 #93
restart-hold, 4.43.2 #94 test fixes, 4.44.0 #90 J2 move rows, 4.45.0 #95 gear offsets, 4.46.0 #96 Michael's first bake,
4.47.0 #98 skeleton S3+S4, 4.47.1 #100 keyCurve, 4.48.0 #101 bay 3 jammer hallway (protocol 26), #104 docs.

## Pacing (Michael)
- 5-hour window: use as much as possible, never hit it; trim in order (cloud, laptop job, one agent per session) and
  pause at 97%. A recurring cron (17, 37, 57 past) checks it in this session; recreate it after a clear.
- Weekly: "Full speed, swap account" (09:20): at weekly ~98% pause everything at clean commits, save, and hand off with
  docs/orchestrator/HANDOFF.md (prompts one at a time). Weekly was 61% at 09:20, rising ~5.5%/h (out ~16:30).
- Overnight: never leave a question dialog open (it blocks the turn and the cron); log assumed decisions instead.
- Context: sessions over ~60% get cleared at clean points (Michael approved 09:30): save STATE, clear, send resume.

## Sessions (titles are the message addresses)
| Session | Owns now | Next |
| --- | --- | --- |
| CT Core Build (desktop, local_164e4c5a) | anim-bake-all (checker), anim-run-half (run clip track half bake bug, key_clip.py:481), e2e-coop-takedown test PR, #102 goggle (merge master: characterRig conflict), #103 bake-targets | anim-natural N1 feet (turn-step rule), N2 body motion layer |
| Course Ready Build (desktop, local_7cc5a94a) | #97 tuner v3 (laptop full on 2dcc601e: e2e-lightbake 16/17 solo rerun pending), guard tuning (item 24, PR after #97), item 30 (wave, apply to keys, smooth between, compare, exact preview via keyCurve) | - |
| Menu Notes Build (desktop, local_b81e3537) | anim-natural N0 audit (AUDIT.md on feature/anim-natural) and N3 weapon draws (feature/anim-n3) | sector-fixes parked: L c436f677, C abc24880, W 3f048e43 (WIP.md each); then P, S, R |
| Character Build (laptop, bridge:session_01Argkzi1eYdbWRrGaWyozTe) | test runner (queue: #97 lightbake solo, #103 full; then #92, #99); jammer-fixes (review items 1-4, protocol 27) | - |
| Bays Cloud (cloud, one-way) | #92 rejoin (slice R), #99 server browser (slice S) | done; needs laptop full runs, then merge |
Open PRs: #92, #97, #99, #102, #103 (#67 parked for Michael).

## Decisions to remember (also in ROADMAP Decided)
- Michael's bake: bake all as exported, widen only the tripped limits, each marked "Michael's 2026-10-22 tune".
- Cameras see in the dark everywhere (IR), Sector Ops included.
- Slice J: J2 seen = sent back, J3 join a jam approved; J4 (unjammable lamp) rejected.
- Security room everywhere with cameras except Sector Ops; lasers visible in night vision, alarm only.
- Every tuner slider must bake (anim-bake-all).
- Phones: tuner and Anim Studio only (exception to M21); game touch = menus + camera.

## Merge procedure
Check the PR head equals the tested commit (or the delta is docs only). In the scratch worktree: checkout --detach the
branch, merge origin/master resolving only CHANGELOG / package conflicts (on any src conflict abort and send it back to
the job lead), npm version <v> --no-git-tag-version, rename the top "## Unreleased - <job>" heading to
"## <v> - <title> (<date>, PR #<n>)", commit "<v>: version at merge (G183)", push HEAD:<branch>, watch CI in the
background (gh run watch <id> --exit-status), gh pr merge <n> --merge, then tag v<v> and push <merge>:refs/heads/dev as
separate commands; update this file's Master line and the ROADMAP Done table.

## Known
- e2e-netmove doorPeek fails on master-based branches until CT Core's remote-feet fix (e4d85253, on ct-prototype)
  reaches master with the anim-rework PR: count it as known.
- Co-op suites time out under load; accept a full run where the load failures pass solo on the same commit (test-speed
  fixes this).
- The co-op client never draws guards' flashlights (torch state not on the wire): later, a protocol bump.

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- ALWAYS state the session title, the model and the effort next to every prompt you give Michael (Michael 2026-10-20 18:30: "You should be showing me exactly which model and effort alongside any prompt, make sure you always do that."). One prompt at a time; he does not remember earlier ones.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, reviewed PRs without asking (CLAUDE.md, and his 23:55 / 08:45 go-aheads). If auto mode blocks a merge,
  ask him in chat for permission.
- Never trace CT animation frame by frame (IP; he accepted pose matching, then dropped CT references for movement).
- Start new sessions only from his own words in the desktop app; a session cannot start one from a peer message. When the app refuses a start (an answer from a question dialog does not count as his words), propose a card (own_initiative) and tell him to click it.
- A paste-in prompt is the turn's LAST message, never paired with a question dialog in the same turn.
- Check the usage meter (mcp__ccd_session_mgmt__get_usage) when pacing.

## Resume prompt
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Recreate the 5-hour usage cron (17, 37, 57 past; trim rules in STATE "Pacing") and check get_usage (5-hour and weekly) now. Then carry on: merge green PRs per "Merge procedure", route work per "Sessions". Short replies, native multiple choice only, hyphens not em dashes.
```
