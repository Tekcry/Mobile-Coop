# Laptop queue: alone starvation, desktop CPU gates, faster restart
kind: patch
- Tooling: an alone measurement that has waited over 30 min (was 45) stops new PR claims on the laptop until it runs,
  also while a train holds alone runs back; the desktop overflow lanes start under 80 % CPU (was 60 / 50 %); the queue
  task triggers every minute (was 5), so a self-update restart takes about a minute.
- Tooling: the laptop starts no new request while a train builds or for 3 min after a train release with train-ready
  PRs waiting, and claims no request onto a slot held by a manual lock.
