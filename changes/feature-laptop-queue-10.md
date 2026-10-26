# Laptop queue: no hung runs, fairer desktop and order
kind: patch
- A test run where no suite finishes for 17 minutes is stopped and reported, so it no longer holds a test slot for an
  hour.
- When a test fails on the desktop, the laptop gets the rerun straight away instead of waiting for the whole desktop
  run to end; a desktop run that gives no result is also rerun on the laptop instead of counting as a fail.
- The desktop judges a request by how long its real parts take, so long requests stay on the laptop.
- The desktop leaves room for a train that is about to start, and its log now shows how busy the PC really was,
  counting the test browsers.
- Updates that can go out next are tested before ones that wait on another update.
- Fixes and Michael's priority work are tested before a long measurement that has been waiting.
- A request moved to an earlier place in the queue keeps its run instead of being cancelled.
- A request taken off the queue during a fix freeze stops its run at once and runs again when it is put back.
- A test on the known-flaky list only hides the failure it was listed for; any other failure shows up as normal.
- Each try of a test run keeps its own logs, so a rerun no longer mixes with the first try.
