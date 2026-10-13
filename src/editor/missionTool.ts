/**
 * ON8: the Mission tools in the editor: the Guard tool and its path editing, the markers (insertion, extraction,
 * objective, intel, checkpoint, hide), objective picking (needs first / opens), the patrol preview and "Mark alone here".
 * The rules are src/editor/mission.ts (pure); this file joins them to the editor: commits with readable words (a guard's
 * first path session is one undo step), the dot's words and ghost, the plan's marks and the 3D labels. No Babylon here:
 * the 3D marks are scene3d.ts's, the patrol figure is drawn by scene3d.ts from `pose`.
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import { addStop, closeLoop, cycleWords, GridCache, guardSummary, isolationAt, isMission, markerLabel, missionLevel, newCheckpoint, newGuard, newHide, newObjective, newSpawn, nextId, onFirstStop, legBetween, patrol, patrolAt, patrolWords, removeLastStop, setFace, stepWait, toggleRequires, walkable, withCycle } from './mission';
import type { Extraction, Guard, MissionColl, MissionData, Objective, Patrol, PatrolPose, PlayPt, Spawn } from './mission';
import { MISSION_TOOLS, objectiveKind, ROSTER } from './missionCatalogue';
import type { MissionKind } from './missionCatalogue';
import type { Change } from './model';
import type { Editor, PlanShape } from './main';
import type { Mark } from './scene3d';
import type { Elem, Key, Pt } from './types';
import { keyOf, parseKey } from './types';
import type { WalkSpawn } from './gameWalk';
import type { Eye } from './lightView';

const STOP_PICK = facts.guard.stopPick.value;
const FACE_STEP = facts.guard.faceStep.value;
const RATE = facts.guard.previewRate.value;
const MAX_SPAWNS = facts.guard.maxSpawns.value;
/** One colour per guard on the plan and in 3D (by its place in the list). */
export const GUARD_COLOURS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#c2255c', '#5c940d'] as const;

const fmt = (v: number): string => String(Math.round(v * 100) / 100);
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A floating label in 3D (overlays.ts draws them). */
export interface MissionLabel {
  text: string;
  colour: string;
  x: number;
  y: number;
  z: number;
  level: string;
}

export class MissionTool {
  /** The Mission tab's tool (Guard, Insertion, ...). */
  kind: MissionKind = 'guard';
  /** The roster role a new guard takes (D-pad left / right with the Guard tool). */
  role = 5;
  /** Path editing: the guard, whether it was placed in this session (its first session is one undo step). */
  path: { id: string; isNew: boolean; key: string } | null = null;
  /** Objective picking: A on other objectives toggles them (needs first / opens). */
  link: { id: string; field: 'requires' | 'unlocks' } | null = null;
  /** The patrol preview: the guard, the time into its loop, its pose now. */
  playing: { id: string; t: number; pose: PatrolPose; eye: Eye | null; eyeAt: number; last: number } | null = null;
  /** Hub > Play: the walk test starts at insertion point 1. */
  startAtInsertion = false;
  /** Hub > View: every guard's path, or only the selected guard's. */
  paths: 'all' | 'selected' = 'all';
  readonly grids = new GridCache();
  private sessions = 0;
  private cache: { rev: number; id: string; p: Patrol } | null = null;

  constructor(private readonly ed: Editor) {}

  private get d(): MissionData {
    return this.ed.model.data as MissionData;
  }

  private readonly gridOf = (l: string): ReturnType<GridCache['get']> => this.grids.get(this.ed.model.data, l);

  /** A guard's patrol (legs, length, cycle), cached until the data changes. */
  patrolOf(g: Guard): Patrol {
    const rev = this.ed.model.rev;
    if (this.cache && this.cache.rev === rev && this.cache.id === g.id && this.cache.p) return this.cache.p;
    const p = patrol(this.ed.model.data, g, this.gridOf);
    this.cache = { rev, id: g.id, p };
    return p;
  }

  /** A guard record with its cycle worked out again (a card step that changed its kind). */
  recycle(e: Elem): Elem {
    return withCycle(this.ed.model.data, e as unknown as Guard, this.gridOf) as unknown as Elem;
  }

  guard(id: string): Guard | undefined {
    return this.ed.model.get<Guard>('guards', id);
  }

  colourOf(id: string): string {
    const i = (this.d.guards ?? []).findIndex((g) => g.id === id);
    return GUARD_COLOURS[(i < 0 ? 0 : i) % GUARD_COLOURS.length]!;
  }

  // ---------- the tool ----------

  setKind(k: MissionKind): void {
    this.kind = k;
    this.endPath(true);
    this.link = null;
  }

