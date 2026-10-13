/**
 * ON12: the Security tool (Y > Security): cameras, card readers and keypads, motion sensors and beams placed as the
 * security file's records (src/editor/security.ts), the dot's ghost and words, the plan's marks (each camera's frame
 * outline and sweep, sensor fans, beams, reader plates by access level), the 3D labels, and the cells the light view
 * tints: the selected camera's cone by the light there (red / amber / blue, as the guard view) or, with the coverage view
 * on, every camera and sensor of the editing level with the gaps left clear. Not saved: the coverage view.
 */
import { CAMERA } from '../config/security';
import { hyp2 } from '../core/mathx';
import { fmt } from './geometry';
import { aimDevice, beamEnd, beamHeights, camClass, cameraCells, camView, coverage, deviceCentre, deviceFoot, deviceId, feedWords, isBeam, isCamera, isPir, isReader, makeBeam, moveDevice, pirCovers, placeDevice, sweepSpan, turnDevice } from './security';
import type { Beam, Camera, Device, SecData, SightRay } from './security';
import { DEVICE_COLOURS, levelColour, SEC_TOOLS, secTool, SF } from './securityCatalogue';
import type { SecTool } from './securityCatalogue';
import type { CellGrid } from './lightPreview';
import type { Editor, PlanShape } from './main';
import type { Mark } from './scene3d';
import type { Elem, Obj, Pt } from './types';
import { keyOf, parseKey } from './types';
import type { MissionLabel } from './missionTool';

const DEG = Math.PI / 180;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** What the light view hands the security cells: the editing level's grid, its light meter values, floor and sight ray. */
export interface SecCtx {
  grid: CellGrid;
  values: Float32Array;
  floor: number;
  level: string;
  ray: SightRay;
}

export class SecurityTool {
  /** The Security tab's tool. */
  kind: SecTool = 'camera';
  /** The yaw (degrees) a ceiling camera or sensor faces when placed; RB (R) turns it. */
  yaw = 0;
  /** Hub > View / tile menu View "Security coverage": every camera and sensor of the level tinted, gaps clear. */
  coverage = false;
  /** The coverage counts the last time the cells were worked out (floor cells). */
  stats = { watched: 0, gaps: 0, level: '' };

  constructor(private readonly ed: Editor) {}

  private get d(): SecData {
    return this.ed.model.data as unknown as SecData;
  }

  get devices(): Device[] {
    return this.d.devices ?? [];
  }

  setKind(k: SecTool): void {
    this.kind = k;
  }

  get toolName(): string {
    return secTool(this.kind).name;
  }

  barWords(): string {
    return `${this.toolName}${this.kind === 'beam' ? `, ${fmt(SF.beamHeightDefault.value)} m` : this.yaw ? `, ${this.yaw} degrees` : ''}`;
  }

  stepKind(dir: 1 | -1): string {
    const i = SEC_TOOLS.findIndex((t) => t.id === this.kind);
    this.kind = SEC_TOOLS[(i + dir + SEC_TOOLS.length) % SEC_TOOLS.length]!.id;
    return this.toolName;
  }

  hint(): string {
    const t = secTool(this.kind);
    return `${t.name}: ${t.desc}; D-pad left / right picks the device${t.kind === 'camera' || t.kind === 'pir' ? ', RB (R) turns a ceiling one' : ''}`;
  }

  turn(by: number): void {
    this.yaw = (((this.yaw + by) % 360) + 360) % 360;
  }

  /** The editor camera's look yaw (degrees), the way a ceiling camera faces by default. */
  private lookYaw(): number {
    const ct = this.ed.view.camera.getTarget();
    const cp = this.ed.view.camera.position;
    return Math.round(((Math.atan2(ct.x - cp.x, ct.z - cp.z) / DEG + this.yaw) % 360 + 360) % 360 / 5) * 5;
  }

