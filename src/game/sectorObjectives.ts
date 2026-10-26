/**
 * (hud-guidance B4, G343 / HG8, M6) Sector Ops in Field Terminal > Objectives: every section's objective and exit, in
 * order, done / current / to do, for every player (solo, the host and each co-op client; G308). Pure, Babylon-free.
 * The host builds the rows from its run; a co-op client mirrors them with no wire change from the host's live section
 * (`sector` message `ls`), the map's section data and the host's objective line (BRIEF A8).
 */
import { exitZone, type SectorDef, type SectorPhase } from './sectors';
import type { ObjectiveLine } from '../ui/screens/pauseScreen';

/**
 * Two rows per section (its objective, then its exit: the connector or the extraction). `phase` `'objective'` makes
 * section `index`'s objective row Current, `'connector'` / `'extract'` its exit row, `'done'` marks every row Done; rows
 * before Current are Done, rows after it To do.
 */
export function sectorObjectiveLines(defs: readonly SectorDef[], index: number, phase: SectorPhase): ObjectiveLine[] {
  const cur = phase === 'done' ? Infinity : index * 2 + (phase === 'objective' ? 0 : 1);
  const out: ObjectiveLine[] = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i]!;
    out.push({ label: d.objective.label, done: i * 2 < cur, current: i * 2 === cur });
    const z = exitZone(d);
    if (z) out.push({ label: z.label, done: i * 2 + 1 < cur, current: i * 2 + 1 === cur });
  }
  return out;
}

/** The download's trailing percent on the host's line (`sectorMode.ts`: "<label> NN%"). */
const PERCENT = / \d+%$/;

/**
 * A co-op client's mirror of the host's rows. The host's section number and its objective line arrive in either order
 * (the `sector` message every 0.5 s or on a change, the snapshot's objective only on a change), so the mirror keeps
 * the last objective line and re-reads it whenever a new section number arrives: a late join or rejoin past section 1
 * lands on the right row.
 */
export class SectorListMirror {
  /** The host's live section (`ls`), -1 until the first one. */
  private live = -1;
  /** The live section's objective line was seen since it went live: only then can its exit row go Current. From the
   *  connector's load to its far door `ls` is already the next section while the host's line still names the old exit,
   *  and two sections can share an exit label. */
  private sawObj = false;
  /** The live section's exit step (its connector or the extraction). */
  private exit = false;
  /** The op ended (the extraction held). */
  private done = false;
  /** The host's last objective line, its download percent stripped. */
  private last = '';

  constructor(private readonly defs: readonly SectorDef[]) {}

  /** The host's live section from its `sector` message; `ls < 0` (between a connector's unload and load) is ignored. */
  onLive(ls: number): void {
    if (ls < 0 || ls === this.live) return;
    // the first section number: no connector lies behind it, so the line already seen is the section's own
    const first = this.live < 0;
    this.live = ls;
    this.sawObj = first;
    this.exit = false;
    this.done = false;
    this.read();
  }

  /** The host's objective line (never a connection notice: `CoopClient.showLine`). */
  onText(t: string): void {
    this.last = t.replace(PERCENT, '');
    this.read();
  }

  /** Field Terminal > Objectives rows; null before the first section number or with no section data (GameState then
   *  shows its own line). */
  lines(): ObjectiveLine[] | null {
    if (this.live < 0 || !this.defs[this.live]) return null;
    return sectorObjectiveLines(this.defs, this.live, this.done ? 'done' : this.exit ? 'connector' : 'objective');
  }

  private read(): void {
    const s = this.defs[this.live];
    if (!s) return;
    const t = this.last;
    if (t === s.objective.label) {
      // also a checkpoint restart from the exit step: the section's objective again
      this.sawObj = true;
      this.exit = false;
    } else if (this.sawObj && t === exitZone(s)?.label) this.exit = true;
    else if (t === '' && this.exit && this.live === this.defs.length - 1) this.done = true;
  }
}
