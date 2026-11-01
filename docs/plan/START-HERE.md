# Night Shift - start here (for Michael)
Owner: the orchestrator. Status: current.

## How this works now
- Claude runs the project: the plan, the order of work, the testing and keeping scope under control.
- You only ever do one thing at a time, and Claude always tells you exactly what it is.
- The four things you will ever be asked to do:
  1. Paste the one prompt Claude gives you (it tells you where, and which model and effort to set first).
  2. Answer its multiple-choice questions (pick "(Recommended)" unless you disagree).
  3. Do a hand step it writes out for you (for example a free sign-up), click by click.
  4. Play a test with your partner and tell it what happened.
- Nothing lives only in chat. The live state is on GitHub, so swapping accounts or starting a new session loses nothing.

## Your first step (once)
1. Go to your current main Night Shift Claude Code session (the one doing the clean-up).
2. Type `/model` and pick **Opus 5.5**. Then type `/effort high`.
3. Paste:

```
New master plan from Michael. Run git fetch origin handover/master-plan, read docs/plan/MASTER-PLAN-PROMPT.md on that branch in full, and do its section 17 ("First run") exactly. From now on you are the orchestrator it describes.
```

4. It will read for a while, put the plan on GitHub, set up the control panel and carry on with the clean-up. When it
   needs you, it ends its message with one clear next step.

## The one line to remember (you can also copy it from here any time)
After a usage limit resets in the same session, type `continue`. In a new session or a new account, start the session
in the Night Shift folder, type `/model` and pick **Opus 5.5**, type `/effort high`, and paste:

```
Night Shift: resume. Read the pinned GitHub issue "Night Shift - control panel" and docs/plan/MASTER-PLAN-PROMPT.md section 16, then carry on exactly where the panel says.
```

## Seeing progress
GitHub, repository Tekcry/Mobile-Coop, the Issues tab, the pinned issue "Night Shift - control panel". It shows the
current phase, what is being worked on, what is next and whether anything is waiting on you.
