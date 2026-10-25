# <job>: brief
<!-- Owner: the orchestrator (template). Status: current. -->

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
- Rules that hold: <hard rules, the level standard and the DECISIONS entries that bound it, as G-numbers>.
- Areas touched and their unwalked count (cap 3 per area): <area: n>.

## Answers (M) and assumptions (A)
<!-- M = Michael's answers during the job. A = the lead's assumptions; each one says how to undo it.
     An assumption that would loosen a rule only Michael may change (hard rules, level standard, DECISIONS, scope he
     set) follows docs/RULES.md "Intake" step 2: by day it is a question below; overnight it is an A-line marked
     "overnight, loosens <rule>", sent to the orchestrator for Michael's next look. -->
- M1 <date>: <answer>
- A1: <assumption>. Undo: <how, e.g. "set X back to Y in src/...", "drop slice S3">.

## Questions for Michael (one click each, asked by day)
- Q1: <question> - options: "<a>" / "<b>". Blocks: <slice or nothing>. Default until answered: <the rule as written, or
  the overnight A-line it replaces>.

## Sign-off needed
<yes (map / layout / look: docs/<job>/SIGNOFF.md before build) or no>
