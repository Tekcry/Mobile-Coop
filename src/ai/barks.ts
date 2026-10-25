/**
 * Enemy callouts (pure): short lines shown near the speaker (no voice audio; a radio chirp plays for radio
 * lines). Lines rotate per speaker; a speaker waits `BARK.cooldown` between lines (urgent ones cut in sooner).
 */
export type BarkEvent =
  | 'suspicious'
  | 'investigate'
  | 'contact'
  | 'lost'
  | 'search'
  | 'body'
  | 'radioCheck'
  | 'radioOk'
  | 'missed'
  | 'dog'
  | 'blind'
  | 'grenade'
  | 'alarm'
  | 'clear'
  | 'callIn'
  | 'drone'
  // (guard-ai S2, design 10) the incident board's lines
  | 'ack'
  | 'checking'
  | 'lightOut'
  | 'standDown'
  | 'missing'
  // (guard-ai S3, design 5) a guard joining on a shout or a radio call
  | 'joining'
  // (guard-ai S4, design 4 / 10) bodies: waking a knocked-out squadmate, the reports
  | 'koFound'
  | 'koReport'
  | 'deadReport'
  // (guard-ai S6, design 7) the command call: the alarm by radio
  | 'command'
  // (guard-ai S8, design 8) squad tactics: the point bounds, the overwatch covers it, the flanker goes round
  | 'moving'
  | 'covering'
  | 'flanking'
  // (guard-ai S12) a round stopped by his helmet or vest
  | 'deflect'
  // (guard-ai S15) a switched-off circuit taken for a fault: he goes to turn it back on
  | 'breaker'
  // (guard-ai S14) section alert: a loud shot heard and called in; the reports when the calls get through
  | 'shots'
  | 'shotsReport'
  | 'missingReport'
  // (guard-ai S17) sent to a tripped device (a laser beam, a camera's alarm)
  | 'tripped'
  // (guard-ai S22) a security console found switched off: he turns it back on; off again soon after: he checks it
  | 'console'
  | 'consoleCheck'
  // (guard-rules S4, A8) a rise by sound; the lookout's radioed sighting (S7)
  | 'heard'
  | 'spotCall';

