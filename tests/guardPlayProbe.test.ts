/**
 * (guard-ai play pass, docs/guard-ai/PLAY-PASS.md) A probe of the guards Michael meets on /preview/: Marlow Yard as the
 * re-planned yard (`ctcourseReplan`, `marlowReplan` on) and Saltmarsh Park S1 from its v2 parts (`campusV2` on). For every
 * guard slot: does `EnemyManager.spawn` find a nav cell (`nearestWalkable` ring 8 on his storey) and how far it snaps
 * him; is his spawn point inside a solid; can he walk each leg of his route (and from his spawn to its first point) on
 * the guards' runtime grid (`tests/helpers/runtimeNav.ts`). Also Sector Ops' reinforcement points and entries.
 *
 * Report only (`GUARD_PROBE=1 npx vitest run tests/guardPlayProbe.test.ts`): it prints a table and never fails, so the
 * map lanes' in-flight data cannot turn CI red. The play pass's fix slices turn the findings into asserting guards.
 */
import { describe, it, vi } from 'vitest';
import type { NavGrid } from '../src/ai/navGrid';
import type { LevelBuilder } from '../src/world/levelBuilder';
import { hyp2 } from '../src/core/mathx';
import { runtimeNav } from './helpers/runtimeNav';
import { closeDoors, solidAt } from './helpers/guardSlotChecks';

const RUN = process.env.GUARD_PROBE === '1';
const BUDGET = 60000;
/** `Enemy.goTo`'s A* budget (src/ai/enemy.ts). */
const GOTO_BUDGET = 3000;

interface Slot {
  id: string;
  kind: string;
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  route?: readonly (readonly [number, number])[];
  passive?: boolean;
  post?: unknown;
  loop?: unknown;
}

/** One slot's lines (empty = clean). */
function checkSlot(b: LevelBuilder, nav: NavGrid, s: Slot): string[] {
  const out: string[] = [];
  const y = s.y ?? Number.NaN;
  const c = nav.nearestWalkable(s.x, s.z, 8, y);
  if (c < 0) return [`NO SPAWN CELL within ring 8 (spawn returns null)`];
  const [cx, cz] = nav.center(c);
  const snap = hyp2(cx - s.x, cz - s.z);
  const fy = nav.height[c]!;
  if (snap > 0.75) out.push(`spawn snaps ${snap.toFixed(2)} m to (${cx.toFixed(2)}, ${cz.toFixed(2)}) y ${fy.toFixed(2)}`);
  const si = solidAt(b, s.x, s.z, Number.isFinite(y) ? y : fy);
  if (si >= 0) {
    const p = b.boxes[si]!;
    out.push(`post point inside solid box #${si} c=(${p.c.map((v) => v.toFixed(2)).join(',')}) s=(${p.s.map((v) => v.toFixed(2)).join(',')})`);
  }
  const r = s.route;
  if (r?.length) {
    const r0 = r[0]!;
    if (hyp2(r0[0] - s.x, r0[1] - s.z) > 0.6 && !nav.findPath([cx, cz], [r0[0], r0[1]], BUDGET, fy, y)) out.push(`no path spawn -> route[0] (${r0[0]}, ${r0[1]})`);
    const n = r.length;
    const legs = n >= 3 ? n : n - 1; // a 3+ point route loops (`PatrolWalker`); 2 points ping-pong
    for (let i = 0; i < legs; i++) {
      const a = r[i]!;
      const d = r[(i + 1) % n]!;
      const ca = nav.nearestWalkable(a[0], a[1], 2, y);
      if (ca < 0) out.push(`route[${i}] (${a[0]}, ${a[1]}) has no walkable cell within ring 2`);
      if (!nav.findPath([a[0], a[1]], [d[0], d[1]], BUDGET, y, y)) out.push(`no path route[${i}] (${a[0]}, ${a[1]}) -> route[${(i + 1) % n}] (${d[0]}, ${d[1]})`);
      // the walker's own budget (`Enemy.goTo`: 3000 expansions) when the leg is not a clear straight line
      else if (!nav.lineClear([a[0], a[1]], [d[0], d[1]], y, y) && !nav.findPath([a[0], a[1]], [d[0], d[1]], GOTO_BUDGET, y, y)) out.push(`route[${i}] -> route[${(i + 1) % n}] needs over ${GOTO_BUDGET} expansions (goTo fails: he walks straight at it)`);
    }
  }
  return out;
}

