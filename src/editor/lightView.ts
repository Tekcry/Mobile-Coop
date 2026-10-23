/**
 * ON7: live lighting in the editor (dev only). The exact light is the game's own pipeline: the editing level's campus
 * (with only that level's lamps) goes through the Kestrel map's builder (`kestrel.build`, as the walk test builds it),
 * `LevelBuilder.build` on a hidden physics scene (the canonical light shapes, collision and doors), the game's bake
 * (`bakeLevelLight`: lamp and moon visibility through the voxel worker pool, cached like the game's), the game's
 * `LightField` (gameplay's one light function) and, for the 3D view, the game's `BakedLamps` with `LampPlugin` on clones
 * of the editor's materials (the phone light look: standard materials and the lamp volume). A lamp being dragged or
 * stepped shows at once as a quick Babylon range light (`lampMath`'s falloff, no occlusion) with its baked light off;
 * the exact bake runs 300 ms after the last change and replaces it. The darkness map, the meter at the dot and the guard
 * view read the exact field only. Nothing here is saved; nothing in the game imports this file.
 */
import type {
  DirectionalLight,
  HemisphericLight} from '../core/babylon';
import {
  Color3,
  Color4,
  CreateBox,
  CreateLineSystem,
  EngineStore,
  Mesh,
  PointLight,
  Scene,
  SpotLight,
  StandardMaterial,
  Vector3,
  VertexData,
  type AbstractMesh,
  type LinesMesh,
  type Material,
} from '../core/babylon';
import { EYE_STAND, losClear } from '../ai/perception';
import { enablePhysics } from '../physics/havok';
import { Ballistics } from '../weapons/ballistics';
import { BakedLamps } from '../world/bakedLamps';
import { dressingOn } from '../world/detailPass';
import { Doors } from '../world/doors';
import { LIGHT_GAIN, LAMP_LEVEL_GAIN, moonLight } from '../world/lampMath';
import { bakeLevelLight, type LightBake } from '../world/lightBake';
import { LightField } from '../world/lightField';
import { LIGHT, type LightRegistry } from '../world/lights';
import { LevelBuilder, type BuiltLevel } from '../world/levelBuilder';
import { KESTREL_THEME, kestrel, setKestrelDraft } from '../world/maps/kestrel';
import { nightTheme, type NightSetting } from '../world/maps/kestrelNight';
import type { MapTheme } from '../world/mapDef';
import { bearingWords, brightnessName, shadowWay } from './night';
import type { CampusFile } from '../world/maps/kestrelCampus';
import { campusLights } from '../world/maps/kestrelLights';
import { lampLevel, type Lamp } from './lamps';
import { band, bearing, BODY_HEIGHT, cellCentre, MAP_CELL, cellIndex, contour, guardClass, inView, lampOnIn, levelCells, meterWords, modeWords, sampleCells, type CellGrid, type GuardClass, type LightMode } from './lightPreview';
import type { EditorModel } from './model';
import type { EditorScene } from './scene3d';
import type { SecCtx } from './securityTool';

/** What the light view needs from the editor. */
export interface LightHost {
  readonly view: EditorScene;
  /** ON12: the security tool's cells (camera cones by the light, coverage) and whether it needs the exact light. */
  readonly security?: { readonly wantsLight: boolean; cells(c: SecCtx): Uint8Array | null; readonly coverage: boolean; readonly stats: { watched: number; gaps: number } };
  readonly model: EditorModel;
  readonly drag: unknown;
  readonly groupDrag: unknown;
  drawPlanOverlay(): void;
}

/** A guard eye of the tester (not saved). */
export interface Eye {
  x: number;
  z: number;
  /** Facing, atan2(x, z) as the AI measures it (0 north, +z). */
  yaw: number;
  level: string;
}

/** One exact result: the game's level, bake and field for the editing level. */
interface Exact {
  level: string;
  floor: number;
  phys: Scene;
  built: BuiltLevel;
  bake: LightBake;
  reg: LightRegistry;
  field: LightField;
  doors: Doors;
  ballistics: Ballistics;
  /** Lamp id of each registry light (`campusLights` order). */
  ids: string[];
}

/** Debounce of the exact bake after the last change (ON7 decision 2). */
const DEBOUNCE_MS = 300;
const COL = { hidden: [0.02, 0.02, 0.03, 0.72], grey: [0.5, 0.5, 0.52, 0.6], lit: [1, 1, 0.97, 0.5], red: [0.95, 0.12, 0.1, 0.55], amber: [1, 0.68, 0.1, 0.5] } as const;
/** ON12: security cells: 1 in a camera's frame but hidden (blue), 2 amber, 3 red (as the guard view), 4 a sensor's fan (violet). */
const SEC_COL: readonly (readonly number[] | null)[] = [null, [0.11, 0.49, 0.84, 0.45], COL.amber, COL.red, [0.44, 0.28, 0.91, 0.4]];
const CONTOUR = { hidden: '#3aa0ff', lit: '#ffd23a' } as const;

