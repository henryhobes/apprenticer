// The diagram kit: the board's drawings as data. The model names the parts and picks the numbers (a
// Spec, by structured output: about a second and a half); this file does the geometry, type, colour,
// build-up and cue words, so every drawing is laid out right and in the house style. A physical thing
// (a machine, a floor plan, a site) still comes back as hand-written SVG.

type Colour = 'ink' | 'power' | 'money' | 'time' | 'cool';
export interface Item { label: string; value: string | null; unit: string | null; sub: string | null; dim: boolean; colour: Colour; from: number[] | null; op: string | null }
export interface Column { heading: string; dim: boolean; items: Item[] }
export interface Spec { type: 'chain' | 'numbers' | 'compare' | 'calc' | 'split' | 'svg'; gold: string | null; note: string | null; items: Item[] | null; columns: Column[] | null; svg: string | null }

export const KIT = `You draw one visual for a live board beside a voice conversation: the person hears the speech while they look at it, so it shows what's easier to see than to hear (structure, scale, flow, a calculation) and never restates the speech. You don't draw it: you fill in one of these diagram types, and the board lays it out.
- chain: things that lead to each other, left to right: a process, stages, money or load flowing. Each item is a box. It follows the item before it, unless from lists the earlier items that feed it ([] makes it a second starting point), so two inputs can merge into one box.
- numbers: up to four numbers that are the point, side by side, big (40 couriers and 12 hubs; 12,000 against 4,500 hours; +12.1% cost, +8% speed): each item a value, unit and label.
- compare: two columns side by side (observed against forecast, before and after, two options): a heading and up to four items each, an item being a short line (label) or a number with what it is (value, unit, label). Set dim on the one column that's forecast, uncertain or not established, if either is.
- calc: a calculation landing on its result, one line per number: value and unit, label saying what it is, and op (+ − × ÷ ≈ =) on every line but the first.
- split: a whole divided into its parts (a budget into its parts, a day into its activities): the first item is the whole, the rest its parts, each with its value.
- svg: only for a physical thing (a machine, a floor plan, a site) or when nothing above fits; then write the fragment yourself, by the style guide below.

Labels are nouns, one to four words, 28 characters at most. A value is the number alone ("40", "$30-50k", "7,700") and its unit goes in unit ("ms", "couriers"). sub is a few words of role or detail (36 characters), or null. At most five items. gold: the label (or compare heading) of the one thing to look at, or null for the natural one (a chain's end, a calculation's result). note: one short line for a caveat ("forecast, not observed"), or null. colour by meaning: power (energy, load, effort), money (money flowing), time (dates, schedules), cool (water, cooling, calm things), otherwise ink; dim for what's forecast, uncertain or not yet true. Use the real numbers, names and dates from the request and the speech, and drop what doesn't fit rather than cramming: one idea. Fields a type doesn't use are null (items, columns, svg; from and op outside chain and calc). Prefer the fewest parts that make the point: the fewer, the larger they're drawn.`;

const ITEM = { type: 'object', additionalProperties: false, required: ['label', 'value', 'unit', 'sub', 'dim', 'colour', 'from', 'op'], properties: {
  label: { type: 'string' }, value: { type: ['string', 'null'] }, unit: { type: ['string', 'null'] }, sub: { type: ['string', 'null'] }, dim: { type: 'boolean' },
  colour: { type: 'string', enum: ['ink', 'power', 'money', 'time', 'cool'] }, from: { type: ['array', 'null'], items: { type: 'integer' } }, op: { type: ['string', 'null'] } } };
export const SPEC_SCHEMA = { type: 'object', additionalProperties: false, required: ['type', 'gold', 'note', 'items', 'columns', 'svg'], properties: {
  type: { type: 'string', enum: ['chain', 'numbers', 'compare', 'calc', 'split', 'svg'] }, gold: { type: ['string', 'null'] }, note: { type: ['string', 'null'] },
  items: { type: ['array', 'null'], items: ITEM, maxItems: 5 },
  columns: { type: ['array', 'null'], maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['heading', 'dim', 'items'],
    properties: { heading: { type: 'string' }, dim: { type: 'boolean' }, items: { type: 'array', items: ITEM, maxItems: 4 } } } },
  svg: { type: ['string', 'null'] } } };

