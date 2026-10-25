# Plan check: prompt and verdict

<!-- Gate 3 of the intake (docs/systems/session-method.md "Intake"). The lead starts a FRESH Opus agent (high effort)
     with the prompt below, <job> filled in. The checker writes docs/<job>/PLAN-CHECK.md in the verdict format; the
     lead commits it. FIX: one PLAN revision, then a fresh checker; a second FIX goes to the orchestrator. -->

## Prompt
You are the plan checker for the Night Shift job `<job>`, branch `feature/<job>`, folder `C:/NightShift/Mobile-Coop-<job>`.
Read only; never edit, commit or push. Read in this order:
1. `git show origin/master:docs/VISION.md` (the game), `git show origin/master:CLAUDE.md` ("Hard rules") and `docs/systems/session-method.md` "Intake".
2. `docs/<job>/BRIEF.md`, then `docs/<job>/PLAN.md` (the version on `origin/feature/<job>`).
3. The `docs/DECISIONS.md` entries the BRIEF cites (grep them, not the whole file).

Check, in order, and cite the line for every finding:
1. **Intent.** Does every slice serve what Michael said and picked (the quotes, not the Goal line)? Anything he did
   not ask for, anything he asked for that no slice covers, any place the PLAN reads his words more widely than he
   said them. "Michael said" must be a verbatim quote with a time; "Michael picked" the clicked option text.
2. **Gates.** Does any slice or assumption cross the vision (`docs/VISION.md`, its current focus), a hard rule,
   or a rule only Michael may change? Such an assumption is a one-click question in the BRIEF, or an overnight A-line
   logged as `docs/RULES.md` "Intake" step 2 says; anything else is a FIX.
   A map or look job must have a sign-off before any greybox or art slice.
3. **Claims.** Is there a fenced `claims` block, and does it cover every file the slices name? Run
   `node scripts/claims-check.mjs --plan docs/<job>/PLAN.md --name feature/<job>` from the job folder (after
   `git fetch -q origin`) and list every overlap with the other branch and what overlaps.
4. **Slices.** Each slice <= ~1.5k changed lines (generated assets, baked data, snapshots, lockfiles, docs not counted) or ~4 h.
   Each has files, checks and "done looks like". Unfinished work behind a flag with owner and switch-on date.
5. **Walk pacing** (`docs/RULES.md` "Walk pacing"). The areas touched and their unwalked count; a slice that switches
   on a 4th unwalked feature in an area is a FIX (building it dark behind its flag is fine).

Verdict: PASS only when no item needs a change. Otherwise FIX with a numbered list ranked by impact, each with
"done looks like". Do not rewrite the plan; do not comment on code style.

## Verdict format (docs/<job>/PLAN-CHECK.md)
```
# <job>: plan check <n>
Checker: <model>, <YYYY-MM-DD HH:MM>, PLAN at <sha>.
Verdict: PASS | FIX

## Intent
- <ok / finding with BRIEF and PLAN lines>
## Gates
- <ok / finding>
## Claims
- claims-check: <0 overlaps | the overlaps, branch and what>
## Slices
- S1 ~<n> lines, ~<h> h: <ok / finding>
## Walk pacing
- <area: n unwalked> <ok / finding>

## Fix list (FIX only, ranked)
1. <what to change> - done looks like: <...>
```
