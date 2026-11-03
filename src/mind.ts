import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import { type BoardCommand, boardCommands, withoutBoard } from './board.ts';
import { config, meter, openai } from './config.ts';
import type { Recap, Space } from './space.ts';

// The mind: GPT-6.1 Sol writes every turn of a session, from the space's brief, its notes and its
// sources. The voice model only speaks for it. Its memory is the notes: plain files, rewritten (never
// appended to) after each session from the transcript, which is kept.

/** Runs a long model call in background mode, which survives past Node's 5-minute response wait. */
export async function longResponse(params: ResponseCreateParamsNonStreaming, maxMinutes = 30): Promise<string> {
  let res = await openai().responses.create({ ...params, background: true });
  const deadline = Date.now() + maxMinutes * 60_000;
  while (res.status === 'queued' || res.status === 'in_progress') {
    if (Date.now() > deadline) {
      await openai().responses.cancel(res.id).catch(() => {});
      throw new Error(`model call took over ${maxMinutes} minutes; cancelled`);
    }
    await new Promise(r => setTimeout(r, 5_000));
    res = await openai().responses.retrieve(res.id);
  }
  if (res.status !== 'completed') throw new Error(`model call ${res.status}: ${JSON.stringify(res.error ?? res.incomplete_details)}`);
  meter(res);
  return stripCitations(res.output_text);
}

export const stripCitations = (text: string) => text.replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/https?:\/\/\S+/g, '').replace(/[ \t]{2,}/g, ' ').trim();

/** The person's calendar date, YYYY-MM-DD: an evening session is still today, not UTC's tomorrow. */
export const localDate = (when: Date | string = new Date()) => new Date(when).toLocaleDateString('en-CA');

export interface Turn { speaker: 'User' | 'Mind'; text: string }
export const renderTurns = (turns: Turn[]) => turns.map(t => `${t.speaker}: ${t.text}`).join('\n');

/** How the mind works: the runtime's part of its instructions. The brief says what it is for. */
export const PROTOCOL = `You are the mind behind a voice conversation. The person talks to a voice model that listens for you and speaks your words aloud; you decide everything it says. The brief below says who you are, what this conversation is for and how to behave: follow it. Your notes are your memory of this person and your past sessions, and the sources are raw material you can draw on. A comment at the top of any of these files is a note to you about that file. In the conversation so far, "User" is the person and "Mind" is you.

Write for the ear. A voice reads your words exactly as you write them, so write speech, the way you'd talk to someone you respect on a call: contractions, short sentences, the odd aside or opinion of your own, numbers said the way people say them; no lists, no markdown, no URLs, and no tidy summing-up line at the end of every turn.

Length. Unless the brief says otherwise, a turn is one idea in 50 to 90 words (about half a minute spoken), then you stop at the end of the point; people lose compound turns. Make it easy to follow by ear: plain words, short sentences, at most one new term a turn (say what it is the first time) and one or two numbers, rounded the way people say them. Say why before what.

Make it make sense. If they say "wait, what?" or sound lost, you lost them: say the same thing again more simply, with something concrete, before going anywhere else. Never move on from confusion, and never answer it with a question.

Take them seriously. When they push back, either they're right (say so plainly, and what it changes) or there's a specific fact or reason that settles it: give it. Don't hedge with "it can be both" unless you then say which matters more and why. When you got something wrong, fix it in a few words without apologizing or narrating your own clarity ("I muddied that").

Start with substance, not a verdict on what they said ("You're right", "Exactly", "Good catch"): when they're right, show it by building on their point. If the brief has you judging their answers, the verdict comes first, plainly.

Remember them. Use what they said earlier in this session and what your notes hold; build on their positions; don't go over what they already have.

Be honest. Say facts the way you'd remember them, never as a citation. Never make a fact up. If something that matters is one you don't know or may have changed, reply with only LOOKUP: followed by what to find, and you'll get to search before answering.

They decide when it ends. Never wrap up or talk about next time unless they say they're going, or the brief sets a length and the session time (given with each turn) has reached it; then close the way the brief says, or simply and warmly.

Follow the brief literally. Where it gives exact lines ("Noted. Next.") or rules (no recap, no hints), use and obey them as written, every turn. Where it defines a closing (feedback, a verdict), finish all of it before the goodbye, over as many turns as it takes.

Turn-taking. A turn ends one of two ways: on a question for them, and you wait for the answer; or at the end of a point, and if they don't come in you are asked to go on a few seconds later. Ask at most one question a turn unless the brief says otherwise. Never tack a question on just to hand over the turn, and don't ask permission to go on: if the next step is obvious, take it. Never ask about their reaction or your own clarity ("does that make sense?", "what did you take from that?").`;

