# Changelog fragment check in CI
kind: patch
- Tests: CI parses every `changes/*.md` fragment with the train build parser (`tests/changesFragments.test.ts`), so a fragment without its "# <title>" line or entries fails the PR instead of the train build (train 39).
