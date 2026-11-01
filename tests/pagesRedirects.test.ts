// (one-game, Michael 2026-11-01) The site is one build: master at /<repo>/. The old /preview/, /ct/ and /kestrel/ addresses
// are static forwarding pages (scripts/write-redirects.mjs) and nothing in CI depends on dev, ct-movement or feature/kestrel.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { OLD_SLOTS as OLD_UNTYPED, redirectPage as pageUntyped, retireWorker as workerUntyped, writeRedirects as writeUntyped } from '../scripts/write-redirects.mjs';

const OLD_SLOTS = OLD_UNTYPED as string[];
const redirectPage = pageUntyped as () => string;
const retireWorker = workerUntyped as () => string;
const writeRedirects = writeUntyped as (dist: string) => string[];

const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('the old slots forward to the main game', () => {
  it('the three old slots', () => {
    expect(OLD_SLOTS).toEqual(['preview', 'ct', 'kestrel']);
  });

  it('the page forwards one level up, keeping the query and the hash, with a no-script refresh', () => {
    const html = redirectPage();
    expect(html).toContain("location.replace('../' + location.search + location.hash)");
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=../">');
    expect(html).toContain('<a href="../">');
    expect(html).not.toMatch(/https?:\/\//); // no absolute address: the same page works on any host and repo name
  });

  it('the replacement worker takes over, drops only its own slot caches, unregisters and forwards open pages', () => {
    const js = retireWorker();
    expect(js).toContain('self.skipWaiting()');
    expect(js).toContain('key.includes(self.registration.scope)');
    expect(js).toContain('self.registration.unregister()');
    expect(js).toContain("new URL('../', self.registration.scope)");
    expect(js).toContain('to.search = here.search');
    expect(js).not.toContain('caches.delete(k)'); // every delete is behind the scope test above
    expect(js).not.toMatch(/fetch\(/); // no runtime network dependency
    expect(() => new Function(js)).not.toThrow();
  });

  it('writeRedirects writes index.html and sw.js for each old slot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ns-redirects-'));
    try {
      const out = writeRedirects(dir);
      expect(out).toHaveLength(OLD_SLOTS.length * 2);
      for (const slot of OLD_SLOTS) {
        expect(readFileSync(join(dir, slot, 'index.html'), 'utf8')).toBe(redirectPage());
        expect(readFileSync(join(dir, slot, 'sw.js'), 'utf8')).toBe(retireWorker());
      }
      expect(existsSync(join(dir, 'index.html'))).toBe(false); // the main game's own page is untouched
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('deploy.yml builds only master', () => {
  it('no slot builds, no workflow_run, no dev / ct-movement / feature/kestrel', () => {
    expect(deploy).not.toMatch(/workflow_run/);
    expect(deploy).not.toMatch(/Preview check/);
    expect(deploy).not.toMatch(/VITE_PREVIEW/);
    expect(deploy).not.toMatch(/ct-movement|feature\/kestrel|ls-remote|ref: dev/);
    expect(deploy).not.toMatch(/path: (preview|ct|kestrel)\b/);
    expect(deploy).not.toMatch(/dist\/(preview|ct|kestrel)/);
  });

  it('it builds the default branch once, writes the forwarding pages after the build, and deploys', () => {
    expect(deploy.match(/npm run build/g)?.length).toBe(2); // build-check on a PR, the one deploy build
    expect(deploy).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(deploy.indexOf('node scripts/write-redirects.mjs dist')).toBeGreaterThan(deploy.indexOf('VITE_BASE=$BASE npm run build'));
    expect(deploy.indexOf('upload-pages-artifact')).toBeGreaterThan(deploy.indexOf('write-redirects.mjs'));
    expect(deploy).toMatch(/needs: build\n/);
  });

  it('pull requests still run lint, test and build-check, gated by check', () => {
    expect(deploy).toContain('\n  pull_request:\n');
    for (const job of ['lint', 'test', 'build-check']) expect(deploy).toMatch(new RegExp(`\\n {2}${job}:\\n {4}if: github.event_name == 'pull_request'`));
    expect(deploy).toContain('needs: [lint, test, build-check]');
    expect(deploy).toContain('run: npm run lint');
    expect(deploy).toContain('run: npm test');
  });

  it('there is no workflow for the old preview branches', () => {
    expect(existsSync(new URL('../.github/workflows/preview.yml', import.meta.url))).toBe(false);
  });

  it("the game's own worker still leaves the old slot addresses to the network (vite.config.ts)", () => {
    const cfg = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(cfg).toContain('navigateFallbackDenylist: preview ? [] : [/\\/preview(\\/|$)/, /\\/ct(\\/|$)/, /\\/kestrel(\\/|$)/]');
  });
});
