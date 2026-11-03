import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as board from './board.ts';
import { config, openai } from './config.ts';
import { type Turn, mindTurn, renderTurns } from './mind.ts';
import { boardLines, saveNotes, transcriptOf } from './session.ts';
import { type Meta, type Space, newSessionDir, openSpace, writeMeta } from './space.ts';

// A text rehearsal of a space: the mind runs its real turn function with its real instructions (the
// board on) against a simulated user whose persona is a markdown file, then a judge scores it. Only the
// reply path is rehearsed: the going-on after silence, WAIT and the voice's own timing are not. The run is saved as a session folder (tagged sim). Its notes pass runs too, but by default
// writes only into that folder, so a rehearsal never touches the space's real memory; with `--notes` it
// is applied to notes/, so that a second run tests memory. No voice, no daily cap.

const USER = (persona: string) => `You are role-playing a person in a rehearsal, to test an AI that talks with them by voice. Behave exactly like the person described below, and never mention that this is a test.

This is a voice conversation transcribed to text: talk the way people do on a call, casually and briefly (one to three sentences unless your persona says otherwise), with the odd "um" or false start. Answer what the AI actually said; push back, ask, wander or go quiet the way your persona would. Don't flatter, and don't know more than your persona would: when asked, guess the way that person would. A note in [Screen: ...] after an AI turn says what was on your screen then: you see it, so you can answer from it. In the conversation so far "Mind" is the AI and "User" is you.

If your persona leaves or ends the session, say your goodbye and put END alone on the next line.

YOUR PERSONA:
${persona}`;

const CRITERIA = {
  followed_brief: "Followed the brief: its role, goal and tone, and any rules it sets for length or format.",
  adapted_to_user: "Adapted to this particular user: their level, pace, goals and what they said, instead of running a generic script.",
  voice_turns: "Turns that work for a voice: spoken language, one idea at a time, a length that fits (the brief may set it), no lists or markdown, nothing read out from the screen.",
  board_use: "Board use: prepared visuals or drawings that fit the idea and arrive at the right moment, never a wrong or invented id, explained by what is happening rather than narrated as a tour. No board at all is fine if the brief and the moment didn't call for one.",
  pushback_tangents_leaving: "Handled pushback, tangents, confusion and the user leaving: took pushback seriously (agreed plainly or settled it with a fact), fixed mistakes briefly, stayed on purpose without stonewalling, closed the way the brief wants. Null if none of these came up.",
  honesty: "Honesty: no made-up facts, numbers or sources; said so when unsure or looked it up; claims fit the brief, notes and sources.",
  used_memory: "Used memory: in a later session, picked up from the notes (what was covered, what was open, what the user prefers) naturally, without reciting them. Null if the notes were empty before this session.",
};
const keys = Object.keys(CRITERIA) as (keyof typeof CRITERIA)[];
const JUDGEMENT = { type: 'object', additionalProperties: false, required: [...keys, 'worst_moment', 'best_moment', 'user_would_say'], properties: {
  ...Object.fromEntries(keys.map(k => [k, { type: 'object', additionalProperties: false, required: ['score', 'evidence'], properties: { score: { type: ['integer', 'null'] }, evidence: { type: 'string' } } }])),
  worst_moment: { type: 'string' }, best_moment: { type: 'string' }, user_would_say: { type: 'string', description: "The user's likely one-line verdict on this session, in their voice" } } };

const screenNote = (commands: board.BoardCommand[], space: Space, looks: string) => {
  const parts = commands.flatMap(c => {
    const v = c.verb === 'show' && space.visuals.find(b => b.id === c.arg);
    return v ? [`"${v.title}". ${v.when}`] : c.verb === 'show' || c.verb === 'draw' ? [`a drawing of ${c.arg}${looks ? ` (${looks})` : ''}`]
      : c.verb === 'set' ? [`set ${c.arg}`] : c.verb === 'ask' ? [`the question "${c.arg}"`] : c.verb === 'term' ? [`the line "${c.arg}"`] : [];
  });
  return parts.length ? ` [Screen: ${parts.join('; ')}]` : '';
};