  /** A (a click) with the Security tool: a device at the dot; a beam starts (A again at its far end). */
  down(x: number, z: number, sx: number, sy: number, source: '3d' | 'plan' | 'pad'): void {
    const ed = this.ed;
    const lv = ed.view.level;
    const grid = ed.objectGrid;
    if (this.kind === 'beam') {
      const a = beamEnd(this.d, lv, x, z, grid);
      const id = deviceId(this.d, 'beam');
      const h = SF.beamHeightDefault.value;
      const b: Beam = { id, kind: 'beam', level: lv, a: [a.p[0], h, a.p[1]], b: [a.p[0], h, a.p[1]], visible: false, room: '', reason: '' };
      ed.model.preview('devices', b as unknown as Elem);
      ed.beginDrag('devices', id, null, a.p, ed.viewFloor(), sx, sy, source, true);
      return ed.status(`Beam from ${a.wall ? `the face of ${a.wall}` : `a post at x ${fmt(a.p[0])}, z ${fmt(a.p[1])}`}: A (click) at the far end`);
    }
    const p = placeDevice(this.d, this.kind, lv, x, z, this.lookYaw(), grid);
    if (!p.dev) return ed.status(p.why ?? 'Cannot go here');
    const dev = { ...p.dev, id: deviceId(this.d, p.dev.kind) } as Device;
    const text = `Added ${secTool(this.kind).name.toLowerCase()} ${dev.id}: ${p.words}`;
    ed.commitText(text, [{ coll: 'devices', id: dev.id, before: null, after: dev as unknown as Elem }]);
    ed.select(keyOf('devices', dev.id));
    ed.status(`${text}; A (click) places another, B (Esc) puts the tool down`);
  }

  /** The beam being drawn with its far end at the pointer (the editor's drag). */
  dragBeam(before: Beam, x: number, z: number): Beam {
    const e = beamEnd(this.d, before.level, x, z, this.ed.objectGrid);
    return { ...before, b: [e.p[0], before.a[1], e.p[1]] };
  }

  /** The drawn beam on the drop: its checks (length, height), room and reason; null with why. */
  finishBeam(b: Beam): { beam: Beam | null; why: string | null } {
    const r = makeBeam(this.d, b.level, [b.a[0], b.a[2]], [b.b[0], b.b[2]], b.a[1], b.visible);
    return r.dev ? { beam: { ...r.dev, id: b.id }, why: null } : { beam: null, why: r.why };
  }

  move(e: Device, dx: number, dz: number): Device {
    return moveDevice(e, dx, dz);
  }

  /** The dot's ghost and words with the tool. */
  ghost(x: number, z: number, f: number): { words: string; bad: boolean; key: string; marks: Mark[]; plan: PlanShape[] } {
    const lv = this.ed.view.level;
    const grid = this.ed.objectGrid;
    const marks: Mark[] = [];
    const plan: PlanShape[] = [];
    if (this.kind === 'beam') {
      const e = beamEnd(this.d, lv, x, z, grid);
      const h = SF.beamHeightDefault.value;
      marks.push({ x: e.p[0], y: f + h / 2, z: e.p[1], sx: 0.08, sy: h, sz: 0.08, dx: 1, dz: 0, look: 'ghost' });
      plan.push({ kind: 'ring', p: e.p });
      return { words: `A: a beam from ${e.wall ? `the face of ${e.wall}` : 'a post here'}, ${fmt(h)} m (high)`, bad: false, key: `bm|${e.p.join()}`, marks, plan };
    }
    const p = placeDevice(this.d, this.kind, lv, x, z, this.lookYaw(), grid);
    if (!p.dev) {
      marks.push({ x, y: f + 1.2, z, sx: 0.15, sy: 0.15, sz: 0.15, dx: 1, dz: 0, look: 'bad' });
      return { words: p.why ?? 'Cannot go here', bad: true, key: `sx|${this.kind}|${Math.round(x * 10)},${Math.round(z * 10)}`, marks, plan };
    }
    const dev = p.dev as Device & { at: [number, number]; y: number; facing: number };
    const yaw = dev.facing * DEG;
    marks.push({ x: dev.at[0], y: f + dev.y, z: dev.at[1], sx: 0.3, sy: 0.15, sz: 0.15, dx: Math.sin(yaw), dz: Math.cos(yaw), look: 'ghost' });
    plan.push({ kind: 'ring', p: dev.at });
    if (isCamera(dev)) for (const s of this.frameLines(dev)) plan.push({ kind: 'line', a: s[0], b: s[1] });
    return { words: `A: ${p.words}`, bad: false, key: `sd|${this.kind}|${dev.at.join()}|${dev.facing}|${isReader(dev) ? dev.door ?? '' : ''}`, marks, plan };
  }

  /** A camera's frame outline on the plan: the two edges of its frame (a pan camera: of its whole sweep) to its range. */
  frameLines(c: Camera): [Pt, Pt][] {
    const r = CAMERA.range;
    const half = CAMERA.hFov / 2;
    const lo = (c.sweep ? Math.min(c.sweep[0], c.sweep[1]) : c.facing) * DEG - half;
    const hi = (c.sweep ? Math.max(c.sweep[0], c.sweep[1]) : c.facing) * DEG + half;
    const at = (a: number): Pt => [c.at[0] + Math.sin(a) * r, c.at[1] + Math.cos(a) * r];
    const out: [Pt, Pt][] = [[c.at, at(lo)], [c.at, at(hi)]];
    const n = Math.max(4, Math.ceil((hi - lo) / (10 * DEG)));
    for (let i = 0; i < n; i++) out.push([at(lo + ((hi - lo) * i) / n), at(lo + ((hi - lo) * (i + 1)) / n)]);
    return out;
  }

