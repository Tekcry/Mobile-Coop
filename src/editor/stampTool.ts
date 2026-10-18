/**
 * ON11 Stamp tool state (DOM-free; the editor and padControl use it): the presets (start set, the module kit from the
 * editor server, Michael's own from docs/kestrel/editor-presets.json), the one the tool stamps, its quarter turns, the
 * ghost at the dot (computed only when the dot, the turn, the level or the data change) and the own presets' save.
 * The logic is src/editor/presets.ts (tests/editor/presets.test.ts).
 */
import type { Campus, Key, Pt } from './types';
import { fitProblems, kitPreset, levelMap, mineId, mineText, originAt, placedItems, presetFromSelection, readMine, START_PRESETS, stampChanges } from './presets';
import type { FitProblem, KitArch, PresetFrom, PresetItems, RoomPreset, StampResult } from './presets';

export interface StampGhost {
  key: string;
  origin: Pt;
  size: [number, number];
  items: PresetItems;
  problems: FitProblem[];
  /** A level the group needs is missing. */
  why: string | null;
  levelOf: (rel: string) => string | null;
}

export class StampTool {
  kit: RoomPreset[] = [];
  mine: RoomPreset[] = [];
  /** Own presets changed since the last save (the Save button shows it; Save writes the file). */
  dirty = false;
  id = 'start.office-4';
  turns = 0;
  from: PresetFrom = 'start';
  private cache: StampGhost | null = null;

  all(): RoomPreset[] {
    return [...START_PRESETS, ...this.kit, ...this.mine];
  }

  list(from: PresetFrom): RoomPreset[] {
    return from === 'start' ? [...START_PRESETS] : from === 'kit' ? this.kit : this.mine;
  }

  get preset(): RoomPreset {
    return this.all().find((p) => p.id === this.id) ?? START_PRESETS[0]!;
  }

  /** The preset the tool stamps (its source tab follows). */
  set(id: string): boolean {
    const p = this.all().find((q) => q.id === id);
    if (!p) return false;
    this.id = p.id;
    this.from = p.from;
    return true;
  }

  /** D-pad left / right with the tool: the next preset of the same source. */
  step(dir: 1 | -1): RoomPreset | null {
    const ps = this.list(this.from);
    if (!ps.length) return null;
    const i = ps.findIndex((p) => p.id === this.id);
    const p = ps[(i + dir + ps.length) % ps.length]!;
    this.id = p.id;
    return p;
  }

  turn(): number {
    this.turns = (this.turns + 1) % 4;
    return this.turns * 90;
  }

  /** The module kit and the own presets from the editor server (a failure leaves the start set only). */
  async load(): Promise<void> {
    try {
      const r = await fetch('/__editor/presets', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { kit?: { module: { id: string; name: string; source?: string }; arch: KitArch }[]; mine?: string };
      this.kit = (j.kit ?? []).map((k) => kitPreset(k.module, k.arch));
      this.mine = readMine(j.mine ?? '');
    } catch (err) {
      console.warn('presets unavailable', err);
    }
  }

  /** The ghost centred on the dot; the same object while nothing it depends on changed. */
  ghost(d: Campus, level: string, x: number, z: number, grid: number, rev: number): StampGhost {
    const p = this.preset;
    const size: [number, number] = this.turns % 2 ? [p.size[1], p.size[0]] : [...p.size];
    const origin = originAt(size, x, z, grid);
    const key = `${p.id}|${this.turns}|${origin.join()}|${level}|${rev}`;
    if (this.cache?.key === key) return this.cache;
    const { items } = placedItems(p, origin, this.turns);
    const levelOf = levelMap(d, level);
    const need = [...new Set([...items.rooms.map((r) => r.level), ...items.walls.map((w) => w.level), ...items.stairs.map((s) => s.to)])];
    const why = need.some((l) => !levelOf(l)) ? `${p.name} needs a level above this one` : null;
    this.cache = { key, origin, size, items, problems: why ? [] : fitProblems(d, items, levelOf), why, levelOf };
    return this.cache;
  }

  /** The stamp at the dot as one change list, or why not. */
  stamp(d: Campus, level: string, x: number, z: number, grid: number, rev: number): StampResult | { why: string } {
    const g = this.ghost(d, level, x, z, grid, rev);
    return stampChanges(d, this.preset, g.items, level);
  }

  /** Selected > Save as preset: the selection becomes an own preset (written with the next Save). */
  saveSelection(d: Campus, keys: readonly Key[], level: string, name: string): RoomPreset | null {
    const p = presetFromSelection(d, keys, level, name, mineId(this.mine));
    if (!p) return null;
    this.mine.push(p);
    this.dirty = true;
    return p;
  }

  rename(id: string, name: string): boolean {
    const p = this.mine.find((q) => q.id === id);
    if (!p || !name.trim()) return false;
    p.name = name.trim();
    this.dirty = true;
    return true;
  }

  remove(id: string): boolean {
    const i = this.mine.findIndex((q) => q.id === id);
    if (i < 0) return false;
    this.mine.splice(i, 1);
    if (this.id === id) this.id = START_PRESETS[0]!.id;
    this.dirty = true;
    return true;
  }

  /** Writes docs/kestrel/editor-presets.json through the editor server (sandbox-aware) when the own presets changed. */
  async save(): Promise<boolean> {
    if (!this.dirty) return false;
    const r = await fetch('/__editor/presets', { method: 'POST', body: JSON.stringify({ text: mineText(this.mine) }) });
    const reply = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok || !reply.ok) throw new Error(reply.error ?? String(r.status));
    this.dirty = false;
    return true;
  }
}
