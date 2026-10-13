/**
 * ON8: the mission lists the Guard and marker tools pick from, as data (one list each, a `src` per entry). Guard kinds
 * are the game's enemy kinds with their patrol walk speeds (facts `guard.walk`, F20); the roster, the employers and the
 * jobs are the guards of docs/kestrel/01-mission-brief.md section 3; objective kinds come from the brief's objective
 * chain (section 4, 5) and F28; hide kinds from schema.md section 3. Babylon-free.
 */
import facts from '../../scripts/kestrel/facts.json';

const WALK = facts.guard.walk.value as Record<string, number>;

export interface GuardKind {
  id: string;
  name: string;
  /** Patrol walk speed, m/s (a looped patrol walks at walkSpeed). */
  walk: number;
  src: string;
}

/** The game's enemy kinds (src/config/enemies.json, F20). Names as the game's enemy defs give them. */
export const GUARD_KINDS: readonly GuardKind[] = [
  { id: 'grunt', name: 'Guard', walk: WALK.grunt!, src: 'F20; src/config/enemies.json grunt' },
  { id: 'officer', name: 'Officer', walk: WALK.officer!, src: 'F20; src/config/enemies.json officer' },
  { id: 'enforcer', name: 'Enforcer', walk: WALK.enforcer!, src: 'F20; src/config/enemies.json enforcer' },
  { id: 'heavy', name: 'Heavy', walk: WALK.heavy!, src: 'F20; src/config/enemies.json heavy' },
  { id: 'runner', name: 'Runner', walk: WALK.runner!, src: 'F20; src/config/enemies.json runner' },
  { id: 'sniper', name: 'Sniper', walk: WALK.sniper!, src: 'F20; src/config/enemies.json sniper' },
  { id: 'droneOp', name: 'Drone operator', walk: WALK.droneOp!, src: 'F20; src/config/enemies.json droneOp' },
  { id: 'dog', name: 'Dog', walk: WALK.dog!, src: 'F20; src/config/enemies.json dog' },
];

export const guardKind = (id: string): GuardKind => GUARD_KINDS.find((k) => k.id === id) ?? GUARD_KINDS[0]!;

export interface Role {
  id: string;
  name: string;
  /** How many the brief puts on site. */
  n: number;
  /** The brief's space (S1-S7, X); the play file's `space` stays empty until P06. */
  space: string;
  employer: string;
  job: string;
  /** The editor's default kind for the role (P07 sets the real ones). */
  kind: string;
  src: string;
}

const BRIEF = '01-mission-brief.md section 3';
const FIRM = 'Guarding firm';
const VAN = 'Guarding firm, extra post paid by Ansell & Crowe';

/** The guards of the mission brief's roster (section 3), in its order; civilians are not guards. */
export const ROSTER: readonly Role[] = [
  { id: 'gatehouse', name: 'Gatehouse officer', n: 1, space: 'S1', employer: FIRM, job: 'Signs vehicles in and out, watches the lane gate and the yard monitor', kind: 'grunt', src: BRIEF },
  { id: 'perimeter', name: 'Perimeter patrol (dog handler 1)', n: 1, space: 'S1', employer: FIRM, job: 'Fixed loop of fence line and front yard with the dog; checks the sensor lamps', kind: 'grunt', src: BRIEF },
  { id: 'handler', name: 'Dog handler', n: 1, space: 'S1', employer: 'Dog-security firm contracted by the guarding firm', job: 'Patrols the rear yard and the east service drive with the dog', kind: 'grunt', src: BRIEF },
  { id: 'van', name: 'Van driver', n: 1, space: 'S1', employer: VAN, job: 'Carries crates from goods-in to the van', kind: 'grunt', src: BRIEF },
  { id: 'reception', name: 'Reception officer', n: 1, space: 'S2', employer: FIRM, job: 'Signs the visitor and delivery book, watches the lobby monitor', kind: 'grunt', src: BRIEF },
  { id: 'rounds', name: 'Rounds officer', n: 1, space: 'S2', employer: FIRM, job: "Tries doors and checks windows on a fixed round of A's ground floor, post room and locker room", kind: 'grunt', src: BRIEF },
  { id: 'manager', name: 'Duty manager', n: 1, space: 'S2', employer: FIRM, job: 'Shift manager: signs the log, holds the master card, walks to reception and back each cycle; iris-enrolled', kind: 'officer', src: BRIEF },
  { id: 'desk', name: 'Desk operator', n: 1, space: 'S3', employer: FIRM, job: 'Watches the monitor wall, takes radio calls', kind: 'grunt', src: BRIEF },
  { id: 'supervisor', name: 'Supervisor', n: 1, space: 'S3', employer: FIRM, job: "Leaves on a rounds loop through A's first floor and the bridge post, then returns", kind: 'officer', src: BRIEF },
  { id: 'corridor', name: 'Corridor patrol', n: 1, space: 'S4', employer: FIRM, job: "Walks A's first-floor corridors, records and plant gallery", kind: 'grunt', src: BRIEF },
  { id: 'escort', name: 'Escort officer', n: 1, space: 'S4', employer: FIRM, job: 'Shadows the engineer on plant checks (lone-worker rule); otherwise stands at the ops door', kind: 'grunt', src: BRIEF },
  { id: 'opsdesk', name: 'Operations desk officer', n: 1, space: 'S4', employer: FIRM, job: 'Sits at the ops sign-in counter: logs customer call-outs and media movements, answers the lounge intercom', kind: 'grunt', src: BRIEF },
  { id: 'bridge', name: 'Bridge post officer', n: 1, space: 'S5', employer: FIRM, job: "Checks cards and the tour sheet at the post on B's side of the link bridge", kind: 'grunt', src: BRIEF },
  { id: 'mantrap', name: 'Mantrap post', n: 1, space: 'S5', employer: FIRM, job: 'Checks cards and logs entries at the mantrap', kind: 'grunt', src: BRIEF },
  { id: 'gallery', name: 'Gallery patrol', n: 1, space: 'S5', employer: FIRM, job: 'Walks the secure corridor and the gallery, looking down into the hall', kind: 'grunt', src: BRIEF },
  { id: 'pair', name: 'Talking pair', n: 2, space: 'S6', employer: FIRM, job: 'Walk the hall aisles together, stopping to talk', kind: 'grunt', src: BRIEF },
  { id: 'contractor', name: "Pell's private contractor", n: 1, space: 'S7', employer: 'Ansell & Crowe Ltd (post paid for the handover)', job: "Watches his client's patch panel, logs who enters", kind: 'enforcer', src: BRIEF },
  { id: 'roaming', name: 'Roaming officer', n: 1, space: 'S7', employer: FIRM, job: 'Loops the meet-me room, the riser room and the corridor outside', kind: 'grunt', src: BRIEF },
  { id: 'bground', name: 'B ground rounds officer', n: 1, space: 'X', employer: FIRM, job: "Tries doors on B's ground floor: locker area, customer staging, plant corridor, generator hall wing", kind: 'grunt', src: BRIEF },
  { id: 'vanback', name: 'Returning van driver', n: 1, space: 'X', employer: VAN, job: 'Second officer of the van crew; off site on the lane run, walks back to sign the van sheet', kind: 'grunt', src: BRIEF },
];

