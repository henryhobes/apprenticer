---
name: apprenticer
description: Rehearse or learn something out loud. Builds an Apprenticer space, a voice session with a board that `npx apprenticer` serves in the browser. Use when the user wants to prepare for an interview, design review, meeting, pitch or negotiation; to learn or be taught a topic; to practise a language; or to think a decision through. Also use when they mention Apprenticer or a space, or come back after a session to improve one. If they haven't asked for a voice session, offer one first.
---

# Building an Apprenticer space

## Start here

1. If the user hasn't asked for a voice session, offer one in a sentence ("Want to rehearse this out loud? I can set up a voice session where the AI plays your boss.") and go on only if they want it.
2. Before you ask or propose anything, run `npx apprenticer init <folder>`, in a new folder named for the space (`./design-review`), or `init .` to revise the space you're in. It prints the interview questions.
3. Ask those questions, in order, one per message, and wait for each answer. Don't swap in questions of your own, and don't answer them yourself from context. If you've already pitched a design, set it aside: the answers decide what gets built.
4. Then follow the four moves below. No visuals or persona until the user has said yes to the brief's read-back, and no visual built until they've said yes to your list of them.
5. Before you hand over, run `check` and `sim`. If either couldn't run (no API key, say), tell the user it didn't, and what it would have tested.

Read the rest of this file before move 2.

An Apprenticer space is a folder. The user runs `npx apprenticer <the folder>` and talks, by voice only, with a "mind" model that has read everything here; a separate voice model only speaks the mind's words. Beside the voice is a board, a 1200x750 dark screen the mind may use for what is easier to see than hear. Nothing about teaching, interviewing or role-play is built in: the brief decides everything, so every session is as good as what you write here. Your job is to build the space with the user in 15 to 30 minutes, then improve it after they've used it. Nearly everything that has frustrated real users came from how the space was written, not from the runtime: a goal guessed instead of asked, a mock on material nobody taught them, rules that together asked one question five times.

A complete worked example (rehearsing a design review with a skeptical VP) is in the Apprenticer repository under `examples/design-review/`. Copy its shapes, not its content.

## The space

```
brief.md         required. Plain markdown, no front-matter, given to the mind word for word every turn. First heading = title.
notes/*.md       memory. The mind rewrites each one whole after every session. Each opens with <!-- what this note holds. -->,
                 which is kept and is the mind's instruction for that note. init made notes/memory.md: replace it with your own.
visuals/*.html   prepared board visuals. id = filename without .html, listed to the mind in filename order (01-name.html, 02-...).
                 Each opens with <!-- Title sentence. Note to the mind... -->.
sources/*        raw material as text files (a design doc, a job description, a scene's props), inlined into the mind's
                 context, about 100k characters in all. Convert PDFs and slides to markdown; binaries are skipped.
sessions/<ts>/   the runtime's: transcript.md, drawings/ (made on the spot), notes-before/, session.json. Gitignored. Read, never write.
persona.md       optional, yours: the simulated user for `sim`. The runtime ignores it.
```

- Every turn the mind gets the brief, sources, notes, which visual is up (by its title and note, never the picture), and the clock: `Session time: N min, turn T`. It can LOOKUP (web search) mid-session, and WAIT.
- Pacing is the runtime's: after a turn that ends on a point, the mind goes on if the user stays quiet about 3 s (four times in a row at most); after a question it waits. Sessions stop at 2 hours.
- Everything in the space is sent to the model provider. No API keys, passwords, customer data, or anything the user may not share.

