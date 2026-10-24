// Glob helpers shared by scripts/pr-size.mjs and scripts/claims-check.mjs (intake gates, 2026-10-24).
// Globs use `/` separators: `*` and `?` stay inside one path segment, `**` spans any number of segments (also none),
// `{a,b}` is an alternative. No character classes. Paths are repo-relative with `/`.

/** Expands `{a,b}` alternatives (nested too) into plain globs. */
export function expandBraces(glob) {
  const open = glob.indexOf('{');
  if (open < 0) return [glob];
  let depth = 0;
  let close = -1;
  const commas = [];
  for (let i = open; i < glob.length; i++) {
    const c = glob[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { close = i; break; } }
    else if (c === ',' && depth === 1) commas.push(i);
  }
  if (close < 0) return [glob];
  const head = glob.slice(0, open);
  const tail = glob.slice(close + 1);
  const bounds = [open, ...commas, close];
  const out = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    for (const alt of expandBraces(glob.slice(bounds[k] + 1, bounds[k + 1]))) out.push(...expandBraces(head + alt + tail));
  }
  return out;
}

const esc = (s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&');

/** One glob (braces allowed) as an anchored RegExp over a whole repo-relative path. */
export function globToRegExp(glob) {
  const alts = expandBraces(normalize(glob)).map((g) => {
    let re = '';
    const segs = g.split('/');
    segs.forEach((seg, i) => {
      const last = i === segs.length - 1;
      if (seg === '**') { re += last ? '.*' : '(?:[^/]+/)*'; return; }
      re += seg.split('').map((c) => (c === '*' ? '[^/]*' : c === '?' ? '[^/]' : esc(c))).join('');
      if (!last) re += '/';
    });
    return re;
  });
  return new RegExp(`^(?:${alts.join('|')})$`);
}

/** True when the path matches any of the globs. */
export function matchesAny(path, globs) {
  const p = normalize(path);
  return globs.some((g) => globToRegExp(g).test(p));
}

/** Trims, turns `\` into `/`, drops a leading `./` or `/`. */
export function normalize(p) {
  return String(p).trim().replace(/\\/g, '/').replace(/^\.?\//, '');
}

// Two patterns intersect when some string matches both. Tokens: a star (any run) or one symbol (a literal or `?`).
// `eq(a, b)` says whether two single symbols can be the same thing.
function intersects(a, b, isStar, eq) {
  const memo = new Map();
  const go = (i, j) => {
    const key = i * (b.length + 1) + j;
    if (memo.has(key)) return memo.get(key);
    let r;
    if (i === a.length && j === b.length) r = true;
    else if (i < a.length && isStar(a[i])) r = go(i + 1, j) || (j < b.length && go(i, j + 1));
    else if (j < b.length && isStar(b[j])) r = go(i, j + 1) || (i < a.length && go(i + 1, j));
    else if (i < a.length && j < b.length) r = eq(a[i], b[j]) && go(i + 1, j + 1);
    else r = false;
    memo.set(key, r);
    return r;
  };
  return go(0, 0);
}

/** Can one path segment match both segment patterns (`*`, `?`, literals)? */
export function segmentsOverlap(a, b) {
  return intersects(a.split(''), b.split(''), (c) => c === '*', (x, y) => x === y || x === '?' || y === '?');
}

/** Can some repo path match both globs? (`src/world/**` vs `src/world/maps/*.ts` -> true; `src/a/*` vs `src/b/*` -> false.) */
export function globsOverlap(a, b) {
  for (const x of expandBraces(normalize(a))) {
    for (const y of expandBraces(normalize(b))) {
      if (intersects(x.split('/'), y.split('/'), (s) => s === '**', (s, t) => s !== '**' && t !== '**' && segmentsOverlap(s, t))) return true;
    }
  }
  return false;
}