  get toolName(): string {
    return MISSION_TOOLS.find((m) => m.id === this.kind)?.name ?? 'Mission';
  }

  /** The tool bar's words under the tool. */
  barWords(): string {
    if (this.path) return `Path ${this.path.id}: A adds a stop`;
    if (this.link) return `${this.link.id}: A picks objectives`;
    if (this.kind === 'guard') return `Guard: ${ROSTER[this.role]?.name ?? ''}`;
    return this.toolName;
  }

  /** D-pad left / right with the Guard tool: the roster role a new guard takes. */
  stepRole(dir: 1 | -1): string {
    this.role = (this.role + dir + ROSTER.length) % ROSTER.length;
    return ROSTER[this.role]!.name;
  }

  /** The hint line when the tool is picked. */
  hint(): string {
    if (this.path) return `Path of ${this.path.id}: A (click) adds a stop, A on the first stop closes the loop, RB (R) turns the stop, D-pad up / down (+ / -) its wait, X (Backspace) removes the last, B (Esc) ends`;
    if (this.link) return `${this.link.id}: A (click) on other objectives ${this.link.field === 'requires' ? 'makes them needed first' : 'makes it open them'}; again takes it back; B (Esc) ends`;
    const m = MISSION_TOOLS.find((q) => q.id === this.kind);
    return `${m?.name ?? 'Mission'}: ${m?.desc ?? ''}${this.kind === 'guard' ? `; D-pad left / right picks the role (${ROSTER[this.role]?.name ?? ''})` : ''}`;
  }

  private here(x: number, z: number): PlayPt {
    return [Math.round(x * 100) / 100, Math.round(z * 100) / 100, this.ed.view.level];
  }

  /** A (a click) with the Mission tool. */
  down(x: number, z: number, sx: number, sy: number, source: '3d' | 'plan' | 'pad'): void {
    if (this.path) return this.pathDown(x, z);
    if (this.link) return this.linkDown(x, z);
    const ed = this.ed;
    const d = this.d;
    const at = this.here(x, z);
    if (this.kind === 'guard') {
      const role = ROSTER[this.role]!;
      const g = withCycle(d, newGuard(d, at, role), this.gridOf);
      this.sessions++;
      const key = `path:${g.id}:${this.sessions}`;
      ed.commitText(`Added ${guardSummary(g)}`, [{ coll: 'guards', id: g.id, before: null, after: g as Elem }], { key, at: 0, within: Infinity });
      this.path = { id: g.id, isNew: true, key };
      ed.select(keyOf('guards', g.id));
      ed.status(`Guard ${g.id} (${role.name}) placed at its first stop: A (click) adds the next stop, B (Esc) ends`);
      return ed.updateHint();
    }
    if (this.kind === 'extraction') {
      // A at one corner, A at the other (drawn like a floor hole); a new zone replaces the old one on commit
      const id = nextId(d.extraction, 'EX');
      const e: Extraction = { id, level: at[2], rect: [at[0], at[1], at[0], at[1]] };
      ed.model.preview('extraction', e as Elem);
      ed.beginDrag('extraction', id, null, [at[0], at[1]], ed.viewFloor(), sx, sy, source, true);
      return;
    }
    if (this.kind === 'spawn') {
      const s = newSpawn(d, at);
      if (!s) return ed.status(`There are ${MAX_SPAWNS} insertion points already (1-${MAX_SPAWNS} players): move or delete one`);
      const n = (d.spawns ?? []).length + 1;
      return this.added('spawns', s, `Added insertion ${n} (${s.id}) at x ${fmt(at[0])}, z ${fmt(at[1])}`);
    }
    if (this.kind === 'objective' || this.kind === 'intel') {
      const o = newObjective(d, at, this.kind === 'intel' ? 'intel' : 'zone');
      return this.added('objectives', o, `Added objective ${o.id}, ${objectiveKind(o.kind).name}, order ${o.order}${o.room ? ` in ${o.room}` : ''}`);
    }
    if (this.kind === 'checkpoint') {
      const c = newCheckpoint(d, at);
      return this.added('checkpoints', c, `Added checkpoint ${c.id} at x ${fmt(at[0])}, z ${fmt(at[1])}`);
    }
    const h = newHide(d, at, 'recess');
    return this.added('hides', h, `Added hiding place ${h.id} (recess) at x ${fmt(at[0])}, z ${fmt(at[1])}`);
  }

  private added(coll: MissionColl, e: { id: string }, text: string): void {
    this.ed.commitText(text, [{ coll, id: e.id, before: null, after: e as Elem }]);
    this.ed.select(keyOf(coll, e.id));
    this.ed.status(`${text}: A (click) places another, B (Esc) puts the tool down`);
  }

