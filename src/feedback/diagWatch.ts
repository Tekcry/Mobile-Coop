import type { App } from '../core/app';
import { settingsDigest } from '../core/settings';
import { feedbackContext } from '../ui/screens/feedbackScreen';
import { diag } from './diag';
import { clock, digestDiff, notePerf, perfLine, shortDevice, type DiagKind, type PerfSample } from './diagLog';

/**
 * What the diagnostics log watches in the page (`diag.ts` keeps it): uncaught errors and rejected promises, the
 * console's errors, warnings and notes (the original output untouched), the session header (version, device, GPU,
 * graphics, audio, storage, network type), screens, settings changes, input and controllers, the tab hidden / shown,
 * pointer lock, the WebGL context, the player down / up, the frame governor, and a performance sample every
 * `PERF_MS` in a match (the frame times come from `diag.perf.push`, called once per frame without allocating). Each
 * check is a timer or an event: nothing here runs per frame.
 */
export const PERF_MS = 10_000;
const POLL_MS = 1000;

let hooked = false;
let inLog = false;

/** One console argument as text (an Error with its first stack lines). */
function argText(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a instanceof Error) {
    const stack = (a.stack ?? '').split('\n').slice(1, 4).map((s) => s.trim()).join(' < ');
    return `${a.name}: ${a.message}${stack ? ` [${stack}]` : ''}`;
  }
  if (typeof a === 'number' || typeof a === 'boolean' || a === null || a === undefined) return String(a);
  try {
    const s = JSON.stringify(a);
    return s === undefined ? String(a) : s.slice(0, 300);
  } catch {
    return Object.prototype.toString.call(a);
  }
}

const shortUrls = (s: string): string => (typeof location !== 'undefined' ? s.split(location.origin).join('') : s);

function logArgs(k: DiagKind, args: readonly unknown[]): void {
  if (inLog) return;
  inLog = true;
  try {
    diag.add(k, shortUrls(args.map(argText).join(' ')));
  } finally {
    inLog = false;
  }
}

/** Errors and the console, as early as possible in the boot (once). */
export function installDiagHooks(): void {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;
  for (const [name, k] of [
    ['error', 'err'],
    ['warn', 'warn'],
    ['info', 'info'],
  ] as const) {
    const con = console as unknown as Record<string, (...a: unknown[]) => void>;
    const orig = con[name]!;
    con[name] = function (...args: unknown[]) {
      orig.apply(console, args);
      logArgs(k, args);
    };
  }
  window.addEventListener(
    'error',
    (e: Event) => {
      if (e instanceof ErrorEvent) {
        const where = e.filename ? ` at ${shortUrls(e.filename)}:${e.lineno}:${e.colno}` : '';
        logArgs('err', [`uncaught: ${e.message}${where}`, ...(e.error instanceof Error ? [e.error] : [])]);
      } else {
        // a file that failed to load (script, image, audio)
        const t = e.target as { tagName?: string; src?: string; href?: string } | null;
        if (t?.tagName) logArgs('err', [`failed to load ${t.tagName.toLowerCase()}: ${t.src ?? t.href ?? ''}`]);
      }
    },
    true,
  );
  window.addEventListener('unhandledrejection', (e) => logArgs('err', ['unhandled promise rejection:', e.reason]));
}

interface MatchLike {
  opts?: { map?: { id?: string }; mode?: string; difficulty?: string; net?: { role?: string; code?: string } };
  player?: { alive?: boolean };
  time?: number;
  isEnded?: boolean;
  menuPaused?: boolean;
  feedbackContext?: () => Record<string, string>;
  events?: { on(type: string, fn: (p: Record<string, unknown>) => void): () => void };
  scene?: { getActiveMeshes?: () => { length: number } };
}

const asMatch = (app: App): MatchLike | null => {
  const s = app.current as unknown as MatchLike | null;
  return s && s.opts?.map ? s : null;
};
const where = (m: MatchLike): string => `${m.opts?.map?.id ?? '?'} / ${m.opts?.mode ?? '?'}`;

