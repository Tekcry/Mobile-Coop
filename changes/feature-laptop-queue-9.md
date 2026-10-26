# Auto-train: fewer missed and wasted trains
kind: patch
- Auto-train no longer stops on a brief GitHub hiccup: a read that fails for a passing reason (such as HTTP 499) is tried
  once more after 5 seconds. Writes are never repeated.
- A train with nothing new in it no longer fails: auto-train goes idle and waits until a PR or master changes.
- A release no longer waits for the live site to update. Auto-train keeps watching the site on later ticks and repairs
  the deploy once if it is still behind 20 minutes after the release.
- The next train is paced by the laptop only: waiting requests and desktop work no longer hold it back, so trains go out
  about every hour again.
- A PR that meets the train-ready rule but was never labelled (as #460 was for train 103) now rides the next train;
  auto-train adds the label when it builds. A PR that lost the label on its current head stays out.
- Auto-train reads the PR list again at the start of a build, so a PR that turned ready seconds before (as #521 did for
  train 119) is no longer left for the next train.
- A draft PR is never taken into a train, never labelled, and loses a stray `train-ready`; the desktop test worker files
  no laptop rerun for a draft's failure.
- The watchdog's "request waiting too long" alert counts from the commit that added the request, so a re-filed request
  is not flagged because of its old id.