Commands:
- `npx apprenticer preview <dir>` opens the visuals preview, no API key needed: each visual on its own board with its note, Next part / All parts / Start over, a button per `set` move, and a box to type what's said (to test cue words and labels).
- `npx apprenticer check <dir>` runs the static checks.
- `npx apprenticer sim <dir> --user persona.md [--turns 16] [--draw]` rehearses a session in text against a simulated user, then a judge scores it, says whether this user would come back, and names the worst moment. `--draw` really draws the `draw` lines. Its clock counts 150 spoken words a minute and 3 s a turn, so 16 turns is about ten minutes. The notes pass goes to that run's `sessions/<ts>/notes-after/` only; `--notes` applies it to notes/ (so a second run tests memory).
- `npx apprenticer <dir>` is the real thing: it serves the space and opens the browser. `npx apprenticer notes <dir>` re-runs a notes update that failed.

## Build it in four moves

**1. Interview.** `init` (Start here) keeps files that already exist, so run it again whenever you come back to this move: it prints the questions. Ask them one at a time, in your own words, and wait for each answer. This move is never skipped, even when you know the user well, have notes on them, or are short of time: context tells you about the person, not what they want from this space, and your guess at their goal is the most common reason a space fails. You may put your guess as the question ("Sounds like a mock of Thursday's review, with your VP pushing on cost. Right?"), but the user answers every one. Put what they give you to read in sources/, as text.
- If the space practises for a real conversation, the user chooses what it covers: draft 20 to 25 likely questions or topics, have them rate each good, medium or bad (a list in chat will do), and build only on the good ones.
- Rehearse the person, not a topic. A first-round interview asks about their own work (the most complex thing they built, its hardest part, a call they got wrong); a drill on textbook mechanisms is a teaching space, built only if they ask for one.

**2. Draft the brief** (below). Read it back in three to five lines, not the file: who the mind is, its rules, how it opens, how it closes. Ask what's wrong, and edit by talking until it's right. This is a gate: write no visuals or persona until they've said yes to the read-back. A yes to the idea ("yes, build it") isn't this yes, and nor is a review by another model, which can only judge your guess.

**3. Visuals, only where seeing beats hearing.** Propose up to six, one line each: id, what it shows, when it goes up, its `set` move. Get a yes before building. A visual of numbers needs the real numbers: get them into sources/ or don't build it. Build them (The board), run `preview`, send the user to it, and fix what they say. No visuals is a fine answer for a thinking partner, and often for coaching stories about their own work, where they glance at the board at most.

**4. Check, rehearse, hand over.** Run `check` and fix everything. Write persona.md: who the user really is, how they talk, what they know and don't. Its triggers come from the user's own complaints, word for word, as things they will do: "if asked something nobody taught them, says 'how would I know that?' and goes flat"; "if asked something they've already answered, snaps". A persona without triggers passes anything: rehearsals scored 4 out of 5 on spaces the real user hated. Add three or four moves (dodge a question, push back on a claim, say "pause", leave early).
- Run `sim` (with `--draw` if the brief draws). Read the judge's worst moment and its would-come-back evidence, fix the one thing behind them, run it once more. If the run ended before the close, raise `--turns` to reach its time, or have the persona leave early.
- Then rehearse a second session: `sim --notes` twice in a row, so the second starts from the first one's notes, where beats that re-ask collide. Afterwards put the notes back: `cp -R sessions/<first run>/notes-before/. notes/`.
- Hand over. They need an OpenAI key: run in a terminal, `npx apprenticer` asks for it once; started any other way it needs `OPENAI_API_KEY` or `~/.config/apprenticer/.env`. Tell them: run `npx apprenticer <dir>`, allow the microphone, start talking; come back to you afterwards to revise.

## The brief

Write it to the mind, in the second person, about the user by name: prose for a smart reader. Most briefs land at 500 to 800 words, and that's fine; facts go in sources/, the brief carries a person, a purpose and an order.

