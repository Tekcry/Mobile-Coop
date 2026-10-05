import { describe, expect, it } from 'vitest';
import '../src/cosmetics/catalog';
import { CAMOS, MASTERY_CAMOS, PART_OPTIONS, camoUnlockId, partUnlockId } from '../src/cosmetics/catalog';
import { UNLOCKS, unlockById, unlockState } from '../src/progression/unlocks';
import { AVATAR_KEYS_OK } from './helpers/lookKeys';
import { BODY_TYPES, HAIRS, HELMETS, PATTERNS, TORSOS } from '../src/cosmetics/avatarLook';
import { defaultSave } from '../src/save/schema';
import { autoGrant, unlockContext } from '../src/progression/profile';
import { PATTERN_ID } from '../src/cosmetics/patterns';

describe('cosmetics catalogue', () => {
  it('registers unique unlock ids for every part, camo, emote and tag', () => {
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length);
    for (const [cat, opts] of Object.entries(PART_OPTIONS)) for (const o of opts) expect(unlockById(partUnlockId(cat as never, o.value))).toBeDefined();
    for (const w of ['rifle', 'smg', 'sniper'] as const) for (const camo of Object.values(MASTERY_CAMOS)) expect(unlockById(camoUnlockId(w, camo))).toBeDefined();
    expect(AVATAR_KEYS_OK).toBe(true);
  });
  it('part options cover every look value', () => {
    expect(PART_OPTIONS.body.map((o) => o.value).sort()).toEqual([...BODY_TYPES].sort());
    expect(PART_OPTIONS.hair.map((o) => o.value).sort()).toEqual([...HAIRS].sort());
    expect(PART_OPTIONS.helmet.map((o) => o.value).sort()).toEqual([...HELMETS].sort());
    expect(PART_OPTIONS.torso.map((o) => o.value).sort()).toEqual([...TORSOS].sort());
    for (const p of PART_OPTIONS.pattern) expect(PATTERNS).toContain(p.value);
  });
  it('fresh profiles own the default look and starter cosmetics after auto-grant', () => {
    const s = defaultSave();
    autoGrant(s);
    const own = (id: string) => s.unlocks.includes(id);
    expect(own(partUnlockId('hair', s.avatar.hair))).toBe(true);
    expect(own(partUnlockId('torso', s.avatar.torso))).toBe(true);
    expect(own(partUnlockId('helmet', s.avatar.helmet))).toBe(true);
    expect(own('emote:wave') && own('tag:Rookie') && own('camo:factory')).toBe(true);
    expect(own('part:hair:spikes')).toBe(false);
  });
  it('mastery camos unlock with weapon kills', () => {
    const s = defaultSave();
    const item = unlockById('camo:smg:desert')!;
    expect(unlockState(item, unlockContext(s))).toBe('locked');
    s.weapons.smg.kills = 30;
    expect(unlockState(item, unlockContext(s))).toBe('free');
  });
  it('camo patterns reference shader pattern ids', () => {
    for (const c of CAMOS) if (c.pattern) expect(PATTERN_ID[c.pattern.name]).toBeGreaterThan(0);
  });
});