/** The mind's whole instructions: stable first (protocol, brief, sources, notes), then the board's, so the start of every turn's prompt is the same and can be cached. */
export function instructions(space: Space, board?: string): string {
  return [
    PROTOCOL,
    `# THE BRIEF\n${space.brief}`,
    space.sources.length && `# SOURCES\n${space.sources.map(s => `## ${s.name}\n${s.text}`).join('\n\n')}`,
    `# YOUR NOTES\n${space.notes.map(n => `## ${n.name}${n.about ? ` (${n.about})` : ''}\n${n.body || '(empty)'}`).join('\n\n') || '(none)'}`,
    board && `# THE BOARD\n${board}`,
  ].filter(Boolean).join('\n\n');
}

/** What the mind is asked for: its reply to the person, the next part after they let a point stand, or (with nothing said yet) its opening turn. */
const WAIT = /^\s*WAIT\W*$/;
const NEXT = {
  reply: "Is there anything they've said that you haven't taken up yet? Then write only what you say next, as the Mind.",
  goOn: "They haven't come in since your last words: they're letting the point stand. Go straight on from where you stopped, without going over what you just said, remarking on their silence or asking whether to go on. If your last turn put a question to them, however it was phrased, or they're going or asked you to wait, or you've said goodbye, or the brief has you wait for them, write only WAIT. Otherwise write only what you say next, as the Mind.",
  open: "The session is just starting and nobody has spoken yet. Write only your opening turn, as the brief and your notes call for it: pick up where your notes left off if there is somewhere to pick up, otherwise begin. If the brief has the person speak first, write only WAIT.",
};

/**
 * The mind's next spoken turn, given the space and the conversation so far.
 * Streams: `onSpeech` gets the opening sentences as soon as they're written, so the voice can start
 * talking while the rest is still being written, then the rest; `onVisual` gets the turn's opening
 * board line (show, draw or clear) as soon as it's written. Returns the whole turn, or WAIT.
 */
export async function mindTurn(space: Space, turns: Turn[], opts: { effort?: 'low' | 'medium'; signal?: AbortSignal; goOn?: boolean; onLookup?: (what: string) => void; onSpeech?: (text: string) => void;
  elapsedMs?: number; board?: { instructions: string; onScreen: string }; onVisual?: (command: BoardCommand) => void; onBoard?: (commands: BoardCommand[]) => void } = {}): Promise<string> {
  const system = instructions(space, opts.board?.instructions);
  const clock = `Session time: ${Math.floor((opts.elapsedMs ?? 0) / 60_000)} min, turn ${turns.filter(t => t.speaker === 'Mind').length + 1}.\n\n`;
  const screen = opts.board ? `On their screen now: ${opts.board.onScreen}.\n\n` : ''; // before the conversation, so it doesn't steer the next words
  let raw = '';
  const ask = async (extra: string, search: boolean) => {
    const stream = await openai().responses.create({
      model: config.mindModel,
      reasoning: { effort: opts.effort ?? 'low' },
      service_tier: config.mindTier,
      ...(search ? { tools: [{ type: 'web_search' as const }] } : {}),
      input: [{ role: 'system', content: system }, { role: 'user', content: `${clock}${screen}The conversation so far:\n${renderTurns(turns) || '(nothing yet)'}\n\n${extra}` }],
      stream: true,
    }, { signal: opts.signal });
    let text = '', spoken = 0, opened = false; // opened: the first line has been checked for the turn's visual
    const speakable = () => withoutBoard(stripCitations(text).replace(/^(?:Mind|You|User):\s*/i, ''));
    for await (const event of stream) {
      if (event.type === 'response.completed') meter(event.response);
      if (event.type !== 'response.output_text.delta') continue;
      text += event.delta;
      if (!opened && /\n/.test(text.trimStart())) {
        opened = true;
        const [first] = boardCommands(text.trimStart().split('\n')[0]);
        if (first && ['show', 'draw', 'clear'].includes(first.verb)) opts.onVisual?.(first);
      }
      const t = speakable();
      if (!opts.onSpeech || /^\s*L(O(O(K(U(P)?)?)?)?)?$|^\s*LOOKUP/i.test(t) || /^\s*W(A(I(T)?)?)?$/.test(t)) continue; // a lookup request, or WAIT, is never spoken
      // The opening sentences go as soon as they're written, the rest in one piece at the end: each
      // separate piece makes the voice pause and restart, which sounded choppy on a real call.
      if (spoken) continue;
      const end = Math.max(t.lastIndexOf('. '), t.lastIndexOf('? '), t.lastIndexOf('! '));
      if (end > 0 && t.slice(0, end + 1).trim().split(/\s+/).length >= 15) {
        opts.onSpeech(t.slice(0, end + 1).trim());
        spoken = end + 1;
      }
    }
    const t = speakable();
    if (opts.onSpeech && spoken < t.length && !/^\s*LOOKUP/i.test(t) && !WAIT.test(t) && t.slice(spoken).trim()) opts.onSpeech(t.slice(spoken).trim());
    raw = text;
    return t;
  };
  // Searching every turn doubles the wait (about 10 s against 5), so the mind asks for it only when it needs a fact.
  let said = await ask(opts.goOn ? (turns.length ? NEXT.goOn : NEXT.open) : NEXT.reply, false);
  const lookup = said.match(/^LOOKUP:\s*(.+)/is)?.[1].trim();
  if (lookup) {
    opts.onLookup?.(lookup);
    said = await ask(`You asked to look up: ${lookup}. Search for it, then write only what you say next, as the Mind, giving the fact with its date.`, true);
  }
  if (WAIT.test(said)) return 'WAIT';
  const commands = boardCommands(raw);
  if (commands.length) opts.onBoard?.(commands);
  return said;
}

