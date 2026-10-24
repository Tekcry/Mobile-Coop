#!/usr/bin/env node
// metrics-gen: docs/design/scale-sheet.md -> docs/design/metrics.json (level-validator M2, slice V1a).
// The scale sheet is the one source of truth for every size and timing the level validator uses; this script reads
// sections 1 and 3 (named rows, numbers read out of the cell text), section 7 (parameter table + room table, GAME
// sizes) and section 8 (Key / Value / Unit, keys verbatim; a value is a number or a `min - max` range) into one JSON. A row that is missing from the sheet is
// omitted, never invented; a row that is present but cannot be read is a parse error naming the section and row.
//
//   node scripts/metrics-gen.mjs           write docs/design/metrics.json
//   node scripts/metrics-gen.mjs --check   exit 1 when the file on disk differs from a fresh generation, else 0
//   exit 2 on a parse error (the message names the section and row)
//
// The hand-kept `kit` block (co-op kit engine limits read from code, VAL-DIMS) is carried over from the file on disk.
// Pure parts (`parseScaleSheet`, `formatMetrics`, `withKit`) are exported for tests/metricsGen.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SHEET_PATH = 'docs/design/scale-sheet.md';
export const METRICS_PATH = 'docs/design/metrics.json';

export class MetricsParseError extends Error {
  /** @param {string} section @param {string} row @param {string} detail */
  constructor(section, row, detail) {
    super(`scale-sheet section ${section}, row "${row}": ${detail}`);
    this.name = 'MetricsParseError';
    this.section = section;
    this.row = row;
  }
}

const NUM = '(\\d+(?:\\.\\d+)?)';
const DASH = '\\s*[-\u2013]\\s*';

/** Strict number cell: "1.3", "90", "0.40". */
const toNumber = (text) => (/^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : null);
const RANGE = new RegExp(`^${NUM}${DASH}${NUM}$`);
/** A Key / Value cell: a number, or "3 - 6" as [3, 6]. */
const toValue = (text) => {
  const n = toNumber(text);
  if (n !== null) return n;
  const m = RANGE.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
/** Key cells are written as `key` in code style. */
const stripTicks = (text) => text.replace(/^`(.*)`$/, '$1').trim();

/** Split the sheet into its "## N." sections: Map<"N", lines with their 1-based line numbers>. */
function splitSections(markdown) {
  const sections = new Map();
  let cur = null;
  markdown.split(/\r?\n/).forEach((text, i) => {
    const h = /^##\s+(\d+)\./.exec(text);
    if (h) { cur = []; sections.set(h[1], cur); return; }
    if (/^#{1,2}\s/.test(text)) { cur = null; return; }
    if (cur) cur.push({ text, line: i + 1 });
  });
  return sections;
}

const splitRow = (text) => {
  let t = text.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
};

/** Every pipe table of a section: { header: string[], rows: { cells, line }[] }. */
function tables(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].text.trim().startsWith('|')) { i++; continue; }
    const block = [];
    while (i < lines.length && lines[i].text.trim().startsWith('|')) block.push(lines[i++]);
    const [head, sep, ...body] = block;
    if (!head || !sep || !/^\|?[\s:|-]+\|?$/.test(sep.text.trim())) continue;
    out.push({ header: splitRow(head.text), rows: body.map((r) => ({ cells: splitRow(r.text), line: r.line })) });
  }
  return out;
}

const findTable = (lines, first) => tables(lines ?? []).find((t) => t.header[0] === first);

