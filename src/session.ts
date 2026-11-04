import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { LiveCreateParams } from 'openai/resources/live/live';
import WebSocket from 'ws';
import * as board from './board.ts';
import { LIVE_USD_PER_MINUTE, WEB_SEARCH_USD, config, openai, spend } from './config.ts';
import { type Turn, localDate, mindTurn, notesPass, renderTurns } from './mind.ts';
import { type Meta, type Space, newSessionDir, openSpace, readMeta, readSpace, spentToday, writeMeta, writeNotes } from './space.ts';

// The mind (a strong text model run by this server) decides everything said in a session; GPT-Live is
// its voice and ears. GPT-Live delegates each substantive turn to the client (us); we run the mind on
// the live transcript and hand its words back as commentary. The mind also opens the session.

const VOICE = `You are the voice of a mind that talks with one person, in their browser. The mind, your backend, does all the thinking: what to say, every explanation, answer, fact and question. You do the speaking and listening, naturally, as the mind in person. You never answer from your own knowledge.

Pace: speak at a natural, unhurried pace, every number and name clear. If they ask you to slow down or speed up, do it for the rest of the session.

Don't speak first. The mind's opening words arrive as commentary in a moment; stay silent until they do.

Their screen: they may have a board in front of them, where the mind puts up diagrams and visuals it changes as it talks, and writes its questions. You can't see it, but it's there and it's the mind's. Anything about the screen ("can you show me", "nothing's up", "what's that box?") goes to the mind like any other request. Never tell them you can't show things.

The mind's words arrive as commentary. Say everything in it, every number and any question at the end, in that order. Reword only for the ear; never shorten, summarize, or add facts, examples or questions. If they interrupt, stop at once and don't resume the cut-off part; fresh words will follow.

On your own you may only: backchannel, say again what you just said when they didn't catch it ("sorry, I lost you"), and answer "can you hear me?". Everything else comes from the mind.

When they say something that needs a real reply, give one short, natural receipt of a word or two that fits what they said (a "mm", an "ah", a "yeah", a quick laugh, their own word echoed back), varied the way a person varies it, never announcing what you're about to do, then stay quiet until the commentary arrives. The receipt never judges what they said ("exactly", "right", "good point"): only the mind knows whether they're right. When it arrives, deliver it fluently. Never fill the wait with a guess or a second receipt, and never say you'll check or look something up.

Backchannel policy: Stay quiet while they are talking or thinking. An occasional brief, neutral "mm-hm" during a long explanation of theirs is fine.

Interruption policy: When they interrupt, stop right away. Keep listening while they pause to think; don't finish their sentences. A cough, line noise or background sound is not a request.

Delegation policy:
Backend tools: the mind, who has the brief, the notes on this person, the sources and web search.
Generate <|SpawnThinking|> when:
- They say anything that moves the conversation on, including a yes or no to something you offered.
- They ask to see something, or ask about their screen.
Do not generate <|SpawnThinking|> when:
- They're only backchanneling while you speak, or are mid-thought.
- They ask you to repeat what you just said.
Generate <|SpawnThinking|> before giving an answer that depends on backend work. Do not guess the result while waiting.`;

export const voiceSession = (): LiveCreateParams['session'] => ({
  model: config.liveModel,
  instructions: VOICE,
  audio: { output: { voice: config.voice } },
  delegation: { type: 'client', acknowledgement_delay_ms: 800 },
});

export interface Tally { seconds: number; searches: number }
export const costUsd = ({ seconds, searches }: Tally) => (seconds / 60) * LIVE_USD_PER_MINUTE + searches * WEB_SEARCH_USD;

/** Updates billable usage from one sideband event; returns whether anything changed. */
export function tally(t: Tally, event: any): boolean {
  if (event.type === 'session.usage.updated' || event.type === 'session.closed') {
    t.seconds = event.usage?.seconds ?? t.seconds;
    return true;
  }
  if (event.type === 'response.event' && event.event?.type === 'response.output_item.done'
    && event.event.item?.type === 'web_search_call') {
    t.searches++;
    return true;
  }
  return false;
}

type Fragment = { role: Turn['speaker']; text: string; at: number };

/**
 * Rebuilds the turns so far from transcript fragments. Both sides can talk at once, so fragments are
 * ordered by when they were spoken and consecutive ones from the same side merged.
 */
