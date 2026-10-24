# <job>: plan

<!-- How to use: copy to docs/<job>/PLAN.md, fill every <...>, delete these comments. Gate 2 of the intake
     (docs/systems/session-method.md "Intake"). Keep the claims block's fence and keys exactly: scripts/claims-check.mjs
     parses it. Commit and push BRIEF + PLAN before the plan checker starts. -->

Lead: <session title>. Planner: <model>, master <sha>. Brief: `docs/<job>/BRIEF.md`.

## Claims
<!-- Everything this job will change, so the checker can compare it with every other open branch.
     files: repo paths or globs (`*` inside a folder, `**` any depth, `{a,b}`); be as narrow as you can.
     maps: map ids (e.g. ctcourse, sectorOps, campusOps). protocol: wire message names in src/net/protocol.ts, or none.
     save: save-shape fields (src/save), or none. A key takes a comma list or `- item` lines. -->
```claims
files:
  - <src/path/file.ts>
  - <src/area/**>
  - <tests/area*.test.ts>
maps: <map ids, or none>
protocol: <message names, or none>
save: <save fields, or none>
```

## Slices
<!-- Each slice is one PR: <= ~1.5k changed lines (not counting generated assets, snapshots, lockfiles, docs) or ~4 h.
     Bigger: split it. A slice that is not playable on its own ships dark behind a flag (table below). -->
**S1 <name> (<builder model>).** <What it builds, one paragraph.>
- Files: <paths>. Est. lines: <n>.
- Checks: <unit files, e2e suites, shots>.
- Done looks like: <what a checker or Michael sees>.
- Flag: <none, or the flag from the table>.

**S2 <name> (<builder model>).** ...

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| <`?flag=1` or config key> | off | <session title> | <YYYY-MM-DD> | <slices passed + walk item accepted> |

## Walk items
<!-- What Michael will check on the walk card once this ships; one line each, ranked by risk. -->
- <menu path>: <what to look for> - accept when <acceptance line>.

## Risks and open questions
- <risk>: <mitigation>.