const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const ink = (c: Colour) => `var(--${c})`;
const STOP = new Set(['the', 'and', 'for', 'with', 'not', 'from', 'into', 'per', 'its', 'are', 'but', 'than', 'that', 'this', 'via']);
const words = (s: string) => s.toLowerCase().match(/[a-z][a-z0-9]{2,}/g)?.filter(w => !STOP.has(w)) ?? []; // "stick-build" is cued by stick or build

/** Each part's cue words: its own words that no other part has, so saying one lights that part and no other. */
export function cues(labels: string[]): string[] {
  const all = labels.map(words);
  return all.map((ws, i) => [...new Set(ws)].filter(w => !all.some((o, j) => j !== i && o.includes(w))).join('|'));
}

/** Text broken into lines that fit `width`, shrinking from `size` toward 20 px if it won't fit in `max` lines (by an average glyph width). */
export function fit(text: string, size: number, width: number, max = 2): { lines: string[]; size: number } {
  for (;; size -= 2) {
    const per = Math.floor(width / (size * 0.55)), lines: string[] = [];
    for (const w of text.trim().split(/\s+/)) {
      if (lines.length && `${lines.at(-1)} ${w}`.length <= per) lines[lines.length - 1] += ` ${w}`;
      else lines.push(w);
    }
    if ((lines.length <= max && lines.every(l => l.length <= per)) || size <= 20) {
      const kept = lines.slice(0, max);
      if (lines.length > max || kept[max - 1]?.length > per) kept[kept.length - 1] = `${kept.at(-1)!.slice(0, per - 1).trimEnd()}…`;
      return { lines: kept, size };
    }
  }
}
const lead = (t: { lines: string[]; size: number }) => t.lines.length * t.size * 1.2;
const text = (x: number, y: number, t: { lines: string[]; size: number }, fill: string, anchor = 'middle') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${t.size}" text-anchor="${anchor}">${t.lines.map((l, i) => `<tspan x="${x}" dy="${i ? t.size * 1.2 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
const number = (x: number, y: number, it: Item, size: number, fill: string, anchor = 'middle') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}">${esc(it.value ?? '')}${it.unit ? `<tspan dx="${Math.round(size * 0.15)}" fill="var(--ink-dim)" font-size="${Math.max(20, Math.round(size * 0.36))}">${esc(it.unit)}</tspan>` : ''}</text>`;
/** The largest size, up to `size`, at which each of these numbers with its unit fits `width`: siblings share one size. */
const numberSize = (items: Item[], size: number, width: number) =>
  Math.floor(Math.min(size, ...items.filter(it => it.value).map(it => width / (0.55 * (it.value!.length + 0.45 * (it.unit?.length ?? 0) + 0.3)))));
const step = (cue: string, body: string) => `<g class="step"${cue ? ` data-cue="${cue}"` : ''}>${body}</g>`;
const goldIndex = (labels: string[], gold: string | null, fallback: number) => {
  const i = labels.findIndex(l => gold && l.toLowerCase() === gold.trim().toLowerCase());
  return i >= 0 ? i : fallback;
};

// Type sizes by how many boxes share the width: fewer parts, drawn larger.
const SIZES = [{ label: 40, sub: 24, value: 80 }, { label: 34, sub: 24, value: 64 }, { label: 30, sub: 22, value: 56 }, { label: 28, sub: 22, value: 48 }, { label: 24, sub: 20, value: 40 }];
type Sizes = typeof SIZES[number];

/** What goes inside a box, top to bottom: label, then the value with its unit, then the detail; and how tall it is. */
function content(it: Item, w: number, sz: Sizes, gold: boolean, cx: number, top: number) {
  const label = fit(it.label, sz.label, w - 40), sub = it.sub ? fit(it.sub, sz.sub, w - 40) : null;
  let y = top + label.size, out = text(cx, y, label, it.dim ? 'var(--ink-dim)' : 'var(--ink)');
  y += lead(label) - label.size * 1.2;
  if (it.value) { y += sz.value * 1.1; out += number(cx, y, it, sz.value, gold ? 'var(--gold)' : 'var(--ink)'); }
  if (sub) { y += sub.size * 1.5; out += text(cx, y, sub, 'var(--ink-dim)'); y += lead(sub) - sub.size * 1.2; }
  return { svg: out, height: y - top + sz.label * 0.3 };
}