/** The session header: what the device and the game are (once the settings are loaded). */
function header(app: App): void {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }; userAgentData?: { platform?: string; mobile?: boolean } };
  const sha = typeof __BUILD_SHA__ !== 'undefined' && __BUILD_SHA__ ? ` (build ${__BUILD_SHA__})` : '';
  const preview = typeof __PREVIEW__ !== 'undefined' && __PREVIEW__ ? ' preview' : '';
  diag.fact('Game', `${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}${preview}${sha}`);
  diag.fact('Started', `${clock(diag.session.started)} (${diag.session.tz})`);
  diag.fact('Page', `${location.host}${location.pathname}${location.search ? ` flags ${location.search}` : ' (no flags)'}${matchMedia?.('(display-mode: standalone)').matches ? ', installed app' : ''}`);
  diag.fact('Device', `${shortDevice(nav.userAgent)}, ${nav.hardwareConcurrency ?? '?'} threads${nav.deviceMemory ? `, ${nav.deviceMemory} GB memory` : ''}, ${nav.userAgentData?.platform ?? nav.platform ?? ''}, language ${nav.language}`);
  diag.fact('User agent', nav.userAgent);
  const coarse = matchMedia?.('(pointer: coarse)').matches;
  diag.fact('Input', `touch points ${nav.maxTouchPoints ?? 0}, pointer ${coarse ? 'coarse (touch)' : 'fine (mouse)'}, controllers ${(nav.getGamepads?.() ?? []).filter(Boolean).length}, mode ${app.input.mode}`);
  diag.fact('Screen', `${screen.width}x${screen.height} at ${devicePixelRatio}x, window ${innerWidth}x${innerHeight}, ${Math.round(app.quality.hz)} Hz`);
  diag.fact('GPU', `${app.gpu.renderer || 'unknown'} (${app.gpu.kind})`);
  try {
    const e = app.engine as unknown as { webGLVersion?: number; getCaps(): Record<string, unknown>; getGlInfo(): { vendor?: string; version?: string } };
    const c = e.getCaps();
    const gl = e.getGlInfo();
    const pick = ['maxTextureSize', 'maxRenderTextureSize', 'maxSamples', 'maxTexturesImageUnits', 'maxVertexUniformVectors', 'maxFragmentUniformVectors', 'parallelShaderCompile', 'textureFloatRender', 'astc', 's3tc', 'etc2']
      .filter((k) => c[k] !== undefined && c[k] !== null)
      .map((k) => `${k}=${typeof c[k] === 'object' ? 'yes' : String(c[k])}`);
    diag.fact('WebGL', `${e.webGLVersion ?? '?'} ${gl.version ?? ''} (${gl.vendor ?? ''}); ${pick.join(' ')}`);
  } catch {
    diag.fact('WebGL', 'unknown');
  }
  try {
    const ctx = feedbackContext(app);
    diag.fact('Graphics', `${ctx.graphics ?? ''}; ${ctx.adaptive ?? ''}`);
    diag.fact('Display', ctx.display ?? '');
    diag.fact('Video settings', ctx.settings ?? '');
    diag.fact('Changed settings', ctx.changed ?? '');
  } catch {
    // (the context reads the app: a failure leaves the lines out)
  }
  const a = app.audio.ctx;
  diag.fact('Audio', a ? `${a.state}, ${a.sampleRate} Hz` : 'not started yet (starts on the first input)');
  const c = nav.connection;
  diag.fact('Network', `${navigator.onLine ? 'online' : 'OFFLINE'}${c ? `, ${c.effectiveType ?? '?'} (about ${c.downlink ?? '?'} Mbit/s, ${c.rtt ?? '?'} ms)${c.saveData ? ', data saver' : ''}` : ''}`);
  void (async () => {
    try {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      if (est) diag.fact('Storage', `${((est.usage ?? 0) / 1048576).toFixed(1)} MB used of ${((est.quota ?? 0) / 1048576).toFixed(0)} MB${persisted ? ', kept (persistent)' : ', may be cleared by the browser'}`);
    } catch {
      // (no storage estimate)
    }
  })();
}