  /** The extraction zone drawn: it replaces the old one in the same edit. */
  extractionDone(after: Extraction): Change[] {
    const old = (this.d.extraction ?? []).filter((e) => e.id !== after.id);
    return [...old.map((e): Change => ({ coll: 'extraction', id: e.id, before: e as Elem, after: null })), { coll: 'extraction', id: after.id, before: null, after: after as Elem }];
  }

  // ---------- path editing ----------

  /** Selected > Edit path: path editing on a guard (its edits are one undo step until B). */
  startPath(id: string): void {
    const g = this.guard(id);
    if (!g) return;
    this.stopPatrol();
    this.sessions++;
    this.path = { id, isNew: false, key: `path:${id}:${this.sessions}` };
    this.link = null;
    if (this.ed.tool !== 'mission') this.ed.setTool('mission');
    this.ed.select(keyOf('guards', id));
    const s = g.loop.at(-1);
    if (s && s.at[2] !== this.ed.view.level) this.ed.setLevel(s.at[2]);
    this.ed.status(this.hint());
    this.ed.updateHint();
  }

  /** B: path editing ends (the tool stays on for the next guard). `quiet`: no words. */
  endPath(quiet = false): void {
    const p = this.path;
    if (!p) return;
    this.path = null;
    if (quiet) return;
    const g = this.guard(p.id);
    if (g) this.ed.status(`${g.id}: ${patrolWords(this.patrolOf(g), g)}. ${this.ed.tool === 'mission' ? 'A (click) places the next guard, B (Esc) puts the tool down' : ''}`);
    this.ed.updateHint();
  }

  private commitGuard(before: Guard, after: Guard, words: string): void {
    const p = this.path;
    const g = withCycle(this.ed.model.data, after, this.gridOf);
    const text = p?.isNew ? `Added ${guardSummary(g)}` : `Changed ${g.id}'s patrol (${words}): ${g.loop.length} stops, ${Math.round(g.cycle)} s loop`;
    this.ed.commitText(text, [{ coll: 'guards', id: g.id, before: before as Elem, after: g as Elem }], p && p.id === g.id ? { key: p.key, at: 0, within: Infinity } : undefined);
  }

  private pathDown(x: number, z: number): void {
    const g = this.guard(this.path!.id);
    if (!g) return this.endPath(true);
    const lv = this.ed.view.level;
    if (onFirstStop(g, x, z, lv)) {
      if (g.loop.length < 3) return this.ed.status('A loop needs at least three stops: add another first');
      this.commitGuard(g, closeLoop(g), 'loop closed');
      const now = this.guard(g.id)!;
      this.ed.status(`${g.id}'s loop closed: ${patrolWords(this.patrolOf(now), now)}`);
      this.path = null;
      return this.ed.updateHint();
    }
    const last = g.loop.at(-1)!;
    if (last.at[2] === lv && hyp2(last.at[0] - x, last.at[1] - z) < STOP_PICK) return this.ed.status('That is the last stop: move the dot on');
    const after = addStop(g, this.here(x, z));
    this.commitGuard(g, after, `stop ${after.loop.length} added`);
    const now = this.guard(g.id)!;
    const p = this.patrolOf(now);
    const leg = p.legs[now.loop.length - 2];
    this.ed.status(`${now.id} stop ${now.loop.length}: ${leg && !leg.ok ? leg.why : `${fmt(leg?.len ?? 0)} m from stop ${now.loop.length - 1}`}; ${patrolWords(p, now)}`);
  }

  /** X: the last stop goes. */
  removeLast(): void {
    const g = this.path ? this.guard(this.path.id) : undefined;
    if (!g) return;
    if (g.loop.length <= 1) return this.ed.status('The first stop stays (delete the guard to remove it)');
    this.commitGuard(g, removeLastStop(g), `stop ${g.loop.length} removed`);
    this.ed.status(`${g.id}: stop ${g.loop.length} removed`);
  }

  /** RB (R): the last stop turns by the face step; the right stick sets it (`to` degrees). */
  turnFace(to?: number): void {
    const g = this.path ? this.guard(this.path.id) : undefined;
    const s = g?.loop.at(-1);
    if (!g || !s) return;
    const deg = to ?? s.face + FACE_STEP;
    const after = setFace(g, deg);
    if (after.loop.at(-1)!.face === s.face) return;
    this.commitGuard(g, after, `stop ${g.loop.length} faces ${after.loop.at(-1)!.face} degrees`);
    this.ed.status(`${g.id} stop ${g.loop.length} faces ${after.loop.at(-1)!.face} degrees`);
  }

