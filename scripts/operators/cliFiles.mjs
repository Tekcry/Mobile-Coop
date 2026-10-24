// File arguments for the guard check CLIs (guardBodyCheck.mjs, guardGarmentCheck.mjs). The laptop bake runs each check
// step through cmd.exe (Node child_process `shell: true` on Windows), which passes `guard-*.json` through literally
// instead of expanding it, so the CLIs expand it themselves: a `*` / `?` in the file name part matches against that
// folder's entries (node:fs only, no glob dependency), and a folder argument stands for every report in it (`dirMatch`).
// A pattern or folder that matches nothing throws, so a check step never passes on zero reports.
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WILD = /[*?]/;

/** A file-name pattern (`*` any run, `?` one character, no folder separators) as an anchored RegExp. */
export function globToRegExp(pattern) {
  const body = [...pattern].map((c) => (c === '*' ? '[^/\\\\]*' : c === '?' ? '[^/\\\\]' : c.replace(/[.+^${}()|[\]\\]/g, '\\$&'))).join('');
  return new RegExp(`^${body}$`, process.platform === 'win32' ? 'i' : '');
}

/**
 * Expands CLI file arguments: plain paths pass through, `<dir>/<pattern>` lists the matching files of `<dir>` (sorted),
 * a folder lists its entries matching `dirMatch`. Duplicates are dropped, order kept. Wildcards are allowed only in the
 * last path part.
 */
export function expandFileArgs(args, { dirMatch = /^guard-.*\.json$/ } = {}) {
  const out = [];
  const list = (dir, re, what) => {
    const hits = readdirSync(dir).filter((n) => re.test(n)).sort().map((n) => path.join(dir, n));
    if (!hits.length) throw new Error(`no file matches ${what}`);
    out.push(...hits);
  };
  for (const a of args) {
    const dir = path.dirname(a);
    const base = path.basename(a);
    if (WILD.test(base)) {
      if (WILD.test(dir)) throw new Error(`${a}: wildcards only in the file name`);
      if (!existsSync(dir)) throw new Error(`${a}: folder ${dir} not found`);
      list(dir, globToRegExp(base), a);
    } else if (existsSync(a) && statSync(a).isDirectory()) list(a, dirMatch, `${dirMatch} in ${a}`);
    else out.push(a);
  }
  return [...new Set(out)];
}