**Rank it.** The mind follows a brief's gist and drops its small print, and a brief patched rule by rule past about 1,000 words gets worse, not better. So:
- Few rules. The two to four a session fails without go under Rules, near the top, one plain sentence each, naming the tempting case ("Never recommend for or against the project, even when she asks what to tell the council"). Say it again in the arc, at the beat where it bites.
- Cut every line that wouldn't change what the mind does, and don't restate the runtime (Writing for a voice).
- Say what to do with a tangent: answer it in a sentence or two and come back ("that's stage three; for now..."), or follow it when it's their real worry. Say nothing and the mind follows every one.
- Write the close as numbered steps, each a turn with what it holds. The mind runs all of it before goodbye, over as many turns as it takes, even when they say they're going.
- Time the arc. The mind sees the minutes each turn, so give it a clock: "at about 35 minutes, say 'That's time.' and start the close"; "by 15 minutes, push her to pick one".
- Read the beats together. A warm-up, a review loop and a quick-fire close can each re-ask the same item, and one real session asked the same question five times that way. Walk one imaginary session through the whole arc, then the next one from its notes, and count how often each question gets asked.

```markdown
# <What this is, in the user's words>

## The goal
<The outcome and the moment it's for, concrete and dated: "Thursday, 30 minutes with Dana; walk out with a yes", not "get better at reviews".>

## <User's name>
<What they know cold (never explain it), what's shaky, how they behave under pressure, what they hate.>

## You are <role>
<Teacher: your angle and what you care about. A person: their agenda, their concerns in the order they'd
raise them, and for each the answer that would settle it; how they talk. A thinking partner: whose side you're on.>

## Rules
<Two to four, one sentence each: the role's hard lines, their worst complaints, and turn length, pacing,
board or questions where they differ from the runtime's defaults.>

## How it opens
<What's on the board (or nothing), and the first line written out, ending on a question they can answer right away.>

## The arc
<The beats in order, each with its visual and its question, and roughly when. When to move on; what to do with a tangent.>

## The close
1. <A turn, and what it holds.>
2. <...>

## Done when
<Shown, not covered: a check the mind can run in conversation ("answers these three without help", "settles all five in one run").>

## If they ask (optional)
- "<a question you can predict>": <the answer, in a sentence>

## Stepping out (role-play)
<How the user calls a time-out ("pause"), what the coach says, how to go back in.>

## Next time
<What to remember, and how to use the notes: where to open, what to skip, what to bring back.>
```

- **Who you are**: adjectives ("tough but fair") give the mind nothing to do. An agenda, pet concerns and what satisfies each does: Dana has been burned by a migration left half-done, so she wants per-family rollback and a date the old system dies. One voice, one role: if the mind plays two (a coach and the interviewer), mark every switch the same way at the start of the line ("The CTO would ask: …"), never with jargon ("Stepping out.", "Back in.").
- **Opening**: on a question or puzzle answerable from the board or from what they know ("Finish this sentence: peanut butter and what?"; "If we did nothing until next summer, what breaks first?"). Never an agenda ("Today we'll cover..."), never "what would you like to talk about?". Anything that opens every session (a tour, a warm-up) says when it stops in terms the mind can see ("skip it once they've said they know it"), never by a count the notes keep ("the first two rounds").
- **Arc, for teaching**: show the mechanism working before asking them to reason about it. Each question must be answerable from what's on the board at that moment. Three to five questions a session; the rest is explanation. When they're wrong, run the mechanism again with their answer rather than just correcting them. Close with an explain-back: they walk through the idea, and the mind fills in only what's missing.
- **Arc, for role-play**: it tests what they already know. If the material is new to them, write a teaching space, or teach before each question; never open a mock on what the brief says is new. Give the scene before the question: a question about a system they've never seen needs the system first. Then the persona's concerns in order, and how they react to a vague answer versus a good one.
- **Arc, for interview prep** about their own work: the questions they rated good, in order, and a shape for story answers (what it is, my part, the hard call, the result). The move users value most is "say it as me, better": after their first take, two sentences of feedback (one line that landed, quoted, and one fix); then a 60 to 90 second version in their voice, from their facts only; then one retake in their own words, and move on. Never a third take. When an answer already covers the next question, say so and skip it, or ask only for what's missing.
- **Arc, for a thinking partner**: a loop, not beats: name the decision, surface what's assumed, push on the one assumption that matters most. Say whether the mind argues the other side, and that its own view comes after theirs (given first, it becomes the answer). Give it a deadline: by when they pick an option, and when numbers go on the pick.
- **Next time**: the notes pass reads the brief to decide what to keep, so say what matters. Open on what's still open, never with a recap.