  /** The plan's marks on the editing level. */
  planMarkup(toPlan: (x: number, z: number) => Pt, S: number): string {
    const lv = this.ed.view.level;
    const sel = this.ed.selected;
    let out = '';
    const ring = (key: string): string => (sel === key ? ' stroke="#ff7300" stroke-width="3"' : ' stroke="#222" stroke-width="1.5"');
    for (const e of this.devices) {
      if (e.level !== lv) continue;
      const key = keyOf('devices', e.id);
      const label = (p: Pt, text: string): string => `<text class="secLabel" x="${p[0] + 9}" y="${p[1] - 7}" font-size="11" fill="#222" pointer-events="none">${esc(text)}</text>`;
      if (isBeam(e)) {
        const a = toPlan(e.a[0], e.a[2]);
        const b = toPlan(e.b[0], e.b[2]);
        out += `<line data-id="${key}" class="secMark beamMark" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${DEVICE_COLOURS.beam}" stroke-width="${sel === key ? 5 : 3}"${e.visible ? '' : ' stroke-dasharray="6 4"'}/>`;
        for (const p of [a, b]) out += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${DEVICE_COLOURS.beam}" pointer-events="none"/>`;
        out += label([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], `${e.id} ${fmt(e.a[1])} m`);
        continue;
      }
      if (!Array.isArray(e.at)) continue;
      const c = deviceCentre(e);
      const p = toPlan(c[0], c[1]);
      const f = typeof e.facing === 'number' ? e.facing * DEG : 0;
      if (isCamera(e)) {
        let d = '';
        for (const [s0, s1] of this.frameLines(e)) {
          const a = toPlan(s0[0], s0[1]);
          const b = toPlan(s1[0], s1[1]);
          d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
        }
        out += `<path class="camFrame" data-cam="${esc(e.id)}" d="${d}" stroke="${DEVICE_COLOURS.cone}" stroke-width="${sel === key ? 2 : 1}" stroke-dasharray="5 4" fill="none" pointer-events="none"/>`;
        const tip: Pt = [p[0] + Math.sin(f) * 14, p[1] - Math.cos(f) * 14];
        out += `<line x1="${p[0]}" y1="${p[1]}" x2="${tip[0]}" y2="${tip[1]}" stroke="${DEVICE_COLOURS.camera}" stroke-width="5" pointer-events="none"/>`;
        out += `<rect data-id="${key}" class="secMark camMark" x="${p[0] - 6}" y="${p[1] - 6}" width="12" height="12" fill="${DEVICE_COLOURS.camera}"${ring(key)}/>`;
        out += label(p, `${e.id}${e.sweep ? ` pan ${sweepSpan(e)}` : ''}`);
      } else if (isReader(e)) {
        out += `<rect data-id="${key}" class="secMark readerMark" x="${p[0] - 5}" y="${p[1] - 7}" width="10" height="14" fill="${levelColour(e.accessLevel)}"${ring(key)}/>`;
        out += label(p, `${e.id} L${e.accessLevel}${e.reader === 'card' ? '' : e.reader === 'keypad' ? ' keypad' : ' PIN'}`);
      } else if (isPir(e)) {
        const r = SF.pirRange.value * S;
        if (e.mount === 'wall') {
          const a0 = f - (SF.pirWallFan.value / 2) * DEG;
          const a1 = f + (SF.pirWallFan.value / 2) * DEG;
          const q0: Pt = [p[0] + Math.sin(a0) * r, p[1] - Math.cos(a0) * r];
          const q1: Pt = [p[0] + Math.sin(a1) * r, p[1] - Math.cos(a1) * r];
          out += `<path class="pirFan" d="M${p[0]} ${p[1]}L${q0[0].toFixed(1)} ${q0[1].toFixed(1)}A${r} ${r} 0 ${SF.pirWallFan.value > 180 ? 1 : 0} 1 ${q1[0].toFixed(1)} ${q1[1].toFixed(1)}Z" stroke="${DEVICE_COLOURS.pirFan}" stroke-dasharray="4 3" fill="${DEVICE_COLOURS.pirFan}" fill-opacity="0.06" pointer-events="none"/>`;
        } else out += `<circle class="pirFan" cx="${p[0]}" cy="${p[1]}" r="${r}" stroke="${DEVICE_COLOURS.pirFan}" stroke-dasharray="4 3" fill="${DEVICE_COLOURS.pirFan}" fill-opacity="0.06" pointer-events="none"/>`;
        out += `<circle data-id="${key}" class="secMark pirMark" cx="${p[0]}" cy="${p[1]}" r="6" fill="${DEVICE_COLOURS.pir}"${ring(key)}/>`;
        out += label(p, `${e.id} ${e.lamp ? `> ${e.lamp}` : 'alarm'}`);
      } else out += `<circle data-id="${key}" class="secMark" cx="${p[0]}" cy="${p[1]}" r="6" fill="#868e96"${ring(key)}/>${label(p, e.id)}`;
    }
    return out;
  }

