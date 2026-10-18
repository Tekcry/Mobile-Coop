/**
 * Walk test as the player (ED2 Part B): the game in a full-window iframe over the editor, built from the editor's
 * current campus (unsaved edits included) through the dev server's in-memory draft. The game stays loaded and paused
 * while hidden ("warm"); the next walk only teleports the player when the campus text is unchanged, else it reloads.
 * Messages go both ways with `postMessage`, same origin only. The camera blend is main.ts's job.
 */
import type { Campus } from './types';

export interface WalkSpawn {
  x: number;
  z: number;
  level: string;
  yaw: number;
}

/** What the game sends (src/dev/editorBridge.ts). */
export interface WalkReport {
  source: 'kestrel-walk';
  type: 'ready' | 'back';
  x: number;
  y: number;
  z: number;
  level: string;
  yaw: number;
  playerYaw: number;
  cam: { pos: [number, number, number]; target: [number, number, number]; fov: number };
}

/** off: no game; loading: built or teleporting, invisible; swap: the editor camera is easing in; open: playing; warm: hidden and paused. */
export type WalkState = 'off' | 'loading' | 'swap' | 'open' | 'warm';

export function walkUrl(s: WalkSpawn): string {
  const f = (v: number): string => String(Math.round(v * 1000) / 1000);
  return `/index.html?autostart=kestrel&mode=sandbox&editorDraft=1&spawn=${f(s.x)},${f(s.z)},${encodeURIComponent(s.level)},${f(s.yaw)}`;
}

export class GameWalk {
  state: WalkState = 'off';
  frame: HTMLIFrameElement | null = null;
  /** The campus text the loaded game was built from. */
  builtText = '';
  /** Page loads of the iframe (tests: a warm walk does not reload). */
  loads = 0;
  last: WalkReport | null = null;

  constructor(private readonly on: { ready(r: WalkReport): void; back(r: WalkReport): void; failed(why: string): void }) {
    window.addEventListener('message', (e: MessageEvent<WalkReport>) => {
      if (e.origin !== location.origin || !this.frame || e.source !== this.frame.contentWindow || e.data?.source !== 'kestrel-walk') return;
      this.last = e.data;
      if (e.data.type === 'ready' && this.state === 'loading') {
        this.state = 'swap';
        this.on.ready(e.data);
      } else if (e.data.type === 'back' && (this.state === 'open' || this.state === 'swap')) {
        this.hide();
        this.on.back(e.data);
      }
    });
  }

  /** The editor reads no pad, keys or mouse while the game is easing in or playing. */
  get blocking(): boolean {
    return this.state === 'swap' || this.state === 'open';
  }

  /** Starts a walk: teleports the warm game when the campus is unchanged, else posts the draft and (re)loads it. */
  async start(campus: Campus, text: string, spawn: WalkSpawn): Promise<'warm' | 'load'> {
    if (this.frame && this.state === 'warm' && text === this.builtText) {
      this.state = 'loading';
      this.frame.style.visibility = 'visible';
      this.frame.contentWindow?.postMessage({ source: 'kestrel-editor', type: 'walk', spawn }, location.origin);
      return 'warm';
    }
    this.drop();
    const r = await fetch('/__editor/draft', { method: 'POST', body: JSON.stringify(campus) });
    if (!r.ok) throw new Error(`draft not sent (${r.status})`);
    const f = document.createElement('iframe');
    f.id = 'gameWalk';
    f.title = 'Walk test as the player';
    f.allow = 'gamepad; fullscreen; autoplay';
    f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:50;opacity:0;pointer-events:none;background:transparent';
    f.addEventListener('load', () => this.loads++);
    f.src = walkUrl(spawn);
    document.body.append(f);
    this.frame = f;
    this.builtText = text;
    this.state = 'loading';
    // a game that never reports (a build error) gives the editor back
    const mine = f;
    window.setTimeout(() => {
      if (this.frame === mine && this.state === 'loading') {
        this.drop();
        this.on.failed('The game did not start in 90 s (see the console)');
      }
    }, 90000);
    return 'load';
  }

  /** The swap's last frame: the game shows and takes the input. */
  show(): void {
    if (!this.frame) return;
    this.frame.style.opacity = '1';
    this.frame.style.pointerEvents = 'auto';
    this.frame.focus();
    this.frame.contentWindow?.focus();
    this.state = 'open';
  }

  /** Hidden and paused (the game paused itself before it reported back). */
  hide(): void {
    if (!this.frame) return;
    this.frame.style.opacity = '0';
    this.frame.style.pointerEvents = 'none';
    this.frame.style.visibility = 'hidden';
    this.frame.blur();
    window.focus();
    this.state = 'warm';
  }

  /** Drops the game (revert, restore, a changed campus). */
  drop(): void {
    this.frame?.remove();
    this.frame = null;
    this.builtText = '';
    this.state = 'off';
  }
}
