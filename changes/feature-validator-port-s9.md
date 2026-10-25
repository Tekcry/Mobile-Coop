# Marlow Yard graph on the training profile
kind: patch

- Tooling and docs, no game change: the Marlow Yard level graph (`docs/marlow-final/graph/ctcourse.json`, as built at
  4.103) is on master on the training profile, with `taught_by` A7 and eight teach elements taken from the course spec.
- It has been measured with `level-measure --write`, and the validator run with `--require-measured` is saved beside it
  as `run.txt`, with a `REPORT.md` that maps each error to the re-plan slice that fixes it.
