# ED overnight - eight editor parts in a row, one fresh agent per part
Model: Opus, medium effort.
Decisions: 8 (one per part; each part's own decisions are in its brief, at most 20 each)

Start message: `Run docs/kestrel/prompts/overnight/ED-overnight.md`. Michael is asleep and does not read the run; he reads
the morning report. Written 2026-10-13 (planner) from Michael's answers the same night (progress.md Decisions,
"Overnight editor run"). The documents part (ED2 Part G) is NOT in this run.

## 0. You are the orchestrator
- You never write code. For each part below, in order, start ONE agent with the Agent tool (subagent_type
  `general-purpose`, `run_in_background: false`) and the part prompt in section 3. Each agent starts with an empty
  context: that is the context clearing, so nothing from one part leaks into the next. Never run two agents at once
  (they share the working tree and the e2e port).
- Keep your own context small: read only the agent's final report (at most 12 lines), `git log --oneline -3` and
  `git status --porcelain`. Do not open source files, diffs or logs yourself.
- After each agent: if `git status --porcelain` is not empty or the last commit is not the part's commit, start a
  second agent for the same part with the first report pasted under "Previous attempt" and the words "finish or
  repair, then commit". If that also fails, mark the part BLOCKED and go on only if the next part does not depend on
  it (dependencies in section 2); otherwise stop the run.
- Never merge, rebase or force-push. Never touch `dev` or `master`.
- When every part is done or BLOCKED, write section 4's morning report.

## 1. Start
1. `git checkout feature/kestrel && git pull`; confirm the branch and a clean tree.
2. `ls docs/kestrel/prompts/overnight/` shows the eight part briefs ON1-ON8.

## 2. Parts, in order
| # | Brief | What | Depends on |
| --- | --- | --- | --- |
| 1 | ON1-room-tools-2.md | Wall chains, door centring, live sizes and distances, guide lines | - |
| 2 | ON2-levels-stairs.md | Stair, ladder and floor-hole tools, levels, storey heights, renaming ids | - |
| 3 | ON3-ease.md | Clickable problems, floating names, save summary, search, history, person figure, bookmarks | - |
| 4 | ON4-objects.md | Realistic object catalogue (data hall, plant, office and security, goods-in, yard and roof), object tool, rows, stealth badges, walk test boxes | - |
| 5 | ON5-exterior-floors.md | Climb pieces and exterior features, floor finishes and footstep loudness | 4 |
| 6 | ON6-lights.md | Light fitting catalogue, lamp tool, switches and circuits, emergency, motion and breakable lamps, play file, walk test lamps | 4 |
| 7 | ON7-light-preview.md | Live lighting in the editor (quick while dragging, exact on drop), darkness map, emergency and motion preview, guard view tester | 6 |
| 8 | ON8-guards-markers.md | Per-guard patrol paths, mission markers (insertion, extraction, objectives, intel) | 6 |

## 3. The prompt you give each agent (fill in the brief name)
```
Overnight editor part. Read docs/kestrel/prompts/overnight/ED-overnight.md section 5 (rules for every part) and then
docs/kestrel/prompts/overnight/<BRIEF>. Do exactly that brief, nothing from any other part. Michael is asleep: never
ask a question; where a brief leaves a choice, take the recommended or most realistic option and record it as
"Overnight choice:" in your progress.md log line. Finish with the brief's end steps, commit, push, and reply with at
most 12 lines: what was built, the check results (counts), anything not done, any Overnight choice.
```

## 4. Morning report (you, after the last part)
1. `docs/kestrel/overnight-report.md`: one short plain-English paragraph per part (what Michael can now do, whether it
   worked, what was left out), the BLOCKED parts with the reason, every "Overnight choice", and one "Try this" list of
   at most 12 steps across all parts, ordered as Michael would test them on the controller.
2. One log line in `docs/kestrel/progress.md`: "2026-10-13 Overnight run: parts done ..., blocked ...".
3. Commit `kestrel overnight: morning report` (only those two files), push.
4. Final reply: the report's paragraphs (at most 12 lines), then "Review chat: SKIP" and the Next step block:
   "1. Type /clear." "2. Stay on Opus, medium." "3. Send the prompt below:" and a code block holding `Planner: next`
   on its first line and the morning report under it.

