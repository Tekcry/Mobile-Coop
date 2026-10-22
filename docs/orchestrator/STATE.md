# Orchestrator - resume point (2026-10-22 ~10:05 Sydney)

2026-10-22 ~13:10: account handoff prepared: docs/orchestrator/HANDOFF.md has the open work and every session's prompt
(it supersedes the "Sessions" table below).
2026-10-22 ~13:20: new account live. All five sessions resumed from HANDOFF prompts: CT Core (local_f21a4036, #103
ctcourse:1 solo rerun on d487495b), Menu Notes (local_ec5ab600, N3 fix round), Course Ready, Character Build (laptop,
Remote Control; address it by title via ListAgents). Usage 5-hour 2%, weekly 2%. Cron 17/37/57 recreated.
Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first (its "Decided" list holds Michael's answers verbatim).
Work folder C:/NightShift/Mobile-Coop-menu, branch feature/menu (orchestrator docs; merge origin/master before each
docs batch; a docs PR when convenient). Scratch worktree for version / merge steps: C:/NightShift/Mobile-Coop-phone-native
(detached checkouts; reset --hard there is safe).

## Master
v4.53.0 (train 2 #112 = #105 + #109, 5220f79c, ~13:05). 4.52.0 (train 1 #111 = #99 + #108, protocol 28, b1f13b19, ~12:30). 4.51.1 (#107, 71ce1bff, ~11:25). 4.51.0 (#106 key tools, d52d37a5, ~11:10). 4.50.0 (#92 rejoin, 1a2c60ca, ~11:00; protocol 27 taken: #99 -> 28, #108 -> 29 at their merges). /preview/ = dev = 5220f79c (4.53.0). Michael 2026-10-22 ~11:20: "Yes I'll allow it" (pushing master merges to dev and editing ROADMAP after auto mode blocked them). Menu Notes cleared and resumed ~11:20. Earlier today: 4.49.0 #97 tuner v3; see ROADMAP Done for the full list.

## Pacing (Michael)
- 5-hour window: use as much as possible, never hit it; trim in order (cloud, laptop job, one agent per session).
  Michael 2026-10-22 ~12:50: "Hard stop at 99% to allow saving work": sessions start no new agent at 97%, save (commit,
  push, STATE) at 98%, and are stopped by 99%. A recurring cron (17, 37, 57 past) checks it in this session; recreate it after a clear.
- Weekly: "Full speed, swap account" (09:20): at weekly ~98% pause everything at clean commits, save, and hand off with
  docs/orchestrator/HANDOFF.md (prompts one at a time). Weekly 65% at 10:02 (pace slowed to ~3%/h with one agent per session).
- Pace now: one agent per session (since 09:45). 12:25: 5-hour 82% rising ~0.5%/min: flake-fix agent paused, desktop
  leads start no new agent and pause at 97% or their current agent's end; a one-shot cron at 14:13 resumes everyone.
- Overnight: never leave a question dialog open (it blocks the turn and the cron); log assumed decisions instead.
- Context: sessions over ~60% get cleared at clean points (Michael approved 09:30): save STATE, clear, send resume.

## Sessions (titles are the message addresses)
| Session | Owns now | Next |
| --- | --- | --- |
| CT Core Build (desktop, local_164e4c5a; cleared + resumed 10:00 from docs/orchestrator/resume-ct-core.md) | anim-run-half (option c approved, walk pin 0.053), #103 bake-targets (laptop solo reruns of e2e-stealth-ai / e2e-clip), anim-bake-all (PR after #103), e2e-coop-takedown (PR) | anim-natural N1 feet, then N2 body motion |
| Course Ready Build (desktop, local_7cc5a94a; cleared + resumed 09:45 from docs/marlow-bays/RESUME-trackA.md) | #105 guard tuning, #106 item 30 key tools (both queued on the laptop) | idle; N4 rows after the audit |
| Menu Notes Build (desktop, local_b81e3537) | anim-natural N0 audit (AUDIT.md), N3 weapon draws paused as WIP (feature/anim-n3 786f993f; animGraph / tuneBakeTable edits approved, tell CT Core) | clear at a clean point after the audit; sector-fixes parked (L c436f677, C abc24880, W 3f048e43) |
| Character Build (laptop, bridge:session_01Argkzi1eYdbWRrGaWyozTe) | test runner: #103 solo reruns, #92 (6d42d9ee), #99 (98ffe573), #105, #106; jammer-fixes (review items 1-4; item 5 withdrawn: IR stays everywhere) | - |
| Bays Cloud (cloud, one-way) | done: #92 rejoin, #99 server browser | - |
Open PRs: #92, #99, #103, #105, #106 (#67 parked for Michael). Protocol: #92, #99 and jammer-fixes all claim 27: the first merged keeps 27, the orchestrator renumbers the others (28, 29) at their merge (one constant + its test).

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
Merge train (Michael 2026-10-22 ~11:25, CLAUDE.md test tiers): in the scratch worktree, `git checkout -B train/<n> origin/master`,
merge each ready PR head in order (CHANGELOG / package / PROTOCOL_VERSION conflicts resolved there; abort a PR on any
other src conflict), push train/<n>, run one full e2e on it (desktop lock or the laptop runner). On a pass (Michael
2026-10-22 "One PR per batch"): one commit on train/<n> sets the version (npm version, one CHANGELOG heading
"## <v> - Train <n>: <short list> (<date>, PR #<train PR>; #a, #b, ...)" with each member's entries under it), push,
open a PR train/<n> -> master listing the members, CI, gh pr merge --merge, tag, move dev once. The member PRs show as
merged because their heads are in master; close any that don't with a comment naming the train PR.
Train 1 merged as #111 (#99 + #108; #105 left on a real e2e-menus failure, fixed e8cdba4e). Train 2: #105 + #109
(f92747c4 contains #105) + #110 after #103 merges and #110 re-captures. CHANGELOG resolver: docs/orchestrator/cl-resolve.mjs
(`node <it> CHANGELOG.md`, incoming block first); drop stray "Unreleased - <job>" headings a member already released.

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
- Bottlenecks (Michael 2026-10-22 ~10:45: "You must review constantly for bottlenecks and advise if there's more efficient ways to progress"): every cron check also reviews idle sessions, the laptop queue, the desktop lock and waiting PRs; fix what is in my authority, advise Michael on the rest. The cron prompt carries this. Michael (~11:45) asked why batching was not proposed earlier: I treated CLAUDE.md's test and merge rules as fixed and only optimised inside them. The review now also questions the rules: where work waited longest, which rule caused it, and a cheaper rule to propose.
- 10:45: Menu Notes cleared after N0 pass 1 (resume: C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md, plus N3 draw-time research). Course Ready got clip-speed (baked per-clip speed slider). CT Core got the N1 / N2 findings and the SWAY_MAX lift. Laptop order: #92 solo ctcourse, #103 solos, #106 (studio + anim), #107 (coop x2), #105 full, #99 full, #108 full.

## Resume prompt
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Recreate the 5-hour usage cron (17, 37, 57 past; trim rules in STATE "Pacing") and check get_usage (5-hour and weekly) now. Then carry on: merge green PRs per "Merge procedure", route work per "Sessions". Short replies, native multiple choice only, hyphens not em dashes.
```