export function turnsFrom(fragments: Fragment[]): Turn[] {
  const turns: Turn[] = [];
  for (const f of [...fragments].sort((a, b) => a.at - b.at)) {
    const last = turns.at(-1);
    if (last?.speaker === f.role) last.text += f.text;
    else turns.push({ speaker: f.role, text: f.text });
  }
  return turns.map(t => ({ ...t, text: t.text.replace(/\s+/g, ' ').trim() })).filter(t => t.text);
}

const did: Record<board.BoardCommand['verb'], string> = { show: 'showed', draw: 'drew', keep: '', clear: 'cleared the board', ask: 'wrote the question', term: 'wrote above the board', set: 'changed the visual' };
/** What a turn put on the board, one line each, for the transcript: the notes pass can't know what they saw from the speech alone. */
export const boardLines = (commands: board.BoardCommand[], turn: string) => commands.filter(c => did[c.verb])
  .map(c => `- ${did[c.verb]}${c.arg && `: ${c.arg}`} (with the turn that begins "${turn.split(/\s+/).slice(0, 8).join(' ')}…")`);
/** The session as text: what was said, then what was on the board. */
export const transcriptOf = (turns: Turn[], boardLog: string[]) => [renderTurns(turns), boardLog.length && `On the board, in order (never spoken):\n${boardLog.join('\n')}`].filter(Boolean).join('\n\n');