## 5. Rules for every part (each agent reads this section)
**Read first, nothing more:** `CLAUDE.md` hard rules; `docs/kestrel/editor.md` (by section; `grep -n '^#'`); the files
your brief lists, by line range. `src/editor/main.ts` (1900+ lines) and `padControl.ts` (1100+): grep, then read only
the ranges you need. Never read `docs/archive/`.

**Hard rules:**
- The editor is dev-only: nothing in `src/editor/` is imported by the game; `editor.html` is never a build input. The
  game may use a dev-only path behind `import.meta.env.DEV` (as the walk test does, `src/dev/editorBridge.ts`); after
  `npm run build`, `dist/` has 0 hits for `padControl`, `__editor`, and your new editor module names.
- Babylon only through `src/core/babylon.ts`. Strict TS, `import type`. No `Math.hypot`: use `hyp2` / `hyp3`.
- Pure logic in Babylon-free modules with Vitest in `tests/editor/`. Every number a rule needs comes from
  `scripts/kestrel/facts.json` (never typed in code); catalogue sizes are data in one catalogue file each, with a
  `src` per entry ("editor default: typical product" where no doc gives one).
- Gameplay never reads graphics state; light parity (bible 5.1): any light value the editor shows comes from the
  game's own light code (`src/world/lampMath.ts`, `lightField.ts`, `lightBake.ts`, `voxel/lampBake.ts`), never a
  second formula.
- The campus file (`docs/kestrel/kestrel.campus.blocks.json`) stays byte-identical on a no-op save (`campusText`,
  test exists). New collections or fields only where your brief says, added to `docs/kestrel/schema.md`. Never run
  `p03b-blocks.mjs --force`.
- Do not change game tuning, the player controller, camera, AI or saves (RULES 11), except where a brief says so.
- No external art or audio; no CDN. Plain English in everything Michael sees; hyphens, not em dashes.

**Controller first:** every new tool works on the pad (Build wheel or Selection wheel entry, A / B / RB / LB as the
existing tools use them, hint bar short words in `actions.ts` `short`, at most 5 prompts), and with the mouse and
keyboard. New tools join the tool bar only if the brief says so. Nothing on the pad screen may overlap (the e2e
overlap step checks 1280 x 720, 1024 x 600, 932 x 430).

**Tests:**
- `npm run lint` (0 errors), `npm test` (only `tests/kestrelMap.test.ts` may fail: the old B0 map copy; if
  `detailPass`, `pvp` or `voxel` fail under load, rerun those three alone; they must pass alone), `npm run build`.
- `npm run e2e:editor` takes about 10 minutes. Run it in the background with a 25-minute timeout, writing to a log in
  the scratchpad, and wait with an until-loop on the log's last line; never run two at once; never chain sleeps.
  It runs the editor server with `KESTREL_EDITOR_SANDBOX`, so saves never touch `docs/kestrel`.
- New e2e steps place the dot with `dotAt(x, z)` (sets the orbit target), never by counting D-pad presses (they repeat
  on slow frames), and wait for the dot's words with `page.waitForFunction` before reading them. Pick empty patches by
  searching the data, as the ED3-3a steps do. The old View-hold step may fail once on timing: rerun once.
- Live previews that touch many elements run only when their input changes (ED3-3a lesson: re-previewing every frame
  made the suite three times slower).
- If the game changed (walk test, light, objects in the game build): `npm run e2e:quick` too; known flaky suites
  print KNOWN FLAKY and do not fail it; `e2e-kestrel` fails 4 steps on the stale B0 copy before any of this work.
- Screenshots: `SHOTS=<scratch dir> npm run e2e:editor` keeps them; view each new one once.
- At most two fix rounds; then stop, write BLOCKED in the log line with the reason, commit what passes, report.

**End of every part:**
1. `docs/kestrel/editor.md`: controls, the new tool's section, the limits list ("What it does not do yet") and the
   files table.
2. `docs/kestrel/progress.md`: one log entry at the top of the Log (newest first), at most 6 lines: what, checks with
   counts, Overnight choices. `docs/kestrel/lessons.md`: one line, only if something non-obvious was learnt.
3. Commit `kestrel <brief id>: <summary>` (only files you changed; `git status --porcelain` empty afterwards), push
   `feature/kestrel`. End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
4. Reply to the orchestrator in at most 12 lines.
