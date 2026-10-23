import { OVERHEAR_HOLD, ZONE_Y_TOL, type SectorDef, type SectorIntel } from './sectors';

/**
 * (sector-redesign EW5, A4) The team's keypad codes in Sector Ops: pure state, no Babylon. Codes are flags found in the
 * level (`SectorIntel`: overheard, a board, an objective), never typed. The host (or solo) owns it: `host` false is a
 * mirror that never grants (the co-op client has no Sector mode; it sees a keypad door open through the door locks in
 * the `sector` message, and the subtitle as a `feed` event). A section restart drops the codes found in that section and
 * locks its keypads again (A50: a clean retry); codes found in an earlier section stay.
 */
export class SectorCodes {
  /** Code flag -> the section it was found in. */
  private readonly have = new Map<string, number>();
  /** `got[sec][k]`: intel k of section sec has been used (its board item off, its zone done). */
  readonly got: boolean[][];
  /** `heard[sec][k]`: seconds a player has stood in overhear intel k's zone, in a row. */
  readonly heard: number[][];
  /** `open[sec][k]`: keypad k of section sec has taken its code (its door unlocked). */
  readonly open: boolean[][];

  constructor(
    readonly defs: readonly SectorDef[],
    readonly host = true,
  ) {
    this.got = defs.map((d) => (d.intel ?? []).map(() => false));
    this.heard = defs.map((d) => (d.intel ?? []).map(() => 0));
    this.open = defs.map((d) => (d.keypads ?? []).map(() => false));
  }

  /** Does the team hold code `flag`? */
  has(flag: string): boolean {
    return this.have.has(flag);
  }

  intel(sec: number, k: number): SectorIntel | null {
    return this.defs[sec]?.intel?.[k] ?? null;
  }

  /**
   * Intel k of section sec is used (read, overheard, its objective done): true when it was not used before (the mode
   * shows its line). The team gets its code; a code already held keeps the section it was first found in.
   */
  grant(sec: number, k: number): boolean {
    const n = this.intel(sec, k);
    if (!this.host || !n || this.got[sec]![k]) return false;
    this.got[sec]![k] = true;
    if (!this.have.has(n.grants)) this.have.set(n.grants, sec);
    return true;
  }

  /** (stealth-pays S2) A code from an interrogation (no intel index): true when it was new; it is held for section sec. */
  grantCode(flag: string, sec: number): boolean {
    if (!this.host || !flag || this.have.has(flag)) return false;
    this.have.set(flag, sec);
    return true;
  }

  /** Section sec's objective is done: its `objective` intel indices that grant now (into `out`, cleared first). */
  objectiveDone(sec: number, out: number[]): number[] {
    out.length = 0;
    const list = this.defs[sec]?.intel;
    if (!list) return out;
    for (let k = 0; k < list.length; k++) if (list[k]!.kind === 'objective' && this.grant(sec, k)) out.push(k);
    return out;
  }

  /**
   * An overhear step: `inside` is true while a player stands in intel k's zone (`inOverhear`). The time runs while
   * someone stays in and resets when nobody is (the exchange is heard whole); true on the step it grants.
   */
  hear(sec: number, k: number, dt: number, inside: boolean): boolean {
    const n = this.intel(sec, k);
    if (!this.host || !n || n.kind !== 'overhear' || this.got[sec]![k]) return false;
    const row = this.heard[sec]!;
    row[k] = inside ? row[k]! + dt : 0;
    return row[k]! >= (n.hold ?? OVERHEAR_HOLD) - 1e-9 && this.grant(sec, k);
  }

  /** A player used keypad k of section sec: true when it opens (the team holds its code and it was still shut). */
  useKeypad(sec: number, k: number): boolean {
    const p = this.defs[sec]?.keypads?.[k];
    if (!this.host || !p || this.open[sec]![k] || !this.has(p.code)) return false;
    this.open[sec]![k] = true;
    return true;
  }

  isOpen(sec: number, k: number): boolean {
    return this.open[sec]?.[k] === true;
  }

  /**
   * Section sec restarts: the codes found in it are dropped, its intel can be found again, and its keypads shut.
   * Returns the keypad indices that were open (their doors lock again).
   */
  restart(sec: number): number[] {
    const out: number[] = [];
    for (const [flag, at] of this.have) if (at === sec) this.have.delete(flag);
    const got = this.got[sec];
    const heard = this.heard[sec];
    if (got) for (let k = 0; k < got.length; k++) got[k] = false;
    if (heard) for (let k = 0; k < heard.length; k++) heard[k] = 0;
    const open = this.open[sec];
    if (open)
      for (let k = 0; k < open.length; k++) {
        if (open[k]) out.push(k);
        open[k] = false;
      }
    return out;
  }

  /** The codes held, sorted (tests, debug). */
  codes(): string[] {
    return [...this.have.keys()].sort();
  }
}

/** Are feet at (x, y, z) in an overhear intel's zone (the `inZone` test, allocation-free)? False for any other kind. */
export function inOverhear(n: SectorIntel, x: number, y: number, z: number): boolean {
  if (n.kind !== 'overhear') return false;
  const [x0, z0, x1, z1] = n.box;
  return x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1) && Math.abs(y - (n.floorY ?? 0)) < ZONE_Y_TOL;
}