export async function simulate(path: string, opts: { user: string; turns: number; out?: string; draw: boolean; notes: 'preview' | 'apply' | 'skip' }) {
  const space = openSpace(path), persona = readFileSync(opts.user, 'utf8').trim();
  const sessionDir = newSessionDir(space.dir), started = Date.now();
  const meta: Meta = { id: `sim-${started}`, started_at: new Date(started).toISOString(), cost_usd: 0, sim: true };
  writeMeta(sessionDir, meta);
  const hadMemory = space.notes.some(n => n.body);
  const drawFn = opts.draw ? board.draw : async () => ({ html: '', looks: '' });
  const turns: Turn[] = [];   // what the mind sees
  const seen: Turn[] = [];    // what the user and the judge see: the mind's turns with a note of what was on the screen
  const rows: { speaker: string; text: string; ms?: number; words?: number; board?: string }[] = [];
  const boardLog: string[] = [], latencies: number[] = [];
  console.log(`${space.title} · ${space.notes.length} notes${hadMemory ? '' : ' (empty)'} · ${space.visuals.length} visuals · tier ${config.mindTier} · ${opts.turns} turns\n`);

  board.start(join(sessionDir, 'drawings'));
  let leaving = false;
  for (let i = 0; ; i++) {
    const t0 = Date.now();
    let commands: board.BoardCommand[] = [];
    const said = await mindTurn(space, turns, { goOn: i === 0, onLookup: what => console.log(`[lookup: ${what}]`),
      board: { instructions: board.boardInstructions(space.visuals), onScreen: board.onScreen() }, onBoard: c => { commands = c; } });
    const ms = Date.now() - t0;
    if (said === 'WAIT') console.log('Mind: [waits]');
    else {
      latencies.push(ms / 1000);
      turns.push({ speaker: 'Mind', text: said });
      board.speaking();
      const drawing = await board.apply(commands, said, space.visuals, drawFn);
      seen.push({ speaker: 'Mind', text: said + screenNote(commands, space, drawing && 'looks' in drawing ? drawing.looks : '') });
      boardLog.push(...boardLines(commands, said));
      const shown = commands.filter(c => c.verb !== 'keep').map(c => `${c.verb} ${c.arg}`).join(' + ') || 'none';
      console.log(`Mind (${(ms / 1000).toFixed(1)} s, ${said.split(/\s+/).length} words): ${said}\n  [board: ${shown}]\n`);
      rows.push({ speaker: 'Mind', text: said, ms, words: said.split(/\s+/).length, board: shown });
    }
    if (leaving || i >= opts.turns - 1) break;
    const res = await openai().responses.create({ model: config.mindModel, reasoning: { effort: 'low' }, input: [{ role: 'system', content: USER(persona) },
      { role: 'user', content: `The conversation so far:\n${renderTurns(seen) || '(nothing yet: you speak first)'}\n\nWrite only what the user says next.` }] });
    const text = res.output_text.replace(/^User:\s*/i, '').trim(), reply = text.replace(/\n*\bEND\s*$/, '').trim();
    leaving = reply !== text;
    turns.push({ speaker: 'User', text: reply }); seen.push({ speaker: 'User', text: reply });
    rows.push({ speaker: 'User', text: reply });
    console.log(`User: ${reply}\n`);
  }
  board.end();

  const transcript = transcriptOf(turns, boardLog);
  writeFileSync(join(sessionDir, 'transcript.md'), transcript + '\n');
  for (const r of rows) appendFileSync(join(sessionDir, 'events.jsonl'), JSON.stringify({ type: 'sim.turn', ...r }) + '\n');
  Object.assign(meta, { ended_at: new Date().toISOString(), duration_s: Math.round((Date.now() - started) / 1000) });
  writeMeta(sessionDir, meta);

  const judge = openai().responses.create({
    model: config.mindModel, reasoning: { effort: 'medium' },
    input: [{ role: 'system', content: `You judge how well an AI "mind" ran a voice conversation, from a text transcript of a rehearsal: a mind that speaks through a voice model, set up by a brief, against a simulated user. Score the MIND 1-5 on each criterion with a sentence of evidence that quotes the transcript. Be demanding: 3 is mediocre, 5 is genuinely excellent. Check the facts you can check, and against the sources. A [Screen: ...] note after a Mind turn says what was on the user's screen then. Use null for a criterion only where it says so.\n\n${keys.map(k => `- ${k}: ${CRITERIA[k]}`).join('\n')}` },
      { role: 'user', content: [`BRIEF\n${space.brief}`, `NOTES BEFORE THIS SESSION${hadMemory ? '' : ' (all empty)'}\n${space.notes.map(n => `## ${n.name}\n${n.body || '(empty)'}`).join('\n\n')}`,
        space.sources.length && `SOURCES\n${space.sources.map(s => `## ${s.name}\n${s.text}`).join('\n\n')}`,
        `PREPARED VISUALS\n${space.visuals.map(v => `- ${v.id}: ${v.title}. ${v.when}`).join('\n') || '(none)'}`,
        `THE SIMULATED USER'S PERSONA\n${persona}`, `TRANSCRIPT\n${renderTurns(seen)}`].filter(Boolean).join('\n\n') }],
    text: { format: { type: 'json_schema', name: 'judgement', schema: JUDGEMENT, strict: true } },
  }).then(r => JSON.parse(r.output_text));
  const notes = opts.notes !== 'skip' ? saveNotes(space.dir, sessionDir, opts.notes === 'apply').then(m => m.recap ?? null, err => { console.error('notes pass failed:', err); return null; }) : Promise.resolve(null);
  const [j, recap] = await Promise.all([judge, notes]);

  console.log('JUDGE');
  const scored: number[] = [];
  for (const k of keys) { const { score, evidence } = j[k]; if (score) scored.push(score); console.log(`  ${score ? `${score}/5` : 'n/a'} ${k.replace(/_/g, ' ')}: ${evidence}`); }
  console.log(`  worst: ${j.worst_moment}\n  best: ${j.best_moment}\n  user: "${j.user_would_say}"`);
  const mean = scored.reduce((a, b) => a + b, 0) / (scored.length || 1), sorted = [...latencies].sort((a, b) => a - b);
  console.log(`\nmean ${mean.toFixed(2)}/5; mind latency median ${sorted[Math.floor(sorted.length / 2)]?.toFixed(1)} s, max ${sorted.at(-1)?.toFixed(1)} s (${config.mindModel}, ${config.mindTier} tier)`);
  if (recap) console.log(`${opts.notes === 'apply' ? 'notes/ updated' : `notes pass written to ${join(sessionDir, 'notes-after')} only (--notes applies it to notes/)`}; recap: ${recap.covered.join(' / ')}${recap.open ? ` · open: ${recap.open}` : ''}`);
  else if (opts.notes !== 'skip') console.log('notes pass produced nothing (too short, or it failed)');
  const out = opts.out ?? join(sessionDir, 'sim.json');
  writeFileSync(out, JSON.stringify({ space: space.title, user: opts.user, tier: config.mindTier, turns: rows, latencies, board: boardLog, judgement: j, mean, recap }, null, 2) + '\n');
  console.log(`saved ${out}\nsession ${sessionDir}`);
}
