import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config, openai } from './config.ts';
import { KIT, SPEC_SCHEMA, describe, render } from './kit.ts';
import type { Visual } from './space.ts';

// The board: a screen beside the voice where the mind puts up visuals and writes its questions. The
// mind drives it with BOARD lines in its turns (see mindTurn); visuals come from the space's visuals/
// or are drawn on the spot. The page follows one session at a time; with no page in view, the mind
// is told nothing about the board and the session runs on voice alone.

/** A line like "BOARD: show 03-trip" in a turn: what to put on the person's screen. Never spoken. */
export interface BoardCommand { verb: 'show' | 'draw' | 'keep' | 'ask' | 'term' | 'set'; arg: string }
export const boardCommands = (text: string): BoardCommand[] => [...text.matchAll(/^\s*BOARD:\s*(show|draw|keep|ask|term|set)\b[ \t]*(.*)$/gim)]
  .map(m => ({ verb: m[1].toLowerCase() as BoardCommand['verb'], arg: m[2].trim() })).filter(c => c.verb === 'keep' || c.arg);
/** The turn without its board lines, including one still being written. */
export const withoutBoard = (text: string) => text.replace(/^[ \t]*BOARD:.*$/gim, '').trim();

/** How a visual should look: the kit (kit.ts) lays its diagrams out to it, and the model draws to it when it writes svg. */
export const STYLE = `The style guide, for svg: the fragment is HTML, usually one SVG.

The canvas is 1200 by 750 px, dark (#111214, already set), with a 60 px safe margin; it is scaled to the person's screen. Prefer one inline <svg viewBox="0 0 1200 750" width="1200" height="750">; HTML with flexbox is fine for text and numbers. Inline styles or one <style> block; no external scripts, fonts or images.

Colour tokens (CSS variables, already defined): --ink #ECE9E3 for most strokes and text; --ink-dim #8A8780 for secondary labels; --faint #3A3B40 for guides and axes; --panel #1C1D20 for fills; --gold #D9A441, the focus: exactly one gold element, the thing to look at; then by meaning, --power #D97A3D (energy, load, effort), --money #7FB77E (money), --time #7A9CC6 (dates, schedules), --cool #5FA8B8 (water, cooling, calm things). Fills are the stroke colour at about 12% opacity. Forecasts and anything uncertain are dashed --ink-dim. In SVG use fill="var(--ink)" etc.

Type: the system font is set. Big numbers 56-72 px, labels 24-28 px, small labels 20 px, nothing under 18 px. A big number carries a small dim unit beside it (40 ms, $2M, 300 couriers), and every number sits in or directly under the thing it measures. Labels are nouns, not sentences; no title, no bullet lists, no paragraphs, no legend (label things directly). Strokes 2 px (3 px emphasised), round caps and joins, 6 px corner radii. No gradients, shadows, 3D, emoji, icons, clip art or pie charts.

Less is the whole job. One idea; at most five boxes, six numbers, twelve words of labels and one gold element. Boxes never nest: containment is a bar divided into parts, or a ladder, never boxes inside boxes. No formulas written as sentences: a calculation is numbers with operators between them. If the request asks for more than fits, draw the one idea and drop the rest. Fewer parts, larger: the drawing fills the canvas.

Build-up: the board follows the speech. Wrap each part that should appear in sequence in an element with class="step" and data-cue="the word said when it gets to it", lower case, several alternatives separated by |. The cue is the part's own label noun (courier, lease, overhead): it is bound to be said. Never a number (numbers are spoken in too many ways) or a phrase that might be put differently: a cue that isn't said leaves the part hidden until the speech stops. Parts with no data-cue appear at once. Use two to five steps when the idea unfolds (a ladder, a chain, a calculation line by line). SVG lines and paths can draw themselves in: add class="draw" pathLength="1". Motion only where it means something: a flow can move for a few seconds (class="flow" on a path animates dashes along it); a number that is the punchline can count up. Nothing loops for decoration.

The register to aim for, a calculation (yours will differ in shape, not in restraint):
<svg viewBox="0 0 1200 750" width="1200" height="750">
  <g class="step" data-cue="orders"><text x="170" y="124" fill="var(--ink-dim)" font-size="26">Orders a day</text>
    <text x="170" y="204" fill="var(--ink)" font-size="68">12,000<tspan dx="15" fill="var(--ink-dim)" font-size="26">orders</tspan></text></g>
  <g class="step" data-cue="courier"><text x="485" y="198" fill="var(--ink-dim)" font-size="48">÷</text>
    <text x="650" y="124" fill="var(--ink-dim)" font-size="26">Per courier</text>
    <text x="650" y="204" fill="var(--ink)" font-size="68">40<tspan dx="15" fill="var(--ink-dim)" font-size="26">orders / day</tspan></text></g>
  <g class="step" data-cue="divide|couriers"><path class="draw" pathLength="1" d="M170 250 H1030" stroke="var(--faint)" stroke-width="2"/>
    <text x="90" y="372" fill="var(--ink-dim)" font-size="40">=</text>
    <text x="170" y="380" fill="var(--gold)" font-size="72">300<tspan dx="15" fill="var(--ink-dim)" font-size="26">couriers</tspan></text></g>
</svg>

In svg, write only the fragment: no code fences, no <html>, <head> or <body>.`;

