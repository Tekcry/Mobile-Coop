// Animation contact sheet: runs a scenario on Proving Grounds and captures frames from a side camera
// that follows the player, then lays them out in a grid (for reviewing blends and timing).
//   node scripts/anim-sheet.mjs out.png <scenario> [frames=12] [interval=0.1] [view=side|front|back|ots]
// Scenarios: aim, walk, jog, sneak, crouchrun, sprint, start, stop, crouchstop, walkstop, turn, crouch, reload, swap, grenade,
// vault, dash, strafe, drop, tense (G1); back to a wall (step 11): wall, wallcrouch, wallslide, wallslideleft, walledge, walledgeleft, lowwall
// (edge peek / lean both edges arrive with step 12); aimed edge lean-outs (PC1): walledgeaim, walledgeleftaim and their
// pistol variants walledgeaimp, walledgeleftaimp. reload and swap run drawn (aim held: step 09 holsters by default);
// holsterswap is the holstered swap; turn is a movement turn (the body turns, the sheet camera stays put); (F4)
// walledgelook, walledgeleftlook: at an edge, the camera swung one way then the other
// (CT prototype G8) view `cam`: a camera matched to a footage clip, from env: SHEET_AZ (deg round her from the front, +
// to her right, 180 behind), SHEET_PITCH (deg down to the pivot), SHEET_DIST (m from the pivot), SHEET_PIVOT (m above her
// feet), SHEET_LAT (m, the pivot to the camera's right), SHEET_FOVV (deg vertical; CT 55.7), SHEET_W / SHEET_H (the
// viewport; CT's frame is 1.45 wide); the whole frame is kept. SHEET_PHASES="0,0.125,..." captures at those gait phases
// (the graph's clock) instead of every interval; SHEET_DUMP=<dir> also writes each frame and the joints projected to
// the screen (<scenario>-cam-frames.json) for the pose overlays (scripts/anim-keys/overlay.mjs).
import { launch, waitOperator } from './e2e-lib.mjs';

const [out = 'sheet.png', scenario = 'walk', framesArg = '12', intervalArg = '0.1', view = 'side'] = process.argv.slice(2);
const FRAMES = Number(framesArg);
const INTERVAL = Number(intervalArg);
const url = process.env.URL ?? `http://localhost:${process.env.E2E_PORT ?? 4173}/`;

/** (G7) The close-quarters scenarios' map, spot and guard. */
const G7 = {
  params: 'autostart=warehouse&mode=clear',
  pos: [2, -2.2],
  yaw: 0,
  at0: "g.target.health.invulnerable = true; g.mode.pending.length = 0; g.enemyMgr.clear(); const V = g.player.position.constructor; const e = g.enemyMgr.spawn('grunt', new V(2, 0, -1), false, 0); e.passive = true;",
};
const G7_PRESS = "a.input.state.tap('interact');";
const G7_PICK = (i) => `g.grabMenu.sel = ${i}; a.input.state.tap('interact');`;
/** (CT prototype G6) The Proving shed door: the body 0.8 m in front of it on its push side (or the pull side), facing it;
 *  the Open pick runs the door-open move directly (the menu's own input is G5's). */
const G6_DOOR = (pull) => `const d = g.world.doors.list[0]; const an = d.anchor; const nx = Math.cos(an.yaw); const nz = -Math.sin(an.yaw); const side = ${pull ? 1 : -1} * an.swing; const V = g.player.position.constructor; const yaw = Math.atan2(-nx * side, -nz * side); g.player.controller.teleport(new V(d.cx + nx * side * 0.8, an.hinge.y + 0.05, d.cz + nz * side * 0.8), yaw); g.player.cam.yaw = yaw; g.player.cam.pitch = 0;`;
const G6_OPEN = "g['startDoorOpen'](0, () => g.world.doors.open(g.world.doors.list[0], 'quiet'));";