/** A box: fill and stroke by meaning, gold or dashed when it's the focus or uncertain, its content centred. */
function box(x: number, y: number, w: number, h: number, it: Item, gold: boolean, sz: Sizes) {
  const stroke = gold ? 'var(--gold)' : it.dim ? 'var(--ink-dim)' : ink(it.colour);
  const fill = gold ? 'var(--gold)' : it.colour === 'ink' || it.dim ? '' : ink(it.colour);
  const inner = content(it, w, sz, gold, x + w / 2, 0);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill || 'var(--panel)'}"${fill ? ' fill-opacity=".12"' : ''} stroke="${stroke}" stroke-width="${gold ? 3 : 2}"${it.dim ? ' stroke-dasharray="8 8"' : ''}/>`
    + `<g transform="translate(0 ${y + (h - inner.height) / 2})">${inner.svg}</g>`;
}
const arrowStroke = (it: Item) => it.dim ? 'var(--ink-dim)' : it.colour === 'power' || it.colour === 'money' ? ink(it.colour) : 'var(--ink-dim)';
const line = (it: Item) => it.dim ? ' stroke-dasharray="8 8"' : ' class="draw" pathLength="1"';

/**
 * Boxes that lead to each other. A straight run of four or five reads top to bottom, so each box can be
 * wide; otherwise left to right in columns by how far along the flow they are, a second starting point
 * just before the box it feeds, so a merge reads as two lines gliding into one.
 */
const inputsOf = (items: Item[]) => items.map((it, i) => (it.from ?? (i ? [i - 1] : [])).filter(j => Number.isInteger(j) && j >= 0 && j < i));
const straight = (items: Item[]) => items.length >= 4 && inputsOf(items).every((ins, i) => i ? ins.length === 1 && ins[0] === i - 1 : !ins.length);
/** Each box's column, by how far along the flow it is; a second starting point sits just before the box it feeds. */
function depths(inputs: number[][]): number[] {
  const depth = inputs.reduce<number[]>((d, ins) => [...d, ins.length ? 1 + Math.max(...ins.map(j => d[j])) : 0], []);
  inputs.forEach((ins, i) => {
    const fed = inputs.flatMap((other, k) => other.includes(i) ? [depth[k]] : []);
    if (!ins.length && fed.length) depth[i] = Math.min(...fed) - 1;
  });
  return depth;
}

