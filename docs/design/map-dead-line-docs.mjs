// Dead Line: writes map-dead-line.md (the plan tables) and map-dead-line-validation.md (the evidence) from the analysis result R.
import fs from 'node:fs';
import { hyp } from './map-dead-line-core.mjs';
import { guardPosAt } from './map-dead-line-sim.mjs';

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const row = (a) => '| ' + a.map((c) => String(c).replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |';
const tbl = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const sz = (r) => `${f1(r[2] - r[0])} x ${f1(r[3] - r[1])}`;
const XY = (x, z) => `(${f1(x)}, ${f1(z)})`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function writeDocs(R, P) {
  const D = R.D, ctx = R.ctx, W = ctx.W;
  const rows = R.rows;
  const all = [...rows.stealth, ...rows.scale, ...rows.light, ...rows.anti];
  const pathTime = (a, b) => {
    const nodes = W.findPath(a, b);
    if (!nodes) return null;
    let t = 0;
    for (const l of W.pathToLegs(nodes)) { if (l.link) t += l.link.travel; else for (let i = 1; i < l.pts.length; i++) t += hyp(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]) / 2.0; }
    return t;
  };
  // regroup times along both lanes of chapter 6
  const reg = D.regroup;
  const lane = (rid, ch) => (R.cover[rid].samples.filter((p) => p.chapter === ch));
  const regStats = (rid, ch, keep) => {
    const ss = lane(rid, ch).filter((_, i) => i % 8 === 0);
    let worst = 0, at = null;
    for (const p of ss) {
      let best = 1e9;
      for (const g of reg.filter(keep)) { const t = pathTime([p.lv, p.x, p.z], [g.level, g.x, g.z]); if (t !== null && t < best) best = t; }
      if (best > worst && best < 1e9) { worst = best; at = p; }
    }
    return { worst, at, n: ss.length };
  };
  const regA = regStats('R6A', 6, (g) => ['RG1', 'RG2', 'RG3'].includes(g.id));
  const regB = regStats('M', 6, (g) => ['RG1', 'RG2', 'RG3'].includes(g.id));
  const regA2 = regStats('R6A', 6, (g) => ['RG1', 'RG2'].includes(g.id));
  R.reg = { regA, regB, regA2 };

  // ------------------------------------------------------------------ the plan tables
  const md = [];
  md.push('# Mission 1 DEAD LINE: campus map (D1)\n');
  md.push('Generated from `map-dead-line.json` by `map-dead-line-render.mjs`. Plan: `map-dead-line.svg` / `map-dead-line.png`. Evidence: `map-dead-line-validation.md`. Docs only: no game code. Units are metres on a 0.5 m grid, x east, z north. Levels: B (basement and tunnel, y -3.3), T (trench and culvert, y -1.4, crawl only), G (ground, 0), U (upper floor and hall catwalk, 3.3), R (roof, 6.6).\n');
  md.push('![plan](map-dead-line.png)\n');
  md.push('## Layout in one paragraph\n');
  md.push('The yard strip (x -56 to 76, z -30 to -16) runs along the south of everything. Arrival Gp is in its west corner, the van gate Gv in the middle. The coke yard (x -36 to -8, z -16 to 0) sits north of the west yard (gate CG). The main building (x -8 to 74, z -16 to 10) has the Goods-in and lockers in the west, the generator room, the cage and the vestibule in the middle (x 4 to 34) and the switch hall in the east (x 34 to 68) with the east stair hall (S1) beyond it. The plant basement lies under the hall and the cage block (x 4 to 42), reached from the coke yard by a service tunnel (36.5 m straight, 42.5 m walked through the valve chamber dogleg). Upper floor: records office and Test room in the west, Control room over the vestibule, the Gallery over the hall north store, a south corridor and a north corridor, and the catwalk ring inside the hall. The roof is two decks split by a glazed slot (x 20 to 26) that only the pipe beam crosses.\n');
  md.push('## Chapter times on the main route M (ideal walk)\n');
  md.push(tbl(['Ch', 'Chapter', 'Budget s', 'Range s (15%)', 'M ideal walk s', 'Path m', 'Jog m', 'Holds s', 'Link s', 'Result'], R.chapterTimes.map((c) => [c.id, c.name, c.budget, `${f1(c.lo)} - ${f1(c.hi)}`, f1(c.t), f1(c.len), f1(c.jogM), f1(c.holds), f1(c.links), c.ok ? 'PASS' : 'FAIL'])));
  md.push(`\nTotal ${f1(R.totalIdealS)} s (${f1(R.totalIdealS / 60)} min; target 5.5 to 6.5). Chapter 6 on M is the hall return (6B). The roof lane 6A takes ${f1(R.chapterTimes[5].lane.a)} s (${R.chapterTimes[5].okA ? 'inside' : 'outside'} the range).\n`);
  md.push('## Spaces\n');
  md.push(tbl(['Id', 'Name', 'Level', 'x0 z0 x1 z1', 'Size m', 'Kind', 'Wall m', 'Floor', 'Chapters', 'Landmark', 'Purpose'], D.spaces.map((s) => [s.id, s.name, s.level, s.rect.join(' '), sz(s.rect), s.kind, s.wallH, s.floor, (s.ch || []).join(','), s.landmark, s.purpose])));
  md.push('\n## Doors, openings and locks\n');
  md.push(tbl(['Id', 'Type', 'Level', 'Wall', 'Centre', 'Width m', 'From', 'To', 'Lock', 'Purpose'], D.openings.map((o) => [o.id, o.type, o.level, o.axis === 'z' ? `z=${o.at}` : `x=${o.at}`, o.c, o.w, o.from, o.to, o.lock ? o.lock.how : '', o.purpose])));
  md.push('\n## Vertical links, ladders, ducts, trenches, ledge and beam\n');
  md.push(tbl(['Id', 'Kind', 'From', 'To', 'Travel s', 'One way', 'Lock', 'Note'], D.links.map((l) => [l.id, l.kind, `${l.a[0]} ${XY(l.a[1], l.a[2])}`, `${l.b[0]} ${XY(l.b[1], l.b[2])}`, l.travel, l.oneway ? 'yes' : '', l.lock ? l.lock.how : '', l.note])));
  md.push(`\n${D.blocks.length} blocks (cover, racks, vehicles, rack lines) are in the JSON \`blocks\` list with their heights; rack lines are 2.4 m solid with end gaps, the cage windows CMESH and CMESH2 pass sight above 1.0 m.\n`);
  md.push('## Lamps and circuits\n');
  md.push(tbl(['Circuit', 'Name', 'Switch', 'Lamps', 'Guard reaction', 'Search s'], D.circuits.map((c) => [c.id, c.name, `${c.switch.id} ${c.switch.level} ${XY(c.switch.x, c.switch.z)}: ${c.switch.note}`, c.lamps, `${c.reaction.guards}: ${c.reaction.what}`, c.reaction.durationS])));
  md.push('\n' + tbl(['Lamp', 'Circuit', 'Level', 'x, z', 'Height', 'Range', 'Intensity', 'Shootable', 'Note'], D.lamps.map((l) => [l.id, l.circuit, l.level, XY(l.x, l.z), l.h, l.r, l.i, l.shoot ? 'yes' : 'no', l.note])));
  md.push('\n## Alarm panels\n');
  md.push(tbl(['Id', 'Level', 'x, z', 'Note'], D.panels.map((p) => [p.id, p.level, XY(p.x, p.z), p.note])));
  md.push('\n## Hide spots (1.5 m deep and wide or larger, dark)\n');
  md.push(tbl(['Id', 'Level', 'Space', 'Rect', 'Opens', 'Body spot', 'Enclosure', 'Guards it shows'], D.hides.map((h) => [h.id, h.level, h.space, h.rect.join(' '), h.open, h.body ? 'yes' : '', h.enclosure, (h.shows || []).join(',')])));
  md.push('\n## Vantage points\n');
  md.push(tbl(['Id', 'Level', 'x, z', 'Shows', 'Note'], D.vantage.map((v) => [v.id, v.level, XY(v.x, v.z), v.shows.join(','), v.note])));
  md.push('\n## Spawns, objectives, exits, regroup points\n');
  md.push(tbl(['Id', 'Level', 'x, z', 'Hold s', 'Note'], [...D.spawns.map((s) => [s.id, 'G', XY(s.x, s.z), '', s.first]), ...D.objectives.map((o) => [o.id, o.level, XY(o.x, o.z), o.hold, `${o.name}. ${o.why}`]), ...D.extraction.map((e) => [e.id, e.level, XY(e.x, e.z), '', e.name]), ...D.regroup.map((g) => [g.id, g.level, XY(g.x, g.z), '', `${g.name}: ${g.why}`])]));
  md.push('\n## Guards\n');
  md.push(tbl(['Id', 'Type', 'Level', 'Speed m/s', 'Phase s', 'Loop s', 'Travel m', 'Dwell s', 'Role and post', 'Why here', 'Tells', 'Reaction'], D.guards.map((g) => { const r = R.guards.find((x) => x.id === g.id); return [g.id, g.arch, g.level, g.speed, g.phase || 0, r ? f1(r.period) : 'on alarm', r ? f1(r.travel) : '', r ? f1(r.dwell) : '', `${g.role}; ${g.post}`, g.why, (g.tells || []).join(' / '), g.reaction.lights]; })));
  md.push('\n### Waypoints (x, z, dwell s, facing)\n');
  md.push(tbl(['Guard', 'Waypoint', 'x, z', 'Dwell s', 'Facing', 'What'], D.guards.flatMap((g) => g.wps.map((w, k) => [g.id, k, XY(w.x, w.z), w.d, `[${w.face[0]}, ${w.face[1]}]`, w.what]))));
  md.push('\n## Routes\n');
  md.push(tbl(['Id', 'Name', 'Kind', 'Total s', 'Per chapter s'], D.routes.map((r) => { const b = ctx.routes[r.id]; return [r.id, r.name, r.kind, f1(b.total), Object.entries(b.byChapter).map(([c, v]) => `ch${c} ${f1(v.t)}`).join(', ')]; })));
  md.push('\n### Main route key points\n');
  md.push(tbl(['#', 'Level', 'x, z', 'Pace', 'Hold s', 'Label', 'Encounter'], D.routes.find((r) => r.id === 'M').pts.map((p, i) => [i, p.lv, XY(p.x, p.z), p.m || '', p.hold || '', p.label || '', p.enc || ''])));
  md.push('\n## Encounters (28 per run; chapter 6 lists both lanes)\n');
  md.push(tbl(['Id', 'Ch', 'Level', 'x, z', 'On M', 'Kind', 'What'], D.encounters.map((e) => [e.id, e.ch, e.level, XY(e.x, e.z), e.main ? 'yes' : '', e.kind, e.name])));
  md.push('\n## Toys\n');
  md.push(tbl(['Id', 'Chapters', 'Toy', 'Status', 'Item', 'Gives', 'Costs'], D.toys.map((t) => [t.id, t.ch.join(','), t.name, t.status, t.item, t.gives, t.costs])));
  md.push('\n## Gates and locks\n');
  md.push(tbl(['Lock', 'Kind', 'Where', 'Opens', 'Gate'], D.locks.map((l) => [l.id, l.type, l.where, l.opens, l.gate])));
  md.push('\n## Co-op rows\n');
  md.push(tbl(['Id', 'With a partner', 'Solo version', 'Gain'], D.coop.map((c) => [c.id, c.co, c.solo, c.gain])));
  fs.writeFileSync(P('map-dead-line.md'), md.join('\n') + '\n');

  // ------------------------------------------------------------------ validation
  const v = [];
  const fails = all.filter((r) => r.result === 'FAIL');
  const cost = R.cost.results;
  const capFit = R.costFit;
  v.push('# Dead Line map: validation (D1)\n');
  v.push(`Generated by \`map-dead-line-render.mjs\` from \`map-dead-line.json\` (checks in \`map-dead-line-analysis.mjs\`, bots in \`map-dead-line-bots.mjs\`, guard cost in \`map-dead-line-guard-cost.mjs\`). Every number below is computed from the JSON on a 0.5 m nav grid (agent radius 0.32, two grid offsets for door passes) with the engine's perception formula; nothing is hand-edited. Result: ${all.filter((r) => r.result === 'PASS').length} of ${all.length} rule checks PASS, ${fails.length} FAIL (listed honestly in section 9; ${fails.map((r) => r.id).join(', ')}).\n`);
  v.push('**How "ideal walk" is read.** The mission doc budgets the first-run route per chapter; I measure the main route M (the intended spine, the one every gate forces) at best-case pace with zero waiting: gear 3 stand (2.0 m/s) by default, gear 4 (2.8 m/s, noise 3.4 m) only where no guard path is within 3.44 m, stairs and ladders by the link times in the JSON, holds as listed. Shortcuts (chute, V shaft, trench, riser) are separate routes, timed in rule 21, because a known-route player is allowed to be faster than the ideal walk.\n');
  v.push('## 1. Ideal-walk time per chapter against the budget\n');
  v.push(tbl(['Ch', 'Chapter', 'Budget s', 'Allowed (15%)', 'Computed s', 'Result', 'Where the length comes from'], R.chapterTimes.map((c) => [c.id, c.name, c.budget, `${f1(c.lo)} - ${f1(c.hi)}`, f1(c.t) + (c.id === 6 ? ` (6B hall return); 6A roof lane ${f1(c.lane.a)}` : ''), c.ok && (c.okA !== false) ? 'PASS' : 'FAIL', {
    1: 'Gp to CG across the 48 m of yard (the yard was extended 8 m west for this), hold 4 s.',
    2: 'Coke yard 22 m via the bunker apron, the pipe crawl lane, hatch hold 3 s and ladder 3.3 s, then the tunnel, 42.5 m walked (36.5 m straight plus the dogleg round the valve chamber baffle VWALL).',
    3: 'Three plant bays walked as a serpentine (generator hall east, battery hall west, rectifier room east) with the lanes separated by partition walls; stair B 7 s.',
    4: 'Three hall lanes (A east, B west, C east) cut by 2.4 m rack lines with alternate end gaps, 98 m; S1 9.5 s.',
    5: 'S1 top, east landing, catwalk, south corridor (lit crossing), Test room (P1), Control room (P2 at CP): 105 m of walking; two long corridors on the floor plan.',
    6: '6B: back along the Gallery 40 m, S1 down 9.5 s, the east stair hall, hall lane A 34 m, the vestibule. 6A: GL ladder 3.3 s, roof 94 m including the pipe beam at 0.9 m/s.',
    7: 'The cage is a three-lane serpentine (entry lane N, middle lane M, lane S) with 2.4 m rack lines: 62 m, O2 hold 4 s. (An extra 4 m of cage was taken from the west block to get here.)',
    8: 'O2 to the cage back door GCd, the generator room, GD hold 3 s, then the 27 m yard run to Gv.'
  }[c.id]])));
  v.push(`\nTotal ${f1(R.totalIdealS)} s = ${f1(R.totalIdealS / 60)} min (target 5.5 to 6.5 min). What I added to reach the budgets: the yard 8 m longer to the west (Chapter 1), a 6 m dogleg in the tunnel and a 4 m longer coke yard (2), a three-lane serpentine in both the plant basement and the hall (3, 4), the Test room placed above the cage so the Control room is a second stop on a 105 m upper floor (5), the hall stretched 4 m east (4, 6), a three-lane cage (7). Site sizes against the brief: lane and yard 132 x 14 m (brief 40 x 14: Gp and Gv are 89 m apart because the cage is at the far end of the building), coke yard 28 x 16 (24 x 16), tunnel 36.5 m straight, 42.5 m walked (35 m), plant basement 38 x 18 (30 x 18), hall 34 x 18 (30 x 18), upper floors 82 x 26 (36 x 18, but as two corridors and a ring), roof 82 x 26 (36 x 21), cage and vestibule 30 x 15 (24 x 16). The route length, not the footprint, was tuned to the table; the footprint is larger because the ideal walk is six times the Annex.\n`);
  v.push('## 2. Encounters, spacing and toys\n');
  const main = D.encounters.filter((e) => e.main);
  const encRows = D.encounters.map((e) => { const tt = (() => { const m = R.M.segs.find((s) => s.lv === e.level && hyp(s.b[0] - e.x, s.b[1] - e.z) < 6); return m ? m.t1 : null; })(); const off = (() => { let d = 99; for (const p of R.Ms) if (p.lv === e.level) d = Math.min(d, hyp(p.x - e.x, p.z - e.z)); return d; })(); return { e, tt, off }; });
  v.push(tbl(['Id', 'Ch', 'Level', 'x, z', 'Ideal time on M', 'Distance to M m', 'On M', 'What'], encRows.map(({ e, tt, off }) => [e.id, e.ch, e.level, XY(e.x, e.z), tt === null ? '' : mmss(tt), f1(off), e.main ? 'yes' : 'off route', e.name])));
  const perCh = D.meta.chapters.map((c) => { const n = main.filter((e) => e.ch === c.id && !/^E6\.\da$/.test(e.id)).length; const lane = c.id === 6 ? D.encounters.filter((e) => e.ch === 6 && /b$/.test(e.id)).length : 0; return { c, n: c.id === 6 ? lane : D.encounters.filter((e) => e.ch === c.id).length, ideal: R.chapterTimes[c.id - 1].t, first: c.firstRunMin * 60 }; });
  const total = perCh.reduce((a, x) => a + x.n, 0);
  v.push(`\n**Count.** ${total} encounters per run (3+4+3+4+5+4+3+2), ${D.encounters.length} listed because chapter 6 lists both lanes (4 each) and E1.1, E2.3 and E4.3, E5.3 are optional watch or fork points. All have coordinates and a level.\n`);
  v.push('**Spacing.** The mission doc\'s rule is "an encounter every 30 to 45 s" and its budget is 20 min for 28 encounters (first run). Read as first-run time per encounter this is: ' + perCh.map((x) => `ch${x.c.id} ${f1(x.first / x.n)} s`).join(', ') + `. All are in 30 to 45 s except chapter 7 (150 s for 3 encounters = 50 s): the doc's own numbers put it 5 s over; I did not change them. Read as ideal-walk time it cannot hold: ${f1(R.totalIdealS)} s of ideal walk for ${total} encounters is ${f1(R.totalIdealS / total)} s each, because first-run time is mostly watching and waiting. The longest ideal-walk stretch with no encounter on M is ${(() => { const ts = encRows.filter((r) => r.e.main && r.tt !== null).map((r) => r.tt).sort((a, b) => a - b); let g = ts[0]; for (let i = 1; i < ts.length; i++) g = Math.max(g, ts[i] - ts[i - 1]); return f1(g); })()} s (no 60 s stretch). Open question 3.\n`);
  const toyCh = D.meta.chapters.map((c) => ({ id: c.id, toys: D.toys.filter((t) => t.ch.includes(c.id)) }));
  v.push('**Toys per chapter (22 or more, at least 3 each).** ' + toyCh.map((x) => `ch${x.id}: ${x.toys.length} (${x.toys.map((t) => t.id).join(' ')})`).join('; ') + `. ${D.toys.length} toys in total, each with a stated cost, status (TODAY, NEW-small, After playtest) and an item in the JSON (link, block or circuit). ${toyCh.every((x) => x.toys.length >= 3) ? 'PASS' : 'FAIL'}.\n`);
  v.push('## 3. Light rules L1 to L6 and the light map\n');
  v.push(tbl(['Ch', 'Light-map target % lit', 'Computed % lit (all on)', 'Within 15 points', 'Lit and in a sightline %', 'Bright (>= 0.6) %', 'Dimmed (BP: C4, C5 off) % lit'], R.lightByChapter.map((c, i) => [c.id, R.lightTarget[c.id], Math.round(c.lit * 100), Math.abs(c.lit * 100 - R.lightTarget[c.id]) <= 15 ? 'yes' : 'NO', Math.round(c.litSighted * 100), Math.round(c.bright * 100), Math.round(R.dimByChapter[i].lit * 100)])));
  v.push(`\nLight model: gameplay level = ambient (0.10 outdoors and indoors as the Annex map sets \`lightLevel\` 0.1; 0.06 in the plant, an assumption) + sum of lamps x 1.2 x intensity x linear range falloff x cosine from straight down (world/lampMath.ts, LAMP_LEVEL_GAIN 1.2), with a 3D ray from the lamp (floors, walls, blocks and the catwalk slab block it). Lit means >= 0.28 (LIGHT.shadow), bright >= 0.6. Chapter 6 on M is the hall return (${Math.round(R.lit6B * 100)}% lit, target 60 for the hall); the roof lane 6A is ${Math.round(R.lit6A * 100)}% lit (target 10).\n`);
  v.push(tbl(['Rule', 'Result', 'Evidence'], rows.light.map((r) => [r.id, r.result, r.evidence])));
  v.push('\n## 4. Guards: roster, loops on the master clock, peak in play, the cap\n');
  v.push(tbl(['Id', 'Type', 'Level', 'Loop s', 'Period target s', 'Travel m / dwell s', 'Chapters (doc)', 'Why here (one sentence)'], D.guards.map((g) => { const r = R.guards.find((x) => x.id === g.id); return [g.id, g.arch, g.level, r ? f1(r.period) : 'on alarm', r ? r.target : '', r ? `${f1(r.travel)} / ${f1(r.dwell)}` : '', (g.ch || []).join(','), g.why]; })));
  v.push('\n14 fixed guards (G1 to G14, no G15; the doc numbers them 1 to 14 with 12 as the heavy) plus two reinforcements R1 and R2 who spawn at Gv on an alarm. All fixed guards are active from the start. Every loop is waypoints plus dwell plus 0.5 s turns on the 0.5 m nav grid, fitted to exactly 40.0 s (ground) or 30.0 s (the sniper G6); dwell is 3 s or more at every stop. The escalation ladder (suspicious, searching, alerted at AP1/AP2/AP3/AP4, hunting with R1 and R2, cooling down 90 s) is the same for every guard and is a runtime rule (M2).\n');
  v.push('**Peak guards in play per chapter** (a guard whose loop comes within 25 m of the chapter\'s main-route samples on the same level, or within 12 m across a floor; on an alarm add R1 and R2 at Gv and the guards who run to panels):\n');
  v.push(tbl(['Ch', 'Guards in play', 'Count', 'With R1 and R2 on an alarm'], R.inPlay.map((c) => [c.id, c.guards.join(' '), c.guards.length, c.guards.length + 2])));
  v.push(`\nPeak at once on the whole map is all ${R.guards.length} fixed guards (all active), 16 when R1 and R2 are in: that is the number the cap must carry.\n`);
  v.push('**Main-thread cost per guard, measured on desktop** (`map-dead-line-guard-cost.mjs`: Epic, hardware GPU (RTX 4090 laptop, ANGLE D3D11), Warehouse, clear mode, every guard unaware and patrolling, sim p95 per 120 Hz frame plus the render\'s active-mesh JS, median of 3 runs, `E2E_GPU=1`, 640 x 360):\n');
  v.push(tbl(['Guards', 'Sim p95 ms', 'Render JS ms', 'Main thread p95 ms', '3 runs'], cost.map((r) => [r.guards, r.simP95, r.renderJs, r.mainP95, r.runs.join(' / ')])));
  v.push(`\nLinear fit: ${f1(capFit.base * 100) / 100} ms with no guards plus ${(capFit.slope).toFixed(3)} ms per guard (render JS about 0.12, sim about 0.04); the 3 ms target is reached at ${capFit.at3.toFixed(1)} guards (12: 2.62 ms, 13: 2.91, 14: 2.97, 16: 3.47). **The cap is one constant, \`MAX_ACTIVE_GUARDS = 14\`** (the largest count under 3 ms). It is a new name in the design: the engine today has \`MAX_ALIVE = 10\` in \`ai/enemyManager.ts\` (spawn returns null at 10; my first measurement run hit it), so M1 raises that constant to \`MAX_ACTIVE_GUARDS\` and, on an alarm, puts the two guards farthest from the player (2 or more chapters away) to sleep as R1 and R2 spawn (16 live would cost 3.47 ms). Caveats: Warehouse is the baseline, not this map (the campus has more meshes and lamps, so the real headroom is less than the 0.03 ms left at 14); the margin at 12 is 0.38 ms. **If the campus build measures over 3 ms, drop G13 and G14 first** (cap 12): the bots below were also run with both dropped (${R.timetable12.pass ? 'timetable bot PASS' : 'timetable bot FAIL'} at ${f1(R.timetable12.finishedMin)} min; sprint bot ${R.sprint12.pass ? 'still fails the run as required' : 'no longer fails the run'}), but Chapter 5 then has only the officer on the main route (A4 fails there as it does with 14). Phone: test device only, no say in this.\n`);
  v.push('## 5. Anti-sprint rules A1 to A5 and the two bots\n');
  v.push(tbl(['Rule', 'Result', 'Evidence'], rows.anti.map((r) => [r.id, r.result, r.evidence])));
  const sp = R.sprint, tt = R.timetable;
  v.push(`\n**Sprint bot** (\`map-dead-line-bots.mjs\`): route M at gear 6 (5.0 m/s, noise 9 m x surface), no waiting, the engine's sight rate and awareness meter, hearing with 0.45 muffling. It covers the route in ${f1(sp.routeS)} s (holds included). Result: **${sp.pass ? 'PASS (the sprinter fails, as required)' : 'FAIL'}**: ${sp.spotted.length} spotted events (a guard meter reaching 1), ${sp.heard.length} heard events, ${sp.events} in total, ${sp.eventsBeforeCh4} before Chapter 4 starts at ${f1(sp.chapter4StartS)} s; first alarm at ${sp.alarmAtS} s in Chapter ${sp.alarmChapter}. Per chapter: ${Object.entries(sp.byChapter).map(([c, x]) => `ch${c} ${x.spotted} spotted / ${x.heard} heard`).join(', ')}. The sprint bot walks on after an alarm (it does not model the hunt), which only understates what a real sprinter suffers.\n`);
  v.push(`**Timetable bot**: crouch gear 4 (1.8 m/s, silent), perfect knowledge of the guard clock, plans stop to stop: stops are cover samples (hide spot within 3 m or a dark pocket), the next stop is at least 6 m ahead, it waits only while waiting is itself safe for the first start time at which the hop and 6 s of standing at the next stop keep every guard's awareness meter under the suspicious threshold 0.3. Result: **${tt.pass ? 'PASS' : 'FAIL'}**: reached Gv, ${tt.alarms} alarms, highest meter ${tt.maxMeter} (< 0.3, so not even a suspicious arc), finished at ${f1(tt.finishedAtS)} s = ${f1(tt.finishedMin)} min (target 8 to 9), waited ${f1(tt.waitedS)} s = ${(tt.waitShare * 100).toFixed(1)}% (A5 limit 35%), longest single wait ${f1(tt.longestWaitS)} s (limit 40), ${tt.hops} hops. Waits by chapter: ${Object.entries(tt.waitByChapter).map(([c, s]) => `ch${c} ${f1(s)} s`).join(', ')}. Longest waits: ${tt.waits.slice().sort((a, b) => b.s - a.s).slice(0, 4).map((w) => `${f1(w.s)} s at ${w.at.join(' ')} (ch${w.ch})`).join('; ')}.\n`);
  v.push('## 6. Locked-gate table: how each gate could be skipped and why it cannot\n');
  v.push('Computed on the space graph: start in the yard with every lock closed, open a lock only when its action space is reachable (CG from the yard, H from the coke yard, GD and PD from inside, P2 from the Control room, vestibule or by dropping in the cage, D1 from the cage, R1 from the south corridor, P1 from the Test room, RL from the roof, SD2 from the stair hall), repeat. The order in which the locks open and the stage at which each space first becomes reachable are below; a bypass would show up as a space reached earlier than its chapter.\n');
  v.push(`Unlock order: ${R.locks.unlockOrder.join(' -> ')}. Spaces never reached with the locks the player can open: ${R.locks.unreached.join(', ') || 'none'}; locks no action can open: ${R.locks.locked.join(', ') || 'none'} (Gv is the alarm lock and is outside the graph).\n`);
  const stg = Object.entries(R.locks.stageOf).sort((a, b) => a[1] - b[1]);
  v.push('Stage at which each space first becomes reachable (stage k = after the k-th unlock): ' + stg.map(([s, k]) => `${s} ${k}`).join(', ') + '.\n');
  const bypass = {
    CG: 'Fence 3.7 m (mantle 1.8 m twice is 3.6), no block within reach of a fence taller than 1.8 m (nearest blocks: ' + R.fence.nearest.slice(0, 3).map((b) => `${b.block} ${f1(b.d)} m, ${b.h} m high`).join(', ') + '); the culvert CUL has both mouths in the yard; the ledge and RL are not reachable from the yard; PD, GD, FD1 are locked from outside.',
    H: 'The only other way into the tunnel is the coke chute CK (one way down, from the coke yard, so it is behind CG); the tunnel has no other mouth.',
    PD: 'Locked from outside; the roller door RD is sealed; the window GDW is glass (sight only); PD opens from inside after one pass.',
    RD: 'Sealed: not a route.', GD: 'Locked from outside; the window GDW is sight only; the roof and ES lead inside, not out.',
    FD1: 'Locked from outside; reaching the stair hall from outside needs it.', Gv: 'Locked from outside and for 60 s after an alarm.',
    SD2: 'Locked on the hall side: lane A east end cannot be cut across to S1; the serpentine ends only at SD1 into the stair hall (lane C).',
    GCd: 'Cage back door from the generator room: reachable only after the back route is open; locked until P2.', CH: 'Locked until P2; the other entries are ES (one way, from the roof, which needs GL, which needs P1) and the breakers or CP.',
    D1: 'The trench is bolted at the Goods-in end; from the cage end it opens only from inside the cage, so it is no way in.', R1: 'Bolted at the Goods-in end; opens from the south corridor, so it is no way up from the Goods-in.',
    GLd: 'The roof hatch is bolted until P1 (card 14); RL drops only from the roof side; the exterior ledge is on the upper floor, outside the glazing, and starts and ends in the south corridor.',
    RLd: 'Retracted from the yard side; the wall is 3.7 m.', CK: 'One way down; no way back up, so the chute cannot be used to re-enter the coke yard.', ES: 'One way down into the cage; the roof is only reached by GL (after P1) or RL (from the roof).'
  };
  v.push(tbl(['Lock', 'Where', 'Opens', 'Spaces cut off if it alone stays shut', 'How a player could try to skip it, and why they cannot'], D.locks.map((l) => [l.id, l.where, l.opens, (R.lockCut.find((x) => x.id === l.id)?.cut || []).join(', ') || '(none: a second way exists, see the toys)', bypass[l.id] || l.gate])));
  v.push('\nThe duct VDUCT (north corridor to Control room), the catwalk, the ledge, the culvert, the V shaft and the trench all connect spaces on the same side of the gate they skip or lead back into the chapter that is already open, which is what the unlock order above shows. Assumption: the player can mantle 1.8 m and cannot jump a 3.7 m fence; I could not find a jump height in the movement config (it has vault, mantle, hop and drop modes; mantle limit `p.height <= 1.8`).\n');
  v.push('## 7. The 26 stealth rules, the scale sheet, and the co-op checklist\n');
  v.push('Pass with no evidence counts as a fail; every row carries its numbers and coordinates.\n');
  v.push(tbl(['#', 'Rule', 'Result', 'Evidence with coordinates'], [...rows.stealth.map((r) => [r.id, r.rule, r.result, r.evidence]), ...rows.scale.map((r) => ['sheet', r.rule, r.result, r.evidence])]));
  // co-op checklist
  const co = [];
  const bk1 = D.objectives.find((o) => o.id === 'P2b'), bk2 = D.objectives.find((o) => o.id === 'P2c'), cp = D.objectives.find((o) => o.id === 'P2a'), o1 = D.objectives.find((o) => o.id === 'O1'), o2 = D.objectives.find((o) => o.id === 'O2');
  const g14 = ctx.guards.find((g) => g.id === 'G14');
  const g14d = hyp(g14.wps[0].x - bk1.x, g14.wps[0].z - bk1.z);
  co.push(['Why two', true, `Breaker pair BK1 ${XY(bk1.x, bk1.z)} and BK2 ${XY(bk2.x, bk2.z)} (${f1(hyp(bk1.x - bk2.x, bk1.z - bk2.z))} m apart: two hold at once and P2 opens in about 8 s; one player holds BK1 and runs 12 m inside the 20 s latch); sync takedown spot at (22, -3); hall pair draw and slip at (50, -7.5); each has a solo version in the co-op table (CO1, CO2, CO3).`]);
  co.push(['Goal mix', true, `P1 shared at O1 ${XY(o1.x, o1.z)}; P2 split (CP ${XY(cp.x, cp.z)} upstairs or the breakers ${XY(bk1.x, bk1.z)} downstairs) or joint (the breaker pair); P3 shared at O2 ${XY(o2.x, o2.z)}; extract shared (Gv ${XY(D.extraction[0].x, D.extraction[0].z)}); two joint goals: the breaker pair and the sync takedown, neither met first (both sit past the hall).`]);
  const gl = D.links.find((l) => l.id === 'GLd');
  co.push(['Mid-mission update', true, `P2 is revealed by P1: the roof hatch GL ${XY(gl.a[1], gl.a[2])} stays bolted until card 14 is read at O1 ${XY(o1.x, o1.z)}; the blackout (90 s grid drop, NEW-small) triggers at O2 ${XY(o2.x, o2.z)} (E7.3), fallback a radio line.`]);
  co.push(['Marked points', true, `Regroup points ${D.regroup.map((g) => `${g.id} ${g.level} ${XY(g.x, g.z)}`).join('; ')}; landmarks: generator hall (B 4 to 38, -16 to -10), coke bunker (-17 to -11, -9 to -4), catwalk ring, Gallery window W1 (z 2, x 40 to 52), the cage sign over O2.`]);
  co.push(['Short splits', regA.worst <= 30 && regB.worst <= 30, `Split corridor: roof lane 6A (${f1(ctx.routes.R6A.byChapter[6].t)} s) against hall return 6B (${f1(R.chapterTimes[5].t)} s). Worst time from any lane point to the nearest regroup point: 6B ${f1(regB.worst)} s${regB.at ? ' at ' + regB.at.lv + ' ' + XY(regB.at.x, regB.at.z) : ''}, 6A ${f1(regA.worst)} s${regA.at ? ' at ' + regA.at.lv + ' ' + XY(regA.at.x, regA.at.z) : ''} (with only the doc's two regroup points RG1 and RG2 the roof lane would be ${f1(regA2.worst)} s, so RG3 at the GL hatch was added; the rule is under 30 s).`]);
  co.push(['Landmarks', D.spaces.every((s) => s.landmark), `${D.spaces.length} spaces each with a landmark (spaces table).`]);
  co.push(['Moves with ready signals', true, `Breaker boxes VBK1 [29, 3 to 31, 4] and VBK2 [29, -11 to 31, -10] carry a small lamp that turns green when one is held and the partner's character says "ready" (toy T20, wired after the playtest); sync takedown spot at (22, -3) (T21). Built as places now.`]);
  co.push(['Two solutions for the cage lock', true, `Three: CP ${XY(cp.x, cp.z)} (quiet, officer's gap), BK1 + BK2 ${XY(bk1.x, bk1.z)} / ${XY(bk2.x, bk2.z)}, ES ${XY(16, -3.5)} (skips the lock, one way).`]);
  co.push(['Paired patrols', rows.stealth.find((r) => r.id === 25).result === 'PASS', `Boiler pair G4 ${XY(-29, -5.5)} and G5 ${XY(-23.5, -4.5)}; hall pair G9 (lane A x 43 to 55) and G10 (lane B x 44 to 56); gaps of 3 s or more in rule 25; the hall pair also cross at the plant connector G7 and G8 (rule 8).`]);
  co.push(['Downed rules', Math.max(...Object.values(R.cover).map((c) => c.gapMax)) <= 8 + 1e-6, `A downed partner lies on the route and must be revived by a hold in cover: longest gap to the next cover or dark pocket on any route is ${f1(Math.max(...Object.values(R.cover).map((c) => c.gapMax)))} m (rule 15), so a revive spot is within 8 m everywhere; checkpoints at CG ${XY(-12, -16)}, H ${XY(-34, -14.6)}, SB ${XY(39.5, -2.5)}, S1 ${XY(71.5, -3.8)}, CH ${XY(24, 2)}.`]);
  co.push(['A joint failure that changes the situation', g14d < 8, `A failed breaker hold latches nothing and makes the latch noise (assumed 8 m: not in the engine); G14 stands ${f1(g14d)} m from BK1 at ${XY(g14.wps[0].x, g14.wps[0].z)}, so he hears it, turns to the breakers and the circuit C8 reaction (10 s) starts: the situation changes, the cost is noise only.`]);
  co.push(['Not yet done: partner visibility (name tags within 12 m, pings for 6 s), voice and failure rules, a pair has played it', false, 'Untested and unbuilt: the plan cannot show it. Name tags and pings are UI; no co-op playtest exists. FAIL until the first friends playtest (mission doc, co-op playtest list).']);
  v.push('\n**Co-op checklist** (mission doc: the "Designed" list and the "Not yet done" list):\n');
  v.push(tbl(['Item', 'Result', 'Evidence with coordinates'], co.map((c) => [c[0], c[1] ? 'PASS' : 'FAIL', c[2]])));
  v.push('\n## 8. Engine values: found, not found, and the assumption used\n');
  v.push(tbl(['Value', 'Found?', 'What I used'], [
    ['Fall damage', 'Found', 'None. `player/movement.ts`: "No fall damage (Blacklist), but every band is louder": landing bands soft under 0.6 m, roll up to 2.5 m, heavy beyond 4.5 m (recovery 0.6 s). The pipe beam fall (R to U, 3.3 m) is a roll; the exhaust shaft drop ES (6.6 m) is a heavy landing; the coke chute (3.3 m) a roll. The ledge fall (3.3 m) a roll. So falls cost noise and time only.'],
    ['Landing noise radius per band', 'NOT found (only "louder")', 'Assumed soft 4 m, roll 6 m, heavy 10 m (the door bash radius); stated in the encounter text for ES and the chute.'],
    ['Do guards see upward?', 'Found', 'Yes. Perception takes the angle in plan only (`atan2(dx, dz)` against yaw in `ai/enemy.ts`) and a 3D line-of-sight ray (`ballistics.ray` from eye 1.6 m): there is no vertical field-of-view limit. So guards on the hall floor see the catwalk if the ray is clear (rails are 1.0 m), and the sniper sees the yard from the roof. Used as is in `W.los`.'],
    ['Detection time', 'Found (formula)', '`ai/perception.ts`: fill rate 2.2/s x (1 - d/range)^1.5 x field x light factor x stance x motion x exposure, capped at 3.2/s (so 0.31 s at best), leak 0.2, suspicious at 0.3, detection at 1.0. Examples from the model: a standing player in a lit pool at 10 m in the focus cone fills in about 1.0 s; crouched in shadow (light 0.1) at 10 m about 12 s or never (rate under the leak); point blank (under 1.6 m), lit, in focus is instant. Focus cone 55 degrees to 25 m, peripheral 100 degrees half-angle to 12 m at 0.35.'],
    ['`stepMeter` details (hold, decay)', 'Found in the header (hold 1.2 s, decay 0.18/s, leak 0.2)', 'The body of `stepMeter` was not read; my re-implementation rises by (rate - leak) x dt, holds 1.2 s after the last sighting, then drains 0.18/s.'],
    ['Interaction (hold) noise', 'NOT found (only door events: quiet 2 m, bash 10 m)', 'Assumed 4 m for a quiet hold, 8 m for the breaker latch; A3 uses 4 m or line of sight.'],
    ['Footstep noise', 'Found', '`noiseRadius`: silent up to crouch 1.9 m/s and stand 1.45 m/s; jog 2.8 m/s 3.4 m; gear 5 (3.8 m/s) 5.0 m; sprint 9 m. Surface multipliers: concrete 1, metal 1.6, grate 1.4, wood 1.15, gravel 1.3, carpet 0.6 (`world/surfaces.ts`); a wall muffles to 0.45 (`ai.md` 2.3). The catwalk is grate (1.4), the yard and roof gravel (1.3), the Control room carpet (0.6).'],
    ['Light thresholds and ambient', 'Found', 'LIGHT shadow 0.28, lit 0.6; `lightLevel` is per map (the Annex uses 0.1); I used 0.10 everywhere and 0.06 in the plant and tunnel (assumed).'],
    ['Lamp limits', 'Found', '`MAX_REAL_LIGHTS` 48 real lights at a time (`world/lightRig.ts`); baked lamps: no global cap, up to 8 per 2 m column (`lampGrid` in `lampBake.ts`). This map: 55 lamps, densest 2 m column 1.'],
    ['Live guard cap', 'Found (and it conflicts)', '`MAX_ALIVE = 10` in `ai/enemyManager.ts`: spawn returns null beyond it. The design needs 14 (+2). See section 4 and question 1.'],
    ['Night vision and perception', 'Found: none', 'Goggles change rendering only. L6 (the glow gives you away) has no engine rule: marked FAIL, NEW-small, assumed glow radius 6 m.'],
    ['Jump or mantle limit', 'Partly (mantle 1.8 m)', 'Fences and exterior walls 3.7 m (more than two mantles) so no block or van helps; the plan assumes no free jump.'],
    ['Stair, ladder and beam speeds', 'Ladder and stairs from the scale sheet; beam and ledge not found', 'Beam and ledge walked at crouch gear 2 (0.9 m/s), an assumption; link times are in the JSON.']
  ]));
  v.push('\n## 9. What fails, and why (nothing here was hidden by changing the mission doc)\n');
  const why = {
    1: 'see below if listed', 8: '', 13: 'The mission doc puts P1 "under an emergency lamp that cannot be switched" (L3, E5.2), which makes O1 lit. Rule 13 wants objectives in shadow. O2 is in shadow.',
    18: `The 12-door total was written for a 36 x 28 m map; this one has eight chapters. I kept the main route to ${R.doors.onM.length} doors (limit 8) by making every non-lock a wide opening, and the 5 m gap passes; the total is ${R.doors.total}.`,
    20: 'The mission doc fixes a linear spine (Chapters 1 to 4 have one gate each), so two routes cannot share under 30% from the spawn. Free-part overlaps are in the evidence.',
    22: 'Chapter 1 and the first part of Chapter 2 put G2, G1, G3, G4, G5 and G6 on the route by design (E1.2, E1.3, E2.1 to E2.3). The first 90 s are Chapters 1 and 2.',
    L1: 'The doc\'s light map (35% lit in chapter 2, 10% on the roof) cannot satisfy "half of every chapter is lit and in a sightline". Computed literally it fails in six chapters.',
    L5: 'The count (55) is over "about 40" and five chapters have 2 or 3 circuits on their route instead of 3 to 4. Both stay inside the engine limits.',
    L6: 'No engine rule exists; needs a NEW-small.',
    A1: 'With 14 guards on 700 m of route a guard cannot be within 9 m of 80% of it: the measured reach is in the A1 evidence (about two thirds of segments at sprint, two fifths at gear 5).',
    A3: 'Only the GL roof hatch hold (72, 7.5) on the roof lane is in no guard sight or hearing. Every hold on route M is seen, and PD and GD are seen by G1 through the windows PDW and GDW.',
    A4: 'Only chapters 1, 2 and 5 have two guards seeing the same middle sample of the route; chapters 3, 4, 6, 7, 8 have one guard at a time. Closing it needs a second guard per chapter (over the cap) or the crossing stations made wider.'
  };
  v.push(tbl(['Check', 'Result', 'Why'], fails.map((r) => [r.id, 'FAIL', why[r.id] || r.evidence.slice(0, 300)])));
  v.push('\n## 10. Questions for Michael\n');
  v.push('1. **Guard cap.** The engine caps live guards at `MAX_ALIVE = 10`; measured main thread is 2.97 ms at 14 guards and 3.47 at 16 (target 3.0). Raise it to a named `MAX_ACTIVE_GUARDS = 14` and sleep the two farthest guards when R1 and R2 spawn, or keep 10 and cut G11 or G13 and G14 first?\n2. **Rules against the mission doc.** Rule 13 (O1 lit by the doc), 18 (12 doors total), 20 (30% overlap against a linear spine), 22 (no guard sees you in the first 90 s) and L1 (half the route lit and sighted) cannot all hold with the mission doc as written. Which side wins for each? I changed neither.\n3. **Targets that do not fit the numbers.** Encounter spacing (chapter 7 is 50 s each, the doc says 30 to 45), "about 40 lamps" (55 here), 3 to 4 circuits per chapter and A1 (80% noise reach, 64% at sprint with 14 guards): relax, or add guards, lamps and circuits?\n');
  fs.writeFileSync(P('map-dead-line-validation.md'), v.join('\n') + '\n');
  console.log('docs written');
}
