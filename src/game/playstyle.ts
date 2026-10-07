/**
 * Play styles (pure): Ghost (unseen and non-lethal), Panther (unseen and lethal), Assault (in the open). Every
 * action scores points to one style by how it was done and whether the operator was detected at the time; the
 * results show the split as three bars, and the economy pays by it (phase 8).
 */
export type PlayStyle = 'ghost' | 'panther' | 'assault';
export const PLAY_STYLES: readonly PlayStyle[] = ['ghost', 'panther', 'assault'];

export type StyleEvent =
  | 'knockout'
  | 'kill'
  | 'headshot'
  | 'takedownLethal'
  | 'takedownNonLethal'
  | 'execute'
  | 'objective'
  | 'objectiveUnseen'
  | 'bodyHidden'
  | 'detected'
  | 'alarm'
  | 'explosion'
  | 'ghostExtract'
  | 'avoided';

/** Points per event: [ghost, panther, assault]; `seen` versions apply while the operator is detected. */
const POINTS: Record<StyleEvent, { unseen: [number, number, number]; seen: [number, number, number] }> = {
  knockout: { unseen: [150, 0, 0], seen: [60, 0, 40] },
  kill: { unseen: [0, 120, 0], seen: [0, 0, 100] },
  headshot: { unseen: [0, 60, 0], seen: [0, 0, 40] },
  takedownLethal: { unseen: [0, 200, 0], seen: [0, 80, 80] },
  takedownNonLethal: { unseen: [220, 0, 0], seen: [80, 0, 60] },
  execute: { unseen: [0, 250, 0], seen: [0, 120, 120] },
  objective: { unseen: [200, 100, 0], seen: [0, 0, 200] },
  objectiveUnseen: { unseen: [300, 0, 0], seen: [0, 0, 0] },
  bodyHidden: { unseen: [80, 40, 0], seen: [0, 0, 0] },
  detected: { unseen: [0, 0, 80], seen: [0, 0, 80] },
  alarm: { unseen: [0, 0, 150], seen: [0, 0, 150] },
  explosion: { unseen: [0, 0, 60], seen: [0, 0, 60] },
  ghostExtract: { unseen: [500, 0, 0], seen: [0, 0, 0] },
  avoided: { unseen: [40, 20, 0], seen: [0, 0, 0] },
};

export class StyleTracker {
  readonly points: Record<PlayStyle, number> = { ghost: 0, panther: 0, assault: 0 };
  /** Times the operator was detected (an enemy went to combat on them) and alarms raised. */
  detections = 0;
  alarms = 0;
  kills = 0;
  knockouts = 0;

  record(ev: StyleEvent, detected: boolean): void {
    const p = POINTS[ev][detected ? 'seen' : 'unseen'];
    this.points.ghost += p[0];
    this.points.panther += p[1];
    this.points.assault += p[2];
    if (ev === 'detected') this.detections++;
    if (ev === 'alarm') this.alarms++;
    if (ev === 'kill' || ev === 'takedownLethal' || ev === 'execute') this.kills++;
    if (ev === 'knockout' || ev === 'takedownNonLethal') this.knockouts++;
  }

  /** Shares 0..1 summing to 1 (all zero when nothing scored). */
  split(): Record<PlayStyle, number> {
    const t = this.points.ghost + this.points.panther + this.points.assault;
    if (t <= 0) return { ghost: 0, panther: 0, assault: 0 };
    return { ghost: this.points.ghost / t, panther: this.points.panther / t, assault: this.points.assault / t };
  }

  /** The style with the most points (ghost on a tie with nothing done). */
  dominant(): PlayStyle {
    const p = this.points;
    if (p.assault > p.ghost && p.assault > p.panther) return 'assault';
    if (p.panther > p.ghost) return 'panther';
    return 'ghost';
  }

  get total(): number {
    return this.points.ghost + this.points.panther + this.points.assault;
  }
}