export class LightView {
  /** Light view (Y): the 3D scene lit at night by the game's bake. */
  on = false;
  /** Darkness map (B): the level's floor cells by the light meter's band. */
  dark = false;
  mode: LightMode = { kind: 'normal' };
  state: 'off' | 'baking' | 'ready' | 'failed' = 'off';
  /** Exact bakes finished (tests wait on it). */
  bakes = 0;
  /** The last bake's time (ms). */
  ms = 0;
  error = '';
  readonly eyes: Eye[] = [];
  /** The guard view tester is the tool. */
  guardTool = false;
  /** ON15: the Moon and time panel's setting while it differs from the map's (null: the map's own night). */
  night: NightSetting | null = null;
  /** ON15: the panel is on: the moon's arrow and the building shadow lines on the plan (from the exact bake). */
  moonShow = false;
  /** ON15: the moon moved since the exact bake (the 3D shows the quick sky light; the map waits for the bake). */
  moonQuick = false;
  private moonVals: Float32Array | null = null;
  /** The night the running bake was built with (the quick state ends only when the bake has the night shown). */
  private bakedNight = '';
  /** The game's light meter thresholds (`LIGHT`, bible L6), for the words and the tests. */
  readonly thresholds = { shadow: LIGHT.shadow, lit: LIGHT.lit };

  private cur: Exact | null = null;
  private lamps: BakedLamps | null = null;
  private grid: CellGrid | null = null;
  private values: Float32Array | null = null;
  private guard: Uint8Array | null = null;
  private timer = 0;
  private running = false;
  private again = false;
  private quickOn = false;
  private quickLight: PointLight | SpotLight | null = null;
  /** Flat material -> its lit clone; mesh -> its flat material while swapped. */
  private readonly lit = new Map<Material, StandardMaterial>();
  private readonly orig = new Map<AbstractMesh, Material>();
  private readonly mine = new Set<AbstractMesh>();
  private darkMesh: Mesh | null = null;
  private contourMesh: LinesMesh | null = null;
  private guardMesh: Mesh | null = null;
  /** ON12: the security cells of the editing level, their 3D mesh and plan image. */
  private sec: Uint8Array | null = null;
  private secMesh: Mesh | null = null;
  private planSec: { url: string; ver: number } | null = null;
  private secVer = 0;
  private eyeMeshes: Mesh[] = [];
  private overlayMat: StandardMaterial | null = null;
  private look: { clear: Color4; hemi: number; sun: number; dir: Vector3; ground: Color3 } | null = null;
  private planDark: { url: string; ver: number } | null = null;
  private planGuard: { url: string; ver: number } | null = null;
  private ver = 0;
  private guardVer = 0;
  private readonly a = new Vector3();
  private readonly b = new Vector3();

  constructor(private readonly host: LightHost) {
    host.view.scene.onBeforeRenderObservable.add(() => this.lamps?.frame());
  }

  private get scene(): Scene {
    return this.host.view.scene;
  }

  /** Anything needs the exact light (the bake runs only then). */
  get wanted(): boolean {
    return this.on || this.dark || this.moonShow || this.eyes.length > 0 || this.guardTool || !!this.host.security?.wantsLight;
  }

  // ---------- switches ----------

  setOn(on: boolean): void {
    this.on = on;
    if (on) {
      this.nightLook(true);
      if (this.cur && this.cur.level === this.host.view.level && this.state === 'ready') this.render();
      else this.schedule(0);
    } else {
      this.unswap();
      this.clearQuick();
      this.nightLook(false);
      this.lamps?.dispose();
      this.lamps = null;
    }
    this.afterSwitch();
  }

  /** ON15: the map's theme under the night shown: the panel's while it differs, else the map's own (`meta.night`). */
  theme(): MapTheme {
    return nightTheme(KESTREL_THEME, this.night ?? this.host.model.data.meta.night);
  }

  /** ON15: the Moon and time panel on or off (its arrow and shadow lines need the exact bake). */
  setMoonShow(on: boolean): void {
    this.moonShow = on;
    if (on && !(this.cur && this.cur.level === this.host.view.level && this.state === 'ready')) this.schedule(0);
    this.afterSwitch();
  }

  /**
   * ON15: the moon moved (the panel, null back to the map's own): quick while it moves - the 3D's sky light (the moon's
   * direction and strength, the sky fill) at once; exact on release - the game's bake (`bakeMoon`) of the editing level
   * 300 ms after the last step, which updates the shadows, the darkness map and the shadow lines.
   */
  setNight(n: NightSetting | null): void {
    this.night = n;
    if (this.look) this.skyLight();
    if (!this.wanted) return;
    this.moonQuick = true;
    this.schedule(DEBOUNCE_MS);
    this.host.drawPlanOverlay();
  }

  setDark(on: boolean): void {
    this.dark = on;
    if (on && !(this.cur && this.cur.level === this.host.view.level && this.state === 'ready')) this.schedule(0);
    this.afterSwitch();
  }

  setMode(m: LightMode): void {
    this.mode = m;
    // (modes switch lamps the game's way, in its registry: the bake itself does not change)
    if (this.cur) {
      this.applyMode();
      this.sample();
    } else if (this.wanted) this.schedule(0);
    this.afterSwitch();
  }

  setGuardTool(on: boolean): void {
    this.guardTool = on;
    if (on && !(this.cur && this.cur.level === this.host.view.level)) this.schedule(0);
    this.afterSwitch();
  }

  addEye(x: number, z: number, yaw: number): Eye {
    const e: Eye = { x, z, yaw, level: this.host.view.level };
    this.eyes.push(e);
    if (!this.cur || this.cur.level !== e.level) this.schedule(0);
    this.updateGuard();
    return e;
  }

