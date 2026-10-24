/**
 * (coop-carry) Co-op body carry: the body item on the wire (kind `body`, the enemy id `e`, the carrier `by`), the host's
 * rules for a client's pick up / hide (`bodyCarryNet.ts`), and the client mirror's transitions (`carryChange`). The
 * protocol number is read, never asserted (the train bumps it).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DROP_BODY_ID, ITEM_KINDS, PROTOCOL_VERSION, parseMessage, type Msg, type NetItem } from '../src/net/protocol';
import { bodyItem, CARRY_USE_SLACK, carryChange, clientBodyPrompt, hideOk, inCarryReach, letGoHeard, pickupDenied, type CarryChange, type PickupCheck } from '../src/net/bodyCarryNet';
import { BODY } from '../src/ai/bodies';

const snapWith = (items: unknown[]): Extract<Msg, { t: 'snap' }> => {
  const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [], obj: '', info: '', pk: 0, items });
  if (!m || m.t !== 'snap') throw new Error('snap did not parse');
  return m;
};

describe('the body item on the wire', () => {
  it('kind body is an item kind; the use id for a put down is drop-body', () => {
    expect(ITEM_KINDS).toContain('body');
    expect(DROP_BODY_ID).toBe('drop-body');
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
  });

  it('a lying body round-trips: on, its enemy id, no carrier', () => {
    const n = bodyItem('b3', 'e7', 1, 0.2, -4, true, '', BODY.reach);
    expect(n).toMatchObject({ id: 'body-b3', k: 'body', on: true, e: 'e7', reach: BODY.reach });
    expect(n.by).toBeUndefined();
    const back = snapWith([JSON.parse(JSON.stringify(n))]).items![0]!;
    expect(back).toMatchObject({ id: 'body-b3', k: 'body', x: 1, y: 0.2, z: -4, on: true, e: 'e7' });
    expect(back.by).toBeUndefined();
  });

  it('a carried body round-trips with its carrier and is off (no pick-up prompt)', () => {
    const n = bodyItem('b3', 'e7', 1, 0, 1, false, 'peerB', BODY.reach);
    expect(n.on).toBe(false);
    const back = snapWith([n]).items![0]!;
    expect(back.by).toBe('peerB');
    expect(back.on).toBe(false);
    // a carrier makes it off even while the body is still present (the host's own lift before the hoist)
    expect(bodyItem('b3', 'e7', 0, 0, 0, true, 'host', 1.4).on).toBe(false);
  });

  it('junk e / by drop the field only; other kinds never carry them', () => {
    const items = snapWith([
      { id: 'body-b1', k: 'body', x: 0, y: 0, z: 0, yaw: 0, label: 'Pick up body', hold: 0, reach: 1.4, on: true, e: '../x', by: 7 },
      { id: 'door-1', k: 'door', x: 0, y: 0, z: 0, yaw: 0, label: 'Open door', hold: 0, reach: 1.4, on: true, e: 'e1', by: 'peer' },
      { id: 'body-b2', k: 'bodyx', x: 0, y: 0, z: 0 },
    ]).items!;
    expect(items).toHaveLength(2);
    const b = items[0]! as NetItem;
    expect(b.k).toBe('body');
    expect(b.e).toBeUndefined();
    expect(b.by).toBeUndefined();
    expect(items[1]!.e).toBeUndefined();
    expect(items[1]!.by).toBeUndefined();
  });
});

const base = (o: Partial<PickupCheck> = {}): PickupCheck => ({
  alive: true,
  held: false,
  carrying: false,
  seizing: false,
  mode: 'ground',
  present: true,
  taken: false,
  bx: 0,
  by: 0,
  bz: 0,
  fx: 1,
  fy: 0,
  fz: 0,
  reach: BODY.reach,
  ...o,
});

describe("the host's rules for a client's pick up", () => {
  it('a live, free client in reach of a lying body takes it', () => {
    expect(pickupDenied(base())).toBe('');
    expect(pickupDenied(base({ mode: undefined }))).toBe('');
  });

  it('refuses: down, held for a rejoin, already carrying, holding a guard or traversing', () => {
    expect(pickupDenied(base({ alive: false }))).toBe('dead');
    expect(pickupDenied(base({ held: true }))).toBe('held');
    expect(pickupDenied(base({ carrying: true }))).toBe('carrying');
    expect(pickupDenied(base({ seizing: true }))).toBe('busy');
    expect(pickupDenied(base({ mode: 'ladder' }))).toBe('busy');
    expect(pickupDenied(base({ mode: 'vault' }))).toBe('busy');
  });

  it('refuses a body someone has (the host lifting it, the other client) or that is gone', () => {
    expect(pickupDenied(base({ taken: true }))).toBe('taken');
    expect(pickupDenied(base({ present: false }))).toBe('taken');
  });

  it('distance: reach + the use slack across, 2 m up or down', () => {
    const edge = BODY.reach + CARRY_USE_SLACK;
    expect(pickupDenied(base({ fx: edge - 0.01 }))).toBe('');
    expect(pickupDenied(base({ fx: edge + 0.01 }))).toBe('far');
    expect(pickupDenied(base({ fy: 2.5 }))).toBe('far');
    expect(inCarryReach(0, 0, 0, 0, -1.9, 1, 1.4)).toBe(true);
  });

  it('hide: only while carrying, alive and in reach of the spot', () => {
    expect(hideOk(true, true, true)).toBe(true);
    expect(hideOk(true, false, true)).toBe(false);
    expect(hideOk(false, true, true)).toBe(false);
    expect(hideOk(true, true, false)).toBe(false);
  });
});

describe('the client mirror', () => {
  /** Run a body's mirrors in order (`by` per mirror, null = gone from the list) through `carryChange`. */
  const run = (seq: (string | null)[]): CarryChange[] => {
    let prev = '';
    const out: CarryChange[] = [];
    for (const by of seq) {
      const ch = carryChange(prev, by !== null, by ?? '');
      out.push(ch);
      prev = by ?? '';
    }
    return out;
  };

  it('down -> carried by me -> put down -> carried by the partner -> hidden', () => {
    expect(run(['', 'me', 'me', '', 'host', null])).toEqual(['none', 'take', 'none', 'drop', 'take', 'hide']);
  });

  it('a lying body leaving the list (restart, cap) is no hide; a carrier swap is a retake', () => {
    expect(run(['', null])).toEqual(['none', 'none']);
    expect(run(['me', 'host'])).toEqual(['take', 'retake']);
  });

  it('a late joiner seeing a carried body first takes it at once', () => {
    expect(carryChange('', true, 'host')).toBe('take');
  });
});

