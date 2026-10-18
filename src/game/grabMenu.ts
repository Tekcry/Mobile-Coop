/**
 * (CT prototype A4, G23, G43, G178) The Chaos Theory grab menu, Babylon-free. The ground takedown button grabs a guard
 * from behind; while holding him this short list opens in the HUD: Knock out, Kill, Carry (knock out and shoulder the
 * body), and the stubs Force to device (no scanner hook yet) and Interrogate (later). The game reads `pick()` and
 * acts; the HUD draws `labels()`. Stub entries do nothing but say so (the menu stays open).
 */

export type GrabOpt = 'knockout' | 'kill' | 'carry' | 'device' | 'interrogate';

export const GRAB_OPT_LABEL: Readonly<Record<GrabOpt, string>> = {
  knockout: 'Knock out',
  kill: 'Kill',
  carry: 'Carry',
  device: 'Force to device (not yet)',
  interrogate: 'Interrogate (later)',
};

/** Options that work today. */
export function grabOptReady(o: GrabOpt): boolean {
  return o === 'knockout' || o === 'kill' || o === 'carry';
}

export const GRAB_OPTS: readonly GrabOpt[] = ['knockout', 'kill', 'carry', 'device', 'interrogate'];

export class GrabMenu {
  open = false;
  sel = 0;
  readonly opts: readonly GrabOpt[] = GRAB_OPTS;

  show(): void {
    this.open = true;
    this.sel = 0;
  }

  move(dir: number): void {
    if (!this.open) return;
    this.sel = (this.sel + (dir > 0 ? 1 : -1) + this.opts.length) % this.opts.length;
  }

  /** The highlighted option. A working option closes the menu; a stub leaves it open and is returned for its message. */
  pick(): GrabOpt | null {
    if (!this.open) return null;
    const o = this.opts[this.sel] ?? null;
    if (o && grabOptReady(o)) this.close();
    return o;
  }

  close(): void {
    this.open = false;
  }

  labels(out: string[] = []): string[] {
    out.length = 0;
    for (const o of this.opts) out.push(GRAB_OPT_LABEL[o]);
    return out;
  }
}
