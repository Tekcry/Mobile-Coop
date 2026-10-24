#!/usr/bin/env bash
# Laptop-queue waste audit (orchestrator, every cron run; Michael 2026-10-23 ~23:12 "make sure we aren't wasting time").
# Run from any checkout: bash docs/orchestrator/queue-audit.sh
# Flags each open request (no done claim) on origin/laptop-queue:
#   STALE   its sha's branch has since changed non-test files (the verdict cannot count): withdraw it
#   DUP     an older request from the same requester + set: keep the newest only
#   BIG     more than 2 suites on a PR whose diff vs master does not touch src/net (CLAUDE.md "Fewer per-PR runs")
#   CLAIM   claimed more than 90 min ago and not done (stuck claim)
git fetch -q origin laptop-queue master 2>/dev/null
git fetch -q origin 2>/dev/null
now=$(date +%s); total=0; waste=0; n=0
declare -A newest
reqs=$(git ls-tree -r --name-only origin/laptop-queue requests | sort)
for r in $reqs; do
  j=$(git show origin/laptop-queue:$r); id=$(basename $r .json)
  req=$(echo "$j" | grep -o '"requester": "[^"]*"' | cut -d'"' -f4); set=$(echo "$j" | grep -o '"set": "[^"]*"' | cut -d'"' -f4)
  [ -n "$set" ] && newest["$req|$set"]=$id
done
for r in $reqs; do
  id=$(basename $r .json); cl=$(git show origin/laptop-queue:claims/$id.json 2>/dev/null)
  echo "$cl" | grep -q '"done":true' && continue
  j=$(git show origin/laptop-queue:$r)
  sha=$(echo "$j" | grep -o '"sha": "[0-9a-f]*"' | cut -d'"' -f4)
  kind=$(echo "$j" | grep -o '"kind": "[^"]*"' | cut -d'"' -f4)
  req=$(echo "$j" | grep -o '"requester": "[^"]*"' | cut -d'"' -f4); set=$(echo "$j" | grep -o '"set": "[^"]*"' | cut -d'"' -f4)
  suites=$(echo "$j" | tr -d '\n ' | grep -o '"suites":\[[^]]*\]' | sed 's/"suites":\[//;s/\]//;s/"//g;s/e2e-//g')
  k=$(echo "$suites" | tr ',' '\n' | grep -c .); total=$((total + k)); n=$((n + 1)); flags=""
  # Stale only when EVERY branch holding the sha has moved past it in non-doc / non-test files: a later slice
  # stacked on it (or another branch that merged it) is not a replacement for its own branch.
  b=""; c=0
  for cb in $(git branch -r --contains $sha 2>/dev/null | grep -v HEAD | grep -vE 'train/|/master$|/dev$' | tr -d ' '); do
    cc=$(git diff --name-only $sha $cb | grep -vcE '^(docs/|tests/|scripts/e2e|changes/|CHANGELOG)|\.md$')
    if [ "$cc" -eq 0 ]; then b=""; c=0; break; fi
    if [ -z "$b" ] || [ "$cc" -lt "$c" ]; then b=$cb; c=$cc; fi
  done
  if [ -n "$b" ]; then
    flags="$flags STALE($b +$c files)"
  fi
  [ -n "$set" ] && [ "${newest[$req|$set]}" != "$id" ] && flags="$flags DUP(newer ${newest[$req|$set]:0:15})"
  if [ "$kind" = "pr" ] && [ "$k" -gt 2 ] && ! git diff --name-only origin/master...$sha 2>/dev/null | grep -q '^src/net/'; then flags="$flags BIG($k suites, no src/net)"; fi
  if [ -n "$cl" ]; then at=$(echo "$cl" | grep -o '"at":"[^"]*"' | cut -d'"' -f4); age=$(( (now - $(date -d "$at" +%s)) / 60 )); [ $age -gt 90 ] && flags="$flags CLAIM(${age} min)"; fi
  [ -n "$flags" ] && waste=$((waste + k))
  echo "${id:0:15} ${sha:0:8} ${req#Night Shift | } [$set] n=$k${flags:+ <-$flags}"
done
echo "open: $n requests, $total suites; flagged: $waste suites"
