/**
 * (sector-fixes P, item 6, Michael 2026-10-22: "If there's lasers, there should be panels nearby that power them which
 * can be interrupted using the jammer. Must be hard to access and not in plain sight. Electro vision should show the
 * panel.") Laser power panels. Pure (no Babylon / DOM), unit-tested (`tests/laserPanels.test.ts`).
 *
 * Every laser band is powered by exactly one panel; one panel may power several bands of a group. (A1) The panel is the
 * lasers' jam point: jamming it (the held pistol jammer, slice J rules: 5 s at most, then the 1.5 s reboot) cuts every
 * band it powers for the jam and its reboot; the bands themselves are no jam targets (undo: re-add the per-laser jam
 * devices in `CtDevices`). A panel of a Sector Ops section that is not live is dark like its lasers.
 */
import { DEV_IDLE, DEV_JAMMED, DEV_RECOVER, type DevPhase, type LaserDef } from './jammer';

/** A laser power panel in the map data (`MapLayout.laserPanels`). */
export interface LaserPanelDef {
  id: string;
  /** The laser ids it powers (one or more bands of one group). */
  lasers: string[];
  /** The mounting point: the centre of the housing's back, on its wall (or the top it stands on). */
  x: number;
  y: number;
  z: number;
  /** Facing out of the wall (0 = +z, the maps' yaw convention: direction (sin yaw, cos yaw)). */
  yaw: number;
  /** Sector Ops: the section it belongs to (live only while that section is); must match its lasers'. */
  section?: number;
  /** What it powers (debug and docs). */
  label?: string;
}

/** The panel housing (m): width, height, depth off the wall; the jam point sits `face` out of the wall. */
export const PANEL = { w: 0.42, h: 0.56, d: 0.12, face: 0.14 } as const;

/** Part names: the housing parts electro paints (gameState `paintElectro`) and the status LED (its own glow). */
export const PANEL_PART = 'laser-panel';
export const PANEL_LED_PART = 'laser-panel-led';

/** The jam point of a panel (its door's face, `PANEL.face` out of the wall), into `out`. No allocation. */
export function panelTarget(p: LaserPanelDef, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = p.x + Math.sin(p.yaw) * PANEL.face;
  out.y = p.y;
  out.z = p.z + Math.cos(p.yaw) * PANEL.face;
  return out;
}

/** The index of the panel that powers laser `id` in `panels`, or -1. */
export function panelFor(panels: readonly LaserPanelDef[], id: string): number {
  for (let i = 0; i < panels.length; i++) if (panels[i]!.lasers.includes(id)) return i;
  return -1;
}

/**
 * Is a laser live (its beams on, the sensor armed): not switched off for good (`off`: its `offFlag`), its section live
 * (`dead` false) and its panel powering it: the panel's jam phase `ph` idle (-1: no panel, always powered).
 */
export function laserLive(ph: DevPhase | -1, dead: boolean, off: boolean): boolean {
  return !off && !dead && (ph === -1 || ph === DEV_IDLE);
}

/** The panel's status LED: dark, on (powered), jammed (a fast cyan blink: lit / dim) or rebooting (amber). */
export const LED_DARK = 0;
export const LED_ON = 1;
export const LED_JAM = 2;
export const LED_JAM_DIM = 3;
export const LED_BOOT = 4;
export type PanelLed = typeof LED_DARK | typeof LED_ON | typeof LED_JAM | typeof LED_JAM_DIM | typeof LED_BOOT;
/** Blinks per second of the jammed LED (the gun light's jam pulse rate). */
export const LED_BLINK = 8;

/**
 * The LED for a panel in jam phase `ph`, `t` s into it. `dead`: its section is not live (dark); `allOff`: every band it
 * powers is switched off for good (a release switch: the power is cut, dark). Render only.
 */
export function panelLed(ph: DevPhase, t: number, dead: boolean, allOff: boolean): PanelLed {
  if (dead) return LED_DARK;
  if (ph === DEV_JAMMED) return ((t * LED_BLINK) | 0) % 2 === 0 ? LED_JAM : LED_JAM_DIM;
  if (ph === DEV_RECOVER) return LED_BOOT;
  return allOff ? LED_DARK : LED_ON;
}

/**
 * The map check: every laser has exactly one panel, every panel powers at least one laser that exists (no id twice),
 * panel ids are unique and a panel's section is its lasers' section. Returns the problems ([] when the data is good).
 */
export function checkPanels(lasers: readonly LaserDef[], panels: readonly LaserPanelDef[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const p of panels) {
    if (ids.has(p.id)) out.push(`panel ${p.id}: id used twice`);
    ids.add(p.id);
    if (p.lasers.length === 0) out.push(`panel ${p.id}: powers no laser`);
    if (new Set(p.lasers).size !== p.lasers.length) out.push(`panel ${p.id}: lists a laser twice`);
    for (const id of p.lasers) {
      const l = lasers.find((q) => q.id === id);
      if (!l) out.push(`panel ${p.id}: no laser ${id}`);
      else if (l.section !== p.section) out.push(`panel ${p.id}: section ${p.section} but laser ${id} is in ${l.section}`);
    }
  }
  for (const l of lasers) {
    const n = panels.filter((p) => p.lasers.includes(l.id)).length;
    if (n !== 1) out.push(`laser ${l.id}: ${n} panels (one needed)`);
  }
  return out;
}
