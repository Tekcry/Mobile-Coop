/**
 * The level editor's walk test, game side (ED2 Part B; dev only). `src/main.ts` imports this only behind
 * `import.meta.env.DEV` and `?editorDraft=1`, so the production build has none of it. It fetches the editor's unsaved
 * campus before the map builds, puts the player at the editor's spawn, tells the editor (the parent page, same origin
 * only) when the game shows that pose, and sends the player and camera back on F10, View + Menu held 0.5 s, or the pause
 * menu's "Back to editor". While hidden the match stays paused through its own pause. No game code is changed.
 */
import { Vector3 } from '../core/babylon';
import type { App } from '../core/app';
import { flags } from '../core/flags';
import type { GameState } from '../game/gameState';
import { PauseScreen, pauseExtraRows } from '../ui/screens/pauseScreen';
import { clearOfWalls, setKestrelDraft } from '../world/maps/kestrel';
import { levelAt, type CampusFile } from '../world/maps/kestrelCampus';

type Spawn = NonNullable<typeof flags.spawn>;
/** Standard mapping: View (Back / Select / Share) and Menu (Start / Options). */
const VIEW = 8;
const MENU = 9;
const HOLD = 0.5;
/** Rendered frames between a teleport and the ready message (the camera settles behind the player). */
const SETTLE = 3;

let campus: CampusFile | null = null;

export async function loadDraft(): Promise<void> {
  const r = await fetch('/__editor/draft');
  if (!r.ok) throw new Error('The editor has no draft for the walk test (start it from the editor)');
  campus = (await r.json()) as CampusFile;
  setKestrelDraft(campus, flags.spawn);
}

export function attach(app: App): void {
  const game = (): GameState | null => {
    const g = app.current as GameState | null;
    return g && 'player' in g && 'world' in g ? g : null;
  };
  let pending: Spawn | null = flags.spawn;
  let settle = -1;
  let open = true;
  let hold = 0;
  let last = performance.now();
  let tick = 0;

  const post = (type: 'ready' | 'back'): void => {
    const g = game();
    if (!g) return;
    const p = g.player.position;
    const cam = g.player.cam.camera;
    const t = cam.getTarget();
    const lv = campus ? levelAt(campus, p.x, p.z, p.y) : null;
    const msg = { source: 'kestrel-walk', type, x: p.x, y: p.y, z: p.z, level: lv?.id ?? '', yaw: g.player.cam.yaw, playerYaw: g.player.controller.yaw, cam: { pos: [cam.position.x, cam.position.y, cam.position.z], target: [t.x, t.y, t.z], fov: cam.fov } };
    parent.postMessage(msg, location.origin);
  };

  const place = (g: GameState, s: Spawn): void => {
    const lv = campus?.levels.find((l) => l.id === s.level);
    const y = lv?.floor ?? g.player.position.y;
    const [x, z] = clearOfWalls(g.world.level, s.x, s.z, y);
    g.player.controller.teleport(new Vector3(x, y + 0.05, z), s.yaw);
    g.player.cam.yaw = s.yaw;
    g.player.cam.snap();
  };

  const back = (): void => {
    const g = game();
    if (!g || !open) return;
    open = false;
    g.pause();
    post('back');
  };

  pauseExtraRows.push({ label: 'Back to editor', act: back });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F10') return;
    e.preventDefault();
    back();
  });
  window.addEventListener('message', (e: MessageEvent<{ source?: string; type?: string; spawn?: Spawn }>) => {
    if (e.origin !== location.origin || e.source !== parent || e.data?.source !== 'kestrel-editor') return;
    if (e.data.type === 'walk' && e.data.spawn) {
      pending = e.data.spawn;
      settle = -1;
      open = true;
      const top = app.screens.top;
      if (top instanceof PauseScreen) top.resume();
      window.focus();
    }
  });

  const readout = document.createElement('div');
  readout.id = 'walkReadout';
  readout.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;pointer-events:none;font:13px/1.35 system-ui,sans-serif;color:#e8eef2;background:rgba(10,14,18,0.6);padding:6px 9px;border-radius:6px;text-align:right';
  document.body.append(readout);

  const showWhere = (g: GameState): void => {
    const p = g.player.position;
    const lv = campus ? levelAt(campus, p.x, p.z, p.y) : null;
    const name = lv ? (/^(Ground|First)$/.test(lv.name) ? `${lv.name} floor` : lv.name) : '?';
    readout.innerHTML = `x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)}, ${name}<br>Doors are open gaps for now`;
  };

  // its own frame loop (the game loop renders without the engine's frame events)
  const frame = (): void => {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    const g = game();
    if (!g) return;
    if (pending) {
      place(g, pending);
      pending = null;
      settle = 0;
    } else if (settle >= 0 && ++settle >= SETTLE) {
      settle = -1;
      showWhere(g);
      post('ready');
    }
    // View + Menu held together on any pad
    let both = false;
    for (const pad of navigator.getGamepads?.() ?? []) if (pad?.buttons[VIEW]?.pressed && pad.buttons[MENU]?.pressed) both = true;
    hold = both ? hold + dt : 0;
    if (hold >= HOLD) {
      hold = 0;
      back();
    }
    if (++tick % 10 === 0) showWhere(g);
  };
  requestAnimationFrame(frame);
}
