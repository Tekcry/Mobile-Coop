# Release path hardening
kind: patch
- merge-train: the release title, minor / patch kind and CHANGELOG heading come from the members actually merged
  into `train/<n>` (a left-out member no longer names the release; the version follows the merged fragments).
- merge-train build: the version commit is built and the CHANGELOG assembled on git objects first (fragment format,
  empty train, nothing new, docs-only train); only a valid train is pushed, once, and its PR opened after the push.
- merge-train release / repair: the tail (tag, dev, member PRs, deploy) is idempotent; `release` of a merged train and
  the new `merge-train repair` (latest released version) redo only what is missing.
- Pages: one deploy per release, dispatched after dev moves with the tested head; lint and vitest are skipped when the
  live tree is that head's tree; each slot gets `version.json` and merge-train waits up to ~20 min, then prints
  whether `/preview/` serves the release (`PREVIEW: OK | STALE | UNKNOWN`).
- merge-train: `build 063` is train 63; a non-stacked build reusing a train PR drops a stale base marker.