/** The person's words not yet answered: said after `afterMs` and not followed by a real reply from the voice (a receipt like "Okay." isn't one; repeating the question is). */
export function unanswered(fragments: Fragment[], afterMs: number): string[] {
  const words: string[] = [];
  let voiceWords = 0;
  for (const f of [...fragments].sort((a, b) => b.at - a.at)) { // newest first
    const n = f.text.match(/[\w'’-]+/g) ?? []; // deltas are tokens: "." alone is no word
    if (f.role === 'Mind') voiceWords += n.length;
    else if (f.at > afterMs && voiceWords < 6) words.unshift(...n.filter(w => !/^(u+m+|u+h+|m+-?h*m+|h+m+)$/i.test(w))); // "um" is them still thinking
  }
  return words;
}

/** Whether the last finished turn, written once the person had said `answered` fragments, still covers everything they've said. */
export function alreadyAnswered(fragments: Fragment[], afterMs: number, answered: number): boolean {
  return fragments.filter(f => f.role === 'User').length === answered && !unanswered(fragments, afterMs).length;
}

/**
 * Handles the mind's side of one session: `handle` takes the sideband's events, `send` writes to the
 * sideband. Every turn is logged as a `mind.turn` event. The session opens when `handle` gets `{ type: 'attached' }`.
 */
export function mindController(space: Space, send: (event: object) => void, log: (event: object) => void) {
  const started = Date.now();
  const fragments: Fragment[] = [];
  const boardLog: string[] = [];
  const userCount = () => fragments.filter(f => f.role === 'User').length;
  // The turn being written. It starts as soon as the person pauses, before the voice delegates, with its
  // words held back; it goes live (is spoken) when the voice delegates or the watchdog fires, and is
  // dropped if they keep talking. A run that's no longer `turn` is stale and never speaks. A run that
  // `continues` is the conversation going on after they let a point stand; `visual` is its opening board line.
  type Run = { id: string | null; live: boolean; held: string[]; user: number; abort: AbortController; started: number; liveAt: number; firstSpeechMs: number | null; done: string | null; board: board.BoardCommand[]; continues: boolean; visual: board.BoardCommand | null };
  let turn: Run | null = null;
  let handledUpToMs = 0; // session time up to which their words have been answered
  let lastAnswered = -1; // how many of their fragments the last finished turn was written for (-1: none yet)
  let lastUserAt = 0, lastVoiceAt = 0, lastSentAt = 0, closed = false;
  let waiting = false; // the mind said it would wait (goodbye, "give me a sec"): no going on until they speak
  let goOns = 0; // turns in a row the mind has gone on by itself (its opening counts): a person who has walked away mustn't run up the bill until the time limit

  const drop = (reason: string) => {
    if (!turn) return;
    log({ type: 'mind.aborted', reason, speculative: !turn.live, ms: Date.now() - turn.started });
    turn.abort.abort();
    turn = null;
  };

  // Every half second: start the next turn early once they pause, and drop it if the voice answered
  // them itself. The watchdog: the voice sometimes acknowledges them without delegating (other
  // builders report 1 in 5 to 1 in 30 turns), leaving them waiting, so if they and the voice have both
  // gone quiet the mind answers anyway. Session times (start_ms, offset_ms) decide what was
  // answered, because their words keep arriving for a second or so after the voice delegates.
  //
  // And the conversation goes on: when the last thing said was the mind's and not a question for them,
  // they've let the point stand, so once both have been quiet for 2 s the mind starts writing what
  // comes next, and says it at 3 s. The voice pauses up to about 2 s inside a turn of its own, between
  // the pieces it's handed; it goes by what was spoken, so a turn the voice cut short is picked up too.
  const tick = setInterval(() => {
    const words = unanswered(fragments, handledUpToMs).length, open = words > 0;
    if (turn && !turn.live && !turn.continues && !open) drop('voice-handled');
    // Early start once they pause, but not on a "yeah" while the voice is still talking.
    if (!turn && open && Date.now() - lastUserAt > 800 && (lastVoiceAt < lastUserAt || Date.now() - lastVoiceAt > 800)) begin();
    if (open && Date.now() - lastUserAt > 2500 && Date.now() - lastVoiceAt > 1500 && (!turn || !turn.live)) {
      log({ type: 'mind.forced', words });
      goLive(null, Math.max(...fragments.map(f => f.at)));
    }
    const quiet = Date.now() - Math.max(lastUserAt, lastVoiceAt, lastSentAt); // and since words went to the voice: it's about to say them
    if (open || waiting || goOns >= MAX_GO_ONS || quiet < 2000 || (turn && (turn.live || !turn.continues))) return;
    const last = turnsFrom(fragments).at(-1);
    if (last?.speaker !== 'Mind' || /\?\W*$/.test(last.text)) return; // a question: their turn
    if (!turn) begin(true);
    else if (quiet > 3000) { log({ type: 'mind.continued' }); start(turn, null); }
  }, 500);
  tick.unref();

  function begin(continues = false) {
    const run: Run = { id: null, live: false, held: [], user: userCount(), abort: new AbortController(), started: Date.now(), liveAt: 0, firstSpeechMs: null, done: null, board: [], continues, visual: null };
    turn = run;
    mindTurn(space, turnsFrom(fragments), {
      signal: run.abort.signal, goOn: continues, elapsedMs: Date.now() - started,
      onSpeech: text => run.live ? speak(run, text) : run.held.push(text),
      onLookup: what => log({ type: 'mind.lookup', delegation_id: run.id, what }),
      board: board.connected() ? { instructions: board.boardInstructions(space.visuals), onScreen: board.onScreen() } : undefined,
      // The visual goes up as the turn starts being spoken, so it's there when they hear about it. A
      // show of an id that isn't a prepared visual waits for the words, which it's drawn from (board.apply).
      onVisual: c => { if (c.verb !== 'show' || space.visuals.some(v => v.id === c.arg)) { run.visual = c; if (run.firstSpeechMs !== null) putUp(run); } },
      onBoard: commands => { run.board = commands; },
    }).then(text => {
      if (turn !== run) return;
      run.done = text;
      if (run.live) finish(run); // otherwise it waits, written, for the voice to delegate
    }, err => {
      if (turn !== run) return;
      log({ type: 'mind.error', delegation_id: run.id, live: run.live, error: String(err) });
      if (run.live && run.firstSpeechMs === null) speak(run, "Sorry, I lost my train of thought for a second there. Could you say that again?");
      turn = null;
    });
  }

  function goLive(id: string | null, atMs: number) {
    handledUpToMs = Math.max(handledUpToMs, atMs);
    // A turn written for everything they've said so far stands: the early start, or the same turn when
    // the voice delegates late after the watchdog fired (or twice), which mustn't be said again, even
    // once it's finished. The conversation going on isn't one: a delegation means they spoke, perhaps before
    // their words arrived, so it's never said as the answer.
    if (turn && (turn.user !== userCount() || turn.continues && !turn.live)) drop(turn.live ? 'superseded' : 'user-spoke');
    if (!turn && alreadyAnswered(fragments, handledUpToMs, lastAnswered)) { log({ type: 'mind.skipped', delegation_id: id }); return; }
    if (!turn) begin();
    start(turn!, id);
  }

  function start(run: Run, id: string | null) {
    run.id = id ?? run.id;
    if (run.live) return; // already speaking: the rest goes out under the new delegation
    Object.assign(run, { live: true, liveAt: Date.now() });
    if (run.held.length) speak(run, run.held.join(' '));
    if (run.done !== null) finish(run);
  }

  const drawn = (run: Run) => (result: object) => log({ type: 'board.drawn', delegation_id: run.id, ...result });
  const putUp = (run: Run) => { if (run.visual) board.apply([run.visual], '', space.visuals)?.then(drawn(run)); };

  function speak(run: Run, content: string) {
    if (turn !== run || closed) return;
    // The board changes with the turn's first words, not before: a turn that turns out to be WAIT says
    // nothing, so it mustn't clear the question they're thinking about.
    if (run.firstSpeechMs === null) { board.speaking(); putUp(run); }
    // silence_ms: from their last words to the first words handed to the voice.
    run.firstSpeechMs ??= Date.now() - lastUserAt;
    lastSentAt = Date.now();
    send({ type: 'session.commentary.append', event_id: randomUUID(), delegation_id: run.id, content });
  }

  function finish(run: Run) {
    turn = null;
    lastAnswered = run.user;
    log({ type: 'mind.turn', delegation_id: run.id, ms: Date.now() - run.started, head_start_ms: run.liveAt - run.started, silence_ms: run.firstSpeechMs, text: run.done, ...run.continues ? { continued: true } : {}, ...run.board.length ? { board: run.board } : {} });
    if (run.continues) goOns++;
    if (run.done === 'WAIT') { waiting = true; return; }
    // Only a turn that's being spoken reaches the board: an early start that was dropped never does.
    // Its opening visual is already up.
    const rest = run.board.filter(c => !(run.visual && c.verb === run.visual.verb && c.arg === run.visual.arg));
    board.apply(rest, run.done!, space.visuals)?.then(drawn(run));
    boardLog.push(...boardLines(run.board, run.done!));
  }

  function handle(event: any) {
    if (event.type === 'attached') { begin(true); start(turn!, null); } // the mind opens the session
    if (event.type === 'session.input_transcript.delta') {
      fragments.push({ role: 'User', text: event.delta, at: event.start_ms ?? 0 });
      lastUserAt = Date.now();
      waiting = false; goOns = 0;
      board.heard(event.delta);
      if (turn && !turn.live) drop('user-spoke'); // they're still going: start again when they pause
    }
    if (event.type === 'session.output_transcript.delta') {
      fragments.push({ role: 'Mind', text: event.delta, at: event.start_ms ?? 0 });
      lastVoiceAt = Date.now();
      if (turn?.continues && !turn.live) drop('voice-went-on'); // that was a pause inside its turn, not the end
      board.said(event.delta);
    }
    if (event.type === 'session.closed' && !closed) { closed = true; clearInterval(tick); drop('closed'); board.end(); }
    if (event.type === 'session.delegation.created' && event.delegation?.target === 'client') goLive(event.delegation.id, event.offset_ms ?? 0);
  }

  return { handle, transcript: () => transcriptOf(turnsFrom(fragments), boardLog) };
}

const MINUTE = 60_000;
const REATTACH_TRIES = 3;
const MAX_GO_ONS = 4; // then the mind waits for them to say something, even after a point that isn't a question
const append = (type: string, content: string) => ({ type, event_id: randomUUID(), delegation_id: null, content });

/** Rewrites the notes from a session folder's transcript and keeps its recap; a session the person barely spoke in changes nothing. With `apply` false (a rehearsal) the notes go to the session folder only. If the pass fails it marks the session's notes failed and throws (run it again with `apprenticer notes`). */
export async function saveNotes(dir: string, sessionDir: string, apply = true): Promise<Meta> {
  const meta = readMeta(sessionDir)!, transcript = readFileSync(join(sessionDir, 'transcript.md'), 'utf8');
  const spoken = (transcript.match(/(?<=^User: ).*$/gm) ?? []).join(' ').split(/\s+/).filter(Boolean).length;
  if (spoken < 20) meta.notes = 'skipped'; // no sound, say: not a session worth remembering
  else {
    const space = readSpace(dir), started = new Date(meta.started_at); // read again: they may have edited the notes since
    const before = spend.usd;
    const { recap, notes } = await notesPass(space, transcript, `${localDate(started)} ${started.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
      .catch(err => { writeMeta(sessionDir, { ...meta, notes: 'failed' }); throw err; });
    meta.cost_usd += spend.usd - before; // the pass costs tokens too
    writeNotes(space, notes, sessionDir, apply);
    Object.assign(meta, { recap, notes: apply ? 'updated' : 'preview' });
  }
  writeMeta(sessionDir, meta);
  return meta;
}

/** Runs an accepted GPT-Live session: the mind opens, answers, logs events, enforces the time limit; resolves once the notes are saved. */
export function runSession(dir: string, sessionId: string): Promise<void> {
  const space = openSpace(dir), sessionDir = newSessionDir(dir), started = Date.now();
  const meta: Meta = { id: sessionId, started_at: new Date(started).toISOString(), cost_usd: 0 };
  writeMeta(sessionDir, meta);
  board.start(join(sessionDir, 'drawings'));
  const usage: Tally = { seconds: 0, searches: 0 }, spent0 = spend.usd, today0 = spentToday(dir); // today0: this space's other sessions today
  const cost = () => costUsd(usage) + spend.usd - spent0; // voice, searches and the mind's tokens
  const log = (event: object) => appendFileSync(join(sessionDir, 'events.jsonl'), JSON.stringify({ ...event, received_at: Date.now() }) + '\n');
  const hangup = () => openai().live.sessions.hangup(sessionId).catch(() => {});
  let ws: WebSocket, closed = false, tries = 0, opened = false;
  const send = (event: object) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(event));
  const mind = mindController(space, send, log);

  // The only limit is GPT-Live's, which ends a session two hours after it starts.
  const timers = [
    setTimeout(() => send(append('session.instructions.append', 'The line cuts out in about ten minutes, at the two-hour limit. At a natural pause, tell them once, then carry on.')), 105 * MINUTE),
    setTimeout(hangup, 115 * MINUTE),
  ];

  function handle(event: any) {
    if (event.type === 'session.output_audio.delta' || event.type === 'session.input_audio.append') return; // raw audio
    log(event);
    if (event.type === 'session.closed') closed = true;
    mind.handle(event);
    if (event.type === 'error' || event.type === 'transport.failed') console.error(`[${sessionId}] ${event.type}`, event.error);
    const changed = tally(usage, event), usd = cost(); // the mind's tokens move the cost between sideband events, which keep coming
    if (changed || usd !== meta.cost_usd) {
      meta.cost_usd = usd;
      writeMeta(sessionDir, meta);
      board.push({ type: 'cost', usd, today: today0 + usd });
    }
  }

  return new Promise(resolve => {
    async function finish() {
      timers.forEach(clearTimeout);
      if (!closed) { hangup(); mind.handle({ type: 'session.closed' }); } // we lost the sideband for good; don't leave the session (or its board) running untracked
      Object.assign(meta, { ended_at: new Date().toISOString(), duration_s: Math.round((Date.now() - started) / 1000), cost_usd: cost() });
      writeFileSync(join(sessionDir, 'transcript.md'), mind.transcript() + '\n');
      writeMeta(sessionDir, meta);
      console.log(`[${sessionId}] ended; saving notes`);
      try {
        const saved = await saveNotes(dir, sessionDir);
        board.push({ type: 'cost', usd: saved.cost_usd, today: today0 + saved.cost_usd });
        board.push({ type: 'recap', ...saved.recap, skipped: saved.notes === 'skipped' });
        console.log(`[${sessionId}] notes ${saved.notes}`);
      } catch (err) {
        board.push({ type: 'recap', failed: true });
        console.error(`[${sessionId}] notes failed; run: apprenticer notes ${dir}\n`, err);
      }
      resolve();
    }

    function attach() {
      ws = new WebSocket(`wss://api.openai.com/v1/live/sessions/${sessionId}/attach`, { headers: { Authorization: `Bearer ${config.openaiApiKey}` } });
      ws.on('open', () => { if (!opened) { opened = true; mind.handle({ type: 'attached' }); } }); // the mind opens once, even if the first attach had to be retried
      // Errors are logged, never thrown: a throw here would crash the server mid-session.
      ws.on('message', raw => {
        try { handle(JSON.parse(raw.toString())); } catch (err) { console.error(`[${sessionId}] sideband handler failed`, err); }
      });
      ws.on('error', err => console.error(`[${sessionId}] sideband error`, err));
      ws.on('close', () => {
        if (!closed && tries < REATTACH_TRIES) {
          tries++;
          console.warn(`[${sessionId}] sideband dropped; re-attaching (${tries}/${REATTACH_TRIES})`);
          setTimeout(attach, 1000);
        } else void finish();
      });
    }

    attach();
  });
}