/** Scenario: setup (once) and per-frame input (time t in s since the first frame). */
const SCENARIOS = {
  // (CT prototype G7) close quarters on the Warehouse (Proving has no guards): a calm grunt 1.2 m ahead facing away
  // (as e2e-takedown); the grab (step-in + pull-in), the hostage walk, the knockout from the hold, interrogate, the
  // body lift (grab -> Carry: the knockout, then the 2.0 s lift), the carry walk, the put down
  grab: { ...G7, pre: 0.4, input: () => ({}), at: { 0: G7_PRESS } },
  holdidle: { ...G7, pre: 1.8, preAt: { 0.4: G7_PRESS }, input: () => ({}) },
  holdwalk: { ...G7, pre: 1.8, preAt: { 0.4: G7_PRESS }, input: () => ({ y: 1 }) },
  holdko: { ...G7, pre: 1.8, preAt: { 0.4: G7_PRESS }, input: () => ({}), at: { 0: G7_PICK(0) } },
  interrogate: { ...G7, pre: 1.8, preAt: { 0.4: G7_PRESS }, input: () => ({}), at: { 0: G7_PICK(4) } },
  lift: { ...G7, pre: 2.75, preAt: { 0.4: G7_PRESS, 1.8: G7_PICK(2) }, input: () => ({}) },
  carrywalk: { ...G7, pre: 5.0, preAt: { 0.4: G7_PRESS, 1.8: G7_PICK(2) }, input: () => ({ y: 1 }) },
  carrydrop: { ...G7, pre: 5.0, preAt: { 0.4: G7_PRESS, 1.8: G7_PICK(2) }, input: () => ({}), at: { 0: "a.input.state.tap('interact');" } },
  // (CT prototype G6, AUDIT-WALLS row 4) the normal door open: the step to the latch side, the hand on the leaf, the swing
  dooropen: { pre: 0.6, at0: G6_DOOR(false), input: () => ({}), at: { 0: G6_OPEN } },
  dooropenpull: { pre: 0.6, at0: G6_DOOR(true), input: () => ({}), at: { 0: G6_OPEN } },
  // (G6, rows 1 / 18) crouched on the wall and sliding: the side-on crouch-walk with the hand on the knee, and the reversal
  wallcrouchslide: { wall: { low: false, k: 2.5 }, pre: 1.8, preAt: { 0.1: "a.input.state.tap('cover');", 0.8: "a.input.state.tap('crouch');" }, input: (t) => ({ x: t < 0.7 ? 1 : t < 1.4 ? -1 : 0 }) },
  // (anim-fix-pass AF0, P4) the same slide drawn (X tap draws, low ready): right, then the reversal left, then still; rifle / pistol
  wallcrouchslidedrawn: { wall: { low: false, k: 2.5 }, pre: 2.2, preAt: { 0.1: "a.input.state.tap('cover');", 0.8: "a.input.state.tap('crouch');", 1.4: "a.input.state.tap('draw');" }, input: (t) => ({ x: t < 0.7 ? 1 : t < 1.4 ? -1 : 0 }) },
  wallcrouchslidedrawnp: { weapon: 'pistol', wall: { low: false, k: 2.5 }, pre: 2.2, preAt: { 0.1: "a.input.state.tap('cover');", 0.8: "a.input.state.tap('crouch');", 1.4: "a.input.state.tap('draw');" }, input: (t) => ({ x: t < 0.7 ? 1 : t < 1.4 ? -1 : 0 }) },
  // (G6, row 12) aiming at a wall 0.45 m in front: the rifle up muzzle-high
  aimwall: { wall: { low: false, k: 2.5, out: 0.45 }, pre: 0.6, input: () => ({ ads: true }) },
  walk: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 0.5 }, input: () => ({ y: 0.5 }) },
  jog: { pos: [-8, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }) },
  sneak: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 0.4 }, input: () => ({ y: 0.4 }), at0: "a.input.state.tap('crouch');" },
  crouchrun: { pos: [-8, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('crouch');" },
  sprint: { pos: [-14, -14], yaw: Math.PI / 2, pre: 1.2, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('dash');" },
  // (CT prototype G8) the top gear's run (4.5 m/s; CT has no sprint button: `sprint` above is the full-stick jog) and the
  // top crouched gear (2.6 m/s)
  run: { params: 'autostart=proving&gear=5', pos: [-16, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }) },
  crouchrun5: { params: 'autostart=proving&gear=5', pos: [-12, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('crouch');" },
  // (G8) gear 3 at full stick (2.1 m/s): CT's walk in 105949 / 105509 (~3 steps a second, ~0.65 m steps)
  walk3: { params: 'autostart=proving&gear=3', pos: [-6, -14], yaw: Math.PI / 2, pre: 2.0, warm: { y: 1 }, input: () => ({ y: 1 }) },
  start: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }) },
  stop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 0 }) },
  // 3.2.0: the Chaos Theory stop holds the stride (crouched, and from a slow walk)
  crouchstop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 0 }), at0: "a.input.state.tap('crouch');" },
  walkstop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.3, warm: { y: 0.5 }, input: () => ({ y: 0 }) },
  strafe: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { x: 1 }, input: () => ({ x: 1 }) },
  back: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { y: -1 }, input: () => ({ y: -1 }) },
  // (PC1) a movement turn: the stick asks for a heading 90 deg right of the body (a slow walk that way); the sheet
  // camera stays where it started (fixCam) so the body is seen turning
  turn: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, fixCam: true, input: (t) => ({ x: t < 0.9 ? 0.45 : 0 }) },
  // (anim-rework S2) the standing holstered idle (its 12 s cycle: frames 1.5 s apart), a turn round from a standstill
  // (the stick pulled back a little) and a 90 deg direction change at a walk (the camera stays put)
  idle: { pos: [0, -14], yaw: Math.PI / 2, pre: 1, input: () => ({}) },
  turnround: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, fixCam: true, input: () => ({ y: -0.4 }) },
  change90: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 0.8 }, fixCam: true, input: () => ({ x: 0.8 }) },
  crouch: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('crouch');" } },
  dash: { pos: [0, -18], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }), at: { 0.1: "a.input.state.tap('dash');" } },
  // (PC1) drawn first: aim held from the warm-up (step 09 holsters by default), then the reload (mag set to 1: a full
  // mag ignores the press) / swap
  reload: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 1; a.input.state.tap('reload');" } },
  // (anim-cleanup) the draw on an aim press from holstered (rifle on the back / pistol in the holster), the holster on release
  draw: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.8, input: (t) => ({ ads: t >= 0 }) },
  drawpistol: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.8, weapon: 'pistol', input: (t) => ({ ads: t >= 0 }) },
  holster: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, warm: { ads: true }, input: () => ({}) },
  holsterpistol: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, weapon: 'pistol', warm: { ads: true }, input: () => ({}) },
  reloadempty: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 0; a.input.state.tap('reload');" } },
  reloadpistol: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, weapon: 'pistol', warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 1; a.input.state.tap('reload');" } },
  reloadpistolempty: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, weapon: 'pistol', warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 0; a.input.state.tap('reload');" } },
  // (anim-cleanup) the left shoulder (the shoulder swap) in motion: a swap, a reload and a holster from a left aim
  swapleft: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, at0: "g.player.cam.shoulder = -1;", warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "a.input.state.tap('swapNext');" } },
  reloadleft: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, at0: "g.player.cam.shoulder = -1;", warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 1; a.input.state.tap('reload');" } },
  holsterleft: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, at0: "g.player.cam.shoulder = -1;", warm: { ads: true }, input: () => ({}) },
  swap: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "a.input.state.tap('swapNext');" } },
  holsterswap: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('swapNext');" } },
  grenade: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('grenade');" } },
  // (locomotion step 11) back to a wall: `wall` places the player 0.85 m out from a free wall on Proving (high, or a
  // low one), facing it, `k` m along it (negative: from the far end); the context press enters during the warm-up
  wall: { wall: { low: false, k: 2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: () => ({}) },
  wallcrouch: { wall: { low: false, k: 2.5 }, pre: 1.8, preAt: { 0.1: "a.input.state.tap('cover');", 0.8: "a.input.state.tap('crouch');" }, input: () => ({}) },
  wallslide: { wall: { low: false, k: 2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t < 1.2 ? 1 : 0 }) },
  wallslideleft: { wall: { low: false, k: -2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t < 1.2 ? -1 : 0 }) },
  // (G6) the slide is 0.35 m/s now: the warm-up slides 2.4 s toward the edge (it stopped short of it at 1.2 s)
  walledge: { wall: { low: false, k: -1.2 }, pre: 3.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 ? 1 : 0 }), input: () => ({ x: 1 }) },
  walledgeleft: { wall: { low: false, k: 1.2 }, pre: 3.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 ? -1 : 0 }), input: () => ({ x: -1 }) },
  // (PC1) at the edge (slid there in the warm-up, stick released), then aim: the lean-out with its edge grip
  walledgeaim: { wall: { low: false, k: -1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? 1 : 0 }), input: () => ({ ads: true }) },
  walledgeleftaim: { wall: { low: false, k: 1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? -1 : 0 }), input: () => ({ ads: true }) },
  walledgeaimp: { weapon: 'pistol', wall: { low: false, k: -1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? 1 : 0 }), input: () => ({ ads: true }) },
  walledgeleftaimp: { weapon: 'pistol', wall: { low: false, k: 1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? -1 : 0 }), input: () => ({ ads: true }) },
  // (F4) at each edge (slid there in the warm-up, stick released), the camera swung one way then the other: the body
  // leans only to the open side, the camera slides past the edge as the look turns toward it
  walledgelook: { wall: { low: false, k: -1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? 1 : 0 }), input: () => ({}), at: { 0: 'g.player.cam.addLook(0.9, 0);', 0.6: 'g.player.cam.addLook(-1.8, 0);' } },
  walledgeleftlook: { wall: { low: false, k: 1.2 }, pre: 4.0, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 3.6 ? -1 : 0 }), input: () => ({}), at: { 0: 'g.player.cam.addLook(0.9, 0);', 0.6: 'g.player.cam.addLook(-1.8, 0);' } },
  lowwall: { wall: { low: true, k: 0.8 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t > 0.6 && t < 1.2 ? 1 : 0 }) },
  aim: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ ads: true }) },
  // (CT prototype G2, AUDIT-AIM row 18) the aim walk forward and the aimed strafe: head and gun hold still in CT (050541)
  aimwalk: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, warm: { ads: true, y: 0.6 }, input: () => ({ ads: true, y: 0.6 }) },
  aimstrafe: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, warm: { ads: true, x: 0.8 }, input: () => ({ ads: true, x: 0.8 }) },
  // (BC) the aim crouched, and the pistol both ways
  // (anim-rework S3) drawn: the low ready walk (X tap draws), the aimed glide backwards, the pistol's aimed strafe, low
  // ready to aim (LT pressed 0.2 s in); `draw` above is the sling draw (LT from holstered, M2)
  lowreadywalk: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.0, at0: "a.input.state.tap('draw');", warm: { y: 0.5 }, input: () => ({ y: 0.5 }) },
  aimback: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, warm: { ads: true, y: -0.8 }, input: () => ({ ads: true, y: -0.8 }) },
  aimstrafep: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.6, weapon: 'pistol', warm: { ads: true, x: 0.8 }, input: () => ({ ads: true, x: 0.8 }) },
  readytoaim: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, at0: "a.input.state.tap('draw');", input: (t) => ({ ads: t >= 0.2 }) },
  aimcrouch: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, at0: "a.input.state.tap('crouch');", input: () => ({ ads: true }) },
  // (anim-rework S4) crouched holstered: the idle (the keyed squat with the hands on the knees: frames 1 s apart over its
  // 12 s cycle), the crouch walk at gear 3, crouch -> stand from a sneak (the feet re-step under the hips), crouch -> stand
  // still; drawn: the crouched aimed strafe (rifle)
  crouchidle: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, at0: "a.input.state.tap('crouch');", input: () => ({}) },
  crouchwalk: { params: 'autostart=proving&gear=3', pos: [-8, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('crouch');" },
  stand: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, at0: "a.input.state.tap('crouch');", input: () => ({}), at: { 0: "a.input.state.tap('crouch');" } },
  sneakstand: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 0.4 }, at0: "a.input.state.tap('crouch');", input: (t) => ({ y: t < 0.3 ? 0.4 : 0 }), at: { 0.6: "a.input.state.tap('crouch');" } },
  aimcrouchstrafe: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, at0: "a.input.state.tap('crouch');", warm: { ads: true }, input: () => ({ ads: true, x: 1 }) },
  // (anim-fix-pass P4) the crouched aimed strafe with the pistol
  aimcrouchstrafep: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, weapon: 'pistol', at0: "a.input.state.tap('crouch');", warm: { ads: true }, input: () => ({ ads: true, x: 1 }) },
  aimpistol: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.8, weapon: 'pistol', input: () => ({ ads: true }) },
  aimcrouchpistol: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.2, weapon: 'pistol', at0: "a.input.state.tap('crouch');", input: () => ({ ads: true }) },
  vault: { pos: [-3.8, -6], yaw: -Math.PI / 2, pre: 0.8, input: () => ({}), at: { 0: "a.input.state.tap('jump');" } },
  // (CT prototype G1) a drop of ~1.4 m onto open floor (the deep landing, arms out); the tense sneak (as if an unaware
  // guard were close: the controller's test hook) moving and then still
  drop: { pos: [0, -14], y: 1.4, yaw: Math.PI / 2, pre: 0.02, input: () => ({}) },
  tense: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 0.45 }, input: (t) => ({ y: t < 0.9 ? 0.45 : 0 }), at0: "g.player.controller.tenseForce = true; a.input.state.tap('crouch');" },
};