/** Watch the app (after the settings load): the header, events and the timers. Once. */
export function watchApp(app: App): void {
  header(app);
  diag.add('sys', 'game started');
  // screens (a menu opened or closed)
  let lastScreen = '';
  app.screens.onChange(() => {
    const top = app.screens.top;
    const name = top ? (top.el.classList[1] ?? 'screen') : 'none (playing or the menu stage)';
    if (name === lastScreen) return;
    lastScreen = name;
    diag.add('ui', `screen: ${name}`);
  });
  // settings: what changed
  let lastDigest = (() => {
    const d = settingsDigest(app.settings.get());
    return `${d.video} ${d.changed}`;
  })();
  app.settings.subscribe((s) => {
    const d = settingsDigest(s);
    const now = `${d.video} ${d.changed}`;
    const diff = digestDiff(lastDigest, now);
    lastDigest = now;
    if (diff) diag.add('ui', `settings changed: ${diff}`);
  });
  app.input.events.on('mode', (m) => diag.add('ui', `input now: ${m}`));
  app.input.events.on('padConnected', ({ id, style }) => diag.add('sys', `controller connected: ${id} (${style})`));
  app.input.events.on('padDisconnected', ({ id }) => diag.add('warn', `controller disconnected: ${id}`));
  app.engine.onContextLostObservable.add(() => diag.add('err', 'WebGL context lost (the GPU reset or ran out of memory)'));
  app.engine.onContextRestoredObservable.add(() => diag.add('sys', 'WebGL context restored'));
  document.addEventListener('visibilitychange', () => {
    diag.add('sys', document.hidden ? 'tab hidden (switched away or minimised)' : 'tab visible again');
    // (no frames while hidden: the gap is not a long frame)
    if (!document.hidden) diag.perf.reset();
  });
  window.addEventListener('pagehide', (e) => diag.add('sys', `page closing${e.persisted ? ' (kept in the back cache)' : ''}`));
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) diag.add('sys', 'page restored from the back cache');
  });
  window.addEventListener('online', () => diag.add('net', 'browser online'));
  window.addEventListener('offline', () => diag.add('warn', 'browser offline (no internet connection)'));
  document.addEventListener('pointerlockchange', () => diag.add('ui', document.pointerLockElement ? 'mouse captured (pointer lock)' : 'mouse released (pointer lock off)'));
  document.addEventListener('pointerlockerror', () => diag.add('warn', 'pointer lock refused by the browser'));
  document.addEventListener('fullscreenchange', () => diag.add('ui', document.fullscreenElement ? 'fullscreen on' : 'fullscreen off'));
  const conn = (navigator as Navigator & { connection?: EventTarget & { effectiveType?: string; rtt?: number } }).connection;
  conn?.addEventListener?.('change', () => diag.add('net', `network type now ${conn.effectiveType ?? '?'} (${conn.rtt ?? '?'} ms)`));
  let resizeT = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => diag.add('ui', `window now ${innerWidth}x${innerHeight} at ${devicePixelRatio}x`), 1000);
  });

  // once a second: the player down / up, the governor, the audio
  let alive: boolean | null = null;
  let match: MatchLike | null = null;
  let gov = -1;
  let thermal = false;
  let audio = app.audio.ctx?.state ?? '';
  setInterval(() => {
    const m = asMatch(app);
    if (m !== match) {
      match = m;
      alive = m?.player?.alive ?? null;
      diag.perf.reset();
    }
    const a = m?.player?.alive;
    if (m && typeof a === 'boolean' && a !== alive) {
      diag.add('game', a ? 'player back up (revived / respawned)' : 'player down');
      alive = a;
    }
    const g = app.quality.governor;
    const on = app.quality.adaptiveOn;
    const level = on ? g.level : -1;
    if (level !== gov || g.thermal !== thermal) {
      if (gov !== -1 || level > 0) diag.add('perf', on ? `graphics governor: detail level ${level}${g.thermal ? ' (thermal: the device is hot)' : ''}` : 'graphics governor off');
      gov = level;
      thermal = g.thermal;
    }
    const as = app.audio.ctx?.state ?? '';
    if (as !== audio) {
      audio = as;
      diag.add('sys', `audio ${as}`);
    }
  }, POLL_MS);

  // every PERF_MS in a match: the frame times since the last sample
  const p: PerfSample = { frames: 0, fps: 0, low1Fps: 0, worstMs: 0, long: 0, cpuMs: 0 };
  setInterval(() => {
    const m = asMatch(app);
    if (!m || document.hidden) {
      diag.perf.reset();
      return;
    }
    if (!diag.perf.take(p)) return;
    const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    const e = app.engine as unknown as { _drawCalls?: { current?: number }; getRenderWidth(): number; getRenderHeight(): number };
    const extra = [
      app.quality.level.name,
      `${e.getRenderWidth()}x${e.getRenderHeight()}`,
      app.quality.adaptiveOn ? `governor ${app.quality.governor.level}` : '',
      mem ? `heap ${Math.round(mem.usedJSHeapSize / 1048576)} MB` : '',
      typeof e._drawCalls?.current === 'number' ? `${e._drawCalls.current} draw calls` : '',
      m.scene?.getActiveMeshes ? `${m.scene.getActiveMeshes().length} meshes` : '',
      m.menuPaused ? 'menu open' : '',
    ]
      .filter(Boolean)
      .join(', ');
    const w = where(m);
    notePerf(diag.session.stats, p, w);
    diag.add('perf', `${w}: ${perfLine(p, extra)}`);
  }, PERF_MS);
}

