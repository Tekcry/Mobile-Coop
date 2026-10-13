/**
 * ON3 overlays on the editor's 3D view: floating room names (a fixed pool of labels, faded with distance, hidden beyond
 * the range and on hidden levels), red markers on the problem spots while the Checks tab or panel is open, and the scale
 * figure at the dot (a 1.75 m person and a 1.15 m crouch). Nothing here makes a mesh or a DOM node after the first use.
 */
import { Color3, CreateBox, StandardMaterial, Vector3 } from '../core/babylon';
import type { Mesh } from '../core/babylon';
import { hyp3 } from '../core/mathx';
import facts from '../../scripts/kestrel/facts.json';
import { buildingAt, elementState } from './visibility';
import type { VisSettings } from './visibility';
import type { Editor } from './main';
import { badgesOf, stealthTint } from './objects';
import type { Badge } from './objects';
import type { Obj } from './types';
import type { MissionLabel } from './missionTool';

/** Floating names hide beyond this (facts.json render.roomNameRange). */
export const NAME_RANGE = facts.render.roomNameRange.value;
const STAND = facts.player.standHeight.value;
const CROUCH = facts.player.crouchHeight.value;
const RADIUS = facts.player.radius.value;
const LABELS = 48;
const MARKERS = 40;
/** ON4: badge icons over objects (a fixed pool, nearest first is not needed: the first in range). */
const BADGES = 64;
/** ON8: guard and mission marker labels (a fixed pool). */
const MISSION_LABELS = 64;
const BADGE_ICON: Record<Badge, string> = { full: 'Full', crouch: 'Crouch', vault: 'Vault', climb: 'Climb', hang: 'Hang' };

interface BadgeSpot {
  text: string;
  colour: string;
  x: number;
  y: number;
  z: number;
  level: string;
  building: string;
}

interface NameSpot {
  name: string;
  x: number;
  z: number;
  level: string;
  building: string;
}

/** A problem spot: the element a check line names, at its centre on its level. */
export interface ProblemSpot {
  x: number;
  z: number;
  level: string;
}

export class EditorOverlays {
  names = false;
  figure = false;
  private readonly layer: HTMLElement;
  private readonly labels: HTMLDivElement[] = [];
  private readonly labelText: string[] = [];
  private labelsOn = 0;
  private spots: NameSpot[] = [];
  private spotsAt = -1;
  private readonly v = new Vector3();
  private readonly out = new Vector3();
  private markers: Mesh[] = [];
  private problems: readonly ProblemSpot[] = [];
  private problemKey = '';
  private fig: Mesh[] = [];
  private shownVis: VisSettings | null = null;
  private readonly badgeEls: HTMLDivElement[] = [];
  private readonly badgeText: string[] = [];
  private badgesOn = 0;
  private badgeSpots: BadgeSpot[] = [];
  private badgeAt = -1;
  private readonly mEls: HTMLDivElement[] = [];
  private readonly mText: string[] = [];
  private mOn = 0;
  private mSpots: MissionLabel[] = [];
  private mKey = '';

  constructor(private readonly ed: Editor) {
    this.layer = document.createElement('div');
    this.layer.id = 'roomNames';
    document.getElementById('view3d')?.appendChild(this.layer);
    for (let i = 0; i < LABELS; i++) {
      const d = document.createElement('div');
      d.className = 'rname';
      d.style.display = 'none';
      this.layer.appendChild(d);
      this.labels.push(d);
      this.labelText.push('');
    }
    for (let i = 0; i < MISSION_LABELS; i++) {
      const d = document.createElement('div');
      d.className = 'rname obadge mlabel';
      d.style.display = 'none';
      this.layer.appendChild(d);
      this.mEls.push(d);
      this.mText.push('');
    }
    for (let i = 0; i < BADGES; i++) {
      const d = document.createElement('div');
      d.className = 'rname obadge';
      d.style.display = 'none';
      this.layer.appendChild(d);
      this.badgeEls.push(d);
      this.badgeText.push('');
    }
  }

  /** Once per rendered frame. */
  frame(): void {
    this.problemFrame();
    this.figureFrame();
    this.namesFrame();
    this.badgesFrame();
    this.missionFrame();
  }

