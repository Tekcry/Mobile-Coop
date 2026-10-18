/**
 * Level editor dev-server endpoints (Vite plugin, `npm run dev` only; docs/kestrel/editor.md). The editor page posts the
 * campus data here for the live plan view and the checks, and saves through here. Writes are accepted only from this
 * PC (the dev server is LAN-exposed for phone testing) and only to fixed paths.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';

const CAMPUS = 'docs/kestrel/kestrel.campus.blocks.json';
const PLANS = 'docs/kestrel/plans';
const LOG_MD = 'docs/kestrel/editor-log.md';
const LOG_JSONL = 'docs/kestrel/editor-log.jsonl';
/** ON11: Michael's own room presets (saved with the file save). */
const PRESETS = 'docs/kestrel/editor-presets.json';
/** ON6: the play file (lamps and circuits; schema.md section 3), loaded and saved with the campus file. */
const PLAY = 'docs/kestrel/kestrel.play.json';
/** ON12: the security file (devices, zones, cards; schema.md section 4), loaded and saved with the campus file. */
const SECURITY = 'docs/kestrel/kestrel.security.json';
type ExpandMod = {
  loadModules: () => Map<string, { id: string; name: string; source?: string }>;
  expandLayout: (a: { layout: unknown; modules: unknown }) => { arch: Record<string, unknown>; errors: string[] };
};
/** Marks the file as owned by the editor; the P03B generator refuses to overwrite it (Michael, 2026-10-12). */
const OWNER = 'level editor (docs/kestrel/editor.md)';

interface Journal {
  time: string;
  action: string;
  text: string;
  changes: unknown[];
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    let n = 0;
    req.on('data', (b: Buffer) => {
      n += b.length;
      if (n > 32 * 1024 * 1024) reject(new Error('body too large'));
      else parts.push(b);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, type: string, text: string): void {
  res.statusCode = status;
  res.setHeader('content-type', type);
  res.setHeader('cache-control', 'no-store');
  res.end(text);
}
const json = (res: ServerResponse, v: unknown, status = 200): void => send(res, status, 'application/json', JSON.stringify(v));

/**
 * This PC, or (only when KESTREL_EDITOR_LAN=1, set by Kestrel-Editor-Network.cmd; Michael, 2026-10-12) a device on the
 * home network: private IPv4 ranges and IPv6 link-local / unique-local addresses. Never the internet.
 */
function isLocal(req: IncomingMessage): boolean {
  const a = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
  if (a === '127.0.0.1' || a === '::1') return true;
  if (process.env.KESTREL_EDITOR_LAN !== '1') return false;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a) || /^f(e8|e9|ea|eb|c|d)/i.test(a);
}

function run(root: string, args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: root });
    let out = '';
    p.stdout.on('data', (b: Buffer) => (out += b.toString()));
    p.stderr.on('data', (b: Buffer) => (out += b.toString()));
    p.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

/** Draws one level (svg) or every level (svg + png) of `data` into a fresh temp folder. */
async function renderPlans(root: string, data: unknown, level: string | null): Promise<{ dir: string; code: number; out: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'kestrel-editor-'));
  const file = path.join(dir, 'campus.json');
  writeFileSync(file, JSON.stringify(data));
  const args = [path.join(root, 'scripts/kestrel/plans.mjs'), file, '--out', dir];
  if (level) args.push('--level', level, '--svg-only');
  const r = await run(root, args);
  return { dir, ...r };
}

type CheckMod = { runChecks: (o: { arch: unknown; security?: unknown }) => { id: string; title: string; status: string; details: string[]; notes?: string[] }[]; summary: (r: unknown) => Record<string, number> };
type StdMod = { standardsCheck: (a: unknown) => { fails: string[]; info: string[]; counts: unknown }; summary: (r: unknown) => string };

