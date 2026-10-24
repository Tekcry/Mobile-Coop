# Pages deploys queue instead of cancelling
kind: patch
- CI: the site deploy no longer cancels itself when a release push and the dev preview trigger overlap; pull request runs still cancel their older run.