### Facts and props

Real-world claims (numbers, names, dates, how things work) must be true: from sources/ or a check you made. Practice props are fine: a fictional flat's listing, an interview's scale numbers, a menu. Write them into sources/ under a line saying they are props, so the mind holds them constant across sessions instead of making up new ones.

Facts about the user's own work come only from them, in a source headed "use only these facts; never invent". The brief keeps what's built apart from what's planned ("the test I'd write", "it hasn't shipped yet"), and says, as the user decided it with you, what the mind does when they overstate in practice: flag it once, or let it go.

### Writing for a voice

The runtime already has the mind talk in speech, not lists; about 50 to 90 words a turn; at most one question a turn; no "Great point", no "does that make sense?" or "what stands out?", no wrap-ups; never asking again what they answered today, whatever the notes say; scripted lines said word for word; their question answered before the close starts, and the close finished before goodbye. The brief's own rules on the board, turn length, pacing and questions override these defaults, so state them only where they differ. What the brief must add, because only it knows the session:
- **Length and pacing**: a VP talks in one or two sentences; an interviewer waits after every question ("after each question, wait; never carry on unprompted"); a language partner speaks slowly and briefly.
- **Questions**: one short sentence with a real answer they can give in a sentence, from what they've been shown or already know. A check makes them produce a name or a result ("Which rule rejects it?"), never just yes or no. An explain-back asks for one idea, not two. A prediction asks which way, or roughly how much, before the reveal. No arithmetic for them in teaching; when doing it is the skill (an interview's estimates), ask for it.
- **Scripted lines**: the mind says them literally, so script only what must be exact (the opening, "That's time."), written for the ear: short sentences, numbers as people say them, the visual's cue words in order.

## The board

The board is optional. The mind drives it with unspoken lines. A turn may start with one of these; a turn without one keeps what's up:
- `show <id>`: a prepared visual. Its first step is up at once, later ones on their cues. Showing the one already up changes nothing; showing it again after something else, or `clear` then `show` in one turn, starts it fresh, without its moves.
- `draw <what>`: a drawing made on the spot, landing a couple of seconds into the turn. It shows only what the line describes, no added parts, so the brief names the parts ("draw the doc's four steps as a timeline, billing last"); a bare sentence renders as text. It replaces what was up.
- `keep` leaves what's up; `clear` empties the board, which then shows the session title.

And anywhere in a turn:
- `set <move>`: a move on the prepared visual that's up, landing early in the turn (Cue words and `set` moves).
- `ask <question>`: writes the question at the foot of the board once the voice has asked it (the visual shrinks a little to make room); it goes when the mind next speaks.
- `term <term>: <meaning>`: a line above the board with a word's spelling and meaning, until the next term.

On the first turn nothing is up, and the mind may leave it so. The mind never sees the board: it knows a prepared visual only from its note, and a drawing from a one-line description. Say in the brief where the board fits and when to `ask`. A prepared visual earns its place where seeing beats hearing: a mechanism working, a structure, a scale, a comparison, the thing both people would look at in the room.
- **Teaching**: mechanism visuals. A toy small enough that every part and number is visible, working as the voice narrates (a model with 4 inputs and 12 weights scoring the next word), then the same thing at real size. Ask only after they've watched it work. For the explain-back, `set labels off`.
- **Role-play** (interview, review, negotiation): the board belongs to the user, and the mind is its scribe: it draws only what they've said, in their words, never a part they haven't named. Prepared visuals are what's really in the room: their doc's diagram, the other side's list of concerns. Nothing springs a trap or hints at an answer; a mock interview starts on an empty board.
- **Thinking partner**: a live outline (the decision, the options, what's known against what's assumed), drawn on the spot. Prepare the frame at most.
- **Language practice**: the scene (a listing, a menu, a map), never the answer they're meant to produce. Listening is the skill, so questions stay spoken: `ask` only when they're stuck.
- **Never a slideshow**: six prepared visuals at most, none that restates speech or carries text to read.

