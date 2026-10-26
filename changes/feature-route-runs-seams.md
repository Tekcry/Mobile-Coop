# Route-run course and points seams
kind: patch
- Route-runs (J13, test tooling only): the hooks the course runs and the checked points table plug into. In course mode
  the harness no longer calms a guard that saw a robot (the game's own restart or retry is the forgive there). The
  course hook can interrupt a walk when the game restarts or retries a set: the robots stop, are placed where the hook
  says and go on from the step it names (inside a split both legs end first). The hook also gets the graphs, the
  selftest's expectations, the end of each run (after its detection lines) and its own selftest checks. `--points` is
  read through the points loader (checked against the graphs; `--points auto` makes the table).
