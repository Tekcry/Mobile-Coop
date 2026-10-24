# pr-size loads its script from the base branch
kind: patch
- CI: the `pr-size` job runs `scripts/pr-size.mjs` (and `glob-match.mjs`) as taken from the base branch, so PR
  branches cut before 4.100.0, which lack the script, no longer fail `check` with "Cannot find module".
