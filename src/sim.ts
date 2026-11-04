import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as board from './board.ts';
import { config, openai, spend } from './config.ts';
import { type Turn, mindTurn, renderTurns } from './mind.ts';
import { boardLines, saveNotes, transcriptOf } from './session.ts';
import { type Meta, type Space, newSessionDir, openSpace, readMeta, writeMeta } from './space.ts';

// A text rehearsal of a space: the mind runs its real turn function with its real instructions (the
// board on) against a simulated user whose persona is a markdown file, then a judge scores it. Only the
// reply path is rehearsed: the going-on after silence, WAIT and the voice's own timing are not. The run is saved as a session folder (tagged sim). Its notes pass runs too, but by default
// writes only into that folder, so a rehearsal never touches the space's real memory; with `--notes` it
// is applied to notes/, so that a second run tests memory. No voice, no daily cap.

const USER = (persona: string) => `You are role-playing a person in a rehearsal, to test an AI that talks with them by voice. Behave exactly like the person described below, and never mention that this is a test.

This is a voice conversation transcribed to text: talk the way people do on a call, casually and briefly (one to three sentences unless your persona says otherwise), with the odd "um" or false start. Answer what the AI actually said; push back, ask, wander or go quiet the way your persona would. Don't flatter, and don't know more than your persona would: when asked, guess the way that person would. Don't be a good sport: when the AI does something your persona hates or gives up on, react exactly as the persona says they do, every time it happens. A note in [Screen: ...] after an AI turn says what was on your screen then: you see it, so you can answer from it. In the conversation so far "Mind" is the AI and "User" is you.

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
  would_come_back: "Would this user want to come back tomorrow? Judge by their persona: what they want, what annoys them and what makes them give up, not by how gamely the simulated user played along. Quote the moment most likely to make them quit.",
};
const keys = Object.keys(CRITERIA) as (keyof typeof CRITERIA)[];
const JUDGEMENT = { type: 'object', additionalProperties: false, required: [...keys, 'worst_moment', 'best_moment', 'user_would_say'], properties: {
  ...Object.fromEntries(keys.map(k => [k, { type: 'object', additionalProperties: false, required: ['score', 'evidence'], properties: { score: { type: ['integer', 'null'] }, evidence: { type: 'string' } } }])),
  worst_moment: { type: 'string' }, best_moment: { type: 'string' }, user_would_say: { type: 'string', description: "The user's likely one-line verdict on this session, in their voice" } } };

/** All the user would see of a turn's board lines: a visual's title, a drawing's looks, the written question; never the mind's notes on a visual or its request for a drawing. */
export const screenNote = (commands: board.BoardCommand[], space: Space, looks: string) => {
  const parts = commands.flatMap(c => {
    const v = c.verb === 'show' && space.visuals.find(b => b.id === c.arg);
    return v ? [`"${v.title}"`] : c.verb === 'show' || c.verb === 'draw' ? [`a drawing${looks ? `: ${looks}` : ''}`] : c.verb === 'clear' ? ['the board is cleared'] : c.verb === 'set' ? ['the visual changes']
      : c.verb === 'ask' ? [`the question "${c.arg}"`] : c.verb === 'term' ? [`the line "${c.arg}"`] : [];
  });
  return parts.length ? ` [Screen: ${parts.join('; ')}]` : '';
};

export async function simulate(path: string, opts: { user: string; turns: number; out?: string; draw: boolean; notes: 'preview' | 'apply' | 'skip' }) {
  const space = openSpace(path), persona = readFileSync(opts.user, 'utf8').trim();
  const sessionDir = newSessionDir(space.dir), started = Date.now();
  const meta: Meta = { id: `sim-${started}`, started_at: new Date(started).toISOString(), cost_usd: 0, sim: true };
  writeMeta(sessionDir, meta);
  const hadMemory = space.notes.some(n => n.body);
  const spent0 = spend.usd; // the mind's tokens for the turns and drawings (its notes pass adds its own to the session's cost; the simulated user and the judge are the rehearsal's, and not counted)
  const drawFn = opts.draw ? board.draw : async () => ({ html: '', looks: '' });
  const turns: Turn[] = [];   // what the mind sees
  const seen: Turn[] = [];    // what the user and the judge see: the mind's turns with a note of what was on the screen
  const rows: { speaker: string; text: string; ms?: number; words?: number; board?: string }[] = [];
  const boardLog: string[] = [], latencies: number[] = [];
  console.log(`${space.title} · ${space.notes.length} notes${hadMemory ? '' : ' (empty)'} · ${space.visuals.length} visuals · tier ${config.mindTier} · ${opts.turns} turns\n`);

  board.start(join(sessionDir, 'drawings'));
  const searches: string[] = []; // the mind's LOOKUPs, for the judge: they happened, though the user never sees them
  let leaving = false, clockMs = 0; // the rehearsal's clock: speech at 150 words a minute and 3 s between turns, so a brief's timed arcs can be tested
  const pass = (text: string) => { clockMs += (text.split(/\s+/).length / 150 * 60 + 3) * 1000; };
  for (let i = 0; ; i++) {
    const t0 = Date.now();
    let commands: board.BoardCommand[] = [];
    const said = await mindTurn(space, turns, { goOn: i === 0, elapsedMs: clockMs, onLookup: what => { console.log(`[lookup: ${what}]`); searches.push(`before Mind turn ${turns.filter(t => t.speaker === 'Mind').length + 1}: ${what}`); },
      board: { instructions: board.boardInstructions(space.visuals), onScreen: board.onScreen() }, onBoard: c => { commands = c; } });
    const ms = Date.now() - t0;
    if (said === 'WAIT') console.log('Mind: [waits]');
    else {
      latencies.push(ms / 1000);
      turns.push({ speaker: 'Mind', text: said });
      board.speaking();
      const drawing = await board.apply(commands, said, space.visuals, drawFn);
      seen.push({ speaker: 'Mind', text: said + screenNote(commands, space, drawing && 'looks' in drawing ? drawing.looks : '') });
      pass(said);
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
    pass(reply);
    rows.push({ speaker: 'User', text: reply });
    console.log(`User: ${reply}\n`);
  }
  board.end();

  const transcript = transcriptOf(turns, boardLog);
  writeFileSync(join(sessionDir, 'transcript.md'), transcript + '\n');
  for (const r of rows) appendFileSync(join(sessionDir, 'events.jsonl'), JSON.stringify({ type: 'sim.turn', ...r }) + '\n');
  Object.assign(meta, { ended_at: new Date().toISOString(), duration_s: Math.round((Date.now() - started) / 1000), cost_usd: spend.usd - spent0 });
  writeMeta(sessionDir, meta);

  const judge = openai().responses.create({
    model: config.mindModel, reasoning: { effort: 'medium' },
    input: [{ role: 'system', content: `You judge how well an AI "mind" ran a voice conversation, from a text transcript of a rehearsal: a mind that speaks through a voice model, set up by a brief, against a simulated user. Score the MIND 1-5 on each criterion with a sentence of evidence that quotes the transcript. Be demanding: 3 is mediocre, 5 is genuinely excellent. Check the facts you can check, and against the sources. A [Screen: ...] note after a Mind turn says what was on the user's screen then. The user sees only that and the mind's words; the visuals' notes and the board log below are the mind's own private instructions and requests, which the user cannot see. Use null for a criterion only where it says so.\n\n${keys.map(k => `- ${k}: ${CRITERIA[k]}`).join('\n')}` },
      { role: 'user', content: [`BRIEF\n${space.brief}`, `NOTES BEFORE THIS SESSION${hadMemory ? '' : ' (all empty)'}\n${space.notes.map(n => `## ${n.name}\n${n.body || '(empty)'}`).join('\n\n')}`,
        space.sources.length && `SOURCES\n${space.sources.map(s => `## ${s.name}\n${s.text}`).join('\n\n')}`,
        `PREPARED VISUALS (private notes to the mind, not visible to the user)\n${space.visuals.map(v => `- ${v.id}: ${v.title}. ${v.when}`).join('\n') || '(none)'}`,
        `THE SIMULATED USER'S PERSONA\n${persona}`, `TRANSCRIPT\n${renderTurns(seen)}`,
        searches.length && `THE MIND'S WEB SEARCHES (it searched before answering; the results aren't recorded)\n${searches.join('\n')}`,
        boardLog.length && `THE MIND'S BOARD COMMANDS, in order (private notes to the mind, not visible to the user)\n${boardLog.join('\n')}`].filter(Boolean).join('\n\n') }],
    text: { format: { type: 'json_schema', name: 'judgement', schema: JUDGEMENT, strict: true } },
  }).then(r => JSON.parse(r.output_text));
  const notes = opts.notes !== 'skip' ? saveNotes(space.dir, sessionDir, opts.notes === 'apply').then(m => m.recap ?? null, err => { console.error('notes pass failed:', err); return null; }) : Promise.resolve(null);
  const [j, recap] = await Promise.all([judge, notes]);

  console.log('JUDGE');
  const scored: number[] = [];
  for (const k of keys) { const { score, evidence } = j[k]; if (score) scored.push(score); console.log(`  ${score ? `${score}/5` : 'n/a'} ${k.replace(/_/g, ' ')}: ${evidence}`); }
  console.log(`  worst: ${j.worst_moment}\n  best: ${j.best_moment}\n  user: "${j.user_would_say}"`);
  const mean = scored.reduce((a, b) => a + b, 0) / (scored.length || 1), sorted = [...latencies].sort((a, b) => a - b);
  console.log(`\nmean ${mean.toFixed(2)}/5; the mind's tokens cost $${(readMeta(sessionDir)?.cost_usd ?? 0).toFixed(3)}; mind latency median ${sorted[Math.floor(sorted.length / 2)]?.toFixed(1)} s, max ${sorted.at(-1)?.toFixed(1)} s (${config.mindModel}, ${config.mindTier} tier)`);
  if (recap) console.log(`${opts.notes === 'apply' ? 'notes/ updated' : `notes pass written to ${join(sessionDir, 'notes-after')} only (--notes applies it to notes/)`}; recap: ${recap.covered.join(' / ')}${recap.open ? ` · open: ${recap.open}` : ''}`);
  else if (opts.notes !== 'skip') console.log('notes pass produced nothing (too short, or it failed)');
  const out = opts.out ?? join(sessionDir, 'sim.json');
  writeFileSync(out, JSON.stringify({ space: space.title, user: opts.user, tier: config.mindTier, turns: rows, latencies, board: boardLog, judgement: j, mean, recap }, null, 2) + '\n');
  console.log(`saved ${out}\nsession ${sessionDir}`);
}