  /** B: the eye nearest (x, z) on this level goes (the last one without a point). */
  removeEye(x?: number, z?: number): boolean {
    if (!this.eyes.length) return false;
    let k = this.eyes.length - 1;
    if (x !== undefined && z !== undefined) {
      let bd = Infinity;
      this.eyes.forEach((e, i) => {
        const d = (e.x - x) ** 2 + (e.z - z) ** 2;
        if (e.level === this.host.view.level && d < bd) {
          bd = d;
          k = i;
        }
      });
    }
    this.eyes.splice(k, 1);
    this.updateGuard();
    if (!this.wanted) this.teardown();
    return true;
  }

  /** ON8: the patrol preview's eye walks with the guard (the caller throttles it). */
  moveEye(e: Eye, x: number, z: number, yaw: number, level: string): void {
    if (e.x === x && e.z === z && e.yaw === yaw && e.level === level) return;
    e.x = x;
    e.z = z;
    e.yaw = yaw;
    e.level = level;
    this.updateGuard();
  }

  /** ON8: the patrol preview's eye goes when the preview stops. */
  dropEye(e: Eye): void {
    const i = this.eyes.indexOf(e);
    if (i < 0) return;
    this.eyes.splice(i, 1);
    this.updateGuard();
    if (!this.wanted) this.teardown();
  }

  turnLastEye(deg: number): void {
    const e = this.eyes.at(-1);
    if (!e) return;
    e.yaw = Math.atan2(Math.sin(e.yaw + (deg * Math.PI) / 180), Math.cos(e.yaw + (deg * Math.PI) / 180));
    this.updateGuard();
  }

  private afterSwitch(): void {
    if (!this.wanted) this.teardown();
    this.drawOverlays();
    this.legend();
    this.host.drawPlanOverlay();
  }

  // ---------- changes ----------

  /** A model change: a lamp being edited shows its quick light now; the exact bake follows (debounced). */
  changed(keys: readonly string[]): void {
    if (!this.wanted) return;
    if (this.on && this.cur)
      for (const k of keys) {
        if (!k.startsWith('lamps:')) continue;
        const l = this.host.model.get<Lamp>('lamps', k.slice(6));
        if (l && lampLevel(this.host.model.data, l) === this.host.view.level) this.quick(l);
      }
    this.schedule(DEBOUNCE_MS);
  }

  /** The editing level changed. */
  levelChanged(): void {
    if (this.wanted) this.schedule(0);
  }

