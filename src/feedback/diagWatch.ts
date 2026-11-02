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
 * check is a timer or an event: nothing here runs per frame. Nothing here may stop the game: every hook, header line
 * and callback is guarded (a browser that refuses an API leaves its line out).
 */
export const PERF_MS = 10_000;
const POLL_MS = 1000;

let hooked = false;
let inLog = false;

/** Run `fn` now; a throw is swallowed (the log never breaks the game). */
function attempt(fn: () => void): void {
  try {
    fn();
  } catch {
    // (an API this browser refuses: that part is left out)
  }
}

/** A callback that never throws into its caller. */
function guard<A extends unknown[]>(fn: (...a: A) => void): (...a: A) => void {
  return (...a: A) => attempt(() => fn(...a));
}

/** A value as short text: at most `depth` levels, 8 items / keys a level, 120 characters a string; getters that
 *  throw are skipped. Never walks a whole object (a scene graph in a console call). */
export function brief(v: unknown, depth = 2): string {
  if (typeof v === 'string') return v.length > 120 ? `${v.slice(0, 120)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint' || v === null || v === undefined) return String(v);
  if (typeof v === 'function') return `[function ${(v as { name?: string }).name || 'anonymous'}]`;
  if (typeof v === 'symbol') return v.toString();
  if (depth <= 0) return Array.isArray(v) ? `[${v.length} items]` : '{…}';
  if (Array.isArray(v)) return `[${v.slice(0, 8).map((x) => brief(x, depth - 1)).join(', ')}${v.length > 8 ? `, …${v.length - 8} more` : ''}]`;
  const keys = Object.keys(v as object);
  const parts: string[] = [];
  for (const k of keys.slice(0, 8)) {
    let s: string;
    try {
      s = brief((v as Record<string, unknown>)[k], depth - 1);
    } catch {
      s = '?';
    }
    parts.push(`${k}: ${s}`);
  }
  return `{${parts.join(', ')}${keys.length > 8 ? `, …${keys.length - 8} more` : ''}}`;
}

/** One console argument as text (an Error with its first stack lines). Never throws. */
export function argText(a: unknown): string {
  try {
    if (typeof a === 'string') return a;
    if (a instanceof Error) {
      let stack = '';
      try {
        stack = String(a.stack ?? '')
          .split('\n')
          .slice(1, 4)
          .map((s) => s.trim())
          .join(' < ');
      } catch {
        // (a stack getter that throws)
      }
      return `${String(a.name)}: ${String(a.message)}${stack ? ` [${stack}]` : ''}`;
    }
    return brief(a);
  } catch {
    return '[unprintable]';
  }
}

const shortUrls = (s: string): string => (typeof location !== 'undefined' ? s.split(location.origin).join('') : s);

function logArgs(k: DiagKind, args: readonly unknown[]): void {
  if (inLog || diag.muted) return;
  inLog = true;
  try {
    diag.add(k, shortUrls(args.map(argText).join(' ')));
  } catch {
    // (never into the game's console call)
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
    attempt(() => {
      const con = console as unknown as Record<string, (...a: unknown[]) => void>;
      const orig = con[name]!;
      con[name] = function (...args: unknown[]) {
        orig.apply(console, args);
        logArgs(k, args);
      };
    });
  }
  attempt(() =>
    window.addEventListener(
      'error',
      guard((e: Event) => {
        if (e instanceof ErrorEvent) {
          const where = e.filename ? ` at ${shortUrls(e.filename)}:${e.lineno}:${e.colno}` : '';
          logArgs('err', [`uncaught: ${e.message}${where}`, ...(e.error instanceof Error ? [e.error] : [])]);
        } else {
          // a file that failed to load (script, image, audio)
          const t = e.target as { tagName?: string; src?: string; href?: string } | null;
          if (t?.tagName) logArgs('err', [`failed to load ${t.tagName.toLowerCase()}: ${t.src ?? t.href ?? ''}`]);
        }
      }),
      true,
    ),
  );
  attempt(() => window.addEventListener('unhandledrejection', guard((e: PromiseRejectionEvent) => logArgs('err', ['unhandled promise rejection:', e.reason]))));
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

/** A header line from `value()`; left out if reading it throws. */
const fact = (key: string, value: () => string): void => attempt(() => diag.fact(key, value()));

/** The session header: what the device and the game are (once the settings are loaded). Each line on its own. */
export function header(app: App): void {
  type Nav = Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } };
  const nav = (): Nav => navigator as Nav;
  fact('Game', () => {
    const sha = typeof __BUILD_SHA__ !== 'undefined' && __BUILD_SHA__ ? ` (build ${__BUILD_SHA__})` : '';
    const preview = typeof __PREVIEW__ !== 'undefined' && __PREVIEW__ ? ' preview' : '';
    return `${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}${preview}${sha}`;
  });
  fact('Started', () => `${clock(diag.session.started)} (${diag.session.tz})`);
  fact('Page', () => {
    let app = '';
    attempt(() => {
      if (matchMedia('(display-mode: standalone)').matches) app = ', installed app';
    });
    return `${location.host}${location.pathname}${location.search ? ` flags ${location.search}` : ' (no flags)'}${app}`;
  });
  fact('Device', () => `${shortDevice(nav().userAgent)}, ${nav().hardwareConcurrency ?? '?'} threads${nav().deviceMemory ? `, ${nav().deviceMemory} GB memory` : ''}, language ${nav().language}`);
  fact('User agent', () => nav().userAgent);
  fact('Input', () => {
    let coarse = false;
    let pads = '?';
    attempt(() => (coarse = matchMedia('(pointer: coarse)').matches));
    // (getGamepads throws SecurityError where the gamepad permission is off, e.g. some iframes)
    attempt(() => (pads = String((nav().getGamepads?.() ?? []).filter(Boolean).length)));
    return `touch points ${nav().maxTouchPoints ?? 0}, pointer ${coarse ? 'coarse (touch)' : 'fine (mouse)'}, controllers ${pads}, mode ${app.input.mode}`;
  });
  fact('Screen', () => `${screen.width}x${screen.height} at ${devicePixelRatio}x, window ${innerWidth}x${innerHeight}, ${Math.round(app.quality.hz)} Hz`);
  fact('GPU', () => `${app.gpu.renderer || 'unknown'} (${app.gpu.kind})`);
  fact('WebGL', () => {
    const e = app.engine as unknown as { webGLVersion?: number; getCaps(): Record<string, unknown>; getGlInfo(): { vendor?: string; version?: string } };
    const c = e.getCaps();
    const gl = e.getGlInfo();
    const pick = ['maxTextureSize', 'maxRenderTextureSize', 'maxSamples', 'maxTexturesImageUnits', 'maxVertexUniformVectors', 'maxFragmentUniformVectors', 'parallelShaderCompile', 'textureFloatRender', 'astc', 's3tc', 'etc2']
      .filter((k) => c[k] !== undefined && c[k] !== null)
      .map((k) => `${k}=${typeof c[k] === 'object' ? 'yes' : String(c[k])}`);
    return `${e.webGLVersion ?? '?'} ${gl.version ?? ''} (${gl.vendor ?? ''}); ${pick.join(' ')}`;
  });
  attempt(() => {
    const ctx = feedbackContext(app);
    diag.fact('Graphics', `${ctx.graphics ?? ''}; ${ctx.adaptive ?? ''}`);
    diag.fact('Display', ctx.display ?? '');
    diag.fact('Video settings', ctx.settings ?? '');
    diag.fact('Changed settings', ctx.changed ?? '');
  });
  fact('Audio', () => {
    const a = app.audio.ctx;
    return a ? `${a.state}, ${a.sampleRate} Hz` : 'not started yet (starts on the first input)';
  });
  fact('Network', () => {
    const c = nav().connection;
    return `${navigator.onLine ? 'online' : 'OFFLINE'}${c ? `, ${c.effectiveType ?? '?'} (about ${c.downlink ?? '?'} Mbit/s, ${c.rtt ?? '?'} ms)${c.saveData ? ', data saver' : ''}` : ''}`;
  });
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

/** Watch the app (after the settings load): the header, events and the timers. Once; never throws. */
export function watchApp(app: App): void {
  attempt(() => header(app));
  diag.add('sys', 'game started');
  // screens (a menu opened or closed)
  let lastScreen = '';
  attempt(() =>
    app.screens.onChange(
      guard(() => {
        const top = app.screens.top;
        const name = top ? (top.el.classList[1] ?? 'screen') : 'none (playing or the menu stage)';
        if (name === lastScreen) return;
        lastScreen = name;
        diag.add('ui', `screen: ${name}`);
      }),
    ),
  );
  // settings: what changed
  attempt(() => {
    const digest = (s: ReturnType<typeof app.settings.get>): string => {
      const d = settingsDigest(s);
      return `${d.video} ${d.changed}`;
    };
    let lastDigest = digest(app.settings.get());
    app.settings.subscribe(
      guard((s) => {
        const now = digest(s);
        const diff = digestDiff(lastDigest, now);
        lastDigest = now;
        if (diff) diag.add('ui', `settings changed: ${diff}`);
      }),
    );
  });
  attempt(() => app.input.events.on('mode', guard((m) => diag.add('ui', `input now: ${m}`))));
  attempt(() => app.input.events.on('padConnected', guard(({ id, style }) => diag.add('sys', `controller connected: ${id} (${style})`))));
  attempt(() => app.input.events.on('padDisconnected', guard(({ id }) => diag.add('warn', `controller disconnected: ${id}`))));
  attempt(() => app.engine.onContextLostObservable.add(guard(() => diag.add('err', 'WebGL context lost (the GPU reset or ran out of memory)'))));
  attempt(() => app.engine.onContextRestoredObservable.add(guard(() => diag.add('sys', 'WebGL context restored'))));
  attempt(() =>
    document.addEventListener(
      'visibilitychange',
      guard(() => {
        diag.add('sys', document.hidden ? 'tab hidden (switched away or minimised)' : 'tab visible again');
        // (no frames while hidden: the gap is not a long frame)
        if (!document.hidden) diag.perf.reset();
      }),
    ),
  );
  attempt(() => window.addEventListener('pagehide', guard((e: PageTransitionEvent) => diag.add('sys', `page closing${e.persisted ? ' (kept in the back cache)' : ''}`))));
  attempt(() =>
    window.addEventListener(
      'pageshow',
      guard((e: PageTransitionEvent) => {
        if (e.persisted) diag.add('sys', 'page restored from the back cache');
      }),
    ),
  );
  attempt(() => window.addEventListener('online', guard(() => diag.add('net', 'browser online'))));
  attempt(() => window.addEventListener('offline', guard(() => diag.add('warn', 'browser offline (no internet connection)'))));
  attempt(() => document.addEventListener('pointerlockchange', guard(() => diag.add('ui', document.pointerLockElement ? 'mouse captured (pointer lock)' : 'mouse released (pointer lock off)'))));
  attempt(() => document.addEventListener('pointerlockerror', guard(() => diag.add('warn', 'pointer lock refused by the browser'))));
  attempt(() => document.addEventListener('fullscreenchange', guard(() => diag.add('ui', document.fullscreenElement ? 'fullscreen on' : 'fullscreen off'))));
  attempt(() => {
    const conn = (navigator as Navigator & { connection?: EventTarget & { effectiveType?: string; rtt?: number } }).connection;
    conn?.addEventListener?.('change', guard(() => diag.add('net', `network type now ${conn.effectiveType ?? '?'} (${conn.rtt ?? '?'} ms)`)));
  });
  attempt(() => {
    let resizeT: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener(
      'resize',
      guard(() => {
        clearTimeout(resizeT);
        resizeT = setTimeout(guard(() => diag.add('ui', `window now ${innerWidth}x${innerHeight} at ${devicePixelRatio}x`)), 1000);
      }),
    );
  });

  // once a second: the player down / up, the governor, the audio
  let alive: boolean | null = null;
  let match: MatchLike | null = null;
  let gov = -1;
  let thermal = false;
  let audio = '';
  attempt(() => (audio = app.audio.ctx?.state ?? ''));
  setInterval(
    guard(() => {
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
    }),
    POLL_MS,
  );

  // every PERF_MS in a match: the frame times since the last sample
  const p: PerfSample = { frames: 0, fps: 0, low1Fps: 0, worstMs: 0, long: 0, cpuMs: 0 };
  setInterval(
    guard(() => {
      const m = asMatch(app);
      if (!m || (typeof document !== 'undefined' && document.hidden)) {
        diag.perf.reset();
        return;
      }
      if (!diag.perf.take(p)) return;
      const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      // (no draw call count: the engine's counter only resets per frame with instrumentation on, which costs a frame)
      const e = app.engine as unknown as { getRenderWidth(): number; getRenderHeight(): number };
      const extra = [
        app.quality.level.name,
        `${e.getRenderWidth()}x${e.getRenderHeight()}`,
        app.quality.adaptiveOn ? `governor ${app.quality.governor.level}` : '',
        mem ? `heap ${Math.round(mem.usedJSHeapSize / 1048576)} MB` : '',
        m.scene?.getActiveMeshes ? `${m.scene.getActiveMeshes().length} meshes` : '',
        m.menuPaused ? 'menu open' : '',
      ]
        .filter(Boolean)
        .join(', ');
      const w = where(m);
      notePerf(diag.session.stats, p, w);
      diag.add('perf', `${w}: ${perfLine(p, extra)}`);
    }),
    PERF_MS,
  );
}

/** A match is starting to load (main.ts): counted, with what it is. */
export function diagMatchLoad(what: string, o: { difficulty?: string; net?: { role?: string; code?: string } }): void {
  attempt(() => {
    diag.session.stats.matches++;
    diag.add('game', `loading ${what}${o.difficulty ? `, ${o.difficulty}` : ''}${o.net ? `, co-op ${o.net.role === 'host' ? 'host' : 'joiner'} in room ${o.net.code ?? '?'}` : ', single player'}`);
  });
}

/** The match's own events worth a line (rare ones only). */
export function diagWatchMatch(app: App): void {
  attempt(() => {
    const ev = asMatch(app)?.events;
    if (!ev) return;
    ev.on('objective', guard((p) => diag.add('game', `objective done: ${String(p.id)}`)));
    ev.on('alarm', guard(() => diag.add('game', 'alarm raised')));
    ev.on('checkpointRestart', guard(() => diag.add('game', 'restarted at the checkpoint')));
    ev.on('operationComplete', guard(() => diag.add('game', 'operation complete')));
    ev.on('bodyFound', guard(() => diag.add('game', 'a guard found a body')));
  });
}

/** Leaving the current match (main.ts, before it is freed): how long it ran and its spike / load summaries. */
export function diagMatchLeave(app: App): void {
  attempt(() => {
    const m = asMatch(app);
    if (!m) return;
    let ctx: Record<string, string> = {};
    attempt(() => (ctx = m.feedbackContext?.() ?? {}));
    const parts = [`left ${where(m)} after ${Math.round(m.time ?? 0)} s${m.isEnded ? ' (ended)' : ''}`];
    if (ctx.spikes) parts.push(`spikes: ${ctx.spikes}`);
    if (ctx.mapReady) parts.push(`load: ${ctx.mapReady}`);
    if (ctx.frames) parts.push(`frames: ${ctx.frames}`);
    diag.add('game', parts.join('; '));
  });
}
