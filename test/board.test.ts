import './setup.ts';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as board from '../src/board.ts';
import { openai, spend } from '../src/config.ts';
import { boardCommands, boardInstructions, withoutBoard } from '../src/board.ts';

test("board lines are read from the end of a turn and never spoken", () => {
  const turn = "A queue is the line. It holds about 40 orders. So how many couriers is that?\nBOARD: show queue-ladder\nBOARD: ask How many couriers do 300 orders need?";
  assert.deepEqual(boardCommands(turn), [{ verb: 'show', arg: 'queue-ladder' }, { verb: 'ask', arg: 'How many couriers do 300 orders need?' }]);
  assert.equal(withoutBoard(turn), 'A queue is the line. It holds about 40 orders. So how many couriers is that?');
  // While it streams, a half-written board line is already out of the speech.
  assert.equal(withoutBoard('So how many couriers is that?\nBOARD: dr'), 'So how many couriers is that?');
  // A board line first, against instructions, still isn't spoken.
  assert.equal(withoutBoard('BOARD: draw the order chain\nHere is the chain.'), 'Here is the chain.');
  assert.deepEqual(boardCommands('No board today. The word BOARD: in a sentence is not a command.'), []);
  assert.deepEqual(boardCommands('Watch the total.\nBOARD: set answer 600'), [{ verb: 'set', arg: 'answer 600' }]);
  // keep takes nothing; a term carries its meaning; a show with no id is no command.
  assert.deepEqual(boardCommands('Right.\nBOARD: keep\nBOARD: term SLA: the promised response time\nBOARD: show'),
    [{ verb: 'keep', arg: '' }, { verb: 'term', arg: 'SLA: the promised response time' }]);
  // clear takes nothing either, and a turn may have no board line at all.
  assert.deepEqual(boardCommands('BOARD: clear\nNow, tell me about yourself.'), [{ verb: 'clear', arg: '' }]);
  assert.equal(withoutBoard('BOARD: clear\nNow, tell me about yourself.'), 'Now, tell me about yourself.');
  assert.deepEqual(boardCommands('Now, tell me about yourself.'), []);
});

