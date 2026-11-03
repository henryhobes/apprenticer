import { tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as board from '../src/board.ts';
import { openai } from '../src/config.ts';
import { alreadyAnswered, costUsd, mindController, saveNotes, tally, transcriptOf, turnsFrom, unanswered } from '../src/session.ts';
import { newSessionDir, readMeta, readSpace, writeMeta } from '../src/space.ts';

const user = (delta: string, start_ms: number) => ({ type: 'session.input_transcript.delta', delta, start_ms });
const voice = (delta: string, start_ms: number) => ({ type: 'session.output_transcript.delta', delta, start_ms });
const frag = (role: 'User' | 'Mind', text: string, at: number) => ({ role, text, at });

test('the mind sees the session as turns, in the order they were spoken', () => {
  assert.deepEqual(turnsFrom([
    frag('Mind', 'Hey there. ', 0),
    frag('User', 'waits on memory.', 2600),
    frag('User', 'Because the GPU ', 2000),
    frag('Mind', 'Right.', 5200),
  ]), [
    { speaker: 'Mind', text: 'Hey there.' },
    { speaker: 'User', text: 'Because the GPU waits on memory.' },
    { speaker: 'Mind', text: 'Right.' },
  ]);
});

test('the transcript is what was said, then what was on the board', () => {
  assert.equal(transcriptOf([{ speaker: 'Mind', text: 'Hi.' }, { speaker: 'User', text: 'Hello.' }], []), 'Mind: Hi.\nUser: Hello.');
  assert.equal(transcriptOf([{ speaker: 'Mind', text: 'Hi.' }], ['- showed: 01-today (with the turn that begins "Hi.…")']),
    'Mind: Hi.\n\nOn the board, in order (never spoken):\n- showed: 01-today (with the turn that begins "Hi.…")');
});

test("their words count as unanswered until the voice really replies, not just with a receipt", () => {
  const asked = [frag('Mind', 'So does a bigger batch help each person?', 0), frag('User', 'No', 3000)];
  assert.deepEqual(unanswered(asked, 0), ['No']);
  assert.deepEqual(unanswered([...asked, frag('Mind', 'Okay.', 3600)], 0), ['No']);
  // Asked to repeat, the voice repeats the question itself: nothing left for the mind.
  assert.deepEqual(unanswered([...asked, frag('Mind', 'Sure. Does a bigger batch help each person?', 3600)], 0), []);
  assert.deepEqual(unanswered(asked, 3000), []); // already answered up to there
  assert.deepEqual(unanswered([asked[0], frag('User', 'Um, mm-hmm...', 3000)], 0), []); // still thinking
  // Deltas arrive as tokens: punctuation isn't a word, so "Mm. Okay. Right." is still only a receipt.
  const tokens = ['Mm', '.', ' Okay', '.', ' Right', '.'].map((text, i) => frag('Mind', text, 3600 + i));
  assert.deepEqual(unanswered([...asked, ...tokens], 0), ['No']);
});

test('a late delegation for words the watchdog already had answered starts no second turn', () => {
  const said = [frag('Mind', 'So does a bigger batch help each person?', 0), frag('User', 'No, each one waits longer', 3000),
    frag('Mind', 'Right: the batch fills the GPU, but each person waits for the slowest.', 6500)];
  assert.equal(alreadyAnswered(said, 3000, 1), true);
  assert.equal(alreadyAnswered([...said, frag('User', ' Why?', 9000)], 3000, 1), false); // they've said more
  assert.equal(alreadyAnswered(said.slice(0, 2), 0, 1), false); // not yet answered up to their words
  assert.equal(alreadyAnswered(said.slice(0, 1), 0, -1), false); // no turn has finished yet
});

test('voice minutes and web searches are what a session costs', () => {
  const t = { seconds: 0, searches: 0 };
  assert.equal(tally(t, { type: 'session.usage.updated', usage: { seconds: 600 } }), true);
  assert.equal(tally(t, { type: 'response.event', event: { type: 'response.output_item.done', item: { type: 'web_search_call' } } }), true);
  assert.equal(tally(t, { type: 'session.output_transcript.delta' }), false);
  assert.equal(costUsd(t), 10 * 0.05 + 0.01);
});

async function until(check: () => boolean) { for (let i = 0; i < 100 && !check(); i++) await new Promise(r => setTimeout(r, 20)); assert.ok(check(), 'timed out'); }

test('the mind opens the session itself, then answers when the voice hands the person over', async t => {
  const responses = openai().responses as any, create = responses.create, prompts: string[] = [];
  t.after(() => { responses.create = create; board.end(); });
  const turns = ['BOARD: show 01-today\nWelcome back. Last time we got as far as the cache layer, so let us start there and look at what happens when it goes cold.', 'Good, that is the failure mode. Now what do you do about it in the first thirty seconds?'];
  responses.create = async (params: any) => {
    prompts.push(params.input[1].content);
    const text = turns[prompts.length - 1];
    return (async function* () { yield { type: 'response.output_text.delta', delta: text }; })();
  };
  const dir = tmpSpace({ 'brief.md': '# Drill\n\nRun an incident drill.', 'visuals/01-today.html': '<!-- Today. Opens the drill. -->\n<svg></svg>' });
  const sent: any[] = [], logged: any[] = [];
  board.start();
  const mind = mindController(readSpace(dir), e => sent.push(e), e => logged.push(e));
  t.after(() => mind.handle({ type: 'session.closed' }));

  mind.handle({ type: 'attached' });
  await until(() => sent.length > 0 && logged.some(e => e.type === 'mind.turn'));
  assert.equal(sent[0].type, 'session.commentary.append');
  assert.equal(sent[0].delegation_id, null);
  assert.match(sent[0].content, /^Welcome back\./);
  assert.ok(!sent[0].content.includes('BOARD'));
  assert.match(prompts[0], /nobody has spoken yet/);
  assert.deepEqual(logged.find(e => e.type === 'mind.turn').board, [{ verb: 'show', arg: '01-today' }]);

  // The voice says it, the person answers, the voice hands over: the mind replies under that delegation.
  mind.handle(voice('Welcome back.', 100));
  mind.handle(user('The cache went cold.', 4000));
  mind.handle({ type: 'session.delegation.created', offset_ms: 5000, delegation: { id: 'd1', target: 'client' } });
  await until(() => sent.length > 1);
  assert.equal(sent[1].delegation_id, 'd1');
  assert.match(sent[1].content, /^Good, that is the failure mode\./);
  assert.match(prompts[1], /User: The cache went cold\./);
  assert.equal(mind.transcript(), 'Mind: Welcome back.\nUser: The cache went cold.\n\nOn the board, in order (never spoken):\n- showed: 01-today (with the turn that begins "Welcome back. Last time we got as far…")');
});

function recorded(transcript: string) {
  const dir = tmpSpace({ 'brief.md': '# Coach\n\nCoach me.', 'notes/memory.md': '<!-- What I know. -->\n\nold\n' });
  const session = newSessionDir(dir);
  writeFileSync(join(session, 'transcript.md'), transcript);
  writeMeta(session, { id: 's', started_at: new Date().toISOString(), cost_usd: 0.4 });
  return { dir, session };
}

test('saving notes rewrites them from the transcript, keeps the recap, and leaves a barely spoken session alone', async t => {
  const responses = openai().responses as any, create = responses.create;
  t.after(() => { responses.create = create; });
  responses.create = async () => ({ id: 'r', status: 'completed', output_text: JSON.stringify({ recap: { covered: ['pacing'], open: 'next steps' }, notes: { memory: 'Likes short turns.' } }) });
  const long = `User: ${'I would like to work on pacing today and on how I answer questions. '.repeat(3)}\nMind: Sure.`;
  const a = recorded(long);
  const meta = await saveNotes(a.dir, a.session);
  assert.deepEqual(meta.recap, { covered: ['pacing'], open: 'next steps' });
  assert.equal(meta.notes, 'updated');
  assert.deepEqual(readMeta(a.session), meta);
  assert.equal(readFileSync(join(a.dir, 'notes/memory.md'), 'utf8'), '<!-- What I know. -->\n\nLikes short turns.\n');
  assert.equal(readFileSync(join(a.session, 'notes-before/memory.md'), 'utf8'), '<!-- What I know. -->\n\nold\n');

  responses.create = async () => { throw new Error('the model must not be called'); };
  const b = recorded('User: Hello?\nMind: Hi.');
  assert.equal((await saveNotes(b.dir, b.session)).notes, 'skipped');
  assert.equal(readFileSync(join(b.dir, 'notes/memory.md'), 'utf8'), '<!-- What I know. -->\n\nold\n');
});
