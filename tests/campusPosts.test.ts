import { describe, expect, it } from 'vitest';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { validatePosts } from '../src/ai/guardAiData';

/** Posted guards per section (1-based guard numbers) per the SPEC tables: the doorman (S1 #5), the bridge officer
 *  (S2 #11), the colonnade sentry (S4 #19) and the two token-room keyholders (S5 #9, #10; high security), and the S5 roof marksman (#19, a lookout, guard-rules S9). */
const POSTED: Record<string, number[]> = { s1: [5], s2: [11], s3: [], s4: [19], s5: [9, 10, 19] };
const HIGH_SECURITY: Record<string, number[]> = { s5: [9, 10] };

describe('campus guard posts (SquadSlot.post)', () => {
  it('validatePosts has no errors for every campus section', () => {
    for (const section of CAMPUS_SECTORS) {
      expect(validatePosts(section.guards, section.id), section.id).toEqual([]);
    }
  });

  it('the posted guards are the ones the SPEC tables mark as posted', () => {
    for (const section of CAMPUS_SECTORS) {
      const got = section.guards.flatMap((g, i) => (g.post ? [i + 1] : []));
      expect(got, section.id).toEqual(POSTED[section.id] ?? []);
      for (const n of got) {
        if (!section.guards[n - 1]!.post!.lookout) expect(section.guards[n - 1]!.role, `${section.id}#${n}`).toBe('posted');
      }
    }
  });

  it('only the keyholders at the token room are high security; every other post is normal', () => {
    for (const section of CAMPUS_SECTORS) {
      const got = section.guards.flatMap((g, i) => (g.post?.highSecurity ? [i + 1] : []));
      expect(got, section.id).toEqual(HIGH_SECURITY[section.id] ?? []);
    }
  });

  it('the S5 roof marksman is the only lookout (A9)', () => {
    const lookouts = CAMPUS_SECTORS.flatMap((s) => s.guards.flatMap((g, i) => (g.post?.lookout ? [`${s.id}#${i + 1}`] : [])));
    expect(lookouts).toEqual(['s5#19']);
    const s5 = CAMPUS_SECTORS.find((s) => s.id === 's5')!;
    expect(s5.guards[18]!.post).toEqual({ leash: 1, lookout: true });
    expect(validatePosts(s5.guards, 's5')).toEqual([]);
  });
});
