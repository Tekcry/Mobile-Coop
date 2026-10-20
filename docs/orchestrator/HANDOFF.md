# Account handoff (weekly limit)

Michael (2026-10-21 ~07:00): "use the remaining weekly usage as normal. Make more progress and we'll move all jobs to
another account when you hit the limit. Set 98% weekly usage to pause everything, save, and set up orchestrator to
deliver steps, prompts, models one at a time in the new account to resume everything".

## Trigger (99%, Michael ~09:45: "Run to 99% capacity then do handoff prompts")
The orchestrator checks `get_usage` on each wake. At weekly all-models >= 99%:
1. Message every working session: "Pause now: finish the step in hand only if it takes under 5 minutes, otherwise stop;
   commit and push your branch, update your job STATE.md (resume point + resume prompt), reply with the head, stop."
   The laptop runner finishes its current run, writes the summary to `C:/NightShift/scratch/runs/<label>/summary.txt`,
   and stops.
2. Update `docs/orchestrator/STATE.md` (open PRs with tested heads, laptop queue) and the table below with each
   session's head and its own resume prompt; push feature/menu.
3. Tell Michael: "Paused at 98%. Switch account, then paste the first prompt."

## In the new account
Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
prompts one at a time: the orchestrator first. The new orchestrator gives each next prompt with its session title, model
and effort, one per message, as the last thing in that message.

Sessions are new in the new account (a session's history stays with the old account): each resume prompt must stand
alone (the repo docs carry everything).

| Order | Session title | Model | Effort | Resume from |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | docs/orchestrator/STATE.md "Resume prompt" |
| 2 | Night Shift \| Course Ready Build | Opus 5.5 | medium | docs/anim-studio/STATE.md (Anim Studio PR 2, bake script) |
| 3 | Night Shift \| CT Core Build | Opus 5.5 | high | docs/anim-rework/STATE.md (#67 S2b) |
| 4 | Night Shift \| Character Build (laptop) | Opus 5.5 | medium | the laptop queue in docs/orchestrator/STATE.md |
| 5 | Night Shift \| Menu Notes Build | Opus 5.5 | high | docs/camera-cue/STATE.md (#63) and the GPU looks |
| 6+ | spare-capacity jobs | Opus 5.5 | medium | their STATE.md files (Marlow bunker #62, ...) |

Heads at the pause: filled in at the trigger.