test('the board is optional, and the brief overrides what the mind is told about using it', () => {
  const text = boardInstructions(bank);
  assert.match(text, /The board is optional\. A turn may start with show, draw, keep or clear, or have no board line at all, which keeps what's up\./);
  assert.match(text, /BOARD: clear {2}empties the board, which then shows the session title, as when nothing is up\./);
  assert.match(text, /ask <your question[^\n]*Optional: use it when seeing the question written helps them\./);
  assert.match(text, /On your first turn nothing is up, and you may leave it that way\./);
  assert.match(text, /The brief's instructions about the board, turn length, pacing and questions override these defaults\./);
  assert.doesNotMatch(text, /Start every turn|always shows|End with an ask/);
  assert.match(text, /- ladder: The scale ladder\. Teaching 1 Looks:/);
});

function page() {
  const events: any[] = [];
  const off = board.subscribe(e => events.push(e));
  return { events, off, types: () => events.map(e => e.type) };
}
const bank = [{ id: 'ladder', title: 'The scale ladder', when: 'Teaching 1', html: '<svg></svg>', looks: 'a chain of boxes, top to bottom: Order → Pick → Pack → Ship; in gold: Ship' }];

test('the board shows, draws and asks for the turn being spoken, and tells the mind what is up', async t => {
  t.after(board.end);
  const p = page();
  board.start();
  assert.deepEqual(p.types(), ['clear']);
  assert.equal(board.onScreen(), 'nothing yet');

  board.apply([{ verb: 'keep', arg: '' }, { verb: 'term', arg: 'SLA: the promised response time' }], 'spoken', bank);
  assert.deepEqual(p.events.at(-1), { type: 'term', term: 'SLA: the promised response time' });
  board.apply([{ verb: 'show', arg: 'ladder' }, { verb: 'ask', arg: 'How many couriers for 300 orders?' }], 'spoken', bank);
  assert.deepEqual(p.events.slice(-2).map(e => e.type), ['visual', 'ask']);
  // The mind knows what's up, so it can point at its parts.
  assert.equal(board.onScreen(), 'the visual "The scale ladder" (a chain of boxes, top to bottom: Order → Pick → Pack → Ship; in gold: Ship), and under it your question "How many couriers for 300 orders?"');
  // A turn's opening visual is put up as it starts and again when it's written: the second changes nothing, so it isn't built up again from blank.
  const shown = p.events.length;
  board.apply([{ verb: 'show', arg: 'ladder' }], 'spoken', bank);
  assert.equal(p.events.length, shown);

  board.speaking(); // the next turn starts: the question it asked is answered
  assert.equal(board.onScreen(), 'the visual "The scale ladder" (a chain of boxes, top to bottom: Order → Pick → Pack → Ship; in gold: Ship)');
  const chain = { verb: 'draw' as const, arg: 'The order chain: intake, picking, handoff' };
  let drawings = 0;
  const drawFn = async (request: string, opts?: { said?: string }) => ({ html: `<p>${request} / ${opts?.said}</p>`, looks: `drawing ${++drawings}` });
  const drawing = board.apply([chain], 'the words', bank, drawFn);
  board.apply([{ verb: 'ask', arg: 'Which comes first?' }], 'the words', bank, drawFn);
  const result = await drawing!;
  assert.ok('ms' in result && result.html.startsWith('<p>The order chain') && result.looks === 'drawing 1');
  assert.deepEqual(p.events.at(-1), { type: 'visual', title: 'The order chain', html: '<p>The order chain: intake, picking, handoff / the words</p>' });
  assert.match(board.onScreen(), /^the visual "The order chain" \(drawing 1\), and under it your question "Which comes first\?"$/);

  // A page that opens mid-session gets what's up now.
  const late = page();
  assert.deepEqual(late.types(), ['visual', 'ask', 'term']);
  assert.ok(late.events[0].replay);
  p.off(); late.off();
  assert.equal(board.connected(), false);
});

test('clear empties the board for the page and for the mind, and drops a drawing still coming', async t => {
  t.after(board.end);
  board.start();
  const p = page();
  board.apply([{ verb: 'show', arg: 'ladder' }, { verb: 'ask', arg: 'Ready?' }, { verb: 'term', arg: 'SLA: promised time' }], '', bank);
  let finish!: (drawn: { html: string; looks: string }) => void;
  const drawing = board.apply([{ verb: 'draw', arg: 'Slow drawing' }], '', bank, () => new Promise(r => { finish = r; }));
  board.apply([{ verb: 'clear', arg: '' }], 'spoken', bank);
  assert.equal(p.events.at(-1).type, 'clear');
  assert.equal(board.onScreen(), 'nothing yet');
  finish({ html: '<p>late</p>', looks: '' });
  await drawing;
  assert.equal(p.events.at(-1).type, 'clear'); // the drawing came too late
  const late = page(); // a page that opens now sees an empty board
  assert.deepEqual(late.types(), []);
  late.off();
  board.apply([{ verb: 'show', arg: 'ladder' }], '', bank); // and the same visual can go up again
  assert.equal(p.events.at(-1).type, 'visual');
  p.off();
});

test('a drawing that lands after a newer visual went up is dropped', async t => {
  t.after(board.end);
  board.start();
  const p = page();
  board.speaking();
  let finish!: (drawn: { html: string; looks: string }) => void;
  const drawing = board.apply([{ verb: 'draw', arg: 'Slow drawing' }], '', bank, () => new Promise(r => { finish = r; }));
  board.speaking();
  board.apply([{ verb: 'show', arg: 'ladder' }], '', bank);
  finish({ html: '<p>late</p>', looks: '' });
  await drawing;
  assert.deepEqual(p.events.filter(e => e.type === 'visual').map(e => e.title), ['The scale ladder']);
  // An id that isn't in the bank is drawn from the words instead, so the board stays on the idea.
  await board.apply([{ verb: 'show', arg: 'racks-per-gigawatt' }], 'the words', bank, async request => ({ html: `<p>${request}</p>`, looks: '' }));
  assert.deepEqual(p.events.at(-1), { type: 'visual', title: 'racks-per-gigawatt', html: '<p>racks-per-gigawatt</p>' });
  board.end();
  assert.equal(p.events.at(-1).type, 'end');
  assert.equal(board.onScreen(), 'nothing yet');
  p.off();
});

test("set changes the prepared visual that's up, and a page that opens later sees it as it is now", async t => {
  t.after(board.end);
  board.start();
  const p = page();
  board.apply([{ verb: 'set', arg: 'play' }], '', bank); // nothing's up: nothing to change
  assert.deepEqual(p.types(), []);
  board.apply([{ verb: 'show', arg: 'ladder' }, { verb: 'set', arg: 'answer 600' }, { verb: 'set', arg: 'labels off' }], 'spoken', bank);
  assert.deepEqual(p.events.slice(1), [{ type: 'set', arg: 'answer 600' }, { type: 'set', arg: 'labels off' }]);
  board.heard(' the question goes');
  assert.deepEqual(p.events.at(-1), { type: 'heard', text: ' the question goes' });
  const late = page();
  assert.deepEqual(late.events.map(e => e.type === 'set' ? e.arg : e.type), ['visual', 'answer 600', 'labels off']);
  // A new visual starts as it was made.
  await board.apply([{ verb: 'draw', arg: 'x' }], '', bank, async () => ({ html: '<p></p>', looks: '' }));
  board.apply([{ verb: 'show', arg: 'ladder' }], '', bank);
  const fresh = page();
  assert.deepEqual(fresh.types(), ['visual']);
  p.off(); late.off(); fresh.off();
});

test("a drawing that went up is kept in the session's drawings, its looks as a leading comment; the recap replays to a late page", async t => {
  t.after(board.end);
  const dir = join(mkdtempSync(join(tmpdir(), 'apprenticer-test-')), 'drawings');
  board.start(dir);
  assert.equal(existsSync(dir), false); // nothing drawn yet
  board.apply([{ verb: 'draw', arg: 'The order chain: intake, picking' }], 'words', bank, async () => ({ html: '<svg>chain</svg>', looks: 'a chain -- left to right' }));
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(readdirSync(dir), ['01-the-order-chain.html']);
  assert.equal(readFileSync(join(dir, '01-the-order-chain.html'), 'utf8'), '<!-- a chain - left to right -->\n<svg>chain</svg>\n');
  board.apply([{ verb: 'draw', arg: 'Nothing drawn' }], '', bank, async () => ({ html: '', looks: '' }));
  await new Promise(r => setTimeout(r, 10));
  assert.equal(readdirSync(dir).length, 1); // an empty drawing is not kept
  board.push({ type: 'recap', covered: ['one'], open: '' });
  const late = page();
  assert.deepEqual(late.events.at(-1), { type: 'recap', covered: ['one'], open: '', replay: true });
  late.off();
  board.start(); // a new session forgets the last recap
  const next = page();
  assert.ok(!next.types().includes('recap'));
  next.off();
});

test('the drawer is told to draw only what the request says, to take nothing from the speech, and its tokens are counted', async t => {
  const responses = openai().responses as any, create = responses.create, calls: any[] = [];
  t.after(() => { responses.create = create; });
  const label = 'Design a ledger for payments.';
  responses.create = async (params: any) => {
    calls.push(params);
    return { output_text: JSON.stringify({ type: 'text', gold: null, note: null, columns: null, svg: null, items: [{ label, value: null, unit: null, sub: null, dim: false, colour: 'ink', from: null, op: null }] }),
      usage: { input_tokens: 1000, output_tokens: 50 }, service_tier: 'ultrafast' };
  };
  const spent0 = spend.usd;
  const { html, looks } = await board.draw(label, { said: 'First, the interview question.' });
  const [system, user] = calls[0].input;
  assert.match(system.content, /Draw only what the request describes: no parts, steps, numbers, names, design or answers of your own/);
  assert.match(system.content, /- text: when the request is only a question or a sentence/);
  assert.match(user.content, /^Draw this, and only this: Design a ledger for payments\./);
  assert.match(user.content, /only for the order its parts come in; take nothing from it into the drawing\):\nFirst, the interview question\./);
  assert.ok(html.includes('Design a ledger for payments.') && !html.includes('<rect'));
  assert.equal(looks, `the words, as written: ${label}`);
  assert.ok(Math.abs(spend.usd - spent0 - (1000 * 2 + 50 * 10) / 1e6 * 6) < 1e-12);
});
