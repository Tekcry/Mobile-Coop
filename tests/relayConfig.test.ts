import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { iceConfig, RELAY_SERVERS, relayMode } from '../src/net/relayConfig';

// (co-op relay fix) the TURN relay reaches Trystero as turnConfig (its own STUN list kept), and its login is never logged
describe('relay config', () => {
  it('lists the relay over UDP, TCP and TLS on 80 / 443, with a login on every TURN entry', () => {
    const urls = RELAY_SERVERS.flatMap((s) => (typeof s.urls === 'string' ? [s.urls] : [...s.urls]));
    expect(urls.some((u) => u.startsWith('stun:'))).toBe(true);
    expect(urls.some((u) => /^turn:.*:80$/.test(u))).toBe(true);
    expect(urls.some((u) => /^turn:.*:80\?transport=tcp$/.test(u))).toBe(true);
    expect(urls.some((u) => /^turn:.*:443$/.test(u))).toBe(true);
    expect(urls.some((u) => /^turns:.*:443\?transport=tcp$/.test(u))).toBe(true);
    for (const s of RELAY_SERVERS) {
      const turn = (typeof s.urls === 'string' ? [s.urls] : [...s.urls]).some((u) => /^turns?:/.test(u));
      if (turn) expect(s.username && s.credential).toBeTruthy();
    }
  });

  it('auto: turnConfig only (Trystero adds it to its default STUN servers); only: relay policy; off: none', () => {
    const auto = iceConfig('auto');
    expect(auto.turnConfig).toHaveLength(RELAY_SERVERS.length);
    expect(auto.rtcConfig).toBeUndefined();
    const only = iceConfig('only');
    expect(only.rtcConfig).toEqual({ iceTransportPolicy: 'relay' });
    // never rtcConfig.iceServers: that would replace Trystero's STUN list
    expect(only.rtcConfig && 'iceServers' in only.rtcConfig).toBe(false);
    expect(iceConfig('off').turnConfig).toEqual([]);
    // fresh copies: Trystero may hold them
    expect(auto.turnConfig[1]).not.toBe(RELAY_SERVERS[1]);
  });

  it('?relay= reads only / off, anything else is the default', () => {
    expect(relayMode('only')).toBe('only');
    expect(relayMode('off')).toBe('off');
    expect(relayMode(null)).toBe('auto');
    expect(relayMode('ONLY')).toBe('auto');
    expect(relayMode('1')).toBe('auto');
  });
});

describe('the relay login stays out of logs', () => {
  const files = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p.replace(/\\/g, '/')] : [];
    });
  const src = files('src');

  it('only the WebRTC transport imports the relay config', () => {
    const imp = /from\s+['"][^'"]*\brelayConfig['"]|import\(\s*['"][^'"]*\brelayConfig['"]/;
    expect(src.filter((f) => imp.test(readFileSync(f, 'utf8')))).toEqual(['src/net/trysteroTransport.ts']);
  });

  it('no console call names the relay config, a username or a credential', () => {
    const bad: string[] = [];
    for (const f of src.filter((x) => x.startsWith('src/net/'))) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/console\.\w+\(/.test(line) && /RELAY_SERVERS|iceConfig|turnConfig|credential|username/.test(line)) bad.push(`${f}:${i + 1}`);
        });
    }
    expect(bad).toEqual([]);
  });

  it('the login values appear in one source file only', () => {
    const secrets = RELAY_SERVERS.flatMap((s) => [s.username, s.credential]).filter((v): v is string => !!v);
    const holders = src.filter((f) => secrets.some((s) => readFileSync(f, 'utf8').includes(s)));
    expect(holders).toEqual(['src/net/relayConfig.ts']);
  });
});
