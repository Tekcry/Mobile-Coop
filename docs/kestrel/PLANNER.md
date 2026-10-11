# Kestrel planner sessions
Rules for planner sessions (Michael, 2026-10-11). A planner session starts when Michael's message begins "Planner:".

## Start
- git checkout feature/kestrel && git pull; confirm the branch.
- Read this file, docs/kestrel/handover.md, and docs/kestrel/progress.md (status table and newest 5 log entries only). Open other files only for the section the job needs (grep -n '^#', then line ranges).

## Jobs (one per session, then stop)
- "Planner: next": First review the last session's output against the brief and RULES: check its self-check covered the universal checks, and that each recommended option meets the brief. List anything you disagree with, with your own recommendation, before writing the next prompt. Then read what the last session committed (its document section, progress row and log line), update handover.md (Status, Order, Notes), and write the next prompt file. If the last session left an unanswered question, stop and list it with its recommended option instead.
- "Planner: APPROVED <stage>": follow RULES section 10 for that stage, update handover.md Status, then do the "next" job if the next prompt file does not exist yet.
- "Planner: <anything else>": answer Michael's question from the repo; record any decision he makes, dated, in progress.md "Decisions by Michael" and in handover.md when it affects later stages.
- "Planner: split this smaller": rewrite the last prompt file not yet run (or the one that stalled) as smaller parts per RULES 7, as new files; leave the old file unchanged.
Never run while a stage session is running. Never edit a stage's output files except status lines on approval.

## Prompt files
- Path docs/kestrel/prompts/<stage>.md, or <stage>-<part>.md (1a, 1b, 2, 3 ...). Line 1 the title, line 2 "Model: <model>, <effort> effort." (RULES 7 model use and task size).
- Complete and standalone: branch switch and check, preconditions, the exact files and line ranges to read, task, outputs, self-check, end per RULES section 9.
- Follow RULES 7 task size: one deliverable per session, capped at about 15-20 decisions; split anything bigger into parts. Precompute simple positions and sizes from approved documents into a table for the session to verify, with sources.
- Line 3 of every prompt is 'Decisions: N' (count of placements or decisions). If N is over 20, split before writing the prompt. Never set high effort.
- Never edit a prompt file after its session has run; write a new one with -r2, -r3.
- Before writing a prompt, check its task matches the stage's definition in its document header and RULES; never add a later stage's detail. Layout prompts include the candidate-first method and a ready self-check script.
- Feasibility first: before writing any layout or puzzle prompt, test with simple arithmetic that its constraints can all be met (areas against the space, door frontage against corridor length, widths against depths) and write the sums into the prompt. If they cannot all be met, do not write the prompt: bring Michael the conflict as a question with options, recommended first.

## Talking to Michael
- Answer his question first, then ask. At most 5 questions, each as native multiple choice with 2-4 options, the recommended option first marked "(Recommended)" with a one-line reason.
- Show one step at a time.
- Plain English, short sentences, hyphens not em dashes.
- When he must check something on PC or phone (a walk, a camera test), give numbered steps.

## Ending
- Commit only files you changed: "kestrel planner: <summary>". Push. Budget about 20 tool calls.
- The session ends with a "Next step" block in exactly this format: "Next step:" then "1. Type /clear." "2. Switch to <model>, <effort> (or "Stay on <model>, <effort>" if unchanged)." "3. Send the prompt below:" followed by the exact message in its own fenced code block (nothing else in the block) so Michael can tap copy. Any other prompt or command Michael must paste also goes in a code block. "Planner: next" always uses Opus, medium; approvals, recording decisions and simple questions use Sonnet, medium.