  // ---------- guard and mission marker labels (ON8) ----------
  private missionFrame(): void {
    const ed = this.ed;
    const view = ed.view;
    const d = ed.model.data;
    if ((!d.guards?.length && !d.spawns?.length && !d.objectives?.length && !d.hides?.length && !d.checkpoints?.length && !d.extraction?.length) || ed.prefs.layout === 'plan' || ed.walk.state === 'open') return this.hideMission(0);
    const key = `${ed.dataVersion}|${ed.mission.paths}|${ed.selected ?? ''}|${ed.mission.path?.id ?? ''}`;
    if (key !== this.mKey) {
      this.mKey = key;
      this.mSpots = ed.mission.labels();
    }
    const cam = view.camera.position;
    const [fx, fy, fz] = ed.controls.forward();
    const m = view.scene.getTransformMatrix();
    const cv = view.engine.getRenderingCanvas();
    const w = cv?.clientWidth ?? 0;
    const h = cv?.clientHeight ?? 0;
    const vis = this.visNow();
    const levels = d.levels;
    const bs = d.meta.buildings;
    let n = 0;
    for (const s of this.mSpots) {
      if (n >= MISSION_LABELS) break;
      if (elementState(vis, levels, view.level, [s.level], buildingAt(bs, s.x, s.z)) !== 'shown') continue;
      const y = view.floorOf(s.level) + view.offsetOf(s.level) + s.y;
      const dx = s.x - cam.x;
      const dy = y - cam.y;
      const dz = s.z - cam.z;
      if (hyp3(dx, dy, dz) > NAME_RANGE || dx * fx + dy * fy + dz * fz < 0.5) continue;
      this.v.set(s.x, y, s.z);
      Vector3.TransformCoordinatesToRef(this.v, m, this.out);
      const sx = ((this.out.x + 1) / 2) * w;
      const sy = ((1 - this.out.y) / 2) * h;
      if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
      const el = this.mEls[n]!;
      const k = `${s.text}|${s.colour}`;
      if (this.mText[n] !== k) {
        this.mText[n] = k;
        el.textContent = s.text;
        el.style.borderColor = s.colour;
      }
      el.style.transform = `translate(${sx.toFixed(0)}px, ${sy.toFixed(0)}px) translate(-50%, -50%)`;
      if (n >= this.mOn) el.style.display = '';
      n++;
    }
    this.hideMission(n);
  }

  private hideMission(from: number): void {
    for (let i = from; i < this.mOn; i++) this.mEls[i]!.style.display = 'none';
    this.mOn = from;
  }

  /** How many mission labels show (the e2e reads it). */
  get missionShown(): number {
    return this.mOn;
  }

  // ---------- object badges (ON4) ----------
  private badgesFrame(): void {
    const ed = this.ed;
    const view = ed.view;
    const objs = (ed.model.data.objects ?? []) as Obj[];
    if (!objs.length || ed.prefs.layout === 'plan' || ed.walk.state === 'open') return this.hideBadges(0);
    if (this.badgeAt !== ed.dataVersion) {
      this.badgeAt = ed.dataVersion;
      const bs = ed.model.data.meta.buildings;
      this.badgeSpots = objs.map((o) => {
        const x = (o.rect[0] + o.rect[2]) / 2;
        const z = (o.rect[1] + o.rect[3]) / 2;
        const b = badgesOf(o).badges;
        return { text: o.seeThrough ? 'See-through' : b.map((k) => BADGE_ICON[k]).join(' ') || '-', colour: stealthTint(o) ?? '#8d9096', x, y: o.y + o.h + 0.25, z, level: o.level, building: buildingAt(bs, x, z) };
      });
    }
    const cam = view.camera.position;
    const [fx, fy, fz] = ed.controls.forward();
    const m = view.scene.getTransformMatrix();
    const cv = view.engine.getRenderingCanvas();
    const w = cv?.clientWidth ?? 0;
    const h = cv?.clientHeight ?? 0;
    const vis = this.visNow();
    const levels = ed.model.data.levels;
    let n = 0;
    for (const s of this.badgeSpots) {
      if (n >= BADGES) break;
      if (elementState(vis, levels, view.level, [s.level], s.building) !== 'shown') continue;
      const y = view.floorOf(s.level) + view.offsetOf(s.level) + s.y;
      const dx = s.x - cam.x;
      const dy = y - cam.y;
      const dz = s.z - cam.z;
      const d = hyp3(dx, dy, dz);
      if (d > NAME_RANGE || dx * fx + dy * fy + dz * fz < 0.5) continue;
      this.v.set(s.x, y, s.z);
      Vector3.TransformCoordinatesToRef(this.v, m, this.out);
      const sx = ((this.out.x + 1) / 2) * w;
      const sy = ((1 - this.out.y) / 2) * h;
      if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
      const el = this.badgeEls[n]!;
      const key = `${s.text}|${s.colour}`;
      if (this.badgeText[n] !== key) {
        this.badgeText[n] = key;
        el.textContent = s.text;
        el.style.borderColor = s.colour;
      }
      el.style.transform = `translate(${sx.toFixed(0)}px, ${sy.toFixed(0)}px) translate(-50%, -50%)`;
      if (n >= this.badgesOn) el.style.display = '';
      n++;
    }
    this.hideBadges(n);
  }

