# Guard AI cloud prompt (for Michael's second account)

Michael wants the guard AI work run on his other account in a cloud session (isolated). That account was out of usage on
2026-10-21 ~00:30; paste this when it resets. Session: Night Shift | Guard AI (cloud). Model: Opus. Effort: high.
The plan it builds is docs/archive/reviews/guards-review.md (on feature/menu). The orchestrator reviews and merges its PR.

```
Night Shift | Guard AI (cloud). Job guard-ai for Night Shift, repo Tekcry/Mobile-Coop.

BRANCH RULES (strict, other sessions are working in this repo):
- First commands: git fetch origin; git checkout -b feature/guard-ai origin/master. If feature/guard-ai already exists on origin, STOP and say so in your final message.
- Work, commit and push ONLY on feature/guard-ai: git push -u origin feature/guard-ai. Never push to any other branch (master, dev, ct-movement, feature/ct-prototype, feature/menu or any other feature/* branch). Never force-push, never rebase a pushed branch, never delete or rename a branch, never create tags.
- Never merge anything into master and never run gh pr merge: open ONE pull request feature/guard-ai -> master with gh pr create and stop. The orchestrator reviews, versions and merges it.
- Never edit package.json, package-lock.json, .github/, CLAUDE.md, docs/ROADMAP.md, docs/DECISIONS.md, or any settings or config file. Never run npm install with new packages (npm ci is fine).
- If master moves while you work, do not merge it in; the orchestrator does that at merge time.

READ FIRST: CLAUDE.md (Sessions, Hard rules incl. light parity and "gameplay never reads graphics state", test tiers: this is a cloud session, so unit tests + logic e2e only, every GPU / visual check is "pending PC run"), docs/ROADMAP.md, then the approved review: git show origin/feature/menu:docs/reviews/guards-review.md (file:line refs, numbers, risks). Also docs/systems/ai.md and docs/ct-research (guard behaviour). Michael (verbatim): "make them slower and more careful, move around with purpose, and not all be alerted at the same time when they hear things break. Only one person needs to investigate etc ... They shouldn't just walk around aimlessly."

BUILD the review's ranked shortlist, prototype quality, in this order, one commit per item:
1. Hearing fix: a noise below the suspicious threshold only turns the head (`heard` no longer overrides the meter). Light guard coordinator in EnemyManager: one incident per event, ONE investigator (nearest calm guard by path distance; an officer sends someone; a dog never goes); the rest turn, bark "Copy" and stay on task; lightsOut and the 14 m turn-to-look need line of sight.
2. Paces by state: patrol 1.05, investigate 0.85, search 0.75 m/s at low ready with a 1-2 s stop every 4-6 m and calm turns; run only for combat or alarm; Sector Ops tour guards move off the runner kind to grunt / officer.
3. Radio callouts per incident as text barks ("Checking the east bay" / "Copy, holding").
4. Light task patrols: PatrolRoute.tasks (radio, door, window or panel, smoke) as FK idles via rig.emote on existing stops; author them for Sector Ops section 1 only.
5. Cover guard: one within 12 m holds and faces the spot; if the investigator is silent 25 s, the cover guard and a buddy search as a pair (G11).

FILES: you may edit src/ai/*, src/config/enemies.json, src/game/stealthSystems.ts and src/game/sectorCheck.ts (guard parts only), the guard / noise parts of src/game/gameState.ts, src/world/maps/warehouseSectors.ts (route task data only), tests/*, scripts/e2e-stealth-ai.mjs, scripts/e2e-sectorops.mjs, docs/systems/ai.md, CHANGELOG.md, and new files under src/ai/ and docs/guard-ai/. Do NOT edit src/world/maps/ctcourse.ts, any warehouse map / lamp / roof / dressing builder, src/anim/*, src/player/*, src/net/* or the protocol (no PROTOCOL_VERSION change), src/ui/*. If an item needs a file outside this list, skip that part and list it in the PR body.

TESTS: npm run check; logic e2e with E2E_JOBS=2: e2e-stealth-ai, e2e-sectorops, e2e-ctcourse, e2e-coop, smoke. Retune the e2e-stealth-ai noise / lights / bodies asserts and the Sector Ops isolation check (sectorCheck, sectors.test) only to the new intended behaviour, never just to pass; keep bodies a full search.

DOCS: CHANGELOG entry under "## Unreleased - guard-ai"; fix docs/systems/ai.md's stale numbers; docs/guard-ai/STATE.md with what was done and open items.

PR BODY: per item what changed, timings before / after, test results, decisions for Michael, open items, and "GPU look: pending PC run". Lean tokens, one self-review, no polish. Stop after opening the PR.
```