/** After a session, the mind rewrites its notes from what actually happened. */
export const NOTES_PASS = `Update your notes after the session below. Your notes are your whole memory of this person and your work together, so keep them accurate, specific and clean: rewrite each file in full rather than appending, keep what still holds, drop what's stale or redundant, and never lose a fact that still matters. The raw transcript is kept separately, so the notes needn't record everything, only what you'll need next time. The brief says what matters to remember: follow it.

Write from the transcript, not from the old notes' claims: what they actually said shows what they know and want. Mark understanding or claims with evidence ("explained X unprompted", "asked what Y meant twice"). Record preferences they stated or showed, especially complaints, as plain facts about them. The transcript comes from speech-to-text, so judge meaning, not wording. A note on what was on their board says what was shown, never spoken.

Reply with JSON: "recap" and "notes". recap.covered is three to five bullets on what happened this session, most important first, each one plain line under about 60 characters; recap.open is the one open question or next step to start from next time, under about 60 characters, or an empty string if there is none. notes has exactly the keys below, one for each file, each a markdown string holding the whole file without its leading comment.

Files:`;

export const notesSchema = (names: string[]) => ({ type: 'object', additionalProperties: false, required: ['recap', 'notes'], properties: {
  recap: { type: 'object', additionalProperties: false, required: ['covered', 'open'], properties: { covered: { type: 'array', items: { type: 'string' }, maxItems: 5 }, open: { type: 'string' } } },
  notes: { type: 'object', additionalProperties: false, required: names, properties: Object.fromEntries(names.map(k => [k, { type: 'string' }])) } } });

/** Rewrites the notes from a session's transcript; the caller writes them (see writeNotes). */
export async function notesPass(space: Space, transcript: string, when: string): Promise<{ recap: Recap; notes: Record<string, string> }> {
  const names = space.notes.map(n => n.name);
  const text = await longResponse({
    model: config.mindModel,
    reasoning: { effort: 'medium' },
    input: [{ role: 'system', content: `You are the mind behind a voice conversation with one person. The brief says who you are and what the conversation is for.\n\n# THE BRIEF\n${space.brief}\n\n${NOTES_PASS}\n${space.notes.map(n => `- ${n.name}: ${n.about || 'what you need to remember'}`).join('\n')}` },
      { role: 'user', content: `YOUR NOTES BEFORE THIS SESSION\n${space.notes.map(n => `## ${n.name}\n${n.body || '(empty)'}`).join('\n\n')}\n\nTHIS SESSION (${when})\n${transcript}` }],
    text: { format: { type: 'json_schema', name: 'notes', schema: notesSchema(names), strict: true } },
  });
  return JSON.parse(text);
}
