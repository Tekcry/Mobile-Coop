# decisions-fold - state

Set by the orchestrator, 2026-10-21 ~09:30 (Michael approved). Job lead: "Night Shift | Sector Ops Build". Branch
`feature/decisions-fold` from master f7e89679, folder `C:/NightShift/Mobile-Coop-decisions-fold`. Docs only (CI check
is the tier).
Ask: every Michael answer in docs/ROADMAP.md "## Decided" (source: `git show origin/feature/menu:docs/ROADMAP.md`, PR #74)
not yet in docs/DECISIONS.md goes into DECISIONS as G192 onward, in date order, formatted like G187-G191 (bold title,
Michael's words verbatim (G114), the rule in one or two sentences). Skip process-only items (budget pauses, account
switch, test ordering); keep design, gameplay, animation, tool, map and platform decisions. Add each to
docs/design-bible.md (one line, right section). Do NOT edit docs/ROADMAP.md (orchestrator only): list the folded entries
and their G numbers in the PR body. One writer, one fresh checker for wording faithfulness.

**Now:** G192-G228 written, checker FIX (7 wording items, check.md), fix round applied; docs PR opened.
**Next:** fresh checker; at most one fix round; docs PR; send the PR to the orchestrator; stop.

## Resume prompt
```
Night Shift | Sector Ops Build. You are the job lead for decisions-fold (docs only). Work only in
C:\NightShift\Mobile-Coop-decisions-fold on feature/decisions-fold (git pull --ff-only first). Read CLAUDE.md
"Sessions" and docs/decisions-fold/STATE.md. Carry on from "Now / Next": one Opus writer, one fresh checker, at most
one fix round. Never edit docs/ROADMAP.md. Done: docs PR (folded entries and G numbers in the body), send it to the
orchestrator, stop. Lean tokens.
```
