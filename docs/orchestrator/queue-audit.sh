#!/usr/bin/env bash
# Laptop-queue waste audit (orchestrator, every cron run; Michael 2026-10-23 ~23:12 "make sure we aren't wasting time").
# Run from any checkout: bash docs/orchestrator/queue-audit.sh
# Flags each open request (no done claim) on origin/laptop-queue:
#   STALE   its own branch (the request's "branch", else the sha's sole non-master holder) has since changed non-test files: withdraw it
#   DUP     an older request from the same requester + set + branch (or PR) with overlapping suites: keep the newest only
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

# One pass: emit one line per open request (no done claim): id US sha US kind US req US set US k US pin US newestId US claimAt US branch
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
// DUP: an open request is a dup only of a NEWER open request with the same requester + set + branch (else PR number)
// and an overlapping suite list (an empty list overlaps anything). Different branch / PR is never a dup.
const brOf = j => first(j, /"branch": "([^"]*)"/) || (first(j, /"pr": *(\d+)/) ? 'pr' + first(j, /"pr": *(\d+)/) : '');
const suitesOf = j => { const m = j.replace(/[\n ]/g, '').match(/"suites":\[([^\]]*)\]/); return m ? m[1].split(',').filter(Boolean) : []; };
const open = i => !out[n + i].includes('"done":true');
const newestOf = i => {
  const set = setOf(out[i]); if (!set) return '';
  const req = reqOf(out[i]), br = brOf(out[i]), su = suitesOf(out[i]); let hit = '';
  for (let m = i + 1; m < n; m++) {
    if (!open(m) || setOf(out[m]) !== set || reqOf(out[m]) !== req || brOf(out[m]) !== br) continue;
    const sm = suitesOf(out[m]);
    if (!su.length || !sm.length || su.some(x => sm.includes(x))) hit = ids[m];
  }
  return hit;
};
const US = '\x1f'; const lines = [];
for (let i = 0; i < n; i++) {
  const j = out[i], cl = out[n + i];
  if (cl.includes('"done":true')) continue;
  const req = reqOf(j), set = setOf(j);
  let k = 0;
  const sm = j.replace(/[\n ]/g, '').match(/"suites":\[([^\]]*)\]/);
  if (sm) k = sm[1].split(',').map(x => x.replace(/"/g, '').replace(/e2e-/g, '')).filter(Boolean).length;
  const pin = /"pin": *true/.test(j) ? '1' : '';
  lines.push([ids[i], first(j, /"sha": "([0-9a-f]*)"/), first(j, /"kind": "([^"]*)"/), req, set, k, pin, newestOf(i), first(cl, /"at":"([^"]*)"/), first(j, /"branch": "([^"]*)"/)].join(US));
}
process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
EOJS

audit_one() {
  local id=$1 sha=$2 kind=$3 req=$4 set=$5 k=$6 pin=$7 newest=$8 at=$9 br=${10} flags="" b c cb cc age
  # Stale only when EVERY branch holding the sha has moved past it in non-doc / non-test files: a later slice
  # stacked on it (or another branch that merged it) is not a replacement for its own branch.
  b=""; c=0
  if [ -z "$pin" ]; then   # "pin": true = a deliberate run on an old sha (A/B perf diagnosis): never STALE or DUP (orchestrator audit 2026-10-24)
    # One `git diff-tree --stdin` for ALL candidate branches (was one `git diff` each). Each input line is "<branch tip> <sha>":
    # the header it prints is the (unique) tip, and an empty diff prints nothing (= 0 files). -M matches `git diff` renames.
    local cbs tips full t n_ i=0; local -A cnt=(); local -a tl
    # Candidate branches (a request is judged only against the branch it belongs to; verdicts on a released train head / master
    # commit were flagged against unrelated branches cut from master later, 2026-10-25):
    #   branch named in the request JSON -> only origin/<branch> (and only if it still contains the sha)
    #   none named -> never STALE if the sha is in origin/master or a train/* ref; else only if exactly ONE other branch holds it
    #   (an unambiguous owner); a sha shared by several branches has no single owner to judge against.
    cbs=""
    if [ -n "$br" ]; then
      br=${br#origin/}
      if git merge-base --is-ancestor $sha origin/$br 2>/dev/null; then cbs=origin/$br; fi
    else
      cbs=$(git branch -r --contains $sha 2>/dev/null | grep -v HEAD | grep -vE '/dev$' | tr -d ' ')
      if echo "$cbs" | grep -qE '^origin/(master|train/)'; then cbs=""
      elif [ "$(echo "$cbs" | grep -c .)" -ne 1 ]; then cbs=""; fi
    fi
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
  [ -z "$pin" ] && [ -n "$newest" ] && flags="$flags DUP(newer ${newest:0:15})"
  if [ "$kind" = "pr" ] && [ "$k" -gt 2 ] && ! git diff --name-only origin/master...$sha 2>/dev/null | grep -q '^src/net/'; then flags="$flags BIG($k suites, no src/net)"; fi
  if [ -n "$at" ]; then age=$(( (now - $(date -d "$at" +%s)) / 60 )); [ $age -gt 90 ] && flags="$flags CLAIM(${age} min)"; fi
  echo "${id:0:15} ${sha:0:8} ${req#Night Shift | } [$set] n=$k${flags:+ <-$flags}"
}

rows=$(node -e "$JS")
wait $fetch_pid
i=0
while IFS="$US" read -r id sha kind req set k pin newest at br; do
  [ -z "$id" ] && continue
  total=$((total + k)); n=$((n + 1)); i=$((i + 1))
  audit_one "$id" "$sha" "$kind" "$req" "$set" "$k" "$pin" "$newest" "$at" "$br" > $tmp/$(printf %05d $i) &
  ks[i]=$k
done <<< "$rows"
wait
for ((j = 1; j <= i; j++)); do
  line=$(cat $tmp/$(printf %05d $j)); echo "$line"
  case $line in *" <-"*) waste=$((waste + ks[j]));; esac
done
echo "open: $n requests, $total suites; flagged: $waste suites"
