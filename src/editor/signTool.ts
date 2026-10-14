/**
 * ON14: the Sign tool (Y > Objects > Signs) and the plan's sign and name plate marks. A (a click) places a sign of the
 * picked kind on the wall face in front of the dot, or hangs it under the ceiling facing the view (signs.ts, pure);
 * D-pad left / right picks the kind. The plan draws each sign as a bar in its colour with its words, and each door's
 * name plate as a small tag in its access level colour.
 */
import { placeSign, platePlace, plateColour, signFoot, signId } from './signs';
import type { SignRecord } from './signs';
import { signFace, SIGN_KINDS, signKind } from './signCatalogue';
import { fmt } from './geometry';
import type { Editor, PlanShape } from './main';
import type { Mark } from './scene3d';
import type { Elem, Pt } from './types';
import { keyOf } from './types';

const DEG = Math.PI / 180;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class SignTool {
  kind = SIGN_KINDS[0]!.id;

  constructor(private readonly ed: Editor) {}

  setKind(id: string): void {
    this.kind = signKind(id).id;
  }

  stepKind(dir: 1 | -1): string {
    const i = SIGN_KINDS.findIndex((k) => k.id === this.kind);
    this.kind = SIGN_KINDS[(i + dir + SIGN_KINDS.length) % SIGN_KINDS.length]!.id;
    return signKind(this.kind).name;
  }

  barWords(): string {
    return signKind(this.kind).name;
  }

  hint(): string {
    const k = signKind(this.kind);
    return `${k.name}: A (click) on a wall face${k.mount === 'wall' ? '' : ', or away from walls to hang it under the ceiling'}; D-pad left / right picks the sign`;
  }

  /** The editor camera's look yaw (degrees): a hung sign faces back along it. */
  private lookYaw(): number {
    const ct = this.ed.view.camera.getTarget();
    const cp = this.ed.view.camera.position;
    return ((Math.atan2(ct.x - cp.x, ct.z - cp.z) / DEG) % 360 + 360) % 360;
  }

  private place(x: number, z: number): ReturnType<typeof placeSign> {
    const p = placeSign(this.ed.model.data, this.kind, this.ed.view.level, x, z, this.ed.objectGrid, this.lookYaw());
    if (!p.sign) return p;
    // Michael 2026-10-14: nothing inside walls (pushed out to the face when a little way in, else refused)
    const w = this.ed.wallGuard('signs', p.sign as unknown as Elem);
    return w.why ? { ...p, sign: null, why: w.why } : { ...p, sign: w.e as unknown as SignRecord };
  }

  /** A (a click): the sign at the dot, selected; the tool stays on. */
  down(x: number, z: number): void {
    const ed = this.ed;
    const p = this.place(x, z);
    if (!p.sign) return ed.status(p.why ?? 'Cannot go here');
    const s: SignRecord = { ...p.sign, id: signId(ed.model.data) };
    ed.commitText(`Added sign ${s.id}: ${p.words}`, [{ coll: 'signs', id: s.id, before: null, after: s as unknown as Elem }]);
    ed.select(keyOf('signs', s.id));
    ed.status(`Added sign ${s.id}: ${p.words}; its card sets the text and arrow; A (click) places another, B (Esc) puts the tool down`);
  }

  ghost(x: number, z: number, f: number): { words: string; bad: boolean; key: string; marks: Mark[]; plan: PlanShape[] } {
    const p = this.place(x, z);
    const marks: Mark[] = [];
    const plan: PlanShape[] = [];
    if (!p.sign) {
      marks.push({ x, y: f + 1.8, z, sx: 0.2, sy: 0.2, sz: 0.2, dx: 1, dz: 0, look: 'bad' });
      return { words: p.why ?? 'Cannot go here', bad: true, key: `sgx|${this.kind}|${Math.round(x * 10)},${Math.round(z * 10)}`, marks, plan };
    }
    const s = p.sign;
    const yaw = s.facing * DEG;
    // the face across the facing: (cos, -sin) is the face's width direction
    marks.push({ x: s.at[0], y: f + s.y, z: s.at[1], sx: s.size[0], sy: s.size[1], sz: 0.05, dx: Math.cos(yaw), dz: -Math.sin(yaw), look: 'ghost' });
    const h = s.size[0] / 2;
    plan.push({ kind: 'line', a: [s.at[0] - Math.cos(yaw) * h, s.at[1] + Math.sin(yaw) * h], b: [s.at[0] + Math.cos(yaw) * h, s.at[1] - Math.sin(yaw) * h] });
    return { words: `A: ${p.words}`, bad: false, key: `sg|${this.kind}|${s.at.join()}|${s.facing}|${s.y}`, marks, plan };
  }

  /** The plan's signs (bars in their colour with their words) and name plates (tags in the access level colour). */
  planMarkup(toPlan: (x: number, z: number) => Pt, _S: number): string {
    const ed = this.ed;
    const d = ed.model.data;
    const lv = ed.view.level;
    const sel = ed.selected;
    let out = '';
    for (const s of d.signs ?? []) {
      if (s.level !== lv) continue;
      const key = keyOf('signs', s.id);
      const k = signKind(s.kind);
      const yaw = s.facing * DEG;
      const h = s.size[0] / 2;
      const a = toPlan(s.at[0] - Math.cos(yaw) * h, s.at[1] + Math.sin(yaw) * h);
      const b = toPlan(s.at[0] + Math.cos(yaw) * h, s.at[1] - Math.sin(yaw) * h);
      const c = toPlan(s.at[0], s.at[1]);
      const on = sel === key;
      out += `<line data-id="${key}" class="signMark" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${on ? '#ff7300' : k.bg}" stroke-width="${on ? 7 : 5}"${s.hang ? ' stroke-dasharray="4 2"' : ''}/>`;
      out += `<text class="signLabel" x="${(c[0] + 6).toFixed(1)}" y="${(c[1] - 6).toFixed(1)}" font-size="11" fill="${k.bg}" stroke="#fff" stroke-width="2.5" paint-order="stroke" pointer-events="none">${esc(signFace(s.text, s.arrow))}</text>`;
    }
    const walls = new Map(d.walls.filter((w) => w.level === lv).map((w) => [w.id, w]));
    for (const o of d.openings) {
      if (typeof o.plate !== 'string' || !o.plate || !walls.has(o.wall)) continue;
      const p = platePlace(d, o);
      if (!p) continue;
      const c = toPlan(p.at[0], p.at[1]);
      const text = o.plate.length > 18 ? `${o.plate.slice(0, 17)}...` : o.plate;
      const w = text.length * 5.2 + 6;
      out += `<g class="plateTag" data-plate="${esc(o.id)}" pointer-events="none"><rect x="${(c[0] - w / 2).toFixed(1)}" y="${(c[1] - 6).toFixed(1)}" width="${w.toFixed(1)}" height="11" rx="2" fill="${plateColour(o)}" stroke="#222" stroke-width="0.7"/><text x="${c[0].toFixed(1)}" y="${(c[1] + 2.5).toFixed(1)}" font-size="9" text-anchor="middle" fill="#111">${esc(text)}</text></g>`;
    }
    return out;
  }

  /** The card's foot. */
  footWords(s: SignRecord): string {
    return `${signFoot(s)}; ${fmt(s.size[0])} x ${fmt(s.size[1])} m`;
  }
}