export function kestrelEditor(): Plugin {
  let root = process.cwd();
  let checks: Promise<[CheckMod, StdMod]> | null = null;
  const loadChecks = (): Promise<[CheckMod, StdMod]> =>
    (checks ??= Promise.all([
      import(/* @vite-ignore */ pathToFileURL(path.join(root, 'scripts/kestrel/check.mjs')).href) as Promise<CheckMod>,
      import(/* @vite-ignore */ pathToFileURL(path.join(root, 'scripts/kestrel/standards-check.mjs')).href) as Promise<StdMod>,
    ]));

  /**
   * Where the campus file, plan images and change logs are read and written: the repository, or with
   * KESTREL_EDITOR_SANDBOX=<dir> (the e2e test, ED3-3a) a copy under that folder, so a test never writes docs/kestrel.
   */
  let store = root;
  const useSandbox = (): void => {
    const dir = process.env.KESTREL_EDITOR_SANDBOX;
    if (!dir) {
      store = root;
      return;
    }
    store = path.resolve(dir);
    const f = path.join(store, CAMPUS);
    if (!existsSync(f)) {
      mkdirSync(path.dirname(f), { recursive: true });
      copyFileSync(path.join(root, CAMPUS), f);
      if (existsSync(path.join(root, PLAY))) copyFileSync(path.join(root, PLAY), path.join(store, PLAY));
      if (existsSync(path.join(root, SECURITY))) copyFileSync(path.join(root, SECURITY), path.join(store, SECURITY));
    }
  };

  return {
    name: 'kestrel-editor',
    apply: 'serve',
    // Kestrel-Editor-Network.cmd: https with the editor's own certificate (iOS allows controllers on secure pages only)
    config() {
      const dir = path.join(process.cwd(), '.kestrel-cert');
      if (process.env.KESTREL_EDITOR_HTTPS !== '1' || !existsSync(path.join(dir, 'cert.pem'))) return;
      return { server: { https: { key: readFileSync(path.join(dir, 'key.pem')), cert: readFileSync(path.join(dir, 'cert.pem')) } } };
    },
    configResolved(c) {
      root = c.root;
      useSandbox();
    },
    configureServer(server) {
      let draftText = '';
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://x');
        if (!url.pathname.startsWith('/__editor/')) return next();
        try {
          if (url.pathname === '/__editor/campus' && req.method === 'GET') {
            // the file time lets the editor tell whether an unsaved draft is newer than the file
            res.setHeader('x-mtime', String(Math.floor(statSync(path.join(store, CAMPUS)).mtimeMs)));
            return send(res, 200, 'application/json', readFileSync(path.join(store, CAMPUS), 'utf8'));
          }
          // ON6: the play file, when there is one (the editor makes it on the first save with lamps)
          if (url.pathname === '/__editor/play' && req.method === 'GET') {
            const f = path.join(store, PLAY);
            // (no file yet: an empty reply, not a 404, so the browser logs no error)
            if (!existsSync(f)) return send(res, 200, 'application/json', '');
            res.setHeader('x-mtime', String(Math.floor(statSync(f).mtimeMs)));
            return send(res, 200, 'application/json', readFileSync(f, 'utf8'));
          }
          // ON12: the security file, when there is one (the editor makes it on the first save with a device)
          if (url.pathname === '/__editor/security' && req.method === 'GET') {
            const f = path.join(store, SECURITY);
            if (!existsSync(f)) return send(res, 200, 'application/json', '');
            res.setHeader('x-mtime', String(Math.floor(statSync(f).mtimeMs)));
            return send(res, 200, 'application/json', readFileSync(f, 'utf8'));
          }
          // the phone downloads this once to trust the editor's https certificate
          if (url.pathname === '/__editor/cert.crt' && req.method === 'GET') {
            const f = path.join(root, '.kestrel-cert', 'cert.pem');
            if (!existsSync(f)) return json(res, { error: 'no certificate: start Kestrel-Editor-Network.cmd' }, 404);
            res.setHeader('content-disposition', 'attachment; filename="kestrel-editor.crt"');
            return send(res, 200, 'application/x-x509-ca-cert', readFileSync(f, 'utf8'));
          }
          // ON11: the module kit as presets (every module expanded at the origin by expand.mjs, read fresh) and the own presets
          if (url.pathname === '/__editor/presets' && req.method === 'GET') {
            const ex = (await import(/* @vite-ignore */ pathToFileURL(path.join(root, 'scripts/kestrel/expand.mjs')).href)) as ExpandMod;
            const mods = ex.loadModules();
            // the levels it stands on (as src/editor/presets.ts KIT_LEVELS: +0, +1 and a roof) and the campus grids
            const storey = (JSON.parse(readFileSync(path.join(root, 'scripts/kestrel/facts.json'), 'utf8')) as { room: { storey: { value: number } } }).room.storey.value;
            const meta = (JSON.parse(readFileSync(path.join(store, CAMPUS), 'utf8')) as { meta: { grid?: number; objectGrid?: number } }).meta;
            const levels = [
              { id: 'P0', name: 'Base', floor: 0, height: storey },
              { id: 'P1', name: 'Next', floor: storey, height: storey },
              { id: 'R', name: 'Roof', floor: 2 * storey, height: 1 },
            ];
            const kit: unknown[] = [];
            for (const m of mods.values()) {
              const r = ex.expandLayout({ layout: { meta: { grid: meta.grid, objectGrid: meta.objectGrid }, levels, placements: [{ id: 'K', module: m.id, level: 'P0', at: [0, 0] }] }, modules: mods });
              if (!r.errors.length) kit.push({ module: { id: m.id, name: m.name, source: m.source }, arch: r.arch });
            }
            const f = path.join(store, PRESETS);
            return json(res, { kit, mine: existsSync(f) ? readFileSync(f, 'utf8') : '' });
          }
          // the walk test's draft (ED2 Part B): the editor's campus held in this server's memory, never written to disk
          if (url.pathname === '/__editor/draft' && req.method === 'GET') {
            if (!isLocal(req)) return json(res, { error: 'the editor only runs on this PC (localhost)' }, 403);
            return draftText ? send(res, 200, 'application/json', draftText) : json(res, { error: 'no draft' }, 404);
          }
          if (req.method !== 'POST') return json(res, { error: 'POST only' }, 405);
          if (!isLocal(req)) return json(res, { error: 'the editor only runs on this PC (localhost)' }, 403);
          const raw = await body(req);
          const data = JSON.parse(raw) as Record<string, unknown>;
          if (url.pathname === '/__editor/draft') {
            if (!Array.isArray(data.levels) || !data.meta) return json(res, { error: 'no campus' }, 400);
            draftText = raw;
            return json(res, { ok: true });
          }

          if (url.pathname === '/__editor/plan') {
            const level = url.searchParams.get('level') ?? '';
            if (!/^[A-Za-z0-9_-]{1,8}$/.test(level)) return json(res, { error: 'bad level' }, 400);
            const r = await renderPlans(root, data, level);
            const f = path.join(r.dir, `${level}.svg`);
            const svg = existsSync(f) ? readFileSync(f, 'utf8') : '';
            rmSync(r.dir, { recursive: true, force: true });
            return svg ? send(res, 200, 'image/svg+xml', svg) : json(res, { error: r.out.slice(-2000) }, 500);
          }

          if (url.pathname === '/__editor/check') {
            const [c, s] = await loadChecks();
            // ON12: the S0 security checks on the editor's devices (the file's zones and cards as saved)
            const sf = path.join(store, SECURITY);
            const saved = existsSync(sf) ? (JSON.parse(readFileSync(sf, 'utf8')) as Record<string, unknown>) : null;
            const devs = Array.isArray(data.devices) ? (data.devices as unknown[]) : [];
            const security = devs.length || saved ? { zones: [], cards: [], ...(saved ?? {}), devices: devs } : null;
            const results = c.runChecks({ arch: data, security });
            const std = s.standardsCheck(data);
            return json(res, { results: results.filter((r) => r.status !== 'PASS'), summary: c.summary(results), standards: { fails: std.fails, info: std.info, line: s.summary(std) } });
          }

          if (url.pathname === '/__editor/presets') {
            if (typeof data.text !== 'string' || !data.text.startsWith('{')) return json(res, { error: 'no presets' }, 400);
            mkdirSync(path.dirname(path.join(store, PRESETS)), { recursive: true });
            writeFileSync(path.join(store, PRESETS), data.text);
            return json(res, { ok: true });
          }

          if (url.pathname === '/__editor/save') {
            const campus = data.campus as { meta: Record<string, unknown> };
            const journal = (data.journal ?? []) as Journal[];
            if (!campus?.meta) return json(res, { error: 'no campus' }, 400);
            campus.meta.editor = OWNER;
            writeFileSync(path.join(store, CAMPUS), JSON.stringify(campus, null, 1) + '\n');
            // ON6: the play file, only when the editor's lamps or circuits changed it
            if (typeof data.playText === 'string') {
              if (!data.playText.startsWith('{')) return json(res, { error: 'bad play file' }, 400);
              writeFileSync(path.join(store, PLAY), data.playText);
            }
            // ON12: the security file, only when the editor's devices changed it
            if (typeof data.securityText === 'string') {
              if (!data.securityText.startsWith('{')) return json(res, { error: 'bad security file' }, 400);
              writeFileSync(path.join(store, SECURITY), data.securityText);
            }
            const savedAt = new Date().toISOString();
            if (journal.length) {
              const logMd = path.join(store, LOG_MD);
              if (!existsSync(logMd)) writeFileSync(logMd, '# Level editor change log\n\nEvery save appends what changed, in order. Exact before and after values are in editor-log.jsonl.\n\n');
              appendFileSync(logMd, String(data.logText ?? ''));
              appendFileSync(path.join(store, LOG_JSONL), journal.map((j) => JSON.stringify({ savedAt, ...j })).join('\n') + '\n');
            }
            const r = await renderPlans(root, campus, null);
            const levels = (campus as unknown as { levels: { id: string }[] }).levels.map((l) => l.id);
            mkdirSync(path.join(store, PLANS), { recursive: true });
            let copied = 0;
            for (const id of levels) {
              const png = path.join(r.dir, `${id}.png`);
              if (existsSync(png)) {
                copyFileSync(png, path.join(store, PLANS, `blocks-${id}.png`));
                copied++;
              }
            }
            rmSync(r.dir, { recursive: true, force: true });
            return json(res, { ok: true, savedAt, plans: copied, planLog: r.code ? r.out.slice(-2000) : '' });
          }
          return json(res, { error: 'unknown endpoint' }, 404);
        } catch (e) {
          return json(res, { error: e instanceof Error ? e.message : String(e) }, 500);
        }
      });
    },
  };
}
