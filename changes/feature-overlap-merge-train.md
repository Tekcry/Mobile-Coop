# Merge train: stacked builds and release guards (overlapping trains)
kind: patch
- merge-train: `build <n> ... --on <sha>` builds a train on another unreleased train's version head (overlapping
  trains, slice 1): the sha must be an `origin/train/<m>` head with master and train m's version commit in it; members,
  the CHANGELOG heading and the member PRs closed at release are only train n's own; `PROTOCOL_VERSION` is bumped from
  the base head's value; the train PR body carries `<!-- auto-train:base train/<m> <sha> -->`.
- merge-train release: a head carrying another train's version commit that master lacks stops with exit 4 ("base train
  not merged"), for every release and lone-PR release. A stacked train is released only after its base merged exactly at
  the recorded sha, tagged, with `git merge-tree` showing GitHub's merge keeps the tested tree; its `gh pr merge` is
  retried up to ~2 min while GitHub settles, and a merge commit whose tree differs from the tested head exits 5.
  Inert until auto-train builds stacked trains.
