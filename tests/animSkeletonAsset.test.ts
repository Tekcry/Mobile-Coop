// (anim-skeleton S1, docs/archive/anim-skeleton/PLAN.md) The shipped Wren files carry the clavicle joints (every LOD) and the
// hero's finger joints (LOD0 / LOD1), skinned, within the LOD budgets; the runtime poser loads them and, until the rig
// drives them (S2), the clavicles follow the chest and the fingers the wrist exactly, so the game looks as before.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGlb } from '../src/operators/lab/glb';
import { glbJson, lodChecks, LOD_BUDGET, type GltfJson } from '../src/operators/lodChecks';
import { validateModel } from '../src/operators/runtime/manifest';
import { OperatorPoser, poserSetup, RIG_JOINTS, RIG_T3, TRS } from '../src/operators/runtime/pose';
// @ts-expect-error plain .mjs build script without types
import { patchGlb } from '../scripts/anim-skeleton/skin.mjs';

const ASSETS = 'src/operators/assets/wren';
const LODS = ['hero', 'lod0', 'lod1', 'lod2'] as const;
const read = (lod: string): Buffer => readFileSync(`${ASSETS}/wren-${lod}.glb`);
const jsonOf = (lod: string): GltfJson & { nodes: { translation?: number[] }[] } => glbJson(read(lod)) as never;

interface FullJson {
  nodes: { name?: string; children?: number[] }[];
  skins: { joints: number[] }[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number }[] }[];
  accessors: { count: number }[];
}
const names = (j: FullJson): string[] => j.skins[0]!.joints.map((i) => j.nodes[i]!.name ?? '');
const parentOf = (j: FullJson, name: string): string | undefined => {
  const i = j.nodes.findIndex((n) => n.name === name);
  return j.nodes.find((n) => (n.children ?? []).includes(i))?.name;
};

