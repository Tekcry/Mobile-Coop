/**
 * Infiltration missions (pure, unit-tested): data-driven objective chains per map (`config/missions.json`,
 * validated like the weapons), the chain's state machine (one objective at a time; intel items in any order;
 * hold objectives keep their progress when you leave), the download's noticed pulses, and per-mission rules
 * (no alarms / no kills / undetected as a bonus or a fail condition).
 */
import raw from '../config/missions.json';

export type ObjectiveType = 'download' | 'plant' | 'rescue' | 'sabotage' | 'intel' | 'extract';
export const OBJECTIVE_TYPES: readonly ObjectiveType[] = ['download', 'plant', 'rescue', 'sabotage', 'intel', 'extract'];

export interface ObjectiveDef {
  type: ObjectiveType;
  id: string;
  label: string;
  /** Site (floor point) and facing; intel uses `items` instead. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Hold time (s): download 30-60, plant / sabotage a few seconds. */
  time: number;
  /** Intel: the item sites. */
  items: [number, number, number][];
  /** Extract / rescue: the zone radius (m); rescue: where the VIP is held (x, y, z). */
  radius: number;
  vip: [number, number, number] | null;
}

export type RuleMode = 'off' | 'bonus' | 'fail';
export interface MissionRules {
  noAlarms: RuleMode;
  noKills: RuleMode;
  undetected: RuleMode;
}

export interface Insertion {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface MissionDef {
  id: string;
  name: string;
  map: string;
  brief: string;
  insertions: Insertion[];
  objectives: ObjectiveDef[];
  rules: MissionRules;
  /** Use the map's room squads (else `enemySpawns` squads). */
  squads: 'rooms' | 'spawns';
}

const num = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const str = (v: unknown, d: string, max = 80): string => (typeof v === 'string' && v.length ? v.slice(0, max) : d);
const rule = (v: unknown): RuleMode => (v === 'bonus' || v === 'fail' ? v : 'off');
const p3 = (v: unknown): [number, number, number] | null => (Array.isArray(v) && v.length >= 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? [v[0] as number, v.length >= 3 ? (v[1] as number) : 0, v[v.length >= 3 ? 2 : 1] as number] : null);

const HOLD: Record<ObjectiveType, [number, number, number]> = {
  // [min, max, default] hold seconds
  download: [30, 60, 40],
  plant: [1.5, 8, 3],
  rescue: [0, 3, 1],
  sabotage: [2, 10, 4],
  intel: [0, 0, 0],
  extract: [0, 0, 0],
};

/** Validate the mission content; throws on a broken mission (bad type, no objectives, no insertion). */
export function validateMissions(data: unknown): MissionDef[] {
  if (!Array.isArray(data)) throw new Error('missions: expected an array');
  const out: MissionDef[] = [];
  const ids = new Set<string>();
  for (const m of data as Record<string, unknown>[]) {
    const id = str(m.id, '');
    if (!id || ids.has(id)) throw new Error(`missions: bad or duplicate id "${id}"`);
    ids.add(id);
    const map = str(m.map, '');
    if (!map) throw new Error(`missions.${id}: no map`);
    const ins: Insertion[] = [];
    for (const i of (m.insertions as Record<string, unknown>[]) ?? []) {
      const p = p3([i.x, i.y ?? 0, i.z]);
      if (!p) throw new Error(`missions.${id}: bad insertion`);
      ins.push({ id: str(i.id, `ins${ins.length}`), name: str(i.name, 'Insertion'), x: p[0], y: p[1], z: p[2], yaw: num(i.yaw, -10, 10, 0) });
    }
    if (ins.length < 1 || ins.length > 3) throw new Error(`missions.${id}: 1-3 insertions`);
    const objs: ObjectiveDef[] = [];
    for (const o of (m.objectives as Record<string, unknown>[]) ?? []) {
      const type = o.type as ObjectiveType;
      if (!OBJECTIVE_TYPES.includes(type)) throw new Error(`missions.${id}: unknown objective type "${String(o.type)}"`);
      const h = HOLD[type];
      const items: [number, number, number][] = [];
      for (const it of (o.items as unknown[]) ?? []) {
        const p = p3(it);
        if (p) items.push(p);
      }
      if (type === 'intel' && items.length < 1) throw new Error(`missions.${id}: intel needs items`);
      const vip = p3(o.vip);
      if (type === 'rescue' && !vip) throw new Error(`missions.${id}: rescue needs a vip`);
      objs.push({
        type,
        id: str(o.id, `${type}${objs.length}`),
        label: str(o.label, type),
        x: num(o.x, -500, 500, 0),
        y: num(o.y, -50, 100, 0),
        z: num(o.z, -500, 500, 0),
        yaw: num(o.yaw, -10, 10, 0),
        time: num(o.time, h[0], h[1], h[2]),
        items,
        radius: num(o.radius, 1.5, 8, 3),
        vip,
      });
    }
    if (!objs.length) throw new Error(`missions.${id}: no objectives`);
    const r = (m.rules ?? {}) as Record<string, unknown>;
    out.push({
      id,
      name: str(m.name, id),
      map,
      brief: str(m.brief, '', 240),
      insertions: ins,
      objectives: objs,
      rules: { noAlarms: rule(r.noAlarms), noKills: rule(r.noKills), undetected: rule(r.undetected) },
      squads: m.squads === 'spawns' ? 'spawns' : 'rooms',
    });
  }
  return out;
}

export const MISSIONS: MissionDef[] = validateMissions(raw);

export function missionById(id: string): MissionDef | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}

