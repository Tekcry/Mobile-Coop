# tuner-clarity STATE

## Resume block
- Job: make the tuner and Anim Studio say plainly whether each setting changes the motion-capture or the hand-made
  moves, show what is playing now, warn on edits that change nothing, and give the Keys tab a Legs part with ankle /
  shin twist (BRIEF.md goal 1-5, A1-A7). ROADMAP Now row 0c; runs during the docs-first hold by Michael's instruction.
- Branch feature/tuner-clarity, worktree C:/NightShift/Mobile-Coop-tuner-clarity, from origin/master f24ebbf6a.
- 16:45: S1-S3 merged and checked (Opus PASS); S5 docs merged (written ahead of S4: recheck class names and strings
  against S4). Running: S4 Sonnet builder in C:/NightShift/Mobile-Coop-tuner-clarity-s4 (feature/tuner-clarity-s4,
  brief C:/NightShift/scratch/ctcore/tuner-clarity/S4-BRIEF.md plus the lead note: compare `NOW_PLAYING.clip` by
  reference too, the clip hash collides). If cut off: resume S4 from its branch head. Worktrees junction node_modules
  to this one; builders use plain tsc.
- Polish left (S1-S3 checker): `ReachNow` has no gun-drawn flag (a holstered row edited while she walks drawn gives no
  warning); idle Body / Joints rows tag "Both" though idle is mostly hand-made; a studio mocap_ clip's text says
  motion capture while `playing().mocap` is 0.
- Polish left (S4+S5 checker, PASS on a404bfc9; held so the running e2e is not restarted; do it in a fix round or the
  next batch): e2e-studio `waitPlay('motion-capture walk')` unanchored (`'^Now playing: motion-capture walk$'` or wait
  on `playing().mocap >= 0.9`); `syncReach` band has no hysteresis (~0.02); `keyToolWarn` with no row falls back to the
  trunk words; the badge can be cut off by the name's ellipsis on narrow widths; ui.md ~130 "Not playing now" wording
  (A11), ~132 tag is "Hand-made" and only part notes exist, ~140 parts show "Left leg" / "Right leg" (no "(key)",
  also testing-tools.md ~343), ~141 + the fragment say "ankle twist" but the row is "Foot twist (toes out)", ~142 rewrap.
- pr-size: 2355 counted before S4 (tests ~1.3k); S2 is not separable any more (S3 / S4 use its leg rows): ask the
  orchestrator for `big-pr` at PR open.
- Gates: plan checker PASS before build; Opus builds src/anim; checker per batch; laptop queue e2e-studio and
  e2e-tuner-phone (`node C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full> --pr <n> --suites "e2e-studio
  e2e-tuner-phone" --set tuner-clarity --requester "Night Shift | Player Build"`).
- Message the orchestrator at PR open / train-ready / blocked.

Next: merge S4; Opus checker on S4 + S5 (docs vs final strings); build; PR (look video path in the body); request
e2e-studio e2e-tuner-phone + e2e-coop e2e-netmove (S2 touches src/player); message the orchestrator (PR open, big-pr).

## Done
- 2026-10-25 ~15:35 BRIEF.md. ~15:50 PLAN.md (Opus planner), BRIEF A8-A12.
- ~16:40 S1-S3 Opus checker PASS on 28275784e (62/62 tests, tsc clean); polish 89fb01996 (knee lift / track warning
  names Joints, BRIEF A11 wording). S5 docs ce327eae0 merged.