### Style

- 1200x750 px, 60 px safe margin. One inline `<svg viewBox="0 0 1200 750" width="1200" height="750">`, or absolutely positioned HTML for text and numbers. Inline styles or one `<style>`; a `<script>` for motion; no external scripts, fonts or images.
- Already set on every visual: body 1200x750, transparent over the board, colour `--ink`, 22 px system sans with tabular figures; `svg` is `display:block`, inherits the font, `overflow:visible`.
- Colour tokens (CSS variables, already set). Exactly one gold element: the thing to look at. The rest by meaning only. Fills are the stroke colour at about 12% opacity. What is uncertain or not yet true is dashed or `--ink-dim`.

| token | value | for |
|---|---|---|
| `--ink` | #ECE9E3 | text and strokes |
| `--ink-dim` | #8A8780 | secondary labels, units, the uncertain |
| `--faint` | #3A3B40 | guides, rules, axes |
| `--panel` | #1C1D20 | box fills |
| `--gold` | #D9A441 | the focus |
| `--power` / `--money` | #D97A3D / #7FB77E | energy, load, effort / money |
| `--time` / `--cool` | #7A9CC6 / #5FA8B8 | dates, schedules / water, cooling, calm things |
| `--bg` | #111214 | the board itself |
| `--ease` | cubic-bezier(.2,.7,.2,1) | the house easing |

- Classes provided (anything else, `.box` or `.big`, is yours to define):
  - `.step`: hidden (transparent, 8 px low) until the board adds `.on`, then fades up over 0.6 s.
  - `.draw`, on a path with `pathLength="1"`: draws itself in over 0.9 s; inside a step, as the step comes on.
  - `.flow`, on a path: dashes run along it for about 7 s, then stop (it stays dashed); inside a step, as the step comes on.
  - `.label`: hides under `set labels off` (the board puts `labels-off` on body) and comes back with `.named` as the user says its `data-cue`, flashing gold. The flash animates `fill`, so SVG text flashes; an HTML label just reappears.
  - With reduced motion set, every animation and transition is off and `.draw` lines show whole.
- Type: big numbers 56-72 px with a small dim unit beside (`2.8` `s`); labels 24-32 px; nothing under 20 px, since they glance while talking. Labels are nouns of one to three words. No titles, bullets, paragraphs or legends: label things directly. Every number sits in or under the thing it measures.
- Strokes 2 px (3 emphasised), round caps and joins, 6 px corners. No gradients, shadows, 3D, emoji, icons, clip art or pie charts.
- Less is the whole job: one idea; at most five boxes, six numbers, twelve words of labels. Boxes never nest. A calculation is numbers with operators between them, never a sentence. Fewer parts, drawn larger.
- Use the shapes of the kit the mind draws with, so prepared and live visuals look like one system: **chain** (things leading to each other, left to right), **numbers** (up to four big numbers side by side), **compare** (two columns; row names dim at the left, no cell borders, one faint rule), **calc** (a calculation line by line onto its result), **split** (a whole divided into its parts). Also: a toy mechanism, a ladder of scale, a timeline with a "now" marker.
- Motion only where it means something: `.draw`, `.flow`, a punchline number that counts up. Transitions of 400-600 ms; nothing loops. When a move changes something, change it where the eye already is.

### Cue words and `set` moves

