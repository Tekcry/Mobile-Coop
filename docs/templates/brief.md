# <job>: brief

<!-- How to use: copy to docs/<job>/BRIEF.md, fill every <...>, delete these comments. Gate 1 of the intake
     (docs/systems/session-method.md "Intake"). The plan checker compares the PLAN against the two Michael sections,
     so they hold his words and clicks exactly, never a summary. -->

Lead: <session title>. Started: <YYYY-MM-DD HH:MM>. Base: master <sha>.

## Michael said
<!-- Verbatim, with time and source. Several quotes: one bullet each, oldest first. Typos stay. -->
- <YYYY-MM-DD ~HH:MM, chat / walk note / voice>: "<his exact words>"

## Michael picked
<!-- The exact option text of each multiple-choice answer he clicked, with the question. "none" if he picked nothing. -->
- <YYYY-MM-DD ~HH:MM> Q: "<question>" -> picked: "<option text as shown>"

## Goal
<One or two sentences: what is true in the game when this job is done, in Michael's terms.>

## Limits
- Out of scope: <what this job does not do>.
- Rules that hold: <current goal / hard rules / DECISIONS entries that bound it, e.g. "no perf tuning (current goal)", G-numbers>.
- Areas touched and their unwalked count (cap 3 per area): <area: n>.

## Answers (M) and assumptions (A)
<!-- M = Michael's answers during the job. A = the lead's assumptions; each one says how to undo it.
     An assumption that touches a rule only Michael may change (current goal, hard rules, level standard, DECISIONS,
     scope he set) is NOT made: write it under "Questions for Michael" and leave that part waiting. -->
- M1 <date>: <answer>
- A1: <assumption>. Undo: <how, e.g. "set X back to Y in src/...", "drop slice S3">.

## Questions for Michael (one click each, asked by day)
- Q1: <question> - options: "<a>" / "<b>". Blocks: <slice or nothing>. Default until answered: the rule as written.

## Sign-off needed
<yes (map / layout / look: docs/<job>/SIGNOFF.md before build) or no>