  /** D-pad up / down (+ / -): the last stop's wait. */
  stepWait(dir: 1 | -1): void {
    const g = this.path ? this.guard(this.path.id) : undefined;
    if (!g) return;
    const after = stepWait(g, dir);
    if (after === g) return this.ed.status('A wait is 0 s or more');
    this.commitGuard(g, after, `stop ${g.loop.length} waits ${after.loop.at(-1)!.wait} s`);
    const now = this.guard(g.id)!;
    this.ed.status(`${g.id} stop ${g.loop.length} waits ${after.loop.at(-1)!.wait} s; ${patrolWords(this.patrolOf(now), now)}`);
  }

  // ---------- objectives ----------

  startLink(id: string, field: 'requires' | 'unlocks'): void {
    this.endPath(true);
    this.link = { id, field };
    if (this.ed.tool !== 'mission') this.ed.setTool('mission');
    this.ed.select(keyOf('objectives', id));
    this.ed.status(this.hint());
    this.ed.updateHint();
  }

  endLink(): void {
    if (!this.link) return;
    const o = this.ed.model.get<Objective>('objectives', this.link.id);
    this.link = null;
    if (o) this.ed.status(`${o.id} needs ${o.requires.join(', ') || 'nothing'} first and opens ${o.unlocks.join(', ') || 'nothing'}`);
    this.ed.updateHint();
  }

  /** The objective marker at (x, z) on this level, other than the one being linked. */
  private objectiveNear(x: number, z: number): Objective | undefined {
    const lv = this.ed.view.level;
    let best: Objective | undefined;
    let bd = STOP_PICK * 1.5;
    for (const o of this.d.objectives ?? []) {
      if (o.at[2] !== lv || o.id === this.link?.id) continue;
      const dd = hyp2(o.at[0] - x, o.at[1] - z);
      if (dd < bd) {
        bd = dd;
        best = o;
      }
    }
    return best;
  }

  private linkDown(x: number, z: number): void {
    const l = this.link!;
    const me = this.ed.model.get<Objective>('objectives', l.id);
    const other = this.objectiveNear(x, z);
    if (!me) return this.endLink();
    if (!other) return this.ed.status('Move onto another objective (B ends)');
    const [needer, needed] = l.field === 'requires' ? [me, other] : [other, me];
    const had = needer.requires.includes(needed.id);
    const [a, b] = toggleRequires(needer, needed);
    const text = had ? `${a.id} no longer needs ${b.id} first` : `${a.id} needs ${b.id} first (${b.id} opens ${a.id})`;
    this.ed.commitText(text, [
      { coll: 'objectives', id: a.id, before: needer as Elem, after: a as Elem },
      { coll: 'objectives', id: b.id, before: needed as Elem, after: b as Elem },
    ]);
    const warn = cycleWords(this.d.objectives ?? []);
    this.ed.status(warn ? `${text}. ${warn}` : `${text}: A on more objectives, B ends`);
  }

  // ---------- the dot ----------