export const BARKS: Record<BarkEvent, readonly string[]> = {
  suspicious: ['Huh?', 'What was that?', 'Hello?', 'Something there...'],
  investigate: ['Checking it out.', 'Going to look.', 'Thought I saw something.', 'Moving to check.'],
  contact: ['Contact!', 'There he is!', 'Intruder!', 'Hostile spotted!'],
  lost: ['Lost him!', "Where'd he go?", 'No visual!'],
  search: ['Spread out!', 'Search the area!', 'Find him!'],
  body: ['Man down!', 'Got a body here!', 'Someone took him out!'],
  radioCheck: ['Radio check.', 'All units, report.', 'Check in.'],
  radioOk: ['All clear.', 'Nothing here.', 'Clear.'],
  missed: ['No answer...', "He's not responding.", 'Unit, respond!'],
  dog: ['*growl*', '*bark bark*', '*snarl*'],
  blind: ["I can't see!", 'My eyes!'],
  grenade: ['Grenade!', 'Take cover!'],
  alarm: ['Raising the alarm!', 'Sound the alarm!'],
  clear: ['Must have been nothing.', 'Back to it.', 'All quiet.'],
  drone: ['Drone has him!', 'Eyes in the sky - contact!'],
  // (guard-ai S3) the spotter's section call, when it gets through ("Command" is the S6 alarm call)
  callIn: ['Control, contact. Moving on him.', 'Control, I have contact.', 'Control, contact, my position.'],
  ack: ['Copy.', 'Copy, holding.'],
  checking: ['Checking it out.'],
  lightOut: ["Light's gone. Taking a look."],
  standDown: ['Nothing here. Back to it.'],
  missing: ["He's not answering. Two of us, go."],
  joining: ['Copy, moving!', 'On my way!', 'Coming to you!'],
  koFound: ['Hey. Hey! Wake up.'],
  koReport: ["Found him out cold. He's okay, checking around."],
  deadReport: ['Man down. Stay sharp.', 'We lost one. Stay sharp.'],
  command: ['Command, contact. Send backup.', 'Command, we have an intruder. Requesting backup.'],
  moving: ['Moving up!', 'Moving!', 'Cover me!'],
  covering: ['Covering!', 'Got you covered!', 'Go, go!'],
  flanking: ['Flanking!', 'Going round!', 'Taking the side!'],
  deflect: ['Argh! Still up!', 'Took one! Still standing!', 'That was close!'],
  breaker: ["Breaker's gone again."],
  // (guard-ai S14) original lines, written to be voiced later (G82)
  shots: ['Shots fired! Calling it in.', 'Gunfire! Calling it in.', 'That was a gunshot. Calling it in.'],
  shotsReport: ['Control, shots fired near my position. All units, stay sharp.', 'Control, I heard gunfire. Everyone, eyes open.'],
  missingReport: ["Control, a unit's not answering. All units, stay sharp.", 'Control, we have a man not checking in. Eyes open.'],
  // (guard-ai S17) original lines, written to be voiced later (G82)
  tripped: ['Sensor tripped. Moving to check.', "Alarm point's lit. On my way."],
  // (guard-ai S22) original lines, written to be voiced later (G82)
  console: ["Console's dropped out again. Getting it back up.", 'Monitors are dark. Switching them back on.'],
  consoleCheck: ["Console's off again. Someone's been at it. Checking.", 'Monitors down twice now. Taking a look.'],
  // (guard-rules S4, A8) original lines, written to be voiced later (G82)
  heard: ['I heard something.', 'What was that noise?', 'Heard something over there.'],
  spotCall: ['Control, movement below me. Someone check it.', 'Control, I saw something down there. Need eyes on it.'],
};

/**
 * (guard-ai S14) Lines naming a unit (`{unit}`: his radio number as a word, `unitWord`), said through `BarkVoice.sayUnit`
 * when the speaker knows who he means; without a number the event's `BARKS` lines are used.
 */
export const BARKS_UNIT: Partial<Record<BarkEvent, readonly string[]>> = {
  missed: ['Unit {unit}, report... Unit {unit}? Nothing.', 'Unit {unit}, check in... No answer.', "Unit {unit}, respond... He's not answering."],
};

const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** (guard-ai S14) A unit's number as said on the radio ("three"); digits past twelve. */
export function unitWord(n: number): string {
  const i = Math.floor(n);
  return i >= 1 && i < WORDS.length ? WORDS[i]! : String(i);
}

/**
 * (guard-ai S9, protocol 38) The wire order of the bark events (the co-op `bark` event's `b`). Append only: a new event
 * goes at the end, so an index means the same event on both sides.
 */
export const BARK_EVENTS: readonly BarkEvent[] = [
  'suspicious', 'investigate', 'contact', 'lost', 'search', 'body', 'radioCheck', 'radioOk', 'missed', 'dog', 'blind', 'grenade',
  'alarm', 'clear', 'callIn', 'drone', 'ack', 'checking', 'lightOut', 'standDown', 'missing', 'joining', 'koFound', 'koReport',
  'deadReport', 'command', 'moving', 'covering', 'flanking', 'deflect', 'breaker', 'shots', 'shotsReport', 'missingReport',
  // (guard-ai A126 merge, A139) S17's device line, appended (protocol 38 still, A140: S9's table is unreleased)
  'tripped',
  // (guard-ai S22, A135) the console lines, appended (same train as S9: protocol 41 since A142)
  'console', 'consoleCheck',
  // (guard-rules S4, A8) appended (the train's protocol bump covers it)
  'heard', 'spotCall',
];

