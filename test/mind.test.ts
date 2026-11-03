import { tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openai } from '../src/config.ts';
import { PROTOCOL, instructions, mindTurn, notesPass, notesSchema, stripCitations } from '../src/mind.ts';
import { readSpace } from '../src/space.ts';

const space = () => readSpace(tmpSpace({
  'brief.md': '# Design review\n\nYou are my skeptical boss. Push on cost.',
  'notes/you.md': '<!-- What you know about me. -->\n\nI over-engineer.',
  'sources/doc.md': 'The doc says: use Postgres.',
}));

test("the instructions are the protocol, the brief verbatim, sources, notes with what they hold, then the board's", () => {
  const s = space(), text = instructions(s, 'BOARD RULES');
  assert.ok(text.startsWith(PROTOCOL));
  const at = (needle: string) => text.indexOf(needle);
  assert.ok(text.includes(s.brief)); // verbatim
  assert.ok(at('# THE BRIEF') < at('# SOURCES') && at('# SOURCES') < at('# YOUR NOTES') && at('# YOUR NOTES') < at('# THE BOARD'));
  assert.match(text, /## you \(What you know about me\.\)\nI over-engineer\./);
  assert.match(text, /## sources\/doc\.md\nThe doc says: use Postgres\./);
  assert.ok(!instructions(s).includes('# THE BOARD')); // no board open: no board
  // Nothing about teaching or any particular person is built in.
  assert.doesNotMatch(PROTOCOL, /professor|lecture|quiz|course|student|Henry/i);
  assert.match(PROTOCOL, /50 to 90 words/);
  assert.match(PROTOCOL, /Unless the brief says otherwise/);
});

function stream(text: string) {
  const responses = openai().responses as any, create = responses.create, calls: any[] = [];
  responses.create = async (params: any) => { calls.push(params); return (async function* () { for (const delta of text.match(/[\s\S]{1,8}/g)!) yield { type: 'response.output_text.delta', delta }; })(); };
  return { calls, restore: () => { responses.create = create; } };
}

test("the board line that opens a turn is reported as soon as it's written, and WAIT is never spoken", async t => {
  const s = stream('BOARD: draw The order chain: intake, picking, handoff\nWhat you are seeing now is the chain from an order to the door, running left to right. It starts with the intake.\nBOARD: term SLA: promised response time');
  t.after(s.restore);
  const events: string[] = [];
  const opts = { onVisual: (c: { verb: string; arg: string }) => events.push(`${c.verb} ${c.arg}`), onSpeech: () => events.push('speech'), onBoard: (cs: unknown[]) => events.push(`${cs.length} board lines`) };
  assert.equal(await mindTurn(space(), [{ speaker: 'User', text: 'Show me.' }], opts), 'What you are seeing now is the chain from an order to the door, running left to right. It starts with the intake.');
  assert.deepEqual(events, ['draw The order chain: intake, picking, handoff', 'speech', 'speech', '2 board lines']); // the visual before any words
  assert.match(s.calls[0].input[0].content, /# THE BRIEF/);
  assert.match(s.calls[0].input[1].content, /^The conversation so far:\nUser: Show me\./);
  events.length = 0;
  const w = stream('WAIT.');
  t.after(w.restore);
  assert.equal(await mindTurn(space(), [{ speaker: 'Mind', text: 'Take your time.' }], { ...opts, goOn: true }), 'WAIT');
  assert.deepEqual(events, []);
});

test('a go-on turn on an empty conversation is the opening: the mind writes the first turn from the brief and notes', async t => {
  const s = stream('Hi. Let me pick up where we left off on the cost question you were dodging last time, because that is the thing I care about.');
  t.after(s.restore);
  const said: string[] = [];
  await mindTurn(space(), [], { goOn: true, onSpeech: x => said.push(x) });
  assert.match(s.calls[0].input[1].content, /\(nothing yet\)/);
  assert.match(s.calls[0].input[1].content, /The session is just starting and nobody has spoken yet/);
  assert.ok(said.length);
  assert.equal(s.calls[0].service_tier, 'ultrafast'); // as configured
});

test('a lookup request is searched for, then answered', async t => {
  const responses = openai().responses as any, create = responses.create, calls: any[] = [];
  t.after(() => { responses.create = create; });
  responses.create = async (params: any) => { calls.push(params); const text = calls.length === 1 ? 'LOOKUP: current Postgres version' : 'Postgres 18, out last autumn.';
    return (async function* () { yield { type: 'response.output_text.delta', delta: text }; })(); };
  const looked: string[] = [];
  assert.equal(await mindTurn(space(), [{ speaker: 'User', text: 'Which version?' }], { onLookup: w => looked.push(w) }), 'Postgres 18, out last autumn.');
  assert.deepEqual(looked, ['current Postgres version']);
  assert.equal(calls[0].tools, undefined);
  assert.deepEqual(calls[1].tools, [{ type: 'web_search' }]);
});

test("the notes pass has one key per note file and returns the recap with them", async t => {
  assert.deepEqual((notesSchema(['you', 'open-threads']) as any).properties.notes.required, ['you', 'open-threads']);
  const responses = openai().responses as any, create = responses.create, got: any[] = [];
  t.after(() => { responses.create = create; });
  responses.create = async (params: any) => { got.push(params); return { id: 'r1', status: 'completed', output_text: JSON.stringify({ recap: { covered: ['cost'], open: 'who pays' }, notes: { you: 'Dodges cost.' } }) }; };
  const out = await notesPass(space(), 'User: hi\nMind: hello', '2026-11-03 14:00');
  assert.deepEqual(out, { recap: { covered: ['cost'], open: 'who pays' }, notes: { you: 'Dodges cost.' } });
  assert.equal(got[0].background, true);
  assert.match(got[0].input[0].content, /- you: What you know about me\./);
  assert.match(got[0].input[0].content, /skeptical boss/); // the brief says what matters to remember
  assert.match(got[0].input[1].content, /I over-engineer\./);
});

test('citations and links are taken out of what is spoken', () => {
  assert.equal(stripCitations('It was in 2024 ([source](https://x.com/a)). See [the docs](https://y.org) or https://z.io now.'), 'It was in 2024. See the docs or now.');
});