  /** The dot's words and ghost with the Mission tool. */
  ghost(x: number, z: number, f: number): { words: string; bad: boolean; key: string; marks: Mark[]; plan: PlanShape[] } {
    const lv = this.ed.view.level;
    const marks: Mark[] = [];
    const plan: PlanShape[] = [{ kind: 'ring', p: [x, z] }];
    const post = (look: Mark['look'], h = 1.75): Mark => ({ x, y: f + h / 2, z, sx: 0.12, sy: h, sz: 0.12, dx: 1, dz: 0, look });
    const grid = this.gridOf(lv);
    const floor = !!grid && walkable(grid, x, z);
    if (this.path) {
      const g = this.guard(this.path.id);
      if (!g) return { words: '', bad: false, key: 'p', marks, plan };
      if (onFirstStop(g, x, z, lv)) {
        const p = this.patrolOf(closeLoop(g));
        marks.push(post('ghost'));
        return { words: g.loop.length >= 3 ? `A: close the loop (${patrolWords(p, closeLoop(g))})` : 'The first stop: a loop needs three stops', bad: g.loop.length < 3, key: `pc|${g.id}|${g.loop.length}`, marks, plan };
      }
      const last = g.loop.at(-1)!;
      const leg = legBetween(this.ed.model.data, last.at, [x, z, lv], g.loop.length - 1, g.loop.length, this.gridOf);
      for (let i = 1; i < leg.pts.length; i++) {
        const a = leg.pts[i - 1]!;
        const b = leg.pts[i]!;
        if (a[2] === lv && b[2] === lv) plan.push({ kind: 'line', a: [a[0], a[1]], b: [b[0], b[1]] });
      }
      marks.push(post(leg.ok ? 'ghost' : 'bad'));
      const words = leg.ok ? `A: stop ${g.loop.length + 1} here, ${fmt(leg.len)} m from stop ${g.loop.length}` : `${leg.why.replace(`stop ${g.loop.length + 1}`, 'here')}`;
      return { words: floor ? words : `${words} (not a floor a guard can stand on)`, bad: !leg.ok, key: `pl|${g.id}|${g.loop.length}|${Math.round(x * 10)},${Math.round(z * 10)}`, marks, plan };
    }
    if (this.link) {
      const o = this.objectiveNear(x, z);
      const me = this.ed.model.get<Objective>('objectives', this.link.id);
      if (!o || !me) return { words: `Move onto another objective; B ends`, bad: false, key: `lk|${x},${z}`, marks, plan };
      const [needer, needed] = this.link.field === 'requires' ? [me, o] : [o, me];
      const had = needer.requires.includes(needed.id);
      marks.push({ x: o.at[0], y: f + 1, z: o.at[1], sx: 0.6, sy: 0.6, sz: 0.6, dx: 1, dz: 0, look: 'ghost' });
      return { words: had ? `A: ${needer.id} no longer needs ${needed.id}` : `A: ${needer.id} needs ${needed.id} first`, bad: false, key: `lk|${o.id}|${had}`, marks, plan };
    }
    if (this.kind === 'spawn' && (this.d.spawns ?? []).length >= MAX_SPAWNS) {
      marks.push(post('bad'));
      return { words: `Insertion ${MAX_SPAWNS} is the last (1-${MAX_SPAWNS} players)`, bad: true, key: 'sp-full', marks, plan };
    }
    marks.push(post('ghost', this.kind === 'extraction' ? 0.2 : 1.75));
    const what = this.kind === 'guard' ? `a guard (${ROSTER[this.role]?.name ?? ''})` : this.kind === 'spawn' ? `insertion ${(this.d.spawns ?? []).length + 1}` : this.kind === 'extraction' ? 'the extraction zone: A here, A at the far corner' : this.kind === 'intel' ? 'an intel pickup' : this.kind === 'objective' ? `objective ${(this.d.objectives ?? []).length + 1}` : this.kind === 'checkpoint' ? 'a checkpoint' : 'a hiding place';
    return { words: `A: ${what}${floor ? '' : ' (not on a floor a guard or player stands on)'}`, bad: false, key: `mk|${this.kind}|${this.role}|${Math.round(x * 10)},${Math.round(z * 10)}|${floor}`, marks, plan };
  }

  // ---------- patrol preview and isolation ----------

  togglePatrol(id: string): void {
    if (this.playing?.id === id) return this.stopPatrol(true);
    const g = this.guard(id);
    if (!g) return;
    this.stopPatrol();
    const p = this.patrolOf(g);
    if (p.cycle <= 0) return this.ed.status(`${id} has one stop: add stops first (Edit path)`);
    const pose = patrolAt(g, p, 0);
    // ON7: with the guard view on (the light view, the darkness map or a guard eye), its sight moves with the guard
    const lights = this.ed.lights;
    const eye = lights.on || lights.dark || lights.eyes.length > 0 ? lights.addEye(pose.x, pose.z, pose.yaw) : null;
    if (eye) eye.level = pose.level;
    this.playing = { id, t: 0, pose, eye, eyeAt: 0, last: 0 };
    this.ed.status(`Patrol of ${id}: ${patrolWords(p, g)}${eye ? '; its sight moves with it' : ''}. Selected > Stop patrol ends it`);
    this.ed.view.setPatrolFigure(pose, this.colourOf(id));
  }

  stopPatrol(say = false): void {
    const p = this.playing;
    if (!p) return;
    this.playing = null;
    if (p.eye) this.ed.lights.dropEye(p.eye);
    this.ed.view.setPatrolFigure(null, '');
    this.ed.drawPlanOverlay();
    if (say) this.ed.status(`Patrol of ${p.id} stopped`);
  }