/**
 * The walk home after a search (`PatrolWalker.rejoin`: the nearest route point by straight line; a post: the post): of the
 * walkable spots on his storey within `r` m of his home, every 2 m, how many have no `GOTO_BUDGET` path home (the
 * line not clear). `Enemy.update`'s patrol branch then heads straight at the point (`goTo(...) ?? g`) and presses a wall.
 */
function homeFails(nav: NavGrid, s: Slot, r: number): string {
  const pts = s.route?.length ? s.route : [[s.x, s.z] as const];
  const y = s.y ?? 0;
  let n = 0;
  let bad = 0;
  let badFar = 0;
  for (let dx = -r; dx <= r; dx += 2) {
    for (let dz = -r; dz <= r; dz += 2) {
      if (hyp2(dx, dz) > r) continue;
      const x = s.x + dx;
      const z = s.z + dz;
      const c = nav.nearestWalkable(x, z, 0, s.y ?? 0);
      if (c < 0 || !(Math.abs(nav.height[c]! - (s.y ?? 0)) < 1.2)) continue;
      let best = pts[0]!;
      let bd = Infinity;
      for (const p of pts) {
        const d = hyp2(p[0] - x, p[1] - z);
        if (d < bd) [best, bd] = [p, d];
      }
      if (!nav.findPath([x, z], [best[0], best[1]], BUDGET, y, y)) continue; // not his region at all
      n++;
      if (nav.lineClear([x, z], [best[0], best[1]], y, y)) continue;
      if (!nav.findPath([x, z], [best[0], best[1]], GOTO_BUDGET, y, y)) {
        bad++;
        if (bd > 20) badFar++;
      }
    }
  }
  return `home walk: ${bad}/${n} spots within ${r} m fail goTo's ${GOTO_BUDGET} (${badFar} of them over 20 m out)`;
}

function describeSlot(s: Slot): string {
  const bits = [s.kind, `(${s.x}, ${s.z}${s.y !== undefined ? `, y ${s.y}` : ''})`];
  if (s.passive) bits.push('PASSIVE');
  if (s.route?.length) bits.push(`route ${s.route.length} pts${s.loop ? ' timed' : ''}`);
  else bits.push('post');
  if (s.post) bits.push(`post ${JSON.stringify(s.post)}`);
  return bits.join(' ');
}