  private hideBadges(from: number): void {
    for (let i = from; i < this.badgesOn; i++) this.badgeEls[i]!.style.display = 'none';
    this.badgesOn = from;
  }

  /** How many badge icons show (the e2e reads it). */
  get badgesShown(): number {
    return this.badgesOn;
  }

  // ---------- floating names ----------
  private namesFrame(): void {
    const ed = this.ed;
    const view = ed.view;
    if (!this.names || ed.prefs.layout === 'plan' || ed.walk.state === 'open') return this.hideLabels(0);
    if (this.spotsAt !== ed.dataVersion) {
      this.spotsAt = ed.dataVersion;
      const bs = ed.model.data.meta.buildings;
      this.spots = ed.model.data.rooms.map((r) => ({ name: r.name || r.id, x: (r.rect[0] + r.rect[2]) / 2, z: (r.rect[1] + r.rect[3]) / 2, level: r.level, building: r.building ?? buildingAt(bs, (r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2) }));
    }
    const cam = view.camera.position;
    const [fx, fy, fz] = ed.controls.forward();
    const m = view.scene.getTransformMatrix();
    const cv = view.engine.getRenderingCanvas();
    const w = cv?.clientWidth ?? 0;
    const h = cv?.clientHeight ?? 0;
    const vis = this.visNow();
    const levels = ed.model.data.levels;
    let n = 0;
    for (const s of this.spots) {
      if (n >= LABELS) break;
      if (elementState(vis, levels, view.level, [s.level], s.building) !== 'shown') continue;
      const y = view.floorOf(s.level) + view.offsetOf(s.level) + 0.15;
      const dx = s.x - cam.x;
      const dy = y - cam.y;
      const dz = s.z - cam.z;
      const d = hyp3(dx, dy, dz);
      if (d > NAME_RANGE || dx * fx + dy * fy + dz * fz < 0.5) continue;
      this.v.set(s.x, y, s.z);
      Vector3.TransformCoordinatesToRef(this.v, m, this.out);
      const sx = ((this.out.x + 1) / 2) * w;
      const sy = ((1 - this.out.y) / 2) * h;
      if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
      const el = this.labels[n]!;
      if (this.labelText[n] !== s.name) {
        this.labelText[n] = s.name;
        el.textContent = s.name;
      }
      const k = d / NAME_RANGE;
      el.style.opacity = (1 - k * k).toFixed(2);
      el.style.transform = `translate(${sx.toFixed(0)}px, ${sy.toFixed(0)}px) translate(-50%, -50%)`;
      if (n >= this.labelsOn) el.style.display = '';
      n++;
    }
    this.hideLabels(n);
  }

  /** The visibility the 3D view uses now (walking shows every level). */
  private visNow(): VisSettings {
    const view = this.ed.view;
    if (!view.showAll) return view.vis;
    if (!this.shownVis || this.shownVis.ghost !== view.vis.ghost) this.shownVis = { ...view.vis, preset: 'whole', building: 'all', exploded: false };
    return this.shownVis;
  }

  private hideLabels(from: number): void {
    for (let i = from; i < this.labelsOn; i++) this.labels[i]!.style.display = 'none';
    this.labelsOn = from;
  }

  /** How many names show (the e2e reads it). */
  get namesShown(): number {
    return this.labelsOn;
  }

  // ---------- problem markers ----------
  private problemFrame(): void {
    const ed = this.ed;
    const on = ed.checksShown();
    const key = on ? `${ed.checksSeq}|${ed.dataVersion}` : '';
    if (key !== this.problemKey) {
      this.problemKey = key;
      this.problems = on ? ed.problemSpots() : [];
      ed.drawPlanOverlay();
    }
    if (!this.problems.length && !this.markers.some((m) => m.isEnabled())) return;
    const view = ed.view;
    const vis = this.visNow();
    const levels = ed.model.data.levels;
    const bs = ed.model.data.meta.buildings;
    if (!this.markers.length) {
      const mat = new StandardMaterial('problem-marker', view.scene);
      mat.diffuseColor = Color3.FromHexString('#ff3b30');
      mat.emissiveColor = Color3.FromHexString('#ff3b30').scale(0.7);
      mat.alpha = 0.6;
      for (let i = 0; i < MARKERS; i++) {
        const m = CreateBox(`problem ${i}`, { width: 0.5, height: 3, depth: 0.5 }, view.scene);
        m.material = mat;
        m.isPickable = false;
        m.renderingGroupId = 1;
        m.setEnabled(false);
        this.markers.push(m);
      }
    }
    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i]!;
      const p = this.problems[i];
      const show = !!p && elementState(vis, levels, view.level, [p.level], buildingAt(bs, p.x, p.z)) === 'shown';
      if (show) m.position.set(p.x, view.floorOf(p.level) + view.offsetOf(p.level) + 1.5, p.z);
      if (m.isEnabled() !== show) m.setEnabled(show);
    }
  }

  /** How many red markers show (the e2e reads it). */
  get markersShown(): number {
    return this.markers.filter((m) => m.isEnabled()).length;
  }

  // ---------- scale figure ----------
  private figureFrame(): void {
    const ed = this.ed;
    const on = this.figure && !ed.controls.walking && ed.prefs.layout !== 'plan';
    if (!on) {
      for (const m of this.fig) if (m.isEnabled()) m.setEnabled(false);
      return;
    }
    if (!this.fig.length) {
      const scene = ed.view.scene;
      const body = new StandardMaterial('figure', scene);
      body.diffuseColor = Color3.FromHexString('#0a84ff');
      body.emissiveColor = Color3.FromHexString('#0a84ff').scale(0.4);
      body.alpha = 0.8;
      const wire = new StandardMaterial('figure-crouch', scene);
      wire.diffuseColor = Color3.FromHexString('#ffd166');
      wire.emissiveColor = Color3.FromHexString('#ffd166').scale(0.8);
      wire.wireframe = true;
      const head = 0.25;
      // the person: a body box and a head box, 1.75 m to the top; the crouch: a 1.15 m outline beside it
      const parts: [string, number, number, number, number, StandardMaterial][] = [
        ['figure body', 2 * RADIUS * 0.75, STAND - head, 2 * RADIUS * 0.45, 0, body],
        ['figure head', head * 0.8, head, head * 0.9, STAND - head, body],
        ['figure crouch', 2 * RADIUS, CROUCH, 2 * RADIUS, 0, wire],
      ];
      for (const [name, sx, sy, sz, y0, mat] of parts) {
        const m = CreateBox(name, { width: sx, height: sy, depth: sz }, scene);
        m.material = mat;
        m.isPickable = false;
        m.metadata = { y0: y0 + sy / 2 };
        this.fig.push(m);
      }
    }
    const p = ed.dotPoint();
    if (!p) return;
    const y = ed.viewFloor();
    for (let i = 0; i < this.fig.length; i++) {
      const m = this.fig[i]!;
      const off = i === 2 ? 2 * RADIUS + 0.3 : 0;
      m.position.set(p[0] + off, y + (m.metadata as { y0: number }).y0, p[1]);
      if (!m.isEnabled()) m.setEnabled(true);
    }
  }

  /** The figure's top above its floor (the e2e reads it). */
  get figureTop(): number {
    const b = this.fig[1];
    return b && b.isEnabled() ? b.position.y + 0.125 - this.ed.viewFloor() : 0;
  }
}