const sc = SCENARIOS[scenario];
if (!sc) throw new Error(`unknown scenario ${scenario}`);
const CAM = view === 'cam';
const E = process.env;
const camVp = { width: Number(E.SHEET_W ?? 1160), height: Number(E.SHEET_H ?? 800) };
const { browser, page, errors } = await launch({ url, params: sc.params ?? 'autostart=proving', ...(CAM ? { viewport: camVp } : {}) });
// (operators 11e) Wren's LOD0 on screen before anything is measured or drawn
await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
// (11e fix r1) never draw a sheet with no Wren on it: a timeout fails the run
if ((await waitOperator(page)) < 0) {
  console.error('anim-sheet: Wren not loaded (her LOD0 never reached the screen within 120 s); no sheet drawn');
  await browser.close();
  process.exit(1);
}
// (PC1) the toasts too ("Ready to play offline", graphics tier)
await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
await page.evaluate(({ pos, yaw, wall, fixCam, weapon, y0 }) => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  a.loop.manual = true;
  const V = p.controller.pos.constructor;
  let y = y0 ?? 0;
  if (wall) {
    // a wall segment with open floor in front of it (as e2e-netmove's findWall), low or high as asked
    const clear = (x0, z0, x1, z1, h) => !g.ballistics.ray(new V(x0, h, z0), new V(x1, h, z1), 1).hit;
    const floor = (x, z, h) => g.ballistics.ray(new V(x, h + 1, z), new V(x, h - 0.5, z), 1).hit;
    const segs = g.world.level.coverSegments;
    let found = null;
    for (const s of segs) {
      if (s.low !== wall.low || Math.abs(s.y) > 0.3 || s.len < (wall.low ? 2 : 4) || s.len > 14) continue;
      let ok = true;
      for (let k = 0.5; k < s.len && ok; k += 0.5) {
        const x = s.ax + s.tx * k + s.nx * 0.45;
        const z = s.az + s.tz * k + s.nz * 0.45;
        ok = clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3) && (wall.low || clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 1)) && floor(x + s.nx * 0.6, z + s.nz * 0.6, s.y);
      }
      if (ok) { found = s; break; }
    }
    if (!found) throw new Error(`no free ${wall.low ? 'low' : 'high'} wall on Proving`);
    const k = wall.k < 0 ? found.len + wall.k : wall.k;
    const out = wall.out ?? 0.75;
    pos = [found.ax + found.tx * k + found.nx * out, found.az + found.tz * k + found.nz * out];
    yaw = Math.atan2(-found.nx, -found.nz);
    y = found.y + 0.05;
  }
  // (PC1) a weapon other than the first: selected holstered (as a holstered swap), drawn by the scenario's aim
  if (weapon) {
    const W = g.weapons;
    const j = W.slots.findIndex((q) => q.def.class === weapon);
    if (j < 0) throw new Error('no ' + weapon + ' in the loadout');
    W.index = j;
    p.controller.speedMul = W.current.def.moveSpeedMult;
    p.cam.adsZoom = W.current.stats.adsZoom;
  }
  p.controller.teleport(new V(pos[0], y, pos[1]), yaw);
  p.cam.yaw = yaw;
  p.cam.pitch = 0;
  window.__camHold = true;
  const origUpdate = p.cam.update.bind(p.cam);
  // camera: follow the player from the chosen view after the normal update
  p.cam.update = (dt, feet, crouch) => {
    origUpdate(dt, feet, crouch);
    const v = window.__view ?? 'side';
    if (v === 'ots') return;
    if (v === 'cam') {
      // (G8) matched to a footage camera: orbit angle, pitch, distance and FOV round a pivot over her feet
      const M = globalThis.__sheetCam;
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const fy = p.controller.renderYaw + (M.az * Math.PI) / 180;
      const pc = (M.pitch * Math.PI) / 180;
      const dx = Math.sin(fy);
      const dz = Math.cos(fy);
      // the camera's right (looking back at her along -d)
      const px = r.x - dz * M.lat;
      const pz = r.z + dx * M.lat;
      const py = r.y + M.pivot;
      c.fov = (M.fovV * Math.PI) / 180;
      c.position.set(px + dx * Math.cos(pc) * M.dist, py + Math.sin(pc) * M.dist, pz + dz * Math.cos(pc) * M.dist);
      c.setTarget(new r.constructor(px, py, pz));
      return;
    }
    const c = p.cam.camera;
    const r = p.rig.root.position;
    const fy = fixCam ? yaw : p.controller.renderYaw;
    const fx = Math.sin(fy);
    const fz = Math.cos(fy);
    // (anim-cleanup) close views for hands and weapons: `left` (her left side), `front34` / `front34l` (front-right /
    // front-left three-quarter), the distance and heights from SHEET_DIST / SHEET_CAM_Y / SHEET_TARGET_Y
    const D = Number(globalThis.__sheetDist ?? 3);
    const off = v === 'front' ? [fx * D, fz * D] : v === 'back' ? [-fx * D, -fz * D] : v === 'left' ? [-fz * D, fx * D]
      : v === 'front34' ? [(fx + fz) * D * 0.7071, (fz - fx) * D * 0.7071] : v === 'front34l' ? [(fx - fz) * D * 0.7071, (fz + fx) * D * 0.7071]
      : [fz * D * 1.033, -fx * D * 1.033];
    c.position.set(r.x + off[0], r.y + Number(globalThis.__sheetCamY ?? 1.05), r.z + off[1]);
    c.setTarget(new r.constructor(r.x + fx * 0.15, r.y + Number(globalThis.__sheetTargetY ?? 0.85), r.z + fz * 0.15));
  };
  a.loop.stepHeadless(y0 > 0 ? 0.01 : 0.3);
}, { pos: sc.pos ?? [0, 0], yaw: sc.yaw ?? 0, wall: sc.wall ?? null, fixCam: !!sc.fixCam, weapon: sc.weapon ?? null, y0: sc.y ?? 0 });
await page.evaluate((v) => (window.__view = v), view);
await page.evaluate((m) => (globalThis.__sheetCam = m), { az: Number(E.SHEET_AZ ?? 0), pitch: Number(E.SHEET_PITCH ?? 12), dist: Number(E.SHEET_DIST ?? 3.3), pivot: Number(E.SHEET_PIVOT ?? 1.68), lat: Number(E.SHEET_LAT ?? 0), fovV: Number(E.SHEET_FOVV ?? 55.7) });
// (G8) SHEET_NOKEY=1: the procedural walk alone (the keyed walk held off through its own gate: a 1e-6 close-quarters bend)
if (E.SHEET_NOKEY) await page.evaluate(() => { const r = window.__app.current.player.rig; const an = r.animate.bind(r); r.animate = (dt, s) => an(dt, { ...s, bend: (s.bend ?? 0) + 1e-6 }); });
const PHASES = E.SHEET_PHASES ? E.SHEET_PHASES.split(',').map(Number) : null;
const DUMP = E.SHEET_DUMP ?? null;
const dumped = [];
const fsm = await import('node:fs');
if (DUMP) fsm.mkdirSync(DUMP, { recursive: true });
/** (G8) The rig's joints projected to the screen (px), plus the gait phase and the keyed walk's weight. */
const project = () => page.evaluate(() => {
  const g = window.__app.current;
  const r = g.player.rig;
  const c = g.player.cam.camera;
  const eng = c.getScene().getEngine();
  const W = eng.getRenderWidth();
  const H = eng.getRenderHeight();
  const vm = c.getViewMatrix().m;
  const pm = c.getProjectionMatrix().m;
  const mul = (x, y, z, m) => [x * m[0] + y * m[4] + z * m[8] + m[12], x * m[1] + y * m[5] + z * m[9] + m[13], x * m[2] + y * m[6] + z * m[10] + m[14], x * m[3] + y * m[7] + z * m[11] + m[15]];
  const fresh = (n) => { const ch = []; for (let q = n; q; q = q.parent) ch.unshift(q); for (const q of ch) q.computeWorldMatrix(true); };
  const proj = (x, y, z) => { const v = mul(x, y, z, vm); const q = mul(v[0], v[1], v[2], pm); return [((q[0] / q[3] + 1) / 2) * W, ((1 - q[1] / q[3]) / 2) * H]; };
  const at = (n, lx = 0, ly = 0, lz = 0) => { fresh(n); const m = n.getWorldMatrix().m; return proj(lx * m[0] + ly * m[4] + lz * m[8] + m[12], lx * m[1] + ly * m[5] + lz * m[9] + m[13], lx * m[2] + ly * m[6] + lz * m[10] + m[14]); };
  const P = r.p;
  const j = {
    headTop: at(r.headNode, 0, P.head.h * 0.58, 0), head: at(r.headNode), neck: at(r.neck), chest: at(r.torso), spine: at(r.spine), pelvis: at(r.hips),
    shL: at(r.shoulderL), shR: at(r.shoulderR), elL: at(r.elbowL), elR: at(r.elbowR), wrL: at(r.wristL), wrR: at(r.wristR),
    hipL: at(r.hipL), hipR: at(r.hipR), knL: at(r.kneeL), knR: at(r.kneeR), anL: at(r.ankleL), anR: at(r.ankleR),
    toeL: at(r.ankleL, 0, -P.y.ankle, P.foot.len * 0.43), toeR: at(r.ankleR, 0, -P.y.ankle, P.foot.len * 0.43),
    heelL: at(r.ankleL, 0, -P.y.ankle, -P.foot.len * 0.25), heelR: at(r.ankleR, 0, -P.y.ankle, -P.foot.len * 0.25),
  };
  return { W, H, phase: r.lastTargets ? r.lastTargets.gait.phase : -1, keyW: r.keyedWalk ?? 0, j };
});