describe('fix round: the quiet let-go and the late joiner prompt', () => {
  it('a client lift let go of before the hoist is quiet (as solo); a put down from the shoulder is heard', () => {
    // the client's own drop-body (asked): quiet before the hoist, heard from the shoulder
    expect(letGoHeard(false, true)).toBe(false);
    expect(letGoHeard(true, true)).toBe(true);
    // (recheck) the carrier down, held or gone mid-lift is heard, as solo's dropCarried
    expect(letGoHeard(false, false)).toBe(true);
    expect(letGoHeard(true, false)).toBe(true);
    const host = readFileSync('src/net/coopHost.ts', 'utf8');
    const i = host.indexOf('private remoteDrop(');
    const body = host.slice(i, i + 900);
    // the quiet branch returns before the noise
    expect(body).toMatch(/if \(!letGoHeard\(v\.onShoulder, asked\)\) \{\s*v\.letGo\(ok\);\s*return;\s*\}[\s\S]*hear\(at, DROP_NOISE\)/);
    // only the client's own drop-body asks; death, hold, leave and the carry step keep asked false
    expect(host).toMatch(/id === DROP_BODY_ID\) \{\s*this\.remoteDrop\(r\.id, true\);/);
    expect(host.match(/this\.remoteDrop\([a-z.]+\)/g)?.length).toBe(4);
  });

  it('a body the client has no lying body for (never saw him fall) offers no pick up', () => {
    expect(clientBodyPrompt(true, true)).toBe(true);
    expect(clientBodyPrompt(true, false)).toBe(false);
    expect(clientBodyPrompt(false, true)).toBe(false);
    const client = readFileSync('src/net/coopClient.ts', 'utf8');
    expect(client).toMatch(/n\.k === 'body' \? clientBodyPrompt\(n\.on, !!n\.e && this\.kept\.get\(n\.e\)\?\.present === true\)/);
    // (recheck) a put down re-reads the prompt (syncItems ran while the body was still carried)
    expect(client).toMatch(/this\.letGo\(eid, prev\);\s*\/\/[^\n]*\n\s*this\.bodyPrompt\(eid\);/);
    // a body that falls after its item arrived gets its prompt then
    expect(client).toMatch(/this\.kept\.set\(e\.enemy, body\);[\s\S]{0,200}this\.bodyPrompt\(e\.enemy\)/);
  });
});

describe('wiring (source checks)', () => {
  const host = readFileSync('src/net/coopHost.ts', 'utf8');
  it("the host never runs its own carry items for a client's use", () => {
    const i = host.indexOf('private onUse(r: RemotePlayer');
    const body = host.slice(i, i + 900);
    expect(body).toMatch(/DROP_BODY_ID[\s\S]*remoteDrop[\s\S]*'body-'[\s\S]*remotePickUp[\s\S]*'hide-'[\s\S]*remoteHide[\s\S]*interactables\?\.items\.find/);
  });
  it('a carrier down, held or gone drops the body', () => {
    expect(host).toMatch(/private onRemoteDeath[\s\S]{0,200}remoteDrop\(r\.id\)/);
    expect(host).toMatch(/private hold\([\s\S]{0,900}remoteDrop\(id\)/);
    expect(host).toMatch(/private removeRemote\([\s\S]{0,700}remoteDrop\(id\)/);
  });
  it('single player never imports src/net (the carry interface lives in src/game)', () => {
    for (const f of ['src/game/bodyCarry.ts', 'src/game/gameState.ts', 'src/game/stealthSystems.ts']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/from '\.\.\/net\//);
    }
  });
});
