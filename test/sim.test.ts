import { tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { openai } from '../src/config.ts';
import { screenNote, simulate } from '../src/sim.ts';
import { readSpace } from '../src/space.ts';

const NOTE = 'Opens the drill. Say "queue" to bring in the second step.';
const files = { 'brief.md': '# Drill\n\nRun an incident drill.', 'visuals/01-today.html': `<!-- Today. ${NOTE} -->\n<svg></svg>` };

test("the screen note shows only what the user would see: titles, a drawing's looks, the written question, never the mind's notes or requests", () => {
  const space = readSpace(tmpSpace(files));
  const note = screenNote([{ verb: 'show', arg: '01-today' }, { verb: 'set', arg: 'answer 600' }, { verb: 'ask', arg: 'What next?' }], space, '');
  assert.equal(note, ' [Screen: "Today"; the visual changes; the question "What next?"]');
  assert.doesNotMatch(note, /drill|queue|600/);
  const draw = { verb: 'draw' as const, arg: 'Design a ledger for payments' };
  assert.equal(screenNote([draw], space, 'a chain of boxes: Intake → Pick'), ' [Screen: a drawing: a chain of boxes: Intake → Pick]');
  assert.equal(screenNote([draw], space, ''), ' [Screen: a drawing]');
  assert.equal(screenNote([{ verb: 'clear', arg: '' }], space, ''), ' [Screen: the board is cleared]');
  assert.equal(screenNote([{ verb: 'keep', arg: '' }], space, ''), '');
});

test('a rehearsal keeps a clock (150 words a minute, 3 s between turns) for the mind, and keeps the notes on its visuals from the user', async t => {
  const dir = tmpSpace(files), persona = join(dir, 'persona.md');
  writeFileSync(persona, 'You are Sam.');
  const responses = openai().responses as any, create = responses.create, mind: string[] = [], user: string[] = [];
  let judged = '';
  t.after(() => { responses.create = create; });
  const words = (n: number) => 'word '.repeat(n).trim();
  const turns = [`BOARD: show 01-today\n${words(600)}`, words(300), 'Bye.'];
  const keys = ['followed_brief', 'adapted_to_user', 'voice_turns', 'board_use', 'pushback_tangents_leaving', 'honesty', 'used_memory', 'would_come_back'];
  responses.create = async (params: any) => {
    if (params.stream) { mind.push(params.input[1].content); const text = turns[mind.length - 1]; return (async function* () { yield { type: 'response.output_text.delta', delta: text }; })(); }
    if (params.text?.format?.name === 'judgement') { judged = params.input[1].content; return { output_text: JSON.stringify({ ...Object.fromEntries(keys.map(k => [k, { score: 4, evidence: '' }])), worst_moment: '', best_moment: '', user_would_say: '' }) }; }
    user.push(params.input[1].content);
    return { output_text: 'Okay, sure.' };
  };
  t.mock.method(console, 'log', () => {});
  await simulate(dir, { user: persona, turns: 3, out: join(dir, 'sim.json'), draw: false, notes: 'skip' });
  // 600 words are 240 s, plus 3 s, plus the user's two words (0.8 s) and 3 s: 4 min in; the next 300 words are 123 s more: 6 min.
  assert.match(mind[0], /^Session time: 0 min, turn 1\./);
  assert.match(mind[1], /^Session time: 4 min, turn 2\./);
  assert.match(mind[2], /^Session time: 6 min, turn 3\./);
  // The simulated user sees the visual's title; the note to the mind only goes to the judge, labelled as private.
  assert.match(user[0], /\[Screen: "Today"\]/);
  assert.ok(!user.join().includes(NOTE));
  assert.ok(!judged.split('TRANSCRIPT')[1].split("THE MIND'S BOARD COMMANDS")[0].includes('queue'));
  assert.match(judged, /PREPARED VISUALS \(private notes to the mind, not visible to the user\)\n- 01-today: Today\. Opens the drill/);
});
