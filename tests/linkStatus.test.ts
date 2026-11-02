import { describe, expect, it } from 'vitest';
import { classifyJoinError, failureDialog, JOIN_FAILURES, linkText, sampleFromStats, selectedPair } from '../src/net/linkStatus';
import { RELAY_SERVERS } from '../src/net/relayConfig';

// (co-op relay fix) the connection readout: direct or via relay from the selected ICE pair, plain words
const report = (list: Record<string, unknown>[]): Map<string, unknown> => new Map(list.map((s) => [s.id as string, s]));

const local = (id: string, type: string) => ({ id, type: 'local-candidate', candidateType: type });
const remote = (id: string, type: string) => ({ id, type: 'remote-candidate', candidateType: type });

describe('sampleFromStats', () => {
  it('Chrome / Edge: the transport names the selected pair; a host / srflx pair is direct', () => {
    const r = report([
      { id: 'T1', type: 'transport', selectedCandidatePairId: 'P2' },
      { id: 'P1', type: 'candidate-pair', localCandidateId: 'L2', remoteCandidateId: 'R2', nominated: true, state: 'succeeded', currentRoundTripTime: 0.3 },
      { id: 'P2', type: 'candidate-pair', localCandidateId: 'L1', remoteCandidateId: 'R1', nominated: true, state: 'succeeded', currentRoundTripTime: 0.0451 },
      local('L1', 'srflx'),
      remote('R1', 'host'),
      local('L2', 'relay'),
      remote('R2', 'relay'),
    ]);
    expect(selectedPair(r)?.id).toBe('P2');
    expect(sampleFromStats(r)).toEqual({ kind: 'direct', rttMs: 45 });
  });

  it('a relay candidate on either end reads as via relay', () => {
    for (const [l, rm] of [['relay', 'srflx'], ['host', 'relay'], ['relay', 'relay']] as const) {
      const r = report([{ id: 'T', type: 'transport', selectedCandidatePairId: 'P' }, { id: 'P', type: 'candidate-pair', localCandidateId: 'L', remoteCandidateId: 'R', currentRoundTripTime: 0.12 }, local('L', l), remote('R', rm)]);
      expect(sampleFromStats(r)).toEqual({ kind: 'relay', rttMs: 120 });
    }
  });

  it('Firefox: the pair flagged selected; else the nominated succeeded pair', () => {
    const ff = report([{ id: 'P', type: 'candidate-pair', selected: true, localCandidateId: 'L', remoteCandidateId: 'R' }, local('L', 'relay'), remote('R', 'host')]);
    expect(sampleFromStats(ff)).toEqual({ kind: 'relay', rttMs: null });
    const nom = report([{ id: 'X', type: 'candidate-pair', nominated: true, state: 'in-progress', localCandidateId: 'L', remoteCandidateId: 'R' }, { id: 'P', type: 'candidate-pair', nominated: true, state: 'succeeded', localCandidateId: 'L', remoteCandidateId: 'R', currentRoundTripTime: 0.008 }, local('L', 'host'), remote('R', 'host')]);
    expect(sampleFromStats(nom)).toEqual({ kind: 'direct', rttMs: 8 });
  });

  it('no selected pair yet: null; junk round trips: none', () => {
    expect(sampleFromStats(report([{ id: 'P', type: 'candidate-pair', state: 'waiting' }]))).toBeNull();
    expect(sampleFromStats(report([]))).toBeNull();
    const bad = report([{ id: 'P', type: 'candidate-pair', selected: true, currentRoundTripTime: -1 }]);
    expect(sampleFromStats(bad)).toEqual({ kind: 'direct', rttMs: null });
  });
});

describe('linkText', () => {
  it('reads in plain words', () => {
    expect(linkText({ phase: 'waiting', sample: null, failure: null })).toBe('Waiting for your partner');
    expect(linkText({ phase: 'connecting', sample: null, failure: null })).toBe('Connecting...');
    expect(linkText({ phase: 'connected', sample: null, failure: null })).toBe('Connected');
    expect(linkText({ phase: 'connected', sample: { kind: 'direct', rttMs: 45 }, failure: null })).toBe('Connected - direct, 45 ms');
    expect(linkText({ phase: 'connected', sample: { kind: 'relay', rttMs: 120 }, failure: null })).toBe('Connected - via relay, 120 ms');
    expect(linkText({ phase: 'connected', sample: { kind: 'local', rttMs: null }, failure: null })).toBe('Connected - same device');
    expect(linkText({ phase: 'failed', sample: null, failure: 'unreachable' })).toBe('Failed - no network path to your partner');
  });
});

describe('join failures', () => {
  it("classifies Trystero's onJoinError texts", () => {
    expect(classifyJoinError('could not connect to peer abc after exchanging SDP; configure TURN servers with turnConfig or rtcConfig.iceServers')).toBe('unreachable');
    expect(classifyJoinError('could not connect to peer abc after exchanging SDP; check that your TURN server URLs and credentials are reachable by both peers')).toBe('unreachable');
    expect(classifyJoinError('incorrect room password when decrypting offer')).toBe('signalling');
    expect(classifyJoinError('something else')).toBe('other');
  });

  it('every failure has a dialog with the code and no relay login in it', () => {
    const secrets = RELAY_SERVERS.flatMap((s) => [s.username, s.credential]).filter((v): v is string => !!v);
    expect(secrets.length).toBeGreaterThan(0);
    for (const f of JOIN_FAILURES) {
      const d = failureDialog(f, 'QWXYZ');
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.text.length).toBeGreaterThan(20);
      const all = `${d.title} ${d.text} ${linkText({ phase: 'failed', sample: null, failure: f })}`;
      for (const s of secrets) expect(all).not.toContain(s);
    }
    expect(failureDialog('timeout', 'QWXYZ').text).toMatch(/QWXYZ.*Check the code/);
    expect(failureDialog('unreachable', 'QWXYZ').text).toMatch(/strict network.*relay/);
    expect(failureDialog('version', 'QWXYZ').text).toMatch(/reload/);
  });
});
