# Menu UI redesign - overview and plan

Status (2026-10-15): **step 1 done** (design spec, decisions MD1-MD20, prototype, run files). Steps 2-4 (the
implementation run) wait for the `feature/ct-locomotion` merge to master; the START prompt is in
[RUNBOOK.md](RUNBOOK.md). Branch: `feature/menu-ui-spec` (docs only, off master; Michael merges).

## Step 1 outputs
- [SPEC.md](SPEC.md): visual direction, tokens, template, input mapping table, every screen's layout / focus / Back /
  legend / states, pause blur, cinematic shot list with tests and budget, parity checklist.
- [DECISIONS.md](DECISIONS.md): MD1-MD20 and the remaining questions.
- Prototype: https://claude.ai/artifact/XvpChFnv69HTzmDtW4n5Fb (private) and [prototype/index.html](prototype/index.html)
  (open in Chrome to test a real controller; the artifact frame may block the Gamepad API).
  [prototype/parity-test.mjs](prototype/parity-test.mjs) is its scripted keyboard / mouse / pad check (43 checks).
- Run files for sessions 2-4: [BRIEF.md](BRIEF.md) (the START brief), [RULES.md](RULES.md), [PLAN.md](PLAN.md),
  [STATE.md](STATE.md), [LOG.md](LOG.md), [steps/](steps/) 01-13.

## Goal (Michael, 2026-10-15)
Restyle every menu in the visual language of Batman: Arkham Knight's menus (style only: no Arkham or Splinter Cell IP):
- a ghosted two-line screen title (MAIN / MENU), condensed caps items, a highlight bar on the focused item;
- the button legend bottom-left, a context / description panel on the right, settings rows with value cyclers;
- near-black screens; the operator reads as a rim-lit silhouette with big shadows;
- the main menu background is the operator animated, moving slowly in cinematic ways (a separate session);
- the in-game pause menu blurs the game but keeps the player character in view;
- identical layouts on keyboard and mouse and on controller (controller is the primary platform); only the legend
  glyphs change.

## Process (why not the locomotion run's unattended loop for step 1)
The locomotion run (`feature/ct-locomotion`, docs/archive/locomotion/) works like this: one long brief saved verbatim
(BRIEF.md, condensed in RULES.md); Michael's decisions numbered (D1-D11, M1-M11) and the run's own calls logged as
"ASSUMED - for review" (A-numbers) instead of asking; PLAN.md split into numbered step files; STATE.md for resume
across sessions and accounts; per step an implementer subagent, a fresh checker subagent (diff, tests, e2e, contact
sheets judged against the bible) with up to 3 fix rounds and one commit per step; block ends run the full e2e and a
perf trend; it pauses only at fixed points for Michael.

- Design (step 1) is taste-led, so it runs interactively: the session asks Michael its open questions as
  multiple-choice and freezes the answers as numbered design decisions (MD1, MD2, ...).
- Implementation (steps 2-4) then runs the locomotion way: brief + plan + step files + implementer / checker loop,
  with one extra checker item: every screen passes the input-parity checklist (keyboard and mouse, then pad).

## Sessions (4)
1. **Design spec and prototype** (interactive, docs only, can start now): docs/ui-redesign.md (or docs/menu-ui/SPEC.md),
   numbered MD decisions, a navigable HTML prototype (keyboard, mouse and real gamepad), and the briefs for 2-4.
2. **UI framework and core screens**: shared screen template, tokens, highlight motion, legend with device-switched
   glyphs, then the main menu and settings; menu e2e suites on pad and mouse.
3. **Remaining screens**: pause (blur keeping the player sharp), loadout, co-op lobby, briefing / debrief, save or
   mission select, dialogs, toasts; phone perf check.
4. **Cinematic menu background**: a Babylon-free shot director (timing, cuts, crossfades; unit tests), 4-6 lit setups,
   slow dolly / push-in, the operator idling or holding poses, a title / press start screen; GPU and perf checks on
   Michael's PC.

## Dependencies and rules
- Sessions 2-4 start after the `feature/ct-locomotion` PR merges to master (merge plan: kestrel to master, master into
  locomotion, then the locomotion PR). Its remaining steps touch the same areas: 18 (remap, hold / toggle and
  difficulty screens in settings), 21-30 (the animation the background depends on), 33 (training prompts).
- Master is far behind feature/ct-locomotion (402 commits on 2026-10-15): step 1 reads the current UI code and docs
  from `origin/feature/ct-locomotion` (`git show origin/feature/ct-locomotion:<path>`), not from master.
- Never touch feature/ct-locomotion, dev or master, the Mobile-Coop-locomotion worktree, or ports 4189 / 4191.
- Project knowledge lives in git (Michael swaps Claude accounts): every decision goes into these docs.

## Material from the 2026-10-15 mockup session
- [FINDINGS.md](FINDINGS.md): what read well, pose and animation problems seen, the arsenal renders, how to rerun.
- [menu-mock.patch](menu-mock.patch): the throwaway `?menuScene=` patch (reference only, never apply to a real
  branch as is). Starting point for session 4's lighting setups.
- Renders and contact page (local, not in git): `C:\NightShift\menu-mock\index.html` (sheets, voxel and smooth
  mockups, aim and co-op variants, arsenal). The detached worktree `C:\NightShift\Mobile-Coop-menu-mock` holds the
  patch applied at 911f51b (remove with `git worktree remove` when no longer needed; ask Michael first).
- Reference screenshots (Arkham Knight, not committed: third-party IP): main menu x2, title / press start, pause,
  graphics options, save select, at `C:\Users\Micha\.claude\uploads\9c2f0a4b-c86a-4cda-bdd4-bd87afa19a6c\`
  (99ead6e1, addfa2d0, a5ea6275, 0ada19a7, 56a46d97 .jpg, 645dd5c9 .webp). Described in STEP1-PROMPT.md in case
  the files are gone.