const unfence = (html: string) => html.trim().replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

/**
 * Draws one visual, with a line on what it looks like; live, during a session, on the fast tier. The model
 * fills in a kit diagram (about 1.5 s) rather than writing SVG (about 4.5 s), unless it's a physical thing only a hand-drawing shows.
 */
export async function draw(request: string, opts: { said?: string } = {}): Promise<{ html: string; looks: string }> {
  const res = await openai().responses.create({
    model: config.mindModel,
    reasoning: { effort: 'low' }, // medium drew busier pictures than low, not better ones
    service_tier: config.mindTier,
    input: [{ role: 'system', content: `${KIT}\n\n${STYLE}` }, { role: 'user', content: [
      `Draw this: ${request}`,
      opts.said && `What is being said while it's up:\n${opts.said}`,
    ].filter(Boolean).join('\n\n') }],
    text: { format: { type: 'json_schema', name: 'diagram', schema: SPEC_SCHEMA, strict: true } },
  });
  const spec = JSON.parse(res.output_text), html = unfence(render(spec));
  if (!html) throw new Error(`nothing drawn: ${res.output_text.slice(0, 200)}`);
  return { html, looks: describe(spec, html) };
}

/** What the mind is told about the board while a page is open; added to its instructions. */
export const boardInstructions = (bank: Visual[]) => `The person has a screen in front of them: a board you control, which they watch while you talk. You drive it with board lines, each on its own line and never spoken: the visual as the very first line of your turn, so it's up the moment they start hearing you; then any set lines; then your words; then ask and term at the very end.
BOARD: show <id>  puts up one of the space's prepared visuals (below).
BOARD: draw <what to draw>  has one drawn on the spot; it lands a couple of seconds into your turn.
BOARD: keep  leaves the visual that's up.
BOARD: set <what>  changes a prepared visual that's up, as its note says ("set play", "set answer 600"); it moves as you start speaking, so say what it's doing ("watch the total"). Several in a row are fine.
BOARD: set labels off  hides the labels of a visual that has them, for the person to name: each comes back as they say it. "set labels on" brings them all back.
BOARD: ask <your question, as they should read it>  writes the question you've just asked on the board when you finish speaking.
BOARD: term <a term, name or number you've just used for the first time>: <what it is, in five words or so>  puts it in a line above the board, so they have its spelling and meaning after hearing it once.

The board always shows the visual for the idea you're on. Start every turn with exactly one of show, draw or keep: show or draw when the idea changes or they ask to see something; keep when it hasn't (a verdict, a follow-up on the same point, a question and its answer). On your first turn nothing is up yet. End with an ask if you asked a question, and a term if you brought one in.

The prepared visuals' notes say when each belongs: follow them, and leave a visual for a tangent or a drawing, then come back. When you put a prediction or choice to the person, the visual stays as it is until they have answered: the move is the answer, so it comes in your next turn, with set, as you say what happened.

They watch their screen closely, so a turn that puts up a new visual works through it, in the same few sentences: explain the idea while the board shows it, saying what's happening as it happens ("now it multiplies each of your numbers by the weight under it"). Its parts come up, or play, as you say the words its note gives, so say them in the order it gives, within that turn. Don't describe the picture or read its labels out ("on the left is...", "this shows..., left to right"): they can see where things are, and a tour of them explains nothing; your words say what things mean and why. A drawing you ask for shows the parts your request names, in the order it names them: name three or four, and name them in that order as you speak; you can't see which way it's laid out, so give the order ("first..., then...") rather than a direction. With keep, don't go over it again: build on the part you're on.

Prefer a prepared visual when one fits; otherwise draw the idea: its structure, scale, flow, timeline or calculation, with its parts in the order you'll name them and the real numbers and names it needs.

The space's prepared visuals (id: title. What it shows, when it goes up, and how it moves):
${bank.length ? bank.map(v => `- ${v.id}: ${v.title}. ${v.when}${v.looks ? ` Looks: ${v.looks}.` : ''}`).join('\n') : '(none: draw what you need)'}`;

