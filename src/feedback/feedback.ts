/**
 * Playtest feedback (pure, unit-tested): notes with a category, the game context they were written in and any
 * number of photos (photo mode captures). Kept in IndexedDB (`kv` 'feedback'); exported as one self-contained
 * HTML report (text list first, then every note with its photos) to send on.
 */
export const FEEDBACK_CATEGORIES = ['bug', 'visual', 'gameplay', 'controls', 'ui', 'performance', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  visual: 'Visual',
  gameplay: 'Gameplay',
  controls: 'Controls',
  ui: 'Menus / HUD',
  performance: 'Performance',
  other: 'Other',
};
/** Most photos per note. */
export const MAX_PHOTOS = 8;
export const MAX_TEXT = 4000;

export interface FeedbackEntry {
  id: string;
  created: number;
  updated: number;
  category: FeedbackCategory;
  text: string;
  /** Where it was written: map, mode, position, version, graphics, input... */
  context: Record<string, string>;
  /** JPEG captures (Blobs in IndexedDB). */
  photos: Blob[];
  /** Ticked off (already sent / fixed). */
  done: boolean;
}

export function newEntry(context: Record<string, string>, now = Date.now()): FeedbackEntry {
  return { id: `fb-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, created: now, updated: now, category: 'bug', text: '', context, photos: [], done: false };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isBlob = (v: unknown): v is Blob => typeof Blob !== 'undefined' && v instanceof Blob;

/** Stored list from untrusted data: bad entries dropped, fields clamped, newest first. */
export function sanitizeFeedback(raw: unknown): FeedbackEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: FeedbackEntry[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.id !== 'string') continue;
    const ctx: Record<string, string> = {};
    if (isObj(r.context)) for (const [k, v] of Object.entries(r.context)) if (typeof v === 'string' || typeof v === 'number') ctx[k.slice(0, 40)] = String(v).slice(0, 200);
    out.push({
      id: r.id.slice(0, 60),
      created: typeof r.created === 'number' ? r.created : 0,
      updated: typeof r.updated === 'number' ? r.updated : typeof r.created === 'number' ? r.created : 0,
      category: FEEDBACK_CATEGORIES.includes(r.category as FeedbackCategory) ? (r.category as FeedbackCategory) : 'other',
      text: typeof r.text === 'string' ? r.text.slice(0, MAX_TEXT) : '',
      context: ctx,
      photos: Array.isArray(r.photos) ? r.photos.filter(isBlob).slice(0, MAX_PHOTOS) : [],
      done: r.done === true,
    });
  }
  return out.sort((a, b) => b.created - a.created);
}

/** One line per note (the list at the top of the report, and "copy as text"). */
export function summaryLine(e: FeedbackEntry, i: number): string {
  const where = [e.context.map, e.context.mode].filter(Boolean).join(' / ');
  const text = e.text.trim().replace(/\s+/g, ' ') || '(no text)';
  return `${i + 1}. [${CATEGORY_LABEL[e.category]}]${e.done ? ' [done]' : ''} ${text}${where ? ` (${where})` : ''}${e.photos.length ? ` [${e.photos.length} photo${e.photos.length > 1 ? 's' : ''}]` : ''}`;
}

export function feedbackText(list: readonly FeedbackEntry[]): string {
  return list.map(summaryLine).join('\n');
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The report: a plain list, then each note with its context and photos (as data URLs, so the file stands alone). */
export function feedbackReportHtml(list: readonly FeedbackEntry[], photoUrls: readonly (readonly string[])[], title: string, now = Date.now()): string {
  const date = new Date(now).toISOString().replace('T', ' ').slice(0, 16);
  const notes = list
    .map((e, i) => {
      const ctx = Object.entries(e.context)
        .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
        .join('');
      const imgs = (photoUrls[i] ?? []).map((u, j) => `<a href="${u}" target="_blank"><img src="${u}" alt="photo ${j + 1}"></a>`).join('');
      return `<section><h2>${i + 1}. ${esc(CATEGORY_LABEL[e.category])}${e.done ? ' <small>(done)</small>' : ''}</h2>
<p class="when">${esc(new Date(e.created).toISOString().replace('T', ' ').slice(0, 16))}</p>
<p class="text">${esc(e.text || '(no text)').replace(/\n/g, '<br>')}</p>
${imgs ? `<div class="photos">${imgs}</div>` : ''}
<table>${ctx}</table></section>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} feedback ${date}</title>
<style>body{font:15px/1.45 system-ui,sans-serif;background:#0b0f10;color:#dfe9e4;margin:0;padding:16px;max-width:1100px}
h1{font-size:22px}h2{font-size:17px;color:#38e08c;margin:0 0 4px}pre{white-space:pre-wrap;background:#141b1c;padding:12px;border-radius:6px}
section{border-top:1px solid #23302d;padding:14px 0}.when{color:#7f948b;margin:0 0 8px;font-size:13px}.text{font-size:16px}
.photos{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.photos img{max-width:100%;width:520px;border-radius:4px;border:1px solid #23302d}
table{border-collapse:collapse;font-size:12px;color:#9fb3aa}th{text-align:left;padding:1px 10px 1px 0;font-weight:600}td{padding:1px 0}</style></head>
<body><h1>${esc(title)} - playtest feedback (${list.length})</h1><p class="when">Exported ${esc(date)}</p>
<pre>${esc(feedbackText(list))}</pre>
${notes}
</body></html>`;
}