describe.runIf(RUN)('guard play probe', () => {
  it('Marlow Yard re-plan (ctcourseReplan)', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { buildCtcourse, ctcourse } = await import('../src/world/maps/ctcourse');
    const b = new LevelBuilder();
    const build = buildCtcourse(b, { replan: true });
    const lay = build.layout;
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const course = lay.course!;
    const { CourseState } = await import('../src/game/course/courseState');
    const st = new CourseState(course.def, course.consoles);
    const locked = new Set<number>();
    for (const d of st.lockedDoors()) if (course.doors[d] !== undefined) locked.add(course.doors[d]!);
    for (const a of b.anchors.doors) if (a.locked) locked.add(a.id);
    const navL = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const nShut = closeDoors(b, navL, locked);
    const lines: string[] = [`== ctcourseReplan (doors locked at the start, shut on a second grid: ${nShut})`];
    for (const bay of course.def.bays) {
      lines.push(`-- ${bay.title} squad [${bay.squad.join(', ')}] rated ${bay.rated}`);
      let failed = false;
      for (const id of bay.squad) {
        const s = course.squads[id];
        if (!s) {
          lines.push(`   ${id}: NO SLOT DATA (skipped by spawnSquad)`);
          continue;
        }
        const res = checkSlot(b, nav, { id, ...s });
        for (const l of checkSlot(b, navL, { id, ...s })) if (!res.includes(l)) res.push(`(locked doors shut) ${l}`);
        if (res[0]?.startsWith('NO SPAWN')) {
          if (!failed) res.push('-> spawnSquad breaks here: the rest of this squad never spawns');
          failed = true;
        }
        lines.push(`   ${id}: ${describeSlot({ id, ...s })}${res.length ? '\n      ! ' + res.join('\n      ! ') : ''}${s.passive ? '' : '\n      ' + homeFails(navL, { id, ...s }, 30)}`);
      }
    }
    const cams = lay.security?.devices.filter((d) => d.kind === 'camera') ?? [];
    lines.push(`-- cameras ${cams.length}: ${cams.map((c) => `${c.id}${'guardResponse' in c && c.guardResponse === false ? '(no response)' : ''}`).join(', ')}`);
    console.info(lines.join('\n'));
  });

  it('Saltmarsh Park S1 v2 (campusOps, campusV2 on)', { timeout: 600_000 }, async () => {
    vi.resetModules();
    const { flags } = await import('../src/core/flags');
    flags.campusV2 = [1, 2, 3, 4, 5];
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { campusOps } = await import('../src/world/maps/campusOps');
    const b = new LevelBuilder();
    const lay = campusOps.build(b, 0);
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const s = campusOps.sectors![0]!;
    // the doors shut at the section's start: locked anchors, and the door nearest each keypad, bolt and pair gate
    const locked = new Set<number>();
    for (const a of b.anchors.doors) if (a.locked) locked.add(a.id);
    const nearestDoor = (x: number, z: number): number => {
      let best = -1;
      let bd = 2.5;
      for (const a of b.anchors.doors) {
        const d = hyp2(a.hinge.x + Math.sin(a.yaw) * a.width * 0.5 - x, a.hinge.z + Math.cos(a.yaw) * a.width * 0.5 - z);
        if (d < bd) [best, bd] = [a.id, d];
      }
      return best;
    };
    for (const p of [...(s.keypads ?? []), ...(s.bolts ?? []), ...((s.pairGates ?? []) as readonly { at?: readonly [number, number] }[])]) {
      if (!p.at) continue;
      const id = nearestDoor(p.at[0], p.at[1]);
      if (id >= 0) locked.add(id);
    }
    const navL = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const nShut = closeDoors(b, navL, locked);
    const lines: string[] = [`== campusOps S1 v2 '${s.name}' guards ${s.guards.length} perStage ${s.perStage} dogs ${s.dogs ?? 0} (doors shut on a second grid: ${nShut})`];
    s.guards.forEach((g, k) => {
      const slot: Slot = { id: String(k), ...g };
      const res = checkSlot(b, nav, slot);
      for (const l of checkSlot(b, navL, slot)) if (!res.includes(l)) res.push(`(locked doors shut) ${l}`);
      const tags = [g.role, g.zone, g.pair !== undefined ? `pair ${g.pair}` : '', g.handler !== undefined ? `handler ${g.handler}` : ''].filter(Boolean).join(' ');
      lines.push(`   ${k}: ${describeSlot(slot)} [${tags}]${res.length ? '\n      ! ' + res.join('\n      ! ') : ''}\n      ${homeFails(navL, slot, 45)}`);
    });
    const start = s.start;
    for (const [i, p] of s.reinforce.entries()) {
      const c = nav.nearestWalkable(p[0], p[1], 8);
      lines.push(`   reinforce ${i} (${p[0]}, ${p[1]}): ${c < 0 ? 'NO CELL' : nav.findPath([p[0], p[1]], [start.x, start.z], 200000) ? 'reaches start' : 'NO PATH to start'}`);
    }
    for (const [i, e] of (s.entries ?? []).entries()) {
      const c = nav.nearestWalkable(e.at[0], e.at[1], 8, e.y ?? Number.NaN);
      lines.push(`   entry ${i} (${e.at[0]}, ${e.at[1]}): ${c < 0 ? 'NO CELL' : 'cell ok'} route ${e.route?.length ?? 0}`);
    }
    for (const a of s.stageActions ?? []) lines.push(`   stage ${a.stage}: ${JSON.stringify(a).slice(0, 200)}`);
    const cams = lay.security?.devices.filter((d) => d.kind === 'camera' && (d.section === undefined || d.section === 0)) ?? [];
    lines.push(`   cameras S1 ${cams.length}: ${cams.map((c) => c.id).join(', ')}`);
    console.info(lines.join('\n'));
  });
});