/** A match is starting to load (main.ts): counted, with what it is. */
export function diagMatchLoad(what: string, o: { difficulty?: string; net?: { role?: string; code?: string } }): void {
  diag.session.stats.matches++;
  diag.add('game', `loading ${what}${o.difficulty ? `, ${o.difficulty}` : ''}${o.net ? `, co-op ${o.net.role === 'host' ? 'host' : 'joiner'} in room ${o.net.code ?? '?'}` : ', single player'}`);
}

/** The match's own events worth a line (rare ones only). */
export function diagWatchMatch(app: App): void {
  const m = asMatch(app);
  const ev = m?.events;
  if (!ev) return;
  ev.on('objective', (p) => diag.add('game', `objective done: ${String(p.id)}`));
  ev.on('alarm', () => diag.add('game', 'alarm raised'));
  ev.on('checkpointRestart', () => diag.add('game', 'restarted at the checkpoint'));
  ev.on('operationComplete', () => diag.add('game', 'operation complete'));
  ev.on('bodyFound', () => diag.add('game', 'a guard found a body'));
}

/** Leaving the current match (main.ts, before it is freed): how long it ran and its spike / load summaries. */
export function diagMatchLeave(app: App): void {
  const m = asMatch(app);
  if (!m) return;
  let ctx: Record<string, string> = {};
  try {
    ctx = m.feedbackContext?.() ?? {};
  } catch {
    // (a half-built match: no context)
  }
  const parts = [`left ${where(m)} after ${Math.round(m.time ?? 0)} s${m.isEnded ? ' (ended)' : ''}`];
  if (ctx.spikes) parts.push(`spikes: ${ctx.spikes}`);
  if (ctx.mapReady) parts.push(`load: ${ctx.mapReady}`);
  if (ctx.frames) parts.push(`frames: ${ctx.frames}`);
  diag.add('game', parts.join('; '));
}