/** The employers and jobs the roster names, in its order (the card's Employer and Job rows). */
export const EMPLOYERS: readonly string[] = [...new Set(ROSTER.map((r) => r.employer))];
export const JOBS: readonly string[] = ROSTER.map((r) => r.job);

export interface ObjectiveKind {
  id: string;
  name: string;
  src: string;
}

/** Objective kinds: the brief's chain (zone triggers, take, panel, code) and the game's F28 types. */
export const OBJECTIVE_KINDS: readonly ObjectiveKind[] = [
  { id: 'zone', name: 'Zone (reach a place)', src: '01-mission-brief.md section 4: objectives 1 and 5 are zone triggers (ASK-2)' },
  { id: 'take', name: 'Take an item', src: '01-mission-brief.md section 4: TA1 master card, TB3 contractor card' },
  { id: 'panel', name: 'Use a panel', src: '01-mission-brief.md section 4: TA2 intrusion panel (S0)' },
  { id: 'intel', name: 'Intel', src: 'F28 intel; 01-mission-brief.md TA3 register, optional rack labels' },
  { id: 'code', name: 'Enter a code', src: '01-mission-brief.md section 4: TA4 key safe PIN' },
  { id: 'plant', name: 'Plant a device', src: 'F28 plant; 01-mission-brief.md objective 6 tap' },
  { id: 'download', name: 'Download', src: "F28 download; 01-mission-brief.md section 5 Pell's cage access log" },
  { id: 'extract', name: 'Extract', src: 'F28 extract; 01-mission-brief.md objective 7' },
];

export const objectiveKind = (id: string): ObjectiveKind => OBJECTIVE_KINDS.find((k) => k.id === id) ?? OBJECTIVE_KINDS[0]!;

/** Hiding place kinds (schema.md section 3 `hides[].kind`). */
export const HIDE_KINDS: readonly { id: string; name: string; src: string }[] = [
  { id: 'recess', name: 'Recess', src: 'schema.md section 3 hides' },
  { id: 'locker', name: 'Locker', src: 'schema.md section 3 hides' },
  { id: 'dark', name: 'Dark patch', src: 'schema.md section 3 hides' },
  { id: 'under', name: 'Under cover', src: 'schema.md section 3 hides' },
];

export const hideKind = (id: string): { id: string; name: string } => HIDE_KINDS.find((k) => k.id === id) ?? HIDE_KINDS[0]!;

/** The Mission tab's tools (the tile menu), in order. */
export type MissionKind = 'guard' | 'spawn' | 'extraction' | 'objective' | 'intel' | 'checkpoint' | 'hide';
export const MISSION_TOOLS: readonly { id: MissionKind; name: string; desc: string }[] = [
  { id: 'guard', name: 'Guard', desc: 'A places a guard, then A adds its patrol stops' },
  { id: 'spawn', name: 'Insertion', desc: 'A places a player start (1-4, numbered)' },
  { id: 'extraction', name: 'Extraction', desc: 'A at one corner, A at the other' },
  { id: 'objective', name: 'Objective', desc: 'A places an objective; its kind on the card' },
  { id: 'intel', name: 'Intel', desc: 'A places an intel pickup (an objective of kind intel)' },
  { id: 'checkpoint', name: 'Checkpoint', desc: 'A places a checkpoint' },
  { id: 'hide', name: 'Hide', desc: 'A places a hiding place; its kind on the card' },
];