describe('anim-skeleton S1: the shipped Wren skeletons', () => {
  it('every LOD has clavL / clavR between chest and the shoulders and goggleStow / goggleUse under the head; LOD0 / LOD1 (and the hero) the 30 finger joints', () => {
    const expected = { hero: 67, lod0: 57, lod1: 57, lod2: 27 };
    for (const lod of LODS) {
      const j = jsonOf(lod) as unknown as FullJson;
      const n = names(j);
      expect(n.length, lod).toBe(expected[lod]);
      expect(n.length, `${lod} budget`).toBeLessThanOrEqual(LOD_BUDGET[lod]!.bones);
      expect(parentOf(j, 'goggleStow'), lod).toBe('head');
      expect(parentOf(j, 'goggleUse'), lod).toBe('head');
      for (const s of ['L', 'R']) {
        expect(parentOf(j, `clav${s}`), lod).toBe('chest');
        expect(parentOf(j, `sh${s}`), lod).toBe(`clav${s}`);
        const fingers = n.filter((x) => x.startsWith(`finger${s}_`));
        expect(fingers.length, `${lod} fingers ${s}`).toBe(lod === 'lod2' ? 0 : 15);
        if (lod !== 'lod2') for (let k = 1; k <= 5; k++) expect(parentOf(j, `finger${s}_${k}_1`), lod).toBe(`wr${s}`);
      }
      const tris = j.meshes.reduce((t, m) => t + m.primitives.reduce((u, p) => u + j.accessors[p.indices]!.count / 3, 0), 0);
      const c = lodChecks(lod, jsonOf(lod), tris);
      for (const name of ['gameJoints', 'anchors', 'triangles', 'bones', 'ktx2', 'tangents']) {
        expect(c.find((x) => x.name === name)!.pass, `${lod} ${name}`).toBe(true);
      }
    }
  });

  it('re-running the patch is a no-op', () => {
    for (const lod of LODS) expect(patchGlb(read(lod), lod, null, null).buf, lod).toBeNull();
  });

  it('weights: the clavicles everywhere, every finger joint on LOD0 / LOD1, 4 influences summing to 1, rigid parts untouched', () => {
    for (const lod of ['lod0', 'lod1', 'lod2'] as const) {
      const buf = read(lod);
      const m = parseGlb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      expect(validateModel(m, lod)).toEqual([]);
      const jn = m.joints.map((i) => m.nodes[i]!.name);
      const count = new Map<string, number>();
      let worst = 0;
      for (const g of m.meshes) {
        for (let v = 0; v < g.weights.length / 4; v++) {
          let s = 0;
          for (let k = 0; k < 4; k++) {
            const w = g.weights[v * 4 + k]!;
            s += w;
            if (w > 0) count.set(jn[g.joints[v * 4 + k]!]!, (count.get(jn[g.joints[v * 4 + k]!]!) ?? 0) + 1);
          }
          worst = Math.max(worst, Math.abs(s - 1));
        }
      }
      expect(worst, lod).toBeLessThan(1e-5);
      expect(count.get('clavL') ?? 0, `${lod} clavL`).toBeGreaterThan(100);
      expect(count.get('clavR') ?? 0, `${lod} clavR`).toBeGreaterThan(100);
      // the in-use goggle (at least the lens: 642 vertices) rides goggleUse; no stowed geometry in the shipped files
      expect(count.get('goggleUse') ?? 0, `${lod} goggleUse`).toBeGreaterThanOrEqual(642);
      expect(count.get('goggleStow') ?? 0, `${lod} goggleStow`).toBe(0);
      const gm = m.meshes.find((g) => m.materials[g.material]!.name.endsWith('-glow'))!;
      for (let v = 0; v < gm.weights.length / 4; v++) expect(jn[gm.joints[v * 4]!], `${lod} lens`).toBe('goggleUse');
      for (const s of ['L', 'R']) for (let k = 1; k <= 5; k++) for (let i = 1; i <= 3; i++) {
        const n = count.get(`finger${s}_${k}_${i}`) ?? 0;
        if (lod === 'lod2') expect(n).toBe(0);
        else expect(n, `${lod} finger${s}_${k}_${i}`).toBeGreaterThan(10);
      }
    }
  });

  it('the runtime poser: clavicles follow the chest, fingers the wrist, the goggle joints the head (skin matrices equal to float rounding), any pose', () => {
    // (S2 polish) the hero too: its clavicles and goggle joints, its fingers (pre-T3 there) on the wrist
    for (const lod of LODS) {
      const buf = read(lod);
      const m = parseGlb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      const S = poserSetup(m.nodes, m.joints);
      const poser = new OperatorPoser(S);
      const rig = new Float64Array(RIG_JOINTS.length * TRS);
      for (let j = 0; j < RIG_JOINTS.length; j++) rig[j * TRS + 6] = 1;
      poser.solve(rig);
      // a deterministic pose: every pre-T3 rig joint turned about its own axis by up to ~40 degrees (the S2 clavicle rig
      // joints stay at identity: untouched clavicles follow the chest)
      let seed = 7;
      const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
      for (let j = 1; j < RIG_T3; j++) {
        const ax = [rnd(), rnd(), rnd()];
        const l = Math.sqrt(ax[0]! * ax[0]! + ax[1]! * ax[1]! + ax[2]! * ax[2]!);
        const h = rnd() * 0.35;
        rig.set([(ax[0]! / l) * Math.sin(h), (ax[1]! / l) * Math.sin(h), (ax[2]! / l) * Math.sin(h), Math.cos(h)], j * TRS + 3);
      }
      const out = poser.solve(rig);
      const n = S.node.length;
      const pos = new Float64Array(n * 3);
      const rot = new Float64Array(n * 4);
      const qm = (a: number[], b: number[]): number[] => [
        a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!, a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
        a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!, a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!];
      const rotv = (q: number[], v: number[]): number[] => {
        const r = qm(qm(q, [v[0]!, v[1]!, v[2]!, 0]), [-q[0]!, -q[1]!, -q[2]!, q[3]!]);
        return [r[0]!, r[1]!, r[2]!];
      };
      for (let s = 0; s < n; s++) {
        const p = S.parent[s]!;
        const t = [...out.subarray(s * TRS, s * TRS + 3)];
        const q = [...out.subarray(s * TRS + 3, s * TRS + 7)];
        if (p < 0) { pos.set(t, s * 3); rot.set(q, s * 4); continue; }
        const pq = [...rot.subarray(p * 4, p * 4 + 4)];
        const v = rotv(pq, t);
        pos.set([pos[p * 3]! + v[0]!, pos[p * 3 + 1]! + v[1]!, pos[p * 3 + 2]! + v[2]!], s * 3);
        rot.set(qm(pq, q), s * 4);
      }
      /** The skin transform of a slot (posed world * inverse bind), applied to a test point. */
      const skin = (s: number, x: number[]): number[] => {
        const bq = [...S.bindRot.subarray(s * 4, s * 4 + 4)];
        const local = rotv([-bq[0]!, -bq[1]!, -bq[2]!, bq[3]!], [x[0]! - S.bindPos[s * 3]!, x[1]! - S.bindPos[s * 3 + 1]!, x[2]! - S.bindPos[s * 3 + 2]!]);
        const w = rotv([...rot.subarray(s * 4, s * 4 + 4)], local);
        return [w[0]! + pos[s * 3]!, w[1]! + pos[s * 3 + 1]!, w[2]! + pos[s * 3 + 2]!];
      };
      const slot = (nm: string): number => S.names.indexOf(nm);
      const same = (a: number, b: number, label: string): void => {
        for (const x of [[0, 1.4, 0], [0.2, 1.3, 0.05], [0.7, 0.9, 0.1], [-0.6, 1.0, -0.1]]) {
          const pa = skin(a, x), pb = skin(b, x);
          for (let k = 0; k < 3; k++) expect(Math.abs(pa[k]! - pb[k]!), `${lod} ${label}`).toBeLessThan(1e-5);
        }
      };
      let checked = 0;
      for (const g of ['goggleStow', 'goggleUse']) { same(slot(g), slot('head'), `${g} vs head`); checked++; }
      for (const s of ['L', 'R']) {
        same(slot(`clav${s}`), slot('chest'), `clav${s} vs chest`);
        checked++;
        for (const nm of S.names) if (nm.startsWith(`finger${s}_`)) { same(slot(nm), slot(`wr${s}`), `${nm} vs wr${s}`); checked++; }
      }
      expect(checked, lod).toBe(lod === 'lod2' ? 4 : 34);
    }
  });

  it('the shoulders keep their world rest under the clavicle; the clavicle sits at the sternoclavicular point', () => {
    for (const lod of LODS) {
      const buf = read(lod);
      const m = parseGlb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      const S = poserSetup(m.nodes, m.joints);
      const at = (nm: string): number[] => [...S.bindPos.subarray(S.names.indexOf(nm) * 3, S.names.indexOf(nm) * 3 + 3)];
      // shoulder head (game frame: x mirrored), as before S1; the clavicle 3 cm off the midline, 4 cm forward of the chest
      expect(at('shL')[1]).toBeCloseTo(1.348, 3);
      expect(Math.abs(at('shL')[0]!)).toBeCloseTo(0.1764, 3);
      expect(Math.abs(at('clavL')[0]!)).toBeCloseTo(0.03, 5);
      expect(at('clavL')[2]! - at('chest')[2]!).toBeCloseTo(0.04, 5);
      expect(at('neck')[1]! - at('clavL')[1]!).toBeCloseTo(0.035, 5);
    }
  });
});