function chain(items: Item[], gold: string | null): string[] {
  const n = items.length, g = goldIndex(items.map(i => i.label), gold, n - 1), cue = cues(items.map(i => i.label));
  if (n === 1) return [step(cue[0], box(300, 195, 600, 300, items[0], true, { ...SIZES[0], value: numberSize(items, SIZES[0].value, 560) }))];
  const inputs = inputsOf(items);
  if (straight(items)) {
    const gap = 40, h = Math.min(100, (570 - gap * (n - 1)) / n), top = 345 - (n * h + (n - 1) * gap) / 2, sz = SIZES[2];
    return items.map((it, i) => {
      const y = top + i * (h + gap), stroke = i === g ? 'var(--gold)' : it.dim ? 'var(--ink-dim)' : ink(it.colour);
      const fill = i === g ? 'var(--gold)' : it.colour === 'ink' || it.dim ? '' : ink(it.colour), tx = 240 + 36, mid = y + h / 2;
      const label = fit(it.label, sz.label, it.value || it.sub ? 380 : 650, 1), room = 924 - (tx + label.lines[0].length * label.size * 0.55) - 32;
      const sub = it.sub && !it.value ? fit(it.sub, 22, room) : null;
      const right = it.value ? number(924, mid + sz.label * 0.35, it, numberSize([it], 40, room), i === g ? 'var(--gold)' : 'var(--ink)', 'end')
        : sub ? text(924, mid + sub.size * 0.35 - (sub.lines.length - 1) * sub.size * 0.6, sub, 'var(--ink-dim)', 'end') : '';
      return step(cue[i], [i ? `<path${line(it)} d="M600 ${y - gap + 6} V${y - 8}" fill="none" stroke="${arrowStroke(it)}" stroke-width="2"/><path d="M592 ${y - 17} L600 ${y - 8} L608 ${y - 17}" fill="none" stroke="${arrowStroke(it)}" stroke-width="2"/>` : '',
        `<rect x="240" y="${y}" width="720" height="${h}" rx="6" fill="${fill || 'var(--panel)'}"${fill ? ' fill-opacity=".12"' : ''} stroke="${stroke}" stroke-width="${i === g ? 3 : 2}"${it.dim ? ' stroke-dasharray="8 8"' : ''}/>`,
        text(tx, mid + label.size * 0.35, label, it.dim ? 'var(--ink-dim)' : 'var(--ink)', 'start'), right].join(''));
    });
  }
  const depth = depths(inputs), cols = Math.max(...depth) + 1, colW = 1080 / cols, w = Math.min(colW - 64, 380), base = SIZES[Math.min(4, cols - 1)];
  const sz = { ...base, value: numberSize(items, base.value, w - 40) };
  const rows = Math.max(...depth.map(d => depth.filter(e => e === d).length)), gap = 40;
  const h = Math.min((570 - (rows - 1) * gap) / rows, Math.max(cols > 3 ? 150 : 200, ...items.map(it => content(it, w, sz, false, 0, 0).height + 48)));
  const at = items.map((_, i) => {
    const col = items.map((_, k) => k).filter(k => depth[k] === depth[i]), stack = col.length * h + (col.length - 1) * gap;
    return { x: 60 + depth[i] * colW + (colW - w) / 2, y: 345 - stack / 2 + col.indexOf(i) * (h + gap) };
  });
  return items.map((it, i) => step(cue[i], [...inputs[i].map(j => {
    const x1 = at[j].x + w + 8, y1 = at[j].y + h / 2, x2 = at[i].x - 10, y2 = at[i].y + h / 2, mx = (x1 + x2) / 2, stroke = arrowStroke(it);
    return `<path${line(it)} d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M${x2 - 11} ${y2 - 8} L${x2} ${y2} L${x2 - 11} ${y2 + 8}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
  }), box(at[i].x, at[i].y, w, h, it, i === g, sz)].join('')));
}

/** The numbers that are the point, side by side and big: what each is above it, the detail below. */
function numbers(items: Item[], gold: string | null): string[] {
  const n = items.length, g = goldIndex(items.map(i => i.label), gold, n - 1), cue = cues(items.map(i => i.label));
  const cell = 1080 / n, size = numberSize(items, [140, 104, 84, 68][n - 1], cell - 40);
  return items.map((it, i) => {
    const cx = 60 + cell * (i + 0.5), label = fit(it.label, 30, cell - 60), sub = it.sub ? fit(it.sub, 24, cell - 60) : null;
    return step(cue[i], [text(cx, 300 - lead(label) + 30, label, 'var(--ink-dim)'), number(cx, 300 + size * 0.85, it, size, i === g ? 'var(--gold)' : it.dim ? 'var(--ink-dim)' : 'var(--ink)'),
      sub ? text(cx, 300 + size * 0.85 + 56, sub, 'var(--ink-dim)') : ''].join(''));
  });
}

/** Two columns: a heading over a rule, then items, numbers drawn big; a dim column (forecast, not established) has a dim heading over a dashed rule. */
function compare(columns: Column[], gold: string | null): string[] {
  const cols = columns.slice(0, 2), g = goldIndex(cols.map(c => c.heading), gold, cols.findIndex(c => !c.dim)), cue = cues(cols.map(c => c.heading));
  const all = cols.flatMap(c => c.items.slice(0, 4)), big = numberSize(all, [96, 80, 60, 48][Math.max(...cols.map(c => Math.min(4, c.items.length))) - 1] ?? 48, 500);
  const lay = (c: Column) => {
    const heading = fit(c.heading, 34, 500), fill = c.dim ? 'var(--ink-dim)' : 'var(--ink)';
    const items = c.items.slice(0, 4).map(it => it.value ? { it, label: fit(it.label, 26, 500), size: big } : { it, label: fit(it.label, 30, 500), size: 0 });
    const height = lead(heading) + 34 + items.reduce((s, x) => s + lead(x.label) + (x.size ? x.size * 1.1 : 0) + 28, 0);
    return { heading, fill, items, height };
  };
  const laid = cols.map(lay), top = Math.max(80, 345 - Math.max(...laid.map(l => l.height)) / 2);
  return cols.map((c, i) => {
    const x = 60 + i * 580, { heading, fill, items } = laid[i];
    let y = top + heading.size;
    const parts = [text(x, y, heading, fill, 'start')];
    y += lead(heading) - heading.size * 0.6;
    parts.push(`<path d="M${x} ${y} H${x + 500}" stroke="${i === g ? 'var(--gold)' : c.dim ? 'var(--ink-dim)' : 'var(--faint)'}" stroke-width="${i === g ? 3 : 2}"${c.dim ? ' stroke-dasharray="8 8"' : ''}/>`);
    y += 34;
    for (const { it, label, size } of items) {
      y += label.size;
      parts.push(text(x, y, label, size ? 'var(--ink-dim)' : 'var(--ink)', 'start'));
      y += lead(label) - label.size * 1.2;
      if (size) { y += size * 1.05; parts.push(number(x, y, it, size, 'var(--ink)', 'start')); }
      y += 28;
    }
    return step(cue[i], parts.join(''));
  });
}

/** A ledger: operators in the margin, numbers right-aligned in one column with their units, what each is beside it, a rule above the result. */
function calc(items: Item[], gold: string | null): string[] {
  const n = items.length, g = goldIndex(items.map(i => i.label), gold, n - 1), cue = cues(items.map(i => i.label));
  const pitch = Math.min(130, 540 / n), size = Math.round(Math.min(64, pitch * 0.55));
  const unitW = Math.max(0, ...items.map(it => (it.unit?.length ?? 0) * 26 * 0.55)), vx = 600, lx = vx + 16 + unitW + 48;
  const ox = vx - Math.max(...items.map(it => (it.value?.length ?? 0) * (size + 4) * 0.55)) - 28;
  const top = 345 - (pitch * (n - 1)) / 2 + size / 3;
  return items.map((it, i) => {
    const y = top + i * pitch, last = i === n - 1 && n > 1 && /^[=≈]$/.test(it.op?.trim() ?? '');
    const fill = i === g ? 'var(--gold)' : it.dim ? 'var(--ink-dim)' : 'var(--ink)';
    return step(cue[i], [
      last ? `<path class="draw" pathLength="1" d="M${ox - 40} ${y - pitch / 2 - size / 4} H1140" stroke="var(--faint)" stroke-width="2"/>` : '',
      i && it.op ? `<text x="${ox}" y="${y}" fill="var(--ink-dim)" font-size="40" text-anchor="end">${esc(it.op.trim())}</text>` : '',
      `<text x="${vx}" y="${y}" fill="${fill}" font-size="${i === g ? size + 4 : size}" text-anchor="end">${esc(it.value ?? '')}</text>`,
      it.unit ? `<text x="${vx + 16}" y="${y}" fill="var(--ink-dim)" font-size="26">${esc(it.unit)}</text>` : '',
      text(lx, y, fit(it.label, 26, 1140 - lx, 1), 'var(--ink-dim)', 'start'),
    ].join(''));
  });
}

/** One bar for the whole, divided in proportion to the parts' values (equally if they aren't numbers), each named beneath its share. */
function split(items: Item[], gold: string | null): string[] {
  const [whole, ...parts] = items, g = goldIndex(parts.map(p => p.label), gold, 0), cue = cues(items.map(i => i.label));
  const nums = parts.map(p => parseFloat((p.value ?? '').replace(/[^\d.]/g, '')));
  const weights = nums.every(v => v > 0) ? nums : parts.map(() => 1), sum = weights.reduce((s, v) => s + v, 0);
  const room = 1080 - 4 * (parts.length - 1), widths = weights.map(v => Math.max(90, (v / sum) * room)), scale = room / widths.reduce((s, v) => s + v, 0);
  const head = `${whole.label}${whole.value ? ` · ${whole.value}${whole.unit ? ` ${whole.unit}` : ''}` : ''}`;
  let x = 60, slivers = 0;
  return [step(cue[0], `${text(60, 238, fit(head, 30, 1080, 1), 'var(--ink-dim)', 'start')}<rect x="60" y="270" width="1080" height="150" rx="6" fill="none" stroke="var(--faint)" stroke-width="2"/>`),
    ...parts.map((p, i) => {
      const w = widths[i] * scale, left = x, colour = i === g ? 'var(--gold)' : p.dim ? 'var(--ink-dim)' : ink(p.colour);
      x += w + 4;
      const wide = w >= 160, size = w >= 260 ? 64 : 48;
      const name = wide ? text(left, 466, fit(p.label, 26, w - 8), 'var(--ink)', 'start')
        : text(left + w / 2 > 600 ? left + w : left, 466 + 32 * ++slivers, { lines: [[p.label, p.value, p.unit].filter(Boolean).join(' ')], size: 24 }, 'var(--ink)', left + w / 2 > 600 ? 'end' : 'start');
      return step(cue[i + 1], [`<rect x="${left}" y="270" width="${w}" height="150" rx="6" fill="${colour}" fill-opacity=".12" stroke="${colour}" stroke-width="${i === g ? 3 : 2}"${p.dim ? ' stroke-dasharray="8 8"' : ''}/>`,
        p.value && wide ? number(left + w / 2, 345 + size * 0.35, { ...p, unit: w >= 260 ? p.unit : null }, size, i === g ? 'var(--gold)' : 'var(--ink)') : '', name].join(''));
    })];
}

/**
 * What a drawing looks like, in a line, for the mind, who can't see it but walks the person through it:
 * its layout, its parts in the order they appear, and the gold one.
 */
export function describe(spec: Spec, html = render(spec)): string {
  const says = (it: Item) => [it.label, it.value && `${it.value}${it.unit ? ` ${it.unit}` : ''}`].filter(Boolean).join(' ');
  const items = spec.items ?? [], n = items.length, labels = items.map(i => i.label);
  const gold = (fallback: number) => `; in gold: ${labels[goldIndex(labels, spec.gold, fallback)]}`;
  if (spec.type === 'compare' && spec.columns?.length) {
    const cols = spec.columns.slice(0, 2), g = goldIndex(cols.map(c => c.heading), spec.gold, cols.findIndex(c => !c.dim));
    return `two columns: ${cols.map((c, i) => `${['on the left', 'on the right'][i]}, "${c.heading}"${c.dim ? ' (dashed: not established)' : ''}: ${c.items.slice(0, 4).map(says).join('; ')}`).join('; ')}${g >= 0 ? `; in gold: ${cols[g].heading}` : ''}`;
  }
  if (spec.type === 'svg' || !n) { // a hand drawing: its parts by their words, in the order they appear, each with where it is
    const parts = [...html.matchAll(/<g class="step"[^>]*>([\s\S]*?)<\/g>/g)].map(([, s]) => {
      const words = s.replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)).replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      const [x, y] = ['x', 'y'].map(a => Number(s.match(new RegExp(`\\b${a}="(-?[\\d.]+)"`))?.[1] ?? NaN)); // its first element's corner, near enough
      const where = [y < 250 ? 'top' : y > 500 ? 'bottom' : '', x < 400 ? 'left' : x > 800 ? 'right' : 'middle'].filter(Boolean).join(' ');
      return words && (Number.isNaN(x) || Number.isNaN(y) ? words : `${words} (${where})`);
    }).filter(Boolean);
    return parts.length ? `a drawing that builds up: ${parts.join(' / ')}` : 'a drawing, all at once';
  }
  if (spec.type === 'numbers') return `${Math.min(n, 4)} big numbers side by side, left to right: ${items.slice(0, 4).map(says).join('; ')}${gold(Math.min(n, 4) - 1)}`;
  if (spec.type === 'calc') return `a calculation, one line per number from the top: ${items.map((it, i) => `${i && it.op ? `${it.op.trim()} ` : ''}${says(it)}`).join(', ')}, the result last${gold(n - 1)}`;
  if (spec.type === 'split' && n > 1) return `one bar for ${says(items[0])}, divided left to right into ${items.slice(1).map(says).join(', ')}; in gold: ${labels.slice(1)[goldIndex(labels.slice(1), spec.gold, 0)]}`;
  if (n === 1 || straight(items)) return `${n === 1 ? 'one box' : 'a chain of boxes, top to bottom'}: ${items.map(says).join(' → ')}${gold(n - 1)}`;
  const depth = depths(inputsOf(items)); // boxes in one column are stacked: "A and B → C"
  const cols = [...new Set(depth)].sort((a, b) => a - b).map(d => items.filter((_, i) => depth[i] === d).map(says).join(' and '));
  return `a chain of boxes, left to right: ${cols.join(' → ')}${gold(n - 1)}`;
}

/** The visual's HTML: a kit drawing laid out here, or the model's own SVG. */
export function render(spec: Spec): string {
  if (spec.type === 'svg' || !(spec.type === 'compare' ? spec.columns?.length : spec.items?.length)) return spec.svg ?? '';
  const parts = spec.type === 'compare' ? compare(spec.columns!, spec.gold)
    : spec.type === 'numbers' ? numbers(spec.items!.slice(0, 4), spec.gold)
    : spec.type === 'calc' ? calc(spec.items!, spec.gold)
    : spec.type === 'split' && spec.items!.length > 1 ? split(spec.items!, spec.gold)
    : chain(spec.items!, spec.gold);
  if (spec.note) { const note = fit(spec.note, 22, 1080); parts.push(step('', text(60, 712 - (note.lines.length - 1) * 26, note, 'var(--ink-dim)', 'start'))); }
  return `<svg viewBox="0 0 1200 750" width="1200" height="750">${parts.join('')}</svg>`;
}