/** Download / plant: hold progress kept while away; a download is "noticed" now and then (noise pulses). */
export const DOWNLOAD = {
  /** The upload runs while the operator is within this (m) of the terminal (leave and it pauses). */
  range: 9,
  /** A running download pings this loud (m radius) every `pulse` s (enemies converge). */
  noise: 16,
  pulse: 10,
} as const;

export type ChainState = 'active' | 'done' | 'failed';

/** The objective chain: objectives in order; per-objective progress (hold seconds or intel items found). */
export class ObjectiveChain {
  index = 0;
  state: ChainState = 'active';
  failReason = '';
  readonly progress: number[];
  readonly found: boolean[][];
  /** Download pulse clock. */
  private pulseT = 0;
  /** A sabotage charge armed (it goes off at extraction). */
  armed = false;
  /** The rescued VIP is with the operator. */
  vipFree = false;

  constructor(readonly def: MissionDef) {
    this.progress = def.objectives.map(() => 0);
    this.found = def.objectives.map((o) => o.items.map(() => false));
  }

  get current(): ObjectiveDef | null {
    return this.state === 'active' ? (this.def.objectives[this.index] ?? null) : null;
  }

  /** Hold-type progress for the current objective (0..1). */
  get fraction(): number {
    const o = this.current;
    if (!o) return 1;
    if (o.type === 'intel') return this.found[this.index]!.filter(Boolean).length / Math.max(1, o.items.length);
    return o.time > 0 ? Math.min(1, this.progress[this.index]! / o.time) : 0;
  }

  /**
   * Hold the current hold-type objective for `dt` (download / plant / sabotage / rescue). Returns true when it
   * completes. A download also returns pulses through `noticed` (the noise goes out).
   */
  hold(dt: number): boolean {
    const o = this.current;
    if (!o || o.type === 'intel' || o.type === 'extract') return false;
    this.progress[this.index] = this.progress[this.index]! + dt;
    if (o.type === 'download') this.pulseT += dt;
    if (this.progress[this.index]! >= o.time) {
      if (o.type === 'sabotage') this.armed = true;
      if (o.type === 'rescue') this.vipFree = true;
      this.advance();
      return true;
    }
    return false;
  }

  /** A download pulse is due (and resets). */
  noticed(): boolean {
    if (this.pulseT >= DOWNLOAD.pulse) {
      this.pulseT = 0;
      return true;
    }
    return false;
  }

  /** Intel item `k` of the current objective picked up; true when the set completes. */
  collect(k: number): boolean {
    const o = this.current;
    if (!o || o.type !== 'intel') return false;
    const f = this.found[this.index]!;
    if (k < 0 || k >= f.length || f[k]) return false;
    f[k] = true;
    if (f.every(Boolean)) {
      this.advance();
      return true;
    }
    return false;
  }

  /** In the current extract zone (with the VIP if one was rescued). Returns true when the mission is done. */
  reach(): boolean {
    const o = this.current;
    if (!o || o.type !== 'extract') return false;
    this.advance();
    return true;
  }

  fail(reason: string): void {
    if (this.state !== 'active') return;
    this.state = 'failed';
    this.failReason = reason;
  }

  private advance(): void {
    this.index++;
    this.pulseT = 0;
    if (this.index >= this.def.objectives.length) this.state = 'done';
  }
}

export interface RuleTally {
  alarms: number;
  kills: number;
  detections: number;
}

export interface RuleResult {
  /** A fail rule broken (reason), or null. */
  fail: string | null;
  /** Bonus rules kept (labels). */
  bonuses: string[];
}

const RULE_LABEL = { noAlarms: 'No alarms', noKills: 'No kills', undetected: 'Undetected' } as const;

/** Check the mission rules against what happened. */
export function evaluateRules(r: MissionRules, t: RuleTally): RuleResult {
  const broken = { noAlarms: t.alarms > 0, noKills: t.kills > 0, undetected: t.detections > 0 };
  let fail: string | null = null;
  const bonuses: string[] = [];
  for (const k of ['noAlarms', 'noKills', 'undetected'] as const) {
    const m = r[k];
    if (m === 'fail' && broken[k]) fail = fail ?? `${RULE_LABEL[k]}: broken`;
    if (m === 'bonus' && !broken[k]) bonuses.push(RULE_LABEL[k]);
  }
  return { fail, bonuses };
}

/** Rating 0..3 stars from the play: completion, bonuses kept, detections. */
export function missionRating(done: boolean, bonuses: number, bonusTotal: number, detections: number): number {
  if (!done) return 0;
  let s = 1;
  if (bonusTotal === 0 || bonuses >= Math.ceil(bonusTotal / 2)) s++;
  if (detections === 0) s++;
  return Math.min(3, s);
}
