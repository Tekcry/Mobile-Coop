#!/usr/bin/env bash
# Laptop-queue waste audit (orchestrator, every cron run; Michael 2026-10-23 ~23:12 "make sure we aren't wasting time").
# Run from any checkout: bash docs/orchestrator/queue-audit.sh
# Flags each open request (no done claim) on origin/laptop-queue:
#   STALE   its sha's branch has since changed non-test files (the verdict cannot count): withdraw it
#   DUP     an older request from the same requester + set: keep the newest only
#   BIG     more than 2 suites on a PR whose diff vs master does not touch src/net (CLAUDE.md "Fewer per-PR runs")
#   CLAIM   claimed more than 90 min ago and not done (stuck claim)
# A request with "pin": true (deliberate old-sha A/B run) is never flagged STALE or DUP.
# Fast path (queue-audit: batch reads, under 10 s): every request and claim blob is read in ONE `git cat-file --batch`
# and parsed in a single node pass; git only runs again per OPEN request (branch --contains / diff for STALE, BIG).
git fetch -q origin laptop-queue master 2>/dev/null
git fetch -q origin 2>/dev/null &   # full fetch overlaps the node parse below (only the per-request git calls need it)
fetch_pid=$!
now=$(date +%s); total=0; waste=0; n=0
tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
US=$'\x1f'

# One pass: emit one line per open request (no done claim): id US sha US kind US req US set US k US pin US newestId US claimAt
read -r -d '' JS <<'EOJS'
const { execFileSync } = require('child_process');
const ref = 'origin/laptop-queue';
const git = (args, input) => execFileSync('git', args, { input, maxBuffer: 1 << 30 });
const reqs = git(['ls-tree', '-r', '--name-only', ref, 'requests']).toString().split('\n').filter(Boolean).sort();
const ids = reqs.map(r => r.replace(/^.*\//, '').replace(/\.json$/, ''));
const names = [...reqs.map(r => ref + ':' + r), ...ids.map(i => ref + ':claims/' + i + '.json')];
const buf = git(['cat-file', '--batch'], names.join('\n') + '\n');
const out = []; let p = 0;
for (let i = 0; i < names.length; i++) {
  const nl = buf.indexOf(10, p); const hdr = buf.toString('latin1', p, nl); p = nl + 1;
  if (/ missing$/.test(hdr)) { out.push(''); continue; }
  const size = +hdr.split(' ')[2];
  out.push(buf.toString('utf8', p, p + size)); p += size + 1;
}
const n = reqs.length;
const first = (s, re) => { const m = s.match(re); return m ? m[1] : ''; };
const reqOf = j => first(j, /"requester": "([^"]*)"/), setOf = j => first(j, /"set": "([^"]*)"/);
const newest = {};
for (let i = 0; i < n; i++) { const s = setOf(out[i]); if (s) newest[reqOf(out[i]) + '|' + s] = ids[i]; }
const US = '\x1f'; const lines = [];
for (let i = 0; i < n; i++) {
  const j = out[i], cl = out[n + i];
  if (cl.includes('"done":true')) continue;
  const req = reqOf(j), set = setOf(j);
  let k = 0;
  const sm = j.replace(/[\n ]/g, '').match(/"suites":\[([^\]]*)\]/);
  if (sm) k = sm[1].split(',').map(x => x.replace(/"/g, '').replace(/e2e-/g, '')).filter(Boolean).length;
  const pin = /"pin": *true/.test(j) ? '1' : '';
  lines.push([ids[i], first(j, /"sha": "([0-9a-f]*)"/), first(j, /"kind": "([^"]*)"/), req, set, k, pin, newest[req + '|' + set] || '', first(cl, /"at":"([^"]*)"/)].join(US));
}
process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
EOJS

audit_one() {
  local id=$1 sha=$2 kind=$3 req=$4 set=$5 k=$6 pin=$7 newest=$8 at=$9 flags="" b c cb cc age
  # Stale only when EVERY branch holding the sha has moved past it in non-doc / non-test files: a later slice
  # stacked on it (or another branch that merged it) is not a replacement for its own branch.
  b=""; c=0
  if [ -z "$pin" ]; then   # "pin": true = a deliberate run on an old sha (A/B perf diagnosis): never STALE or DUP (orchestrator audit 2026-10-24)
    # One `git diff-tree --stdin` for ALL candidate branches (was one `git diff` each). Each input line is "<branch tip> <sha>":
    # the header it prints is the (unique) tip, and an empty diff prints nothing (= 0 files). -M matches `git diff` renames.
    local cbs tips full t n_ i=0; local -A cnt=(); local -a tl
    cbs=$(git branch -r --contains $sha 2>/dev/null | grep -v HEAD | grep -vE 'train/|/dev$' | tr -d ' ')
    if [ -n "$cbs" ]; then
      full=$(git rev-parse $sha); tips=$(git rev-parse $cbs); tl=($tips)
      while read -r t n_; do cnt[$t]=$n_; done < <(printf "%s $full\n" $tips | git diff-tree --stdin -r -M --name-only |
        awk '/^[0-9a-f]{40}$/ { h=$0; seen[h]=1; next } $0 !~ /^(docs\/|tests\/|scripts\/e2e|changes\/|CHANGELOG)|\.md$/ { cnt[h]++ } END { for (h in seen) print h, cnt[h]+0 }')
      for cb in $cbs; do
        cc=${cnt[${tl[i]}]:-0}; i=$((i + 1))
        if [ "$cc" -eq 0 ]; then b=""; c=0; break; fi   # master counts only as a clean (0-file) holder: a request on the master tip is never STALE
        [ "$cb" = origin/master ] && continue
        if [ -z "$b" ] || [ "$cc" -lt "$c" ]; then b=$cb; c=$cc; fi
      done
    fi
  fi
  [ -n "$b" ] && flags="$flags STALE($b +$c files)"
  [ -z "$pin" ] && [ -n "$set" ] && [ "$newest" != "$id" ] && flags="$flags DUP(newer ${newest:0:15})"
  if [ "$kind" = "pr" ] && [ "$k" -gt 2 ] && ! git diff --name-only origin/master...$sha 2>/dev/null | grep -q '^src/net/'; then flags="$flags BIG($k suites, no src/net)"; fi
  if [ -n "$at" ]; then age=$(( (now - $(date -d "$at" +%s)) / 60 )); [ $age -gt 90 ] && flags="$flags CLAIM(${age} min)"; fi
  echo "${id:0:15} ${sha:0:8} ${req#Night Shift | } [$set] n=$k${flags:+ <-$flags}"
}

rows=$(node -e "$JS")
wait $fetch_pid
i=0
while IFS="$US" read -r id sha kind req set k pin newest at; do
  [ -z "$id" ] && continue
  total=$((total + k)); n=$((n + 1)); i=$((i + 1))
  audit_one "$id" "$sha" "$kind" "$req" "$set" "$k" "$pin" "$newest" "$at" > $tmp/$(printf %05d $i) &
  ks[i]=$k
done <<< "$rows"
wait
for ((j = 1; j <= i; j++)); do
  line=$(cat $tmp/$(printf %05d $j)); echo "$line"
  case $line in *" <-"*) waste=$((waste + ks[j]));; esac
done
echo "open: $n requests, $total suites; flagged: $waste suites"
