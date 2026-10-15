# Operators run - the workflow prompt (steps 05-18)

Why: a session cannot start another session (found at the end of step 04, 2026-10-16: the app refuses `start_session`
on a turn started by another session). Michael chose (2026-10-16) to run the remaining steps as one workflow.

Design (Michael, 2026-10-16, after comparing with the locomotion run): each step is implement -> independent Opus High
checker (re-runs the checks, reads every render against ART-DIRECTION and SPEC 1) -> up to 3 fix rounds -> finish
(commit, push, send renders). Rules: RULES.md "Step loop". The script is in git: `docs/operators/run.workflow.js`.
The first version (2026-10-16 00:33, builder self-check plus a Sonnet exit-code verifier) was stopped 5 minutes into
step 05 and replaced by this one.

How to start or resume: open a new session in `C:\NightShift\Mobile-Coop-operators`, Opus 5.5, effort High, and paste:

```
Use a workflow to run the operators run, fully automated. I (Michael) am asleep and will not answer anything. Do not start other sessions.
1. Call mcp__ccd_host__request_keep_awake (until session_idle).
2. Run the branch guard: cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators". If it fails, STOP. If the tree is not clean, a step was cut off mid-work: leave the files (the next implementer continues from them).
3. Read only docs/operators/STATE.md to find the first step not yet done (NN).
4. Run the workflow script in git, without rewriting it: Workflow({scriptPath: "C:\\NightShift\\Mobile-Coop-operators\\docs\\operators\\run.workflow.js", args: {from: "NN"}}). Then wait for it to finish and report the summary.
```
