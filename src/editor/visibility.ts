/**
 * Which levels and buildings the level editor draws (docs/kestrel/editor.md, "Levels"). Babylon-free
 * (tests/editor/visibility.test.ts): the 3D view and the plan both ask this module, so they always agree.
 */
import type { Building } from './types';

/** Whole building, single level, up to this level (the v1 cutaway), or a free pick of levels. */
export type LevelPreset = 'whole' | 'single' | 'upTo' | 'pick';
export type VisState = 'shown' | 'ghost' | 'hidden';

export interface VisSettings {
  preset: LevelPreset;
  /** Level ids ticked in Pick levels. */
  picked: string[];
  /** Levels that would be hidden are drawn as faint outlines instead (never clickable). */
  ghost: boolean;
  exploded: boolean;
  /** Exploded gap between levels, metres (0-12). */
  gap: number;
  /** Walls cut at this height above their own floor; 0 is off. */
  section: number;
  /** 'all', a building id from meta.buildings, or 'site' (outside every footprint). */
  building: string;
  /** Faint walls of the level below on the plan. */
  underlay: boolean;
}

export const DEFAULT_VIS: VisSettings = { preset: 'upTo', picked: [], ghost: false, exploded: false, gap: 6, section: 0, building: 'all', underlay: false };

export const GAP_MAX = 12;

export interface LevelInfo {
  id: string;
  floor: number;
}

const sorted = (levels: readonly LevelInfo[]): LevelInfo[] => levels.slice().sort((a, b) => a.floor - b.floor);

/** The ticks a preset stands for (choosing a preset sets the Pick levels boxes). */
export function presetPicks(preset: LevelPreset, levels: readonly LevelInfo[], editing: string, picked: readonly string[] = []): string[] {
  const cur = levels.find((l) => l.id === editing)?.floor ?? 0;
  if (preset === 'whole') return levels.map((l) => l.id);
  if (preset === 'single') return [editing];
  if (preset === 'upTo') return levels.filter((l) => l.floor <= cur + 1e-6).map((l) => l.id);
  return picked.slice();
}

/** True when the settings themselves would hide the editing level (it is then shown anyway; the hint bar says so). */
export function editingForced(s: VisSettings, levels: readonly LevelInfo[], editing: string): boolean {
  return !presetPicks(s.preset, levels, editing, s.picked).includes(editing);
}

/** Is a level drawn normally? The editing level always is. */
export function levelShown(s: VisSettings, levels: readonly LevelInfo[], editing: string, id: string): boolean {
  return id === editing || presetPicks(s.preset, levels, editing, s.picked).includes(id);
}

/** Which building a plan point sits in: a building id, or 'site' outside every footprint. */
export function buildingAt(buildings: readonly Building[] | undefined, x: number, z: number): string {
  for (const b of buildings ?? []) {
    const f = b.footprint;
    if (x >= f[0] - 1e-6 && x <= f[2] + 1e-6 && z >= f[1] - 1e-6 && z <= f[3] + 1e-6) return b.id;
  }
  return 'site';
}

/**
 * An element's state from the levels it belongs to (a stair: both ends) and its building. A filtered-out building is
 * hidden, never ghosted. An element on any shown level is shown; otherwise it is a ghost or hidden.
 */
export function elementState(s: VisSettings, levels: readonly LevelInfo[], editing: string, elemLevels: readonly string[], building: string): VisState {
  if (s.building !== 'all' && building !== s.building) return 'hidden';
  if (elemLevels.some((l) => levelShown(s, levels, editing, l))) return 'shown';
  return s.ghost ? 'ghost' : 'hidden';
}

/** Height a level is lifted by in exploded view: its rank from the lowest level times the gap. Never saved. */
export function explodeOffset(s: VisSettings, levels: readonly LevelInfo[], id: string): number {
  if (!s.exploded) return 0;
  const i = sorted(levels).findIndex((l) => l.id === id);
  return i < 0 ? 0 : i * Math.max(0, Math.min(GAP_MAX, s.gap));
}

/** Reads stored settings, keeping only known fields of the right type (a stale or hand-edited value falls back). */
export function parseVis(raw: unknown): VisSettings {
  const s = { ...DEFAULT_VIS, picked: [] as string[] };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (r.preset === 'whole' || r.preset === 'single' || r.preset === 'upTo' || r.preset === 'pick') s.preset = r.preset;
  if (Array.isArray(r.picked)) s.picked = r.picked.filter((v): v is string => typeof v === 'string');
  for (const k of ['ghost', 'exploded', 'underlay'] as const) if (typeof r[k] === 'boolean') s[k] = r[k];
  if (typeof r.gap === 'number' && Number.isFinite(r.gap)) s.gap = Math.max(0, Math.min(GAP_MAX, r.gap));
  if (typeof r.section === 'number' && Number.isFinite(r.section)) s.section = Math.max(0, r.section);
  if (typeof r.building === 'string') s.building = r.building;
  return s;
}