// The live board: one state, pushed to every open page, belonging to one session at a time.
type BoardEvent = { type: string; [k: string]: unknown };
const pages = new Set<(e: BoardEvent) => void>();
let screen: { visual?: { title: string; html: string; id?: string; looks?: string }; sets?: string[]; question?: string; term?: string } = {};
let recap: BoardEvent | undefined; // the last session's recap, for a page that reconnects while notes are saved
let drawn = 0; // counts drawings asked for, so a late one that a newer visual has passed is dropped
let drawingsDir = '';

export const connected = () => pages.size > 0;
export const onScreen = () => [screen.visual && `the visual "${screen.visual.title}"${screen.visual.looks ? ` (${screen.visual.looks})` : ''}`, screen.question && `your question "${screen.question}"`].filter(Boolean).join(', and under it ') || 'nothing yet';
const publish = (e: BoardEvent) => pages.forEach(page => page(e));
/** Anything else the page shows (the session's cost, its recap) travels the same stream. */
export function push(e: BoardEvent) { if (e.type === 'recap') recap = e; publish(e); }

/** A page connects: it gets what's on the board now, then everything new. Returns the disconnect. */
export function subscribe(page: (e: BoardEvent) => void) {
  pages.add(page);
  if (screen.visual) page({ type: 'visual', title: screen.visual.title, html: screen.visual.html, replay: true });
  for (const arg of screen.sets ?? []) page({ type: 'set', arg }); // a working visual as it is now, not as it started
  if (screen.question) page({ type: 'ask', question: screen.question, replay: true });
  if (screen.term) page({ type: 'term', term: screen.term });
  if (recap) page({ ...recap, replay: true });
  return () => { pages.delete(page); };
}

function show(title: string, html: string, id?: string, looks?: string) {
  screen.visual = { title, html, id, looks };
  screen.sets = [];
  publish({ type: 'visual', title, html });
}

function ask(question: string) {
  screen.question = question;
  publish({ type: 'ask', question });
}

function term(text: string) {
  screen.term = text;
  publish({ type: 'term', term: text });
}

/** A session starts: a clean board. Drawings made during it are saved in `drawings` (a session folder's). */
export function start(drawings = '') {
  screen = {}; drawn++; recap = undefined; drawingsDir = drawings; // a drawing still coming from the last session is dropped
  publish({ type: 'clear' });
}

/** The mind's next turn starts being spoken: the question it asked is answered, so it goes. The page follows the words (`said`). */
export function speaking() { delete screen.question; publish({ type: 'turn' }); }
export const said = (text: string) => publish({ type: 'said', text });
/** The person's words, as they come: a visual with its labels off brings each back as they name it. */
export const heard = (text: string) => publish({ type: 'heard', text });
export function end() { publish({ type: 'end' }); screen = {}; drawn++; }

/** Each drawing that went up is kept in the session folder, its `looks` as a leading comment. */
function save(title: string, html: string, looks: string) {
  if (!drawingsDir || !html) return;
  mkdirSync(drawingsDir, { recursive: true });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'drawing';
  writeFileSync(join(drawingsDir, `${String(readdirSync(drawingsDir).length + 1).padStart(2, '0')}-${slug}.html`), `<!-- ${(looks || title).replaceAll('--', '-')} -->\n${html}\n`);
}

/**
 * Carries out a spoken turn's board lines; `keep` changes nothing, and nor does showing what's already
 * up. A drawing lands a few seconds later, unless another visual went up meanwhile. Returns the drawing's promise (for the session log, which keeps its html, and tests), if there is one.
 */
export function apply(commands: BoardCommand[], spoken: string, bank: Visual[], drawFn = draw): Promise<{ ms: number; html: string; looks: string } | { error: string }> | undefined {
  let drawing;
  for (const c of commands) {
    const v = c.verb === 'show' && bank.find(b => b.id === c.arg);
    if (v) { if (screen.visual?.id !== v.id) { drawn++; show(v.title, v.html, v.id, v.looks); } } // the one that's up stays as it is, built up
    else if (c.verb === 'show' || c.verb === 'draw') { // an id that isn't in the bank is drawn from the words instead: the board stays on the idea
      const mine = ++drawn, t0 = Date.now();
      drawing = drawFn(c.arg, { said: spoken }).then(
        ({ html, looks }) => {
          if (mine === drawn) { const title = c.arg.split(/[.:;]/)[0].slice(0, 80); show(title, html, undefined, looks); save(title, html, looks); }
          return { ms: Date.now() - t0, html, looks };
        },
        err => ({ error: String(err) }),
      );
    } else if (c.verb === 'ask') ask(c.arg);
    else if (c.verb === 'term') term(c.arg);
    else if (c.verb === 'set' && screen.visual) { screen.sets!.push(c.arg); publish({ type: 'set', arg: c.arg }); }
  }
  return drawing;
}