- A part that appears in sequence is an element with `class="step"` and `data-cue="noun|alternative"`; steps go in document order and never nest. The first is up at once and needs no cue; every later one needs one (`check` enforces it). Anything outside a step is always up.
- Cues fire on the mind's spoken words in the current turn, not the user's. A cue matches the start of a word, in any case (`multipl` catches "multiply" and "multiplication"), so start it with a plain letter a to z: "árbol" never matches. Saying a later cue brings up every step before it. While the voice talks, a step never cued comes up 8 s after the one before; everything is up once it stops.
- The cue is the part's own noun, the word the voice is bound to say (queue, owner, duplicates). Never a number, never a phrase that could be worded differently. All of a visual's cues get said, in order, in the turn that puts it up. In role-play, put them in the persona's scripted line or the note's suggested wording.
- For a part that plays (an animation), add a hidden marker `<i class="step" data-cue="...">` in its place in the step order, and start the animation when the marker gets the class `on` (skeleton below).
- `set <words>` posts `{ set: "<words>" }` to the visual that's up; the visual acts on the words (trim and lower-case them first). A move can carry words: `set struck owner`. `show` and `set` in one turn work: the move lands once the visual has loaded. Use a move for the answer to something the mind asked: the visual holds still until the user answers, and the move comes in the next turn as the voice says what happened. Moves do nothing on a drawing.
- `set labels off` and `set labels on` belong to the board and never reach the visual's script in a session (in preview they do: don't act on them). Give every `.label` a `data-cue`, or it hides and never returns. That's the explain-back.
- A visual starts fresh each time it goes up again. Never build one that needs moves from an earlier showing.

### The note

The note is the contract: the mind can drive only what the note describes. Write: the title as the first sentence (no full stop inside it), saying what's on the board, since in `sim` the simulated user sees only the title; when it goes up; what's on it, part by part, as it looks; the cue words, quoted, in the order to say them, all in the turn that shows it; each move in double quotes (`"set risk"`; preview makes a button for each) with what it changes and when to make it; and the numbers on it, so the mind reads them instead of inventing them. From the example:

```html
<!-- A separate Postgres against a managed queue. For concern 2, as Dana asks why not option A: the design doc's two options side by side, a table with no borders. Row names down the left, in grey: effort, still with us, new to us. The "A separate Postgres" column is up at once; the managed queue column comes up as Dana says "queue", so in the turn that shows it she names A first and the queue second ("a separate Postgres in two weeks, or the queue in ten?"). Effort: 2 weeks against 10 weeks, the 10 in gold: the price Sam is asking her to pay. Still with us: "polling, duplicates" under A, a dash under the queue. New to us: a dash under A, "at-least-once delivery" under the queue, in grey. "set leftover" moves the gold to A's "polling, duplicates": make it as Dana takes the point, once Sam has said what A leaves unfixed. "set risk" moves the gold to "at-least-once delivery": make it to open concern 3, as Dana asks what happens the day a charge_card job arrives twice. "set effort" puts the gold back on the 10 weeks. Not on the board, also from the doc: about $900 a month for A, $160 for the queue. -->
```

### Skeleton

```html
<!-- Title sentence. When it goes up; what is on it; cues "queue", then "retry", in one turn; "set storm" and what it shows. -->
<style>.box{fill:var(--panel);stroke:var(--ink);stroke-width:2} .lbl{fill:var(--ink);font-size:28px}</style>
<svg viewBox="0 0 1200 750" width="1200" height="750" stroke-linecap="round" stroke-linejoin="round">
  <g class="step"><!-- first part: up at once -->
    <rect class="box" x="120" y="300" width="300" height="130" rx="6"/>
    <text class="lbl label" data-cue="client" x="270" y="375" text-anchor="middle">Client</text></g>
  <g class="step" data-cue="queue"><!-- up as the voice says "queue" -->
    <path class="draw" pathLength="1" d="M430 365 H560" stroke="var(--ink-dim)" stroke-width="2"/>
    <rect class="box" x="570" y="300" width="300" height="130" rx="6"/>
    <text class="lbl label" data-cue="queue" x="720" y="375" text-anchor="middle">Queue</text></g>
  <text id="n" x="720" y="530" text-anchor="middle" font-size="64" fill="var(--gold)" opacity="0">10</text>
</svg>
<i class="step" data-cue="retr"></i><!-- hidden marker, last in step order: plays on "retry" -->
<script>
const marker = document.querySelector('i.step');
new MutationObserver(() => marker.classList.contains('on') && play()).observe(marker, { attributes: true });
addEventListener('message', e => {
  const move = String(e.data?.set ?? '').trim().toLowerCase();
  if (move === 'storm') document.getElementById('n').setAttribute('opacity', 1);
});
function play() { /* one animation that means something, once */ }
</script>
```

