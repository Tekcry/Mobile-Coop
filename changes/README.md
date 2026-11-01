# Changelog fragments
Each PR adds ONE file here instead of editing `CHANGELOG.md`, so parallel branches never conflict in it.
- Name: the branch with `/` as `-`, e.g. `feature/sector-fixes` -> `changes/feature-sector-fixes.md`.
- Line 1: `# <short title>` (becomes the `###` subsection, or nothing when the release has one fragment).
- Optional line 2: `kind: minor` (a game change, the default) or `kind: patch` (a fix, test or docs only).
- Then the entries exactly as they would appear in `CHANGELOG.md` (`- ` bullets, wrapped lines indented).
- CI parses every fragment with the release parser (`tests/changesFragments.test.ts`), so a bad one fails the PR, not the release.
- More work on the branch: edit the same file. Never edit `CHANGELOG.md` or `package.json`'s version.
- At a release, run `node scripts/changelog-assemble.mjs <version> <title> <date> <PR> [members...]`: one
  `## <version> - ...` section, the fragments deleted.
- Legacy `## Unreleased - <job>` blocks on top of `CHANGELOG.md` are still folded in at that step.