  /** Once per rendered frame: the preview walks on (real time, facts guard.previewRate). */
  frame(dt: number): void {
    const pl = this.playing;
    if (!pl) return;
    const g = this.guard(pl.id);
    if (!g) return this.stopPatrol();
    const p = this.patrolOf(g);
    // (wall-clock time, so a slow frame does not slow the guard; a stall of over half a second is skipped)
    const now0 = performance.now();
    const step = pl.last ? Math.min(0.5, (now0 - pl.last) / 1000) : dt;
    pl.last = now0;
    pl.t = (pl.t + step * RATE) % Math.max(0.001, p.cycle);
    pl.pose = patrolAt(g, p, pl.t);
    this.ed.view.setPatrolFigure(pl.pose, this.colourOf(pl.id));
    const now = performance.now();
    if (now - pl.eyeAt > 250) {
      pl.eyeAt = now;
      if (pl.eye) this.ed.lights.moveEye(pl.eye, pl.pose.x, pl.pose.z, pl.pose.yaw, pl.pose.level);
      this.ed.drawPlanOverlay();
    }
  }

  /** Selected > Mark alone here: the loop's point nearest the dot (or the patrol's place now) with its time. */
  markAlone(id: string, x: number, z: number): void {
    const g = this.guard(id);
    if (!g) return;
    const p = this.patrolOf(g);
    const pl = this.playing?.id === id ? this.playing : null;
    const iso = pl ? { at: [Math.round(pl.pose.x * 100) / 100, Math.round(pl.pose.z * 100) / 100, pl.pose.level] as PlayPt, t: Math.round(pl.t * 10) / 10 } : isolationAt(g, p, x, z, this.ed.view.level);
    if (!iso) return this.ed.status(`${id}'s loop does not pass this level`);
    this.ed.commitText(`${g.id} is alone at x ${fmt(iso.at[0])}, z ${fmt(iso.at[1])}, ${iso.t} s into its ${Math.round(g.cycle)} s loop`, [{ coll: 'guards', id, before: g as Elem, after: { ...g, isolation: iso } as Elem }]);
  }

  // ---------- the walk test ----------

  setStartAtInsertion(on: boolean): void {
    this.startAtInsertion = on && (this.d.spawns ?? []).length > 0;
    this.ed.status(this.startAtInsertion ? 'The walk test starts at insertion 1 (Tab, L3 held, Hub > Play)' : 'The walk test starts at the dot');
  }

  /** Insertion point 1 as the walk test's start (facing north), or null. */
  spawnPoint(): WalkSpawn | null {
    if (!this.startAtInsertion) return null;
    const s = this.d.spawns?.[0];
    return s ? { x: s.at[0], z: s.at[1], level: s.at[2], yaw: 0 } : null;
  }

  // ---------- drawing ----------

  /** Whether a guard's path is drawn (Hub > View "Guard paths"). */
  showsPath(id: string): boolean {
    return this.paths === 'all' || this.ed.selected === keyOf('guards', id) || this.path?.id === id;
  }