## Notes

Notes are the mind's memory. After every session it rewrites each note whole from the transcript, following that note's leading comment and the brief. Choose two to four per space; each must earn its place by changing what the next session does.
- Teaching: `you.md` (goal, what they understand with evidence, what's shaky, how they like to be taught, their complaints); `progress.md` (where it stopped, what's done by the brief's checks, open threads); `quiz.md` only if they want spaced practice: one entry per idea with a recall question, the answer wanted, and a dated log of every asking (got it, half, missed). The brief's next-time line says what's due: never asked, missed or half last time means now; right once, about 3 days; twice, a week; three times, 2-3 weeks.
- Interview prep: `you.md`, `answers.md` (each likely question, their best answer so far in their words, what's missing), `weak-spots.md`.
- Design review: `you.md`, `objections.md` (each concern, a dated log of their answers, what's still missing), `open-threads.md`.
- Thinking partner: `decision.md` (options, what's known against what's assumed, what would change their mind), `open-threads.md`.

The leading comment is the instruction, so write it as one: what the note holds, what counts as evidence (their own words, "explained X unprompted", the date), a length cap, and what must never be dropped. It must contain a sentence ending in a full stop (`check` looks for one). Example: `<!-- Dana's five concerns from the brief, and any new one that came up, one entry each: the concern in a line; a log of Sam's answers, one line per session with the date, in Sam's words, marked settled, half or open; and what is still missing. Never drop a log line. -->`. Seed `you.md` with what the interview told you, so the first session already knows it.

## Revise after a session

When the user comes back, first: if they were frustrated in two sessions running, stop patching. Go back to move 1 (run `init` again), ask whether the space practises the right thing, and be ready to start the brief over: move the old space aside and don't build on it. A fifth rule won't fix a space that drills the wrong thing. Otherwise:
1. Read the newest `sessions/<ts>/transcript.md` in full. Mark where they were lost ("wait, what?", "what are you asking?"), bored (a run of "okay"s, short answers), cut the mind off, corrected it ("I already answered that"), or lit up (a follow-up, an explanation they gave unprompted).
2. Check the brief against it: did each rule hold, and did the close run in full? A rule the mind dropped is buried or one of too many: move it into Rules, or cut others.
3. Compare `notes-before/` with `notes/`. Did the update keep what matters and record their complaints? If it failed, run `npx apprenticer notes <dir>`. Hand-edit notes only to fix a wrong fact.
4. Ask them one question: what was the worst moment?
5. Propose one change to the brief and one visual change (new, fixed or cut), each tied to a moment you quote from the transcript. Make them once they agree.
6. Promote a good drawing: copy it from `sessions/*/drawings/` into `visuals/NN-name.html`, write its leading note, check its facts and cues.
7. Run `check`, then reread every visual's note against the brief: an edit to a scripted line silently orphans a cue.

## Hard limits

- Never invent facts, in visuals or the brief. Real-world numbers, names and dates come from sources/ or a check you made; props live in sources/, marked as props.
- No board that answers for them: in role-play and practice it shows what they've said and the scene, never the solution.
- No chores: visuals take no input. Never have the mind ask them to type, click or "notice", or to compute unless computing is the skill.
- No secrets in the space, never write `sessions/`, and never drop a note's leading comment.