/** (guard-ai S9) The wire index of `ev` (-1 unknown). */
export function barkIndex(ev: BarkEvent): number {
  return BARK_EVENTS.indexOf(ev);
}

/**
 * (guard-ai S9) The line `BarkVoice` picked, rebuilt from the wire: event index `b`, line index `n` and unit `u` (>= 1: a
 * `BARKS_UNIT` line naming him, as `sayUnit`). Null for an unknown event. Pure; the same text the host shows.
 */
export function barkLine(b: number, n: number, u: number): string | null {
  const ev = BARK_EVENTS[b];
  if (ev === undefined) return null;
  const t = u >= 1 ? BARKS_UNIT[ev] : undefined;
  const lines = t ?? BARKS[ev];
  const i = Math.floor(n);
  const line = lines[(i >= 0 ? i : 0) % lines.length]!;
  return t ? line.split('{unit}').join(unitWord(u)) : line;
}

/** Radio lines (a chirp plays with them). */
export const RADIO_BARKS: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['radioCheck', 'radioOk', 'missed', 'alarm', 'drone', 'search', 'callIn', 'ack', 'checking', 'lightOut', 'standDown', 'missing', 'koReport', 'deadReport', 'command', 'shotsReport', 'missingReport', 'consoleCheck', 'spotCall']);
/** Urgent lines cut through a speaker's cooldown. (guard-ai S14) `missed` too: it follows his own "Radio check." at once. */
const URGENT: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['contact', 'body', 'blind', 'grenade', 'alarm', 'callIn', 'koFound', 'koReport', 'deadReport', 'command', 'missed', 'shots', 'shotsReport', 'missingReport']);

export const BARK = {
  /** Seconds between one speaker's lines; on screen this long. */
  cooldown: 3.5,
  show: 2.2,
  /** At most this many lines on screen. */
  max: 4,
} as const;

/** Per-speaker line state. */
export class BarkVoice {
  private next = 0;
  private t = 0;
  private turn = 0;
  /** (guard-ai S9) The index into its table of the last line `say` / `sayUnit` returned (the co-op `bark` event's `n`). */
  lastLine = 0;

  constructor(private seed: number) {
    this.turn = seed % 7;
  }

  /** Advance the voice clock. */
  tick(dt: number): void {
    this.t += dt;
  }

  /** The line for `ev` if this speaker may talk now (else null). */
  say(ev: BarkEvent): string | null {
    return this.pick(ev, BARKS[ev]);
  }

  /** (guard-ai S14) The line for `ev` naming unit `unit` (`BARKS_UNIT`, `{unit}` -> "three"); the plain line when the
   *  event has no unit lines or `unit` < 1. Null when he may not talk now. */
  sayUnit(ev: BarkEvent, unit: number): string | null {
    const t = unit >= 1 ? BARKS_UNIT[ev] : undefined;
    if (!t) return this.say(ev);
    const line = this.pick(ev, t);
    return line === null ? null : line.split('{unit}').join(unitWord(unit));
  }

  private pick(ev: BarkEvent, lines: readonly string[]): string | null {
    if (this.t < this.next && !URGENT.has(ev)) return null;
    const n = (this.turn + this.seed) % lines.length;
    const line = lines[n]!;
    this.lastLine = n;
    this.turn++;
    this.next = this.t + BARK.cooldown;
    return line;
  }
}

/**
 * (guard-ai S7, design 10 `camBody`) The security desk's radio line when a camera sees a downed guard: the camera's
 * label ("Camera 2"), the room it is in (`RoomRect.name`; '' drops it), and who should go (one for a knocked-out guard,
 * two for a dead one). Original text, under 90 characters with a short room name, written to be voiced later (G82).
 */
export function camBodyLine(camera: string, room: string, lethal: boolean): string {
  const where = room ? `, ${room}` : '';
  return lethal ? `${camera} has a man down${where}. He's not moving. Two of you, go.` : `${camera} has a man down${where}. Nearest unit, check on him.`;
}
