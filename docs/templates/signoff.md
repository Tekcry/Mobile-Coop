# <job>: sign-off <n> - <map / section / look name>
<!-- Owner: the orchestrator (template). Status: current. -->

<!-- Gate 4 of the intake, for maps, layouts and looks only. ONE page:
     Michael reads it in under a minute and clicks one decision. Copy to docs/<job>/SIGNOFF.md (or SIGNOFF-<n>.md),
     fill every <...>, delete these comments. Nothing past this point (greybox, detail art, look build) starts until
     he clicks. The orchestrator asks the decision as native multiple choice by day and records the pick below. -->

## Picture
<!-- To scale: a plan image with a scale bar and north arrow (scripts/plan-svg.mjs for maps), or the look render at the
     game camera. Committed path, plus the before shot for a change. -->
- Plan / render: `<docs/<job>/signoff/<file>.png>` (scale 1 m = <n> px)
- Before (changes only): `<path>`

## Intent check (5 lines)
1. Michael said: "<the verbatim quote this answers, with time>"
2. What this is: <one line>
3. What changes for the player: <one line>
4. What it does not do: <one line>
5. What it costs: <slices, ~hours, the areas' unwalked count>

## The decision
Q: <one question, e.g. "Build Campus S1 to this plan?">
- "<option 1: go as drawn>"
- "<option 2: the one alternative worth offering>"

## Michael's pick
<YYYY-MM-DD ~HH:MM> picked: "<option text>" <!-- filled by the orchestrator -->