  /** The 3D labels (device ids) on their levels. */
  labels(): MissionLabel[] {
    const out: MissionLabel[] = [];
    for (const e of this.devices) {
      const c = deviceCentre(e);
      const y = isBeam(e) ? e.a[1] + 0.3 : typeof e.y === 'number' ? e.y + 0.3 : 1;
      out.push({ text: e.id, colour: isReader(e) ? levelColour(e.accessLevel) : isPir(e) ? DEVICE_COLOURS.pirFan : isBeam(e) ? DEVICE_COLOURS.beam : DEVICE_COLOURS.cone, x: c[0], y, z: c[1], level: e.level });
    }
    return out;
  }

  /** The card's foot (and the side panel's words). */
  footWords(e: Device): string {
    return deviceFoot(e);
  }

  /** The security desk object's card: its feed list. */
  deskWords(o: Obj): string {
    return feedWords(this.d, o.id);
  }

  /** Selected > Aim on a camera or sensor: its facing turned to `yaw` (degrees). */
  aimed(e: Device, yaw: number): Device {
    return aimDevice(e, yaw);
  }

  turned(e: Device, by: number): Device {
    return turnDevice(e, by);
  }

  /** The light view needs the exact light (and its sight ray): the coverage view, or a camera or sensor selected. */
  get wantsLight(): boolean {
    if (this.coverage) return true;
    const p = this.ed.selected ? parseKey(this.ed.selected) : null;
    if (p?.coll !== 'devices') return false;
    const e = this.ed.model.get('devices', p.id) as unknown as Device | undefined;
    return !!e && (isCamera(e) || isPir(e));
  }

  /**
   * The cells the light view tints on the editing level: 3 red (lit: seen at once), 2 amber (seen slowly), 1 blue (in a
   * camera's frame but hidden), 4 violet (a sensor's fan). Coverage view: every camera and sensor of the level (cameras
   * 1, sensors 4), the gaps clear, counted. Else the selected camera's cone by the light, or the selected sensor's fan.
   */
  cells(c: SecCtx): Uint8Array | null {
    const devs = this.devices.filter((e) => e.level === c.level);
    const g = c.grid;
    if (this.coverage) {
      const cams = devs.filter(isCamera).map((e) => cameraCells(g, camView(this.d, e), c.floor, c.ray));
      const cov = coverage(g, cams, devs.filter(isPir));
      this.stats = { watched: cov.watched, gaps: cov.gaps, level: c.level };
      return cov.cells;
    }
    const p = this.ed.selected ? parseKey(this.ed.selected) : null;
    const e = p?.coll === 'devices' ? devs.find((q) => q.id === p.id) : undefined;
    if (!e) return null;
    const out = new Uint8Array(g.nx * g.nz);
    if (isCamera(e)) {
      cameraCells(g, camView(this.d, e), c.floor, c.ray, out);
      for (let k = 0; k < out.length; k++) if (out[k]) out[k] = camClass(c.values[k]!);
      return out;
    }
    if (isPir(e)) {
      for (let k = 0; k < out.length; k++) {
        if (!g.walk[k]) continue;
        const x = g.x0 + ((k % g.nx) + 0.5) * g.cell;
        const z = g.z0 + (Math.floor(k / g.nx) + 0.5) * g.cell;
        if (pirCovers(e, x, z)) out[k] = 4;
      }
      return out;
    }
    return null;
  }

  /** The device nearest a point on the level (e2e, Find). */
  nearest(x: number, z: number): Device | null {
    let best: Device | null = null;
    let bd = Infinity;
    for (const e of this.devices) {
      if (e.level !== this.ed.view.level) continue;
      const c = deviceCentre(e);
      const d = hyp2(c[0] - x, c[1] - z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** The allowed beam heights (the card steps through them). */
  get beamHeights(): number[] {
    return beamHeights();
  }
}