  /** The plan's marks on the editing level: guard paths (legs, arrows, stops with facing and wait) and the markers. */
  planMarkup(toPlan: (x: number, z: number) => Pt, S: number): string {
    const d = this.d;
    const lv = this.ed.view.level;
    const sel = this.ed.selected;
    let out = '';
    const ring = (key: Key): string => (sel === key ? ' stroke="#ff7300" stroke-width="3"' : ' stroke="#222" stroke-width="1.5"');
    for (const g of d.guards ?? []) {
      const col = this.colourOf(g.id);
      const key = keyOf('guards', g.id);
      if (this.showsPath(g.id)) {
        const p = this.patrolOf(g);
        for (const leg of p.legs) {
          const open = !g.closed && leg.to === 0;
          for (let i = 1; i < leg.pts.length; i++) {
            const a = leg.pts[i - 1]!;
            const b = leg.pts[i]!;
            if (a[2] !== lv || b[2] !== lv) continue;
            const pa = toPlan(a[0], a[1]);
            const pb = toPlan(b[0], b[1]);
            out += `<line class="guardLeg${leg.ok ? '' : ' bad'}" data-guard="${esc(g.id)}" x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}" stroke="${leg.ok ? col : '#e03131'}" stroke-width="${leg.ok ? 2.5 : 3.5}"${open || !leg.ok ? ' stroke-dasharray="6 4"' : ''} pointer-events="none"/>`;
            // an arrow at the middle of each long piece, pointing the way walked
            const L = hyp2(pb[0] - pa[0], pb[1] - pa[1]);
            if (L > 30) {
              const ux = (pb[0] - pa[0]) / L;
              const uy = (pb[1] - pa[1]) / L;
              const mx = (pa[0] + pb[0]) / 2;
              const my = (pa[1] + pb[1]) / 2;
              out += `<path d="M${mx + ux * 6},${my + uy * 6} L${mx - ux * 5 - uy * 5},${my - uy * 5 + ux * 5} L${mx - ux * 5 + uy * 5},${my - uy * 5 - ux * 5} Z" fill="${leg.ok ? col : '#e03131'}" pointer-events="none"/>`;
            }
          }
          if (!leg.ok) {
            const a = leg.pts[0]!;
            const b = leg.pts.at(-1)!;
            if (a[2] === lv) {
              const pm = toPlan((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
              out += `<text class="legWhy" x="${pm[0] + 6}" y="${pm[1] - 6}" font-size="11" fill="#e03131" pointer-events="none">${esc(leg.why)}</text>`;
            }
          }
        }
      }
      g.loop.forEach((s, i) => {
        if (s.at[2] !== lv || (i > 0 && !this.showsPath(g.id))) return;
        const a = toPlan(s.at[0], s.at[1]);
        const r = i === 0 ? 9 : 6;
        const fx = Math.sin((s.face * Math.PI) / 180);
        const fz = Math.cos((s.face * Math.PI) / 180);
        // the facing wedge (plan y grows south)
        const tip: Pt = [a[0] + fx * (r + 9), a[1] - fz * (r + 9)];
        const l: Pt = [a[0] + fx * r - fz * 5, a[1] - fz * r - fx * 5];
        const rr: Pt = [a[0] + fx * r + fz * 5, a[1] - fz * r + fx * 5];
        out += `<path d="M${tip[0]},${tip[1]} L${l[0]},${l[1]} L${rr[0]},${rr[1]} Z" fill="${col}" fill-opacity="0.8" pointer-events="none"/>`;
        out += `<circle data-id="${key}" class="guardStop" cx="${a[0]}" cy="${a[1]}" r="${r}" fill="${col}"${ring(key)}/>`;
        if (i === 0) out += `<text x="${a[0] + 11}" y="${a[1] - 9}" font-size="11" fill="#222" pointer-events="none">${esc(g.id)}</text>`;
        if (s.wait > 0) out += `<text class="stopWait" x="${a[0] - 4}" y="${a[1] + 4}" font-size="9" fill="#fff" pointer-events="none">${s.wait}</text>`;
      });
      if (g.isolation && g.isolation.at[2] === lv && this.showsPath(g.id)) {
        const a = toPlan(g.isolation.at[0], g.isolation.at[1]);
        out += `<g class="isolation" pointer-events="none"><circle cx="${a[0]}" cy="${a[1]}" r="10" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="3 2"/><text x="${a[0] + 12}" y="${a[1] + 12}" font-size="10" fill="${col}">alone ${g.isolation.t} s</text></g>`;
      }
    }
    if (this.playing && this.playing.pose.level === lv) {
      const a = toPlan(this.playing.pose.x, this.playing.pose.z);
      out += `<g class="patrolFig" pointer-events="none"><circle cx="${a[0]}" cy="${a[1]}" r="8" fill="#fff" stroke="${this.colourOf(this.playing.id)}" stroke-width="4"/><line x1="${a[0]}" y1="${a[1]}" x2="${a[0] + Math.sin(this.playing.pose.yaw) * 16}" y2="${a[1] - Math.cos(this.playing.pose.yaw) * 16}" stroke="${this.colourOf(this.playing.id)}" stroke-width="3"/></g>`;
    }
    for (const e of d.extraction ?? []) {
      if (e.level !== lv) continue;
      const a = toPlan(e.rect[0], e.rect[3]);
      const key = keyOf('extraction', e.id);
      out += `<rect data-id="${key}" class="missionMark extractMark" x="${a[0]}" y="${a[1]}" width="${(e.rect[2] - e.rect[0]) * S}" height="${(e.rect[3] - e.rect[1]) * S}" fill="#2f9e44" fill-opacity="0.15" stroke="${sel === key ? '#ff7300' : '#2f9e44'}" stroke-width="${sel === key ? 3 : 2}" stroke-dasharray="8 4"/><text x="${a[0] + 4}" y="${a[1] + 14}" font-size="12" fill="#2b8a3e" pointer-events="none">Extraction</text>`;
    }
    const point = (coll: MissionColl, e: { id: string; at: PlayPt }, shape: string, fill: string): void => {
      if (e.at[2] !== lv) return;
      const a = toPlan(e.at[0], e.at[1]);
      const key = keyOf(coll, e.id);
      const s = shape === 'diamond' ? `<path data-id="${key}" class="missionMark" d="M${a[0]},${a[1] - 9} L${a[0] + 9},${a[1]} L${a[0]},${a[1] + 9} L${a[0] - 9},${a[1]} Z" fill="${fill}"${ring(key)}/>` : shape === 'square' ? `<rect data-id="${key}" class="missionMark" x="${a[0] - 7}" y="${a[1] - 7}" width="14" height="14" fill="${fill}"${ring(key)}/>` : shape === 'flag' ? `<path data-id="${key}" class="missionMark" d="M${a[0] - 2},${a[1] + 8} L${a[0] - 2},${a[1] - 10} L${a[0] + 10},${a[1] - 5} L${a[0]},${a[1] - 1} Z" fill="${fill}"${ring(key)}/>` : `<circle data-id="${key}" class="missionMark" cx="${a[0]}" cy="${a[1]}" r="9" fill="${fill}"${ring(key)}/>`;
      out += `${s}<text x="${a[0] + 11}" y="${a[1] + 4}" font-size="11" fill="#222" pointer-events="none">${esc(markerLabel(d, coll, e))}</text>`;
    };
    (d.spawns ?? []).forEach((s, i) => {
      point('spawns', s, 'circle', '#1c7ed6');
      if (s.at[2] === lv) {
        const a = toPlan(s.at[0], s.at[1]);
        out += `<text x="${a[0] - 3.5}" y="${a[1] + 4}" font-size="11" fill="#fff" pointer-events="none">${i + 1}</text>`;
      }
    });
    for (const o of d.objectives ?? []) point('objectives', o, 'diamond', o.kind === 'intel' ? '#f59f00' : '#e64980');
    for (const h of d.hides ?? []) point('hides', h, 'square', '#495057');
    for (const c of d.checkpoints ?? []) point('checkpoints', c, 'flag', '#0ca678');
    return out;
  }

  /** The 3D labels: marker names and stop waits, on their levels. */
  labels(): MissionLabel[] {
    const d = this.d;
    const out: MissionLabel[] = [];
    for (const g of d.guards ?? []) {
      const col = this.colourOf(g.id);
      const s0 = g.loop[0];
      if (s0) out.push({ text: markerLabel(d, 'guards', g), colour: col, x: s0.at[0], y: 2.1, z: s0.at[1], level: s0.at[2] });
      if (!this.showsPath(g.id)) continue;
      g.loop.forEach((s, i) => {
        if (s.wait > 0 || i > 0) out.push({ text: `${i + 1}${s.wait > 0 ? `: ${s.wait} s` : ''}`, colour: col, x: s.at[0], y: 0.6, z: s.at[1], level: s.at[2] });
      });
    }
    for (const coll of ['spawns', 'objectives', 'hides', 'checkpoints'] as const)
      for (const e of (d[coll] ?? []) as { id: string; at: PlayPt }[]) out.push({ text: markerLabel(d, coll, e), colour: coll === 'spawns' ? '#1c7ed6' : coll === 'objectives' ? '#e64980' : coll === 'hides' ? '#495057' : '#0ca678', x: e.at[0], y: 1.9, z: e.at[1], level: e.at[2] });
    for (const e of d.extraction ?? []) out.push({ text: 'Extraction', colour: '#2f9e44', x: (e.rect[0] + e.rect[2]) / 2, y: 0.5, z: (e.rect[1] + e.rect[3]) / 2, level: e.level });
    return out;
  }

  /** The card's foot words (the guard's loop, the objective's links, a marker's place). */
  footWords(coll: MissionColl, e: Elem): string {
    if (coll === 'guards') {
      const g = e as unknown as Guard;
      const p = this.patrolOf(g);
      return `${patrolWords(p, g)}; walks ${p.speed} m/s${g.isolation ? `; alone at ${g.isolation.t} s` : ''}`;
    }
    if (coll === 'objectives') {
      const o = e as unknown as Objective;
      const warn = cycleWords(this.d.objectives ?? []);
      return `Needs ${o.requires.join(', ') || 'nothing'} first; opens ${o.unlocks.join(', ') || 'nothing'}${warn && warn.includes(o.id) ? `; ${warn}` : ''}`;
    }
    if (coll === 'spawns') return `Insertion ${(this.d.spawns ?? []).findIndex((s) => s.id === e.id) + 1} of ${(this.d.spawns ?? []).length}`;
    return '';
  }

  /** The level of a mission record (the editor's levelOf). */
  levelOf(coll: MissionColl, e: Elem): string {
    return missionLevel(coll, e);
  }

  /** Keys that belong to the mission (not the building): nothing to rebake or recheck. */
  static isMissionKey(k: string): boolean {
    const p = parseKey(k);
    return !!p && isMission(p.coll);
  }

  /** The spawn records (for tests and the walk test). */
  get spawns(): Spawn[] {
    return this.d.spawns ?? [];
  }
}
