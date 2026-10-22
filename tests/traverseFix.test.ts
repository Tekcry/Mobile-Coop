// (traverse-fix, spare job 8) Traversal correctness: the hands at a lip's end, the climb-up's hand release, the rifle
// draw's clearance past the trunk.
import { describe, expect, it } from 'vitest';
import { AttachGrips, LEDGE_HAND_GAP } from '../src/player/attachGrips';
import { attachRange } from '../src/player/attach';
import { makeLedge, TraversalAnchors, type Ledge } from '../src/world/anchors';

const zero = () => ({ x: 0, y: 0, z: 0, w: 0 });

describe('(traverse-fix 1) a ledge hand at the lip end', () => {
  it('never lands on or through the other hand, and stays on the lip, shimmying into either end at any speed', () => {
    const anchors = new TraversalAnchors();
    // the lip runs along +x from x 0 (the hands' targets are on its line, z 10)
    for (const len of [0.8, 1.5, 3]) {
      const lip = anchors.add<Ledge>(makeLedge(0, 10, len, 10, 2.4));
      const r = attachRange(lip, 1.75);
      for (const speed of [0.5, 0.8, 1.2]) {
        for (const dir of [1, -1]) {
          for (const startK of [0, 0.5, 1]) {
            const g = new AttachGrips();
            const rig = { reachL: zero(), reachR: zero(), plantL: zero(), plantR: zero(), height: 1.68 };
            let s = r.min + (r.max - r.min) * startK;
            let v = 0;
            g.setup(lip, s, 1, 1.68);
            let minGap = 9;
            let lo = 9;
            let hi = -9;
            // into the end and held there, back the other way, then still (accel 8 m/s^2, the ledge's)
            for (let i = 0; i < 6 * 120; i++) {
              const want = i < 4 * 120 ? dir * speed : i < 5 * 120 ? -dir * speed : 0;
              v += Math.max(-8 / 120, Math.min(8 / 120, want - v));
              s += v / 120;
              if (s >= r.max) {
                s = r.max;
                if (v > 0) v = 0;
              } else if (s <= r.min) {
                s = r.min;
                if (v < 0) v = 0;
              }
              g.update(1 / 120, lip, s, v, 1, 1, rig);
              // the left hand is on the -x side here (the body faces the wall from +z)
              minGap = Math.min(minGap, rig.reachR.x - rig.reachL.x);
              lo = Math.min(lo, rig.reachL.x, rig.reachR.x);
              hi = Math.max(hi, rig.reachL.x, rig.reachR.x);
            }
            const what = `len ${len} speed ${speed} dir ${dir} from ${startK}`;
            // was 2.7 cm (0.8 m/s) and 0 (1.2 m/s) at the end, crossing by up to 32 cm mid-lip on the first quick reach
            expect(minGap, what).toBeGreaterThanOrEqual(LEDGE_HAND_GAP - 1e-6);
            expect(lo, what).toBeGreaterThanOrEqual(0.08 - 1e-6);
            expect(hi, what).toBeLessThanOrEqual(len - 0.08 + 1e-6);
          }
        }
      }
    }
  });
});