await page.evaluate((o) => Object.assign(window, o), { __sheetDist: process.env.SHEET_DIST, __sheetCamY: process.env.SHEET_CAM_Y, __sheetTargetY: process.env.SHEET_TARGET_Y });

const setInput = async (inp, code) =>
  page.evaluate(([inp, code]) => {
    const a = window.__app;
    const g = a.current;
    const s = a.input.state;
    s.move.x = inp.x ?? 0;
    s.move.y = inp.y ?? 0;
    if (inp.ads) s.set('sheet-ads', 'ads', true);
    else s.set('sheet-ads', 'ads', false);
    if (code) new Function('a', 'g', code)(a, g);
  }, [inp, code ?? null]);
const step = (sec) => page.evaluate((sec) => window.__app.loop.stepHeadless(sec, 120), sec);

// warm up into the scenario
const pre = sc.pre;
const warm = (t) => (typeof sc.warm === 'function' ? sc.warm(t) : sc.warm ?? {});
if (sc.at0) await setInput(warm(0), sc.at0);
const preAt = sc.preAt ?? {};
for (let t = 0; t < pre; t += 1 / 60) {
  await setInput(warm(t), Object.entries(preAt).find(([k]) => Math.abs(Number(k) - t) < 1 / 120)?.[1] ?? null);
  await step(1 / 60);
}
const shots = [];
const at = sc.at ?? {};
let t = 0;
const NF = PHASES ? PHASES.length : FRAMES;
for (let f = 0; f < NF; f++) {
  // run the interval in small steps, firing timed events
  const end = t + (f === 0 || PHASES ? 0 : INTERVAL);
  // (G8) or step at 120 Hz until the gait phase crosses the next one asked for
  if (PHASES) {
    const want = PHASES[f];
    const d = (x) => (((x - want) % 1) + 1) % 1;
    let prev = (await project()).phase;
    for (let n = 0; n < 600; n++) {
      await setInput(sc.input(t), null);
      await page.evaluate(() => window.__app.loop.stepHeadless(1 / 120, 120));
      t += 1 / 120;
      const ph = (await project()).phase;
      if (n > 2 && d(ph) < 0.5 && d(prev) >= 0.5) break;
      prev = ph;
    }
  }
  while (t < end - 1e-6) {
    const code = Object.entries(at).find(([k]) => Math.abs(Number(k) - t) < 1 / 120)?.[1];
    await setInput(sc.input(t), code);
    await step(1 / 60);
    t += 1 / 60;
  }
  if (f === 0 && at[0]) await setInput(sc.input(0), at[0]);
  const info = await page.evaluate(() => {
    const g = window.__app.current;
    const c = g.player.controller;
    const r = g.player.rig;
    return `${c.motion.state} ${c.speed.toFixed(2)} ${r.planner.L.contact ? 'L' : '-'}${r.planner.R.contact ? 'R' : '-'}${c.crouched ? ' C' : ''}${c.kneeling ? ' K' : ''}`;
  });
  await new Promise((r) => setTimeout(r, 30));
  const vp = page.viewportSize();
  // (PC1) ots: the whole frame (the centre crop showed only the forearm under ADS); the other views: a body portrait
  const w = view === 'ots' || CAM ? vp.width : Math.round(vp.height * 0.75);
  const buf = await page.screenshot({ clip: { x: Math.round(vp.width / 2 - w / 2), y: 0, width: w, height: vp.height } });
  if (DUMP) {
    const name = `${scenario}-${view}-${String(f).padStart(2, '0')}.png`;
    fsm.writeFileSync(`${DUMP}/${name}`, buf);
    dumped.push({ file: name, t, ...(await project()) });
    fsm.writeFileSync(`${DUMP}/${scenario}-${view}-frames.json`, JSON.stringify(dumped, null, 1));
  }
  shots.push({ src: `data:image/png;base64,${buf.toString('base64')}`, label: `${t.toFixed(2)}s ${info}` });
}
const cols = Math.min(6, NF);
const [cw, ch] = view === 'ots' ? [400, 225] : CAM ? [Math.round((300 * camVp.width) / camVp.height), 300] : [240, 300];
const sheet = await browser.newPage({ viewport: { width: cols * cw, height: Math.ceil(NF / cols) * ch } });
await sheet.setContent(
  `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${cw}px);font:11px monospace;color:#ddd">` +
    shots.map((s) => `<div style="position:relative"><img src="${s.src}" style="width:${cw}px;height:${ch}px;object-fit:cover"><span style="position:absolute;left:4px;top:4px;background:#000a;padding:1px 3px">${s.label}</span></div>`).join('') +
    '</body>',
);
await sheet.screenshot({ path: out });
console.log(`${scenario}: ${NF} frames -> ${out}`);
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) console.log(real.join('\n'));
await browser.close();