  private schedule(ms: number): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.fire(), ms);
    if (this.state !== 'baking') this.legend();
  }

  private fire(): void {
    // (quick while dragging, exact on drop)
    if (this.host.drag || this.host.groupDrag) return this.schedule(DEBOUNCE_MS);
    if (!this.wanted) return;
    if (this.running) {
      this.again = true;
      return;
    }
    void this.bake();
  }

  // ---------- the exact bake ----------

  private async bake(): Promise<void> {
    this.running = true;
    this.state = 'baking';
    this.legend();
    const t0 = performance.now();
    try {
      const next = await this.build();
      if (!this.wanted || next.level !== this.host.view.level) {
        this.disposeExact(next);
        if (!this.wanted) this.state = 'off';
      } else {
        const old = this.cur;
        this.cur = next;
        this.applyMode();
        this.sample();
        if (this.on) this.render();
        if (old) this.disposeExact(old);
        this.state = 'ready';
        this.moonQuick = this.bakedNight !== JSON.stringify(this.night ?? this.host.model.data.meta.night ?? null);
        this.bakes++;
        this.ms = performance.now() - t0;
      }
    } catch (err) {
      this.state = 'failed';
      this.error = String(err);
      console.warn('light bake failed', err);
    }
    this.running = false;
    this.legend();
    this.host.drawPlanOverlay();
    if (this.again) {
      this.again = false;
      this.schedule(0);
    }
  }

  private async build(): Promise<Exact> {
    const d = this.host.model.data;
    const level = this.host.view.level;
    const floor = d.levels.find((l) => l.id === level)?.floor ?? 0;
    // (ON7 decision 8: the editing level's lamps only)
    const lamps = (d.lamps ?? []).filter((l) => lampLevel(d, l) === level);
    // (ON15: the night shown - the panel's, else the map's - goes in as the map's own, so the builder's theme is it)
    const night = this.night ?? d.meta.night;
    this.bakedNight = JSON.stringify(night ?? null);
    const campus = JSON.parse(JSON.stringify({ ...d, meta: { ...d.meta, night }, lamps })) as CampusFile;
    const ids: string[] = [];
    campusLights(campus as Parameters<typeof campusLights>[0], ids);
    setKestrelDraft(campus, null);
    const b = new LevelBuilder();
    kestrel.build(b, 0);
    const editorScene = this.scene;
    const phys = new Scene(this.host.view.engine);
    // (never rendered; code that makes a mesh without naming its scene keeps getting the editor's)
    EngineStore._LastCreatedScene = editorScene;
    phys.autoClear = false;
    try {
      await enablePhysics(phys);
      const theme = kestrel.theme;
      const built = b.build(phys, kestrel.id, { floor: theme.floor ?? 'concrete', dressing: dressingOn(kestrel) });
      for (const m of built.meshes) m.setEnabled(false);
      // (as World.create: the map's level, then the canonical bake every device makes)
      built.lights.ambient = theme.lightLevel ?? 0.75;
      const bake = await bakeLevelLight({ mapId: kestrel.id, seed: 0, shapes: built.light.shapes, shapesHash: built.light.hash, lo: built.light.lo, hi: built.light.hi, reg: built.lights, sunDir: theme.sunDir, moonLight: moonLight(theme) });
      const doors = new Doors(phys, built.anchors);
      const field = new LightField(bake, built.lights, doors.list);
      const ballistics = new Ballistics(phys, { lookup: () => null } as unknown as ConstructorParameters<typeof Ballistics>[1], { get: () => null } as unknown as ConstructorParameters<typeof Ballistics>[2], null as unknown as ConstructorParameters<typeof Ballistics>[3]);
      return { level, floor, phys, built, bake, reg: built.lights, field, doors, ballistics, ids };
    } catch (err) {
      phys.dispose();
      EngineStore._LastCreatedScene = editorScene;
      throw err;
    }
  }

  private disposeExact(x: Exact): void {
    x.doors.dispose();
    x.built.dispose();
    x.phys.dispose();
    EngineStore._LastCreatedScene = this.scene;
  }

  /** The mode's lamps on or off in the game's registry (`setOn`, as a switch or a shot does). */
  private applyMode(): void {
    const c = this.cur;
    if (!c) return;
    const lamps = new Map((this.host.model.data.lamps ?? []).map((l) => [l.id, l]));
    c.ids.forEach((id, i) => {
      const l = lamps.get(id);
      if (l) c.reg.setOn(i, lampOnIn(l, this.mode));
    });
  }

  /** The darkness map's values from the exact field: the light meter's own sample (`bodyLevel`) at every cell. */
  private sample(): void {
    const c = this.cur;
    if (!c) return;
    const d = this.host.model.data;
    this.grid = levelCells(d.rooms, d.voids, c.level);
    this.values = this.grid ? sampleCells(this.grid, (x, z) => c.field.bodyLevel(x, c.floor, z, BODY_HEIGHT)) : null;
    // ON15: the moon's visibility on the ground (the bake's own grid, a hand above the floor): the shadow lines
    this.moonVals = this.grid ? sampleCells(this.grid, (x, z) => c.field.moonAt(x, c.floor + 0.1, z)) : null;
    this.ver++;
    this.updateGuard(false);
    this.updateSecurity(false);
    this.drawOverlays();
    this.legend();
    this.host.drawPlanOverlay();
  }

  // ---------- reading ----------

  /** The exact light meter value at a plan point on the editing level, or null. */
  levelAt(x: number, z: number): number | null {
    const c = this.cur;
    if (!c || c.level !== this.host.view.level || this.quickOn) return null;
    return c.field.bodyLevel(x, c.floor, z, BODY_HEIGHT);
  }

  /** The dot's words: "light 0.21 hidden" when the light view or the darkness map is on. */
  meterAt(x: number, z: number): string {
    if (!this.on && !this.dark) return '';
    const v = this.levelAt(x, z);
    return v === null ? 'light: baking' : `light ${meterWords(v)}`;
  }

  /** The darkness map's value of the cell at a point (NaN off the floor or before a bake). */
  cellValue(x: number, z: number): number {
    if (!this.grid || !this.values) return NaN;
    const k = cellIndex(this.grid, x, z);
    return k < 0 ? NaN : this.values[k]!;
  }

  /** The guard view's class of the cell at a point. */
  guardAt(x: number, z: number): GuardClass {
    if (!this.grid || !this.guard) return 'clear';
    const k = cellIndex(this.grid, x, z);
    const g = k < 0 ? 0 : this.guard[k]!;
    return g === 2 ? 'red' : g === 1 ? 'amber' : 'clear';
  }

  // ---------- guard view ----------

  private updateGuard(draw = true): void {
    const c = this.cur;
    const g = this.grid;
    const v = this.values;
    const eyes = this.eyes.filter((e) => e.level === this.host.view.level);
    this.guard = null;
    if (c && g && v && eyes.length && c.level === this.host.view.level) {
      const out = new Uint8Array(g.nx * g.nz);
      const eye = this.a;
      const to = this.b;
      for (const e of eyes) {
        eye.set(e.x, c.floor + EYE_STAND, e.z);
        for (let k = 0; k < out.length; k++) {
          const lv = v[k]!;
          if (lv !== lv || out[k] === 2 || band(lv) === 'hidden') continue;
          const [x, z] = cellCentre(g, k);
          const dx = x - e.x;
          const dz = z - e.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const ang = bearing(dx, dz, e.yaw);
          if (!inView(dist, ang)) continue;
          // (perception's own test: the chest, else the head, of a body standing there; the meter's sample heights)
          to.set(x, c.floor + BODY_HEIGHT * 0.6, z);
          let los = losClear(c.ballistics, eye, to, 0.3);
          if (!los) {
            to.set(x, c.floor + BODY_HEIGHT * 0.95, z);
            los = losClear(c.ballistics, eye, to, 0.2);
          }
          const cls = guardClass(dist, ang, los, lv);
          const n = cls === 'red' ? 2 : cls === 'amber' ? 1 : 0;
          if (n > out[k]!) out[k] = n;
        }
      }
      this.guard = out;
    }
    this.guardVer++;
    if (draw) {
      this.drawOverlays();
      this.host.drawPlanOverlay();
    }
  }

  // ---------- security (ON12) ----------

  /** The security cells change (a device, the selection, the coverage view): worked out again, or a bake first. */
  refreshSecurity(): void {
    if (!this.wanted) {
      if (this.cur || this.sec) this.teardown();
      this.sec = null;
      this.legend();
      this.host.drawPlanOverlay();
      return;
    }
    if (!(this.cur && this.cur.level === this.host.view.level && this.state === 'ready')) {
      if (this.state !== 'baking') this.schedule(0);
      return;
    }
    this.updateSecurity(true);
  }

  /** The security class of the cell at a point (0 none, 1 hidden in frame, 2 amber, 3 red, 4 sensor). */
  securityAt(x: number, z: number): number {
    if (!this.grid || !this.sec) return 0;
    const k = cellIndex(this.grid, x, z);
    return k < 0 ? 0 : this.sec[k]!;
  }

  /** How many cells of each security class (0-4) the editing level has now (the e2e reads it). */
  securityCounts(): number[] {
    const n = [0, 0, 0, 0, 0];
    if (this.sec) for (let k = 0; k < this.sec.length; k++) n[this.sec[k]!]!++;
    return n;
  }

  private updateSecurity(draw = true): void {
    const c = this.cur;
    const g = this.grid;
    const v = this.values;
    const s = this.host.security;
    this.sec = c && g && v && s && c.level === this.host.view.level ? s.cells({ grid: g, values: v, floor: c.floor, level: c.level, ray: c.ballistics, pts: { eye: this.a, to: this.b } }) : null;
    this.secVer++;
    if (draw) {
      this.drawOverlays();
      this.legend();
      this.host.drawPlanOverlay();
    }
  }

  // ---------- 3D ----------

  /** The scene at night: the theme's sky, the moon as the game's directional light, the hemisphere off (the lamp
   *  plugin's ambient-grid fill replaces it, as on the phone light look). */
  private nightLook(on: boolean): void {
    const hemi = this.scene.getLightByName('sky') as HemisphericLight | null;
    const sun = this.scene.getLightByName('sun') as DirectionalLight | null;
    if (!hemi || !sun) return;
    if (on && !this.look) {
      this.look = { clear: this.scene.clearColor.clone(), hemi: hemi.intensity, sun: sun.intensity, dir: sun.direction.clone(), ground: hemi.groundColor.clone() };
      const t = this.theme();
      const sky = Color3.FromHexString(t.sky);
      this.scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
      hemi.groundColor = Color3.Black();
      this.skyLight();
    } else if (!on && this.look) {
      this.scene.clearColor = this.look.clear;
      hemi.intensity = this.look.hemi;
      hemi.groundColor = this.look.ground;
      sun.intensity = this.look.sun;
      sun.direction = this.look.dir;
      this.look = null;
    }
  }

  /** With the lamp plugin the fill is the bake's ambient grid; without lamps on the level the hemisphere stands in at
   *  the sky fill's level (a level maps to `LIGHT_GAIN / LAMP_LEVEL_GAIN` on screen). */
  private hemiLevel(): void {
    const hemi = this.scene.getLightByName('sky') as HemisphericLight | null;
    if (!hemi || !this.look) return;
    const t = this.theme();
    hemi.intensity = this.lamps ? 0 : Math.max(0, (t.lightLevel ?? 0.75) - moonLight(t)) * (LIGHT_GAIN / LAMP_LEVEL_GAIN);
  }

  /** ON15: the moon as the scene's directional light (its direction and strength) and the sky fill, from the theme shown. */
  private skyLight(): void {
    const sun = this.scene.getLightByName('sun') as DirectionalLight | null;
    if (!sun || !this.look) return;
    const t = this.theme();
    sun.direction = new Vector3(t.sunDir[0], t.sunDir[1], t.sunDir[2]).normalize();
    sun.intensity = t.sunIntensity;
    this.hemiLevel();
  }

  /** ON15: the moon's visibility at a plan point (the exact bake's, 0 in its shadow .. 1 open), NaN off the floor. */
  moonCell(x: number, z: number): number {
    if (!this.grid || !this.moonVals) return NaN;
    const k = cellIndex(this.grid, x, z);
    return k < 0 ? NaN : this.moonVals[k]!;
  }

  /** ON15: the moon's plan marks: the arrow the light travels along (from the moon's bearing) and the shadow lines. */
  private moonMarkup(toPlan: (x: number, z: number) => [number, number], g: CellGrid): string {
    const t = this.theme();
    const len = Math.sqrt(t.sunDir[0] ** 2 + t.sunDir[2] ** 2);
    let out = '<g id="moonMarks">';
    const mv = this.moonVals;
    if (mv && !this.moonQuick) {
      const segs = contour(g, mv, 0.5);
      let dpath = '';
      for (const [x0, z0, x1, z1] of segs) {
        const a = toPlan(x0, z0);
        const b = toPlan(x1, z1);
        dpath += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      }
      if (dpath) out += `<path class="moonShadow" d="${dpath}" stroke="#b58cff" stroke-width="2" stroke-dasharray="5 3" fill="none"/>`;
    }
    if (len > 1e-6) {
      const n = this.night ?? null;
      const [wx, wz] = n ? shadowWay(n) : [t.sunDir[0] / len, t.sunDir[2] / len];
      const ax = g.x0 + 6;
      const az = g.z0 + g.nz * g.cell - 6;
      const a = toPlan(ax, az);
      const b = toPlan(ax + wx * 8, az + wz * 8);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / l;
      const uy = dy / l;
      const h1 = [b[0] - ux * 12 - uy * 7, b[1] - uy * 12 + ux * 7] as const;
      const h2 = [b[0] - ux * 12 + uy * 7, b[1] - uy * 12 - ux * 7] as const;
      const f = (v: number): string => v.toFixed(1);
      out += `<g class="moonArrow"><circle cx="${f(a[0])}" cy="${f(a[1])}" r="9" fill="#e9e4c8" stroke="#000"/><line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#e9e4c8" stroke-width="3"/><path d="M${f(b[0])} ${f(b[1])}L${f(h1[0])} ${f(h1[1])}L${f(h2[0])} ${f(h2[1])}Z" fill="#e9e4c8"/><text class="moonWords" x="${f(a[0] + 14)}" y="${f(a[1] - 12)}" font-size="13" font-weight="bold" fill="#e9e4c8" stroke="#000" stroke-width="0.6">${this.moonLabel()}</text></g>`;
    }
    return out + '</g>';
  }

  /** "Moon 205 (SW), 54 high, full" (the panel's, else the map's); the map's own moon when it has no night set. */
  moonLabel(): string {
    const t = this.theme();
    const s = this.night ?? (this.host.model.data.meta.night as NightSetting | undefined) ?? null;
    if (!s) return "Moon: the map's own";
    return `Moon ${bearingWords(s.bearing)}, ${Math.round(s.height)} high, ${brightnessName(s.brightness).toLowerCase()}${t.sunIntensity > 0 ? '' : ' (no moon light)'}`;
  }

  /** The exact result on screen: a fresh `BakedLamps` and lit clones of the materials. */
  private render(): void {
    const c = this.cur;
    this.unswap();
    this.clearQuick();
    this.lamps?.dispose();
    this.lamps = null;
    if (c?.bake.lamps) {
      const hemi = this.scene.getLightByName('sky') as HemisphericLight | null;
      const fill = { grid: c.bake.ambient, color: [hemi?.diffuse.r ?? 1, hemi?.diffuse.g ?? 1, hemi?.diffuse.b ?? 1] as [number, number, number] };
      const lowest = Math.min(...this.host.model.data.levels.map((l) => l.floor));
      this.lamps = new BakedLamps(this.scene, c.reg, c.bake.lamps.baked, c.bake.lamps.r, c.bake.lo, c.bake.hi, { floorY: lowest }, { moon: c.bake.moon, doors: c.doors.list, fill, standard: true, moonLight: c.bake.moonLight, bounce: c.field.bounce });
    }
    this.hemiLevel();
    this.swap();
  }

  /** Every lit standard material in the scene swapped for its clone with the game's lamp plugin (new meshes after an
   *  edit are swapped on the next call). */
  swap(): void {
    const lamps = this.lamps;
    if (!this.on || !lamps) return;
    for (const mesh of this.scene.meshes) {
      if (this.mine.has(mesh)) continue;
      const m = mesh.material;
      if (!m || m.getClassName() !== 'StandardMaterial' || (m as StandardMaterial).disableLighting) continue;
      if ([...this.lit.values()].includes(m as StandardMaterial)) continue;
      let c = this.lit.get(m);
      if (!c) {
        c = (m as StandardMaterial).clone(`${m.name} lit`);
        lamps.attach(c);
        this.lit.set(m, c);
      }
      this.orig.set(mesh, m);
      mesh.material = c;
    }
  }

  private unswap(): void {
    for (const [mesh, m] of this.orig) if (!mesh.isDisposed()) mesh.material = m;
    this.orig.clear();
    for (const c of this.lit.values()) c.dispose();
    this.lit.clear();
  }

  /** A lamp being edited: its light at once as a Babylon range light, its baked light off until the exact bake. */
  private quick(l: Lamp): void {
    const c = this.cur;
    if (!c) return;
    const d = this.host.model.data;
    // (an area fitting is several points: the quick light is their sum at their middle)
    const all = campusLights({ levels: d.levels, rooms: d.rooms, lamps: [l], circuits: d.circuits ?? [] });
    const init = all.length > 1 ? { ...all[0]!, x: all.reduce((a, q) => a + q.x, 0) / all.length, z: all.reduce((a, q) => a + q.z, 0) / all.length, intensity: all.reduce((a, q) => a + (q.intensity ?? 0), 0) } : all[0];
    c.ids.forEach((id, i) => {
      if (id === l.id) c.reg.setOn(i, false);
    });
    this.quickOn = true;
    this.quickLight?.dispose();
    this.quickLight = null;
    if (!init || !lampOnIn(l, this.mode)) return;
    const pos = new Vector3(init.x, init.y, init.z);
    const q = init.cone ? new SpotLight('quickLamp', pos, new Vector3(init.cone.dx, init.cone.dy, init.cone.dz), 2 * Math.acos(init.cone.cosOuter), 2, this.scene) : new PointLight('quickLamp', pos, this.scene);
    q.range = init.radius ?? 4;
    q.intensity = (init.intensity ?? 0.7) * LIGHT_GAIN;
    q.diffuse = new Color3(...(init.color ?? [1, 1, 1]));
    q.specular = Color3.Black();
    this.quickLight = q;
  }

  private clearQuick(): void {
    this.quickLight?.dispose();
    this.quickLight = null;
    this.quickOn = false;
  }

  private overlay(): StandardMaterial {
    if (!this.overlayMat) {
      const m = new StandardMaterial('lightOverlay', this.scene);
      m.disableLighting = true;
      m.emissiveColor = Color3.White();
      m.diffuseColor = Color3.White();
      m.backFaceCulling = false;
      m.zOffset = -2;
      this.overlayMat = m;
    }
    return this.overlayMat;
  }

  /** Quads over the cells `pick` colours (null: none), at height y. */
  private cellMesh(name: string, g: CellGrid, y: number, pick: (k: number) => readonly number[] | null): Mesh | null {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const h = g.cell / 2;
    for (let k = 0; k < g.nx * g.nz; k++) {
      const c = pick(k);
      if (!c) continue;
      const [x, z] = cellCentre(g, k);
      const n = pos.length / 3;
      pos.push(x - h, y, z - h, x + h, y, z - h, x + h, y, z + h, x - h, y, z + h);
      for (let i = 0; i < 4; i++) col.push(c[0]!, c[1]!, c[2]!, c[3]!);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    if (!idx.length) return null;
    const vd = new VertexData();
    vd.positions = pos;
    vd.colors = col;
    vd.indices = idx;
    const m = new Mesh(name, this.scene);
    vd.applyToMesh(m);
    m.hasVertexAlpha = true;
    m.material = this.overlay();
    m.isPickable = false;
    this.mine.add(m);
    return m;
  }

  private disposeOverlay(m: AbstractMesh | null): null {
    if (m) {
      this.mine.delete(m);
      m.dispose();
    }
    return null;
  }

  /** The darkness map, its contours, the guard tint and the eyes in 3D (rebuilt only when their inputs change). */
  private drawOverlays(): void {
    this.darkMesh = this.disposeOverlay(this.darkMesh);
    this.contourMesh = this.disposeOverlay(this.contourMesh) as null;
    this.guardMesh = this.disposeOverlay(this.guardMesh);
    this.secMesh = this.disposeOverlay(this.secMesh);
    for (const m of this.eyeMeshes) this.disposeOverlay(m);
    this.eyeMeshes = [];
    const c = this.cur;
    const g = this.grid;
    const v = this.values;
    if (!c || c.level !== this.host.view.level) return;
    const y = c.floor + this.host.view.offsetOf(c.level);
    if (g && v && this.dark) {
      this.darkMesh = this.cellMesh('darknessMap', g, y + 0.04, (k) => {
        const lv = v[k]!;
        return lv !== lv ? null : COL[band(lv)];
      });
      const lines: Vector3[][] = [];
      const colors: Color4[][] = [];
      for (const [t, hex] of [[LIGHT.shadow, CONTOUR.hidden], [LIGHT.lit, CONTOUR.lit]] as const) {
        const cc = Color3.FromHexString(hex);
        for (const [x0, z0, x1, z1] of contour(g, v, t)) {
          lines.push([new Vector3(x0, y + 0.06, z0), new Vector3(x1, y + 0.06, z1)]);
          colors.push([new Color4(cc.r, cc.g, cc.b, 1), new Color4(cc.r, cc.g, cc.b, 1)]);
        }
      }
      if (lines.length) {
        const lm = CreateLineSystem('darknessContours', { lines, colors }, this.scene);
        lm.isPickable = false;
        this.mine.add(lm);
        this.contourMesh = lm;
      }
    }
    const gv = this.guard;
    if (g && gv) {
      this.guardMesh = this.cellMesh('guardView', g, y + 0.05, (k) => (gv[k] === 2 ? COL.red : gv[k] === 1 ? COL.amber : null));
    }
    const sv = this.sec;
    if (g && sv) this.secMesh = this.cellMesh('securityView', g, y + 0.055, (k) => SEC_COL[sv[k]!] ?? null);
    for (const e of this.eyes) {
      if (e.level !== c.level) continue;
      const head = CreateBox('guardEye', { width: 0.3, height: 0.3, depth: 0.3 }, this.scene);
      head.position.set(e.x, y + EYE_STAND, e.z);
      head.material = this.overlay();
      head.isPickable = false;
      const look = CreateBox('guardEyeLook', { width: 0.06, height: 0.06, depth: 1.2 }, this.scene);
      look.position.set(e.x + Math.sin(e.yaw) * 0.75, y + EYE_STAND, e.z + Math.cos(e.yaw) * 0.75);
      look.rotation.y = e.yaw;
      look.material = this.overlay();
      look.isPickable = false;
      for (const m of [head, look]) {
        this.mine.add(m);
        this.eyeMeshes.push(m);
      }
    }
  }

  // ---------- plan ----------

  /** Cells as an image (one pixel each, north up) for the plan. */
  private cellImage(g: CellGrid, pick: (k: number) => readonly number[] | null): string {
    const cv = document.createElement('canvas');
    cv.width = g.nx;
    cv.height = g.nz;
    const ctx = cv.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(g.nx, g.nz);
    for (let k = 0; k < g.nx * g.nz; k++) {
      const c = pick(k);
      if (!c) continue;
      const i = k % g.nx;
      const j = g.nz - 1 - Math.floor(k / g.nx);
      const o = (j * g.nx + i) * 4;
      img.data[o] = Math.round(c[0]! * 255);
      img.data[o + 1] = Math.round(c[1]! * 255);
      img.data[o + 2] = Math.round(c[2]! * 255);
      img.data[o + 3] = Math.round(c[3]! * 255);
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
  }

  /** The plan's layer (under the lamp marks): the darkness map with its labelled contours, the guard tint and eyes. */
  planMarkup(toPlan: (x: number, z: number) => [number, number], S: number): string {
    const c = this.cur;
    const g = this.grid;
    const v = this.values;
    if (!c || !g || !v || c.level !== this.host.view.level) return '';
    let out = '';
    const tl = toPlan(g.x0, g.z0 + g.nz * g.cell);
    const box = `x="${tl[0]}" y="${tl[1]}" width="${g.nx * g.cell * S}" height="${g.nz * g.cell * S}" preserveAspectRatio="none" style="image-rendering:pixelated;pointer-events:none"`;
    if (this.dark) {
      if (this.planDark?.ver !== this.ver) this.planDark = { url: this.cellImage(g, (k) => (v[k]! !== v[k]! ? null : COL[band(v[k]!)])), ver: this.ver };
      out += `<g id="darkMap"><image href="${this.planDark.url}" ${box}/>`;
      for (const [t, hex, word] of [[LIGHT.shadow, CONTOUR.hidden, 'hidden'], [LIGHT.lit, CONTOUR.lit, 'lit']] as const) {
        const segs = contour(g, v, t);
        if (!segs.length) continue;
        let dpath = '';
        for (const [x0, z0, x1, z1] of segs) {
          const a = toPlan(x0, z0);
          const b = toPlan(x1, z1);
          dpath += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
        }
        const at = toPlan(segs[0]![0], segs[0]![1]);
        out += `<path class="contour" data-contour="${word}" d="${dpath}" stroke="${hex}" stroke-width="2.5" fill="none"/><text x="${at[0] + 4}" y="${at[1] - 4}" font-size="13" font-weight="bold" fill="${hex}" stroke="#000" stroke-width="0.6">${word}</text>`;
      }
      out += '</g>';
    }
    const gv = this.guard;
    if (gv) {
      if (this.planGuard?.ver !== this.guardVer) this.planGuard = { url: this.cellImage(g, (k) => (gv[k] === 2 ? COL.red : gv[k] === 1 ? COL.amber : null)), ver: this.guardVer };
      out += `<image id="guardMap" href="${this.planGuard.url}" ${box}/>`;
    }
    const sv = this.sec;
    if (sv) {
      if (this.planSec?.ver !== this.secVer) this.planSec = { url: this.cellImage(g, (k) => SEC_COL[sv[k]!] ?? null), ver: this.secVer };
      out += `<image id="secMap" href="${this.planSec.url}" ${box}/>`;
    }
    if (this.moonShow) out += this.moonMarkup(toPlan, g);
    for (const e of this.eyes) {
      if (e.level !== c.level) continue;
      const a = toPlan(e.x, e.z);
      const b = toPlan(e.x + Math.sin(e.yaw) * 1.5, e.z + Math.cos(e.yaw) * 1.5);
      out += `<g class="guardEye"><circle cx="${a[0]}" cy="${a[1]}" r="8" fill="#ff3b30" stroke="#fff" stroke-width="2"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ff3b30" stroke-width="3"/></g>`;
    }
    return out;
  }

  // ---------- words ----------

  /** The legend: the mode, the bands and "Baking light..." while a bake runs. */
  private legend(): void {
    const el = document.getElementById('lightLegend');
    if (!el) return;
    const show = this.wanted;
    el.hidden = !show;
    if (!show) return;
    const st = this.state === 'baking' || (this.timer && !this.cur) ? 'Baking light...' : this.state === 'failed' ? `Light bake failed: ${this.error.slice(0, 80)}` : this.cur ? `Exact light (${Math.round(this.ms)} ms)` : 'Baking light...';
    const bands = this.dark ? `<div><i style="background:#060608"></i>hidden (under ${LIGHT.shadow})</div><div><i style="background:#808085"></i>grey</div><div><i style="background:#fffff7"></i>lit (over ${LIGHT.lit})</div>` : '';
    const guard = this.eyes.length || this.guardTool ? '<div><i style="background:#f21f1a"></i>seen at once <i style="background:#ffad1a;margin-left:6px"></i>seen slowly</div>' : '';
    const s = this.host.security;
    const sec = this.sec && s ? (s.coverage ? `<div data-sec-legend><i style="background:#1c7dd6"></i>camera <i style="background:#7048e8;margin-left:6px"></i>sensor; clear: unwatched (${s.stats.gaps} cells, ${Math.round(s.stats.gaps * MAP_CELL * MAP_CELL)} m2)</div>` : '<div data-sec-legend><i style="background:#f21f1a"></i>camera sees at once <i style="background:#ffad1a;margin-left:6px"></i>slowly <i style="background:#1c7dd6;margin-left:6px"></i>too dark</div>') : '';
    const moon = this.moonShow || this.night ? `<div data-moon-legend>${this.moonLabel()}${this.night ? ' (preview, not yet for the map)' : ''}${this.moonQuick ? '; quick: sky light only' : ''}</div>` : '';
    el.innerHTML = `<b>${this.on ? 'Lighting' : 'Light'}: ${modeWords(this.mode)}</b><div class="dim" data-light-state="${this.state}">${st}</div>${moon}${bands}${guard}${sec}`;
  }

  /** Everything off: the exact result and overlays go. */
  private teardown(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    this.unswap();
    this.clearQuick();
    this.lamps?.dispose();
    this.lamps = null;
    this.nightLook(false);
    if (this.cur) this.disposeExact(this.cur);
    this.cur = null;
    this.grid = null;
    this.values = null;
    this.moonVals = null;
    this.moonQuick = false;
    this.guard = null;
    this.sec = null;
    this.state = 'off';
    this.drawOverlays();
  }
}