// Sections 1 and 3: the value is prose, so each key names its row and a pattern on the value cell. Order = JSON order.
const SIZE_RULES = [
  { key: 'door_w', sec: '3', row: 'Single door', re: new RegExp(`^${NUM}\\s*x\\s*${NUM}`), pick: (m) => Number(m[1]) },
  { key: 'door_min_w', sec: '3', row: 'Single door', re: new RegExp(`${NUM}\\s*x\\s*${NUM}\\s+only\\b`), pick: (m) => Number(m[1]) },
  { key: 'door_h', sec: '3', row: 'Single door', re: new RegExp(`^${NUM}\\s*x\\s*${NUM}`), pick: (m) => Number(m[2]) },
  { key: 'door_h_min', sec: '3', row: 'Door height', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'door_h_max', sec: '3', row: 'Door height', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m`), pick: (m) => Number(m[2]) },
  { key: 'door_double_w', sec: '3', row: 'Double door', re: new RegExp(`^${NUM}\\s+or\\s+${NUM}\\s*x`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'opening_w', sec: '3', row: 'Wide opening, no door', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m\\b`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'roller_door_w', sec: '3', row: 'Roller door', re: new RegExp(`^${NUM}\\s*x\\s*${NUM}`), pick: (m) => Number(m[1]) },
  { key: 'corridor_min_w', sec: '3', row: 'Corridor', re: new RegExp(`never under\\s+${NUM}`), pick: (m) => Number(m[1]) },
  { key: 'corridor_w', sec: '3', row: 'Corridor', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m wide`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'play_space_min_short', sec: '3', row: 'Play space', re: new RegExp(`at least\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'ceiling_room', sec: '3', row: 'Ceiling', re: new RegExp(`^${NUM}\\s*m rooms`), pick: (m) => Number(m[1]) },
  { key: 'ceiling_hall', sec: '3', row: 'Ceiling', re: new RegExp(`${NUM}${DASH}${NUM}\\s*m halls`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'ceiling_min', sec: '3', row: 'Ceiling minimum', re: new RegExp(`^${NUM}\\s*m clear`), pick: (m) => Number(m[1]) },
  { key: 'storey_h', sec: '3', row: 'Ceiling', re: new RegExp(`[Ss]torey height[^0-9]*${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'fire_stair_w', sec: '3', row: 'Fire stair (enclosed)', re: new RegExp(`^${NUM}\\s*m wide`), pick: (m) => Number(m[1]) },
  { key: 'open_stair_w', sec: '3', row: 'Open feature stair', re: new RegExp(`^${NUM}\\s*m wide`), pick: (m) => Number(m[1]) },
  { key: 'duct_w', sec: '3', row: 'Duct, trench, pipe subway (crouch)', re: new RegExp(`^${NUM}\\s*wide\\s*x\\s*${NUM}\\s*high`), pick: (m) => Number(m[1]) },
  { key: 'duct_h', sec: '3', row: 'Duct, trench, pipe subway (crouch)', re: new RegExp(`^${NUM}\\s*wide\\s*x\\s*${NUM}\\s*high`), pick: (m) => Number(m[2]) },
  { key: 'tunnel_h', sec: '3', row: 'Walk-in tunnel', re: new RegExp(`^${NUM}\\s*m clear minimum`), pick: (m) => Number(m[1]) },
  { key: 'coop_lip', sec: '3', row: 'Co-op lip', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'split_jump_w', sec: '3', row: 'Split-jump gap', re: new RegExp(`^${NUM}${DASH}${NUM}\\s*m between faces`), pick: (m) => [Number(m[1]), Number(m[2])] },
  { key: 'split_jump_h', sec: '3', row: 'Split-jump gap', re: new RegExp(`at least\\s+${NUM}\\s*m tall`), pick: (m) => Number(m[1]) },
  { key: 'wall_jump_max_up', sec: '1', row: 'Wall jump', re: new RegExp(`^up\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'step_player', sec: '1', row: 'Step limit', re: new RegExp(`player\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'step_nav', sec: '1', row: 'Step limit', re: new RegExp(`nav\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'nav_cell', sec: '1', row: 'Nav grid', re: new RegExp(`cell\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
  { key: 'agent_radius', sec: '1', row: 'Nav grid', re: new RegExp(`agent radius\\s+${NUM}`), pick: (m) => Number(m[1]) },
  { key: 'headroom', sec: '1', row: 'Nav grid', re: new RegExp(`headroom\\s+${NUM}\\s*m`), pick: (m) => Number(m[1]) },
];
const SIZE_TABLE_HEAD = { 1: 'Thing', 3: 'Item' };

function parseSizes(sections) {
  const sizes = {};
  for (const r of SIZE_RULES) {
    const table = findTable(sections.get(r.sec), SIZE_TABLE_HEAD[r.sec]);
    const row = table?.rows.find((x) => x.cells[0] === r.row);
    if (!row) continue; // missing row: omitted, never invented
    const value = row.cells[1] ?? '';
    const m = r.re.exec(value);
    if (!m) throw new MetricsParseError(r.sec, r.row, `cannot read ${r.key} from "${value}" (line ${row.line})`);
    sizes[r.key] = r.pick(m);
  }
  return sizes;
}

/** A Key / Value table (section 7 parameters, section 8): keys verbatim, every value a plain number or a
 *  `min - max` range ([min, max]). */
function parseKeyValue(sec, table) {
  const out = {};
  if (!table) return out;
  const vi = table.header.indexOf('Value');
  if (vi < 0) throw new MetricsParseError(sec, table.header.join(' | '), 'Key table has no "Value" column');
  table.rows.forEach((r, i) => {
    const key = stripTicks(r.cells[0] ?? '');
    const label = `${i + 1} ${key || '(no key)'}`;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new MetricsParseError(sec, label, `bad key "${r.cells[0] ?? ''}" (line ${r.line})`);
    if (r.cells.length !== table.header.length) throw new MetricsParseError(sec, label, `has ${r.cells.length} cells, the header has ${table.header.length} (line ${r.line})`);
    const v = toValue(r.cells[vi] ?? '');
    if (v === null) throw new MetricsParseError(sec, label, `value "${r.cells[vi] ?? ''}" is not a number or a min - max range (line ${r.line})`);
    if (key in out) throw new MetricsParseError(sec, label, `duplicate key (line ${r.line})`);
    out[key] = v;
  });
  return out;
}

// Section 7 room table: contract field -> column header. Order = JSON order.
const ROOM_COLS = [
  ['minW', 'Game min w (m)'], ['minL', 'Game min l (m)'], ['maxW', 'Game max w (m)'], ['maxL', 'Game max l (m)'],
  ['cameraFloor', 'Camera floor (m)'], ['ceilMin', 'Ceiling min (m)'], ['ceilMax', 'Ceiling max (m)'], ['encounter', 'Encounter'],
];
const ENCOUNTER = new Set(['yes', 'conditional', 'no']);

function parseRooms(table) {
  const rooms = {};
  if (!table) return rooms;
  const idx = {};
  for (const [field, head] of ROOM_COLS) {
    const i = table.header.indexOf(head);
    if (i < 0) throw new MetricsParseError('7', 'Class (header)', `room table has no "${head}" column`);
    idx[field] = i;
  }
  table.rows.forEach((r, n) => {
    const cls = stripTicks(r.cells[0] ?? '');
    const label = `${n + 1} ${cls || '(no class)'}`;
    if (!/^[a-z][a-z0-9_]*$/.test(cls)) throw new MetricsParseError('7', label, `bad class "${r.cells[0] ?? ''}" (line ${r.line})`);
    if (r.cells.length !== table.header.length) throw new MetricsParseError('7', label, `has ${r.cells.length} cells, the header has ${table.header.length} (line ${r.line})`);
    if (cls in rooms) throw new MetricsParseError('7', label, `duplicate class (line ${r.line})`);
    const room = {};
    for (const [field, head] of ROOM_COLS) {
      const cell = r.cells[idx[field]] ?? '';
      if (field === 'encounter') {
        if (!ENCOUNTER.has(cell)) throw new MetricsParseError('7', label, `${head} "${cell}" is not yes, conditional or no (line ${r.line})`);
        room[field] = cell;
        continue;
      }
      if ((field === 'ceilMin' || field === 'ceilMax') && cell === 'open') { room[field] = 'open'; continue; }
      const v = toNumber(cell);
      if (v === null) throw new MetricsParseError('7', label, `${head} "${cell}" is not a number (line ${r.line})`);
      room[field] = v;
    }
    rooms[cls] = room;
  });
  return rooms;
}

/** Pure: the scale sheet's markdown -> the metrics object (the shared contract shape). Throws MetricsParseError. */
export function parseScaleSheet(markdown) {
  const sections = splitSections(markdown);
  return {
    source: SHEET_PATH,
    sizes: parseSizes(sections),
    roomParams: parseKeyValue('7', findTable(sections.get('7'), 'Key')),
    rooms: parseRooms(findTable(sections.get('7'), 'Class')),
    rules: parseKeyValue('8', findTable(sections.get('8'), 'Key')),
  };
}

/** The file text: 2-space JSON with a trailing newline. */
export const formatMetrics = (metrics) => `${JSON.stringify(metrics, null, 2)}\n`;

/** Pure: the fresh sheet metrics plus the hand-kept `kit` block of the file on disk (`diskText`, may be null). The kit
 *  block holds the co-op kit moves' engine limits, each read from code (its `_src` strings), not from the sheet
 *  (mission-framework VAL-DIMS), so a regeneration carries it over unchanged, last. */
export function withKit(fresh, diskText) {
  let kit;
  try {
    kit = diskText ? JSON.parse(diskText).kit : undefined;
  } catch {
    kit = undefined;
  }
  return kit && typeof kit === 'object' ? { ...fresh, kit } : fresh;
}

function main(args) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const out = path.join(root, METRICS_PATH);
  const disk = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n') : null;
  let text;
  try {
    text = formatMetrics(withKit(parseScaleSheet(fs.readFileSync(path.join(root, SHEET_PATH), 'utf8')), disk));
  } catch (e) {
    console.error(`metrics-gen: ${e.message}`);
    return 2;
  }
  if (args.includes('--check')) {
    if (disk === text) { console.log(`metrics-gen: ${METRICS_PATH} matches ${SHEET_PATH}`); return 0; }
    console.error(`metrics-gen: ${METRICS_PATH} ${disk === null ? 'is missing' : 'differs from'} a fresh generation from ${SHEET_PATH}; run node scripts/metrics-gen.mjs`);
    return 1;
  }
  fs.writeFileSync(out, text);
  console.log(`metrics-gen: wrote ${METRICS_PATH}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
