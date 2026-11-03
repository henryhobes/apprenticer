# Building an Apprenticer space

This folder is an Apprenticer space. The user will run `npx apprenticer <this folder>` and talk, by voice only, with a "mind" model that has read everything here, while a board (a 1200x750 dark screen beside the voice) shows what is easier to see than hear. A separate voice model only speaks the mind's words. Nothing about teaching, interviewing or role-play is built in: the brief decides everything, so every session will be as good as what you write here. Your job is to build the space with the user in 10 to 20 minutes, then improve it after they've used it.

A complete worked example (rehearsing a design review with a skeptical VP) is in the Apprenticer repository under `examples/design-review/`. Copy its shapes, not its content.

## The space

```
brief.md         required. Plain markdown, no front-matter, given to the mind word for word every turn. First heading = title.
notes/*.md       memory. The mind rewrites each one whole after every session. Each opens with <!-- what this note holds. -->,
                 which is kept and is the mind's instruction for that note. init made notes/memory.md: replace it with your own.
visuals/*.html   prepared board visuals. id = filename without .html, listed to the mind in filename order (01-name.html, 02-...).
                 Each opens with <!-- Title sentence. Note to the mind... -->.
sources/*        raw material as text files (a design doc, a job description, the user's notes), inlined into the mind's
                 context, about 100k characters in all. Convert PDFs and slides to markdown; binaries are skipped.
sessions/<ts>/   the runtime's: transcript.md, drawings/ (made on the spot), notes-before/, session.json. Gitignored. Read, never write.
persona.md       optional, yours: the simulated user for `sim`. The runtime ignores it.
```

- During a session the mind can also LOOKUP (web search) and draw on the spot (see The board).
- Fixed by the runtime: pacing (after a turn that ends on a point it carries on if the user is quiet about 3 s; after a question it waits; the mind can also WAIT), turns of about 50 to 90 words unless the brief says otherwise, a 2-hour limit. The brief changes these only in prose: "after each question, wait; never carry on unprompted", "one or two sentences a turn".
- Everything in the space is sent to the model provider. No API keys, passwords, customer data, or anything the user may not share.

Commands:
- `npx apprenticer <dir>` serves it and opens the browser; `/preview` shows each visual on its own board with its note, a button per `set` move, and a box to type what's said (to test cue words).
- `npx apprenticer check <dir>` runs the static checks.
- `npx apprenticer sim <dir> --user persona.md [--turns 10] [--no-notes]` rehearses a session in text against a simulated user, then a judge scores it. It writes a session folder, and without `--no-notes` it rewrites notes/.
- `npx apprenticer notes <dir>` re-runs a notes update that failed.

## Build it in four moves

**1. Interview.** Ask one question at a time, in your own words. Skip what they've already told you; offer a guess to correct when you have one ("Sounds like a mock of Thursday's review, with your VP pushing on cost. Right?"). Stop once these are answered, four questions at most:
- What do you want to be able to do, and when does it become real? (Thursday's review; an exam on the 3rd; "whenever I'm curious".)
- Who are you in this: what do you know cold, and what's shaky?
- Who should the AI be? A teacher; a specific person (what do they want, what worries them, what would win them over?); a thinking partner; something else.
- What do you hate in conversations like this? Then: anything it should read? Put what they give you in sources/, as text.

**2. Draft the brief** (template below). Read it back in three to five lines, not the file: who the mind is, how it opens, what it pushes on, when it's done. Ask what's wrong, and edit by talking until it's right.

**3. Visuals, only where seeing beats hearing.** Propose up to six, one line each: id, what it shows, when it goes up, its `set` move. Get a yes before building. A visual of numbers needs the real numbers: get them into sources/ or don't build it. Build them (The board), start the server, send the user to /preview, and fix what they say. No visuals is a fine answer for a thinking partner.

**4. Check, rehearse, hand over.** Run `check` and fix everything. If there's time, write persona.md: who the user really is, how they talk, what they know, what annoys them, and three or four things they'll do (dodge a question, push back on a claim, say "pause"). Honest, not flattering. Run `npx apprenticer sim <dir> --user persona.md --no-notes`, read the judge's worst moment, fix the one thing behind it, run it once more. Then tell them: run `npx apprenticer <dir>`, allow the microphone, start talking; come back to you afterwards to revise.

## The brief

Write it to the mind, in the second person, about the user by name. About 400 words: the sources carry the facts, the brief carries a person, a purpose and an order. Prose for a smart reader, not rules for a parser. Don't restate what the runtime already does (below); spend the words on this user and this goal.

```markdown
# <What this is, in the user's words>

## The goal
<The outcome and the moment it's for: "Thursday, 30 minutes with Dana; walk out with a yes.">

## <User's name>
<What they know cold (never explain it), what's shaky, how they behave under pressure, what they hate.>

## You are <role>
<Teacher: your angle and what you care about. A person: their agenda, their concerns in the order they'd
raise them, and for each the answer that would settle it; how they talk. A thinking partner: whose side you're on.>

## How it opens
<Which visual to put up, and the first line written out, ending on a question they can answer right away.>

## The arc
<The beats in order, each with its visual and its question. When to move on.>

## Done when
<A check the mind can run in conversation: "answers these three without help", "settles all five in one run".>

## If they ask (optional)
- "<a question you can predict>": <the answer, in a sentence>

## Stepping out (role-play)
<How the user calls a time-out ("pause"), what the coach's note says, how to go back in.>

## Don't
<Their complaints, as instructions.>

## Next time
<What to remember, and how to use the notes: where to open, what to skip, what to bring back.>
```

- **Goal**: concrete and dated. "Walk out of Thursday's review with a yes" beats "get better at design reviews".
- **Who you are**: adjectives ("tough but fair") give the mind nothing to do. An agenda, pet concerns and what satisfies each does: Dana has been burned by a migration left half-done, so she wants per-family rollback and a date the old system dies.
- **Opening**: on a question or puzzle answerable from the board or from what they know ("Finish this sentence: peanut butter and what?"; "If we did nothing until next summer, what breaks first?"). Never an agenda ("Today we'll cover..."), never "what would you like to talk about?".
- **Arc, for teaching**: show the mechanism working before asking them to reason about it. Each question must be answerable from what's on the board at that moment. Plan few questions, and good ones: three to five a session, the rest is explanation. When they're wrong, run the mechanism again with their answer rather than just correcting them. End with an explain-back: they walk through the idea, and the mind fills in only what's missing.
- **Arc, for role-play**: the persona's concerns in order, how they react to a vague answer versus a good one, and how to step out of character ("pause") and back in.
- **Arc, for a thinking partner**: a loop, not beats: name the decision, surface what's assumed, push on the one assumption that matters most. Say whether the mind argues the other side, and that its own view comes after theirs (given first, it becomes the answer). Done when they can say what would change their mind.
- **Done when**: shown, not covered. A topic is done when they answer its questions without help.
- **Next time**: the notes pass reads the brief to decide what to keep, so say what matters. Open on what's still open, never with a recap.

## Writing for a voice

The runtime already covers the basics of talking by voice: speech, not lists; one idea a turn in 50 to 90 words; no "Great point"; no "does that make sense?"; no wrap-ups. Don't repeat them in the brief. What the brief must add, because only it knows the session:
- **Questions**: one short sentence with a real answer they can give in a sentence, from what they've been shown or already know. Never arithmetic for them to do, never "what did you notice?" or "how does that strike you?", never one they've already answered ("I literally already answered that" is a real complaint). A prediction asks which way, or roughly how much, before the reveal.
- **Length and pacing**, when the default is wrong: a VP talks in one or two sentences; an interviewer waits after every question; a language partner speaks slowly and briefly.
- **Lines you script** (an opening, a key explanation): written for the ear, short sentences, numbers as people say them, containing the visual's cue words in order.
- **Their complaints**, as instructions: "no fake praise", "don't lecture", "no chores".

## The board

The mind drives the board with unspoken lines: it puts up a prepared visual by id (`show`), draws one on the spot (`draw`), keeps what's up (`keep`), makes a move on the visual that's up (`set`), and can write the question it just asked on the board (`ask`) and a new term above it (`term`). On the first turn nothing is up, so the brief's opening says which visual to put up. The mind never sees a visual: it knows each one only from its note.

A prepared visual earns its place where seeing beats hearing: a mechanism working, a structure, a scale, a comparison, the thing both people would look at in the room. Everything else the mind draws on the spot, or the board stays as it is. Most turns keep what's up.
- **Teaching**: mechanism visuals. A toy small enough that every part and number is visible, working as the voice narrates (a model with 4 inputs and 12 weights scoring the next word), then the same thing at real size. Ask only after they've watched it work. For the explain-back, `set labels off`.
- **Role-play** (interview, review, negotiation): the shared artifact in the room. The board belongs to the user: their problem statement, their design, their numbers, the options' tradeoffs, the other side's list of concerns. The persona's gold is their finger pointing at something; nothing on the board springs a trap.
- **Thinking partner**: a live outline (the decision, the options, what's known against what's assumed), mostly drawn on the spot. Prepare the frame at most.
- **Language practice**: the scene (a menu, a ticket, a street map). Never the answer they're meant to produce.
- **Never a slideshow**: six prepared visuals at most, none that restates speech or carries text to read.

### Style

- 1200x750 px, dark (#111214, already set), 60 px safe margin. One inline `<svg viewBox="0 0 1200 750" width="1200" height="750">`, or absolutely positioned HTML for text and numbers. Inline styles or one `<style>`; a `<script>` for motion; no external scripts, fonts or images.
- Colour tokens (CSS variables, already set): `--ink` (#ECE9E3) text and strokes, `--ink-dim` secondary labels, `--faint` guides and rules, `--panel` fills, `--gold` the focus. Exactly one gold element: the thing to look at. By meaning only: `--power`, `--money`, `--time`, `--cool`. Fills are the stroke colour at about 12% opacity. What is uncertain or not yet true is dashed or `--ink-dim`. `--ease` is the house easing.
- Type: big numbers 56-72 px with a small dim unit beside (`2.8` `s`); labels 24-32 px; nothing under 20 px, since they glance while talking. Labels are nouns of one to three words. No titles, bullets, paragraphs or legends: label things directly. Every number sits in or under the thing it measures.
- Strokes 2 px (3 emphasised), round caps and joins, 6 px corners. No gradients, shadows, 3D, emoji, icons, clip art or pie charts.
- Less is the whole job: one idea; at most five boxes, six numbers, twelve words of labels. Boxes never nest. A calculation is numbers with operators between them, never a sentence. Fewer parts, drawn larger.
- Use the shapes of the kit the mind draws with, so prepared and live visuals look like one system: **chain** (things leading to each other, left to right), **numbers** (up to four big numbers side by side), **compare** (two columns; row names dim at the left, no cell borders, one faint rule), **calc** (a calculation line by line onto its result), **split** (a whole divided into its parts). Also: a toy mechanism, a ladder of scale, a timeline with a "now" marker.
- Motion only where it means something: `class="draw" pathLength="1"` draws a line in; `class="flow"` moves dashes along a path for a few seconds; a punchline number can count up. Transitions of 400-600 ms; nothing loops. When a move changes something, change it where the eye already is.
- Every fact on a visual comes from sources/ or a check you made. A toy labelled as a toy is fine; a made-up number passed off as real is not.

### Cue words and `set` moves

- A part that appears in sequence is an element with `class="step"` and `data-cue="noun|alternative"`. The first step is up at once and needs no cue; every later step needs one (`check` enforces it). Anything outside a step is always up.
- Cues fire on the mind's spoken words, not the user's. A cue matches the start of a word, in any case, anywhere in that turn (`multipl` catches "multiply" and "multiplication"). Saying a later cue brings up every step before it. A cue never said comes up 8 s after the one before, and everything is up when the turn ends.
- The cue is the part's own noun, the word the voice is bound to say (queue, owner, duplicates). Never a number, never a phrase that could be worded differently. All of a visual's cues get said, in order, in the turn that puts it up. In role-play, put them in the persona's scripted line or the note's suggested wording.
- For a part that plays (an animation), add a hidden marker `<i class="step" data-cue="...">` in its place in the step order, and start the animation when the marker gets the class `on` (skeleton below).
- A `set` move changes the visual that's up: the board posts `{ set: "<words>" }` to it, and the visual acts on the words (lower-case them first). A move can carry words: `set struck owner`. Use a move for the answer to something the mind asked: the visual holds still until the user answers, and the move comes in the next turn as the voice says what happened.
- `set labels off` is built in: every element with `class="label"` hides, and each comes back, flashing gold, as the user says its `data-cue`. Give every `.label` a `data-cue`, or it hides and never returns. That's the explain-back.
- A visual starts fresh each time it goes up. Never build one that needs moves from an earlier showing.

### The note

The note is the contract: the mind can drive only what the note describes. Write: the title as the first sentence (no full stop inside it); when it goes up; what's on it, part by part, as it looks; the cue words, quoted, in the order to say them, all in the turn that shows it; each move in double quotes (`"set risk"`; /preview makes a button for each) with what it changes and when to make it; and the numbers on it, so the mind reads them instead of inventing them. From the example:

```html
<!-- Two ways out. For concern 2, as Dana asks why not option A: the design doc's two options side by side, a table with no borders. Row names down the left, in grey: effort, still with us, new to us. The "A separate Postgres" column is up at once; the managed queue column comes up as Dana says "queue", so in the turn that shows it she names A first and the queue second ("a separate Postgres in two weeks, or the queue in ten?"). Effort: 2 weeks against 10 weeks, the 10 in gold: the price Sam is asking her to pay. Still with us: "polling, duplicates" under A, a dash under the queue. New to us: a dash under A, "at-least-once delivery" under the queue, in grey. "set leftover" moves the gold to A's "polling, duplicates": make it as Dana takes the point, once Sam has said what A leaves unfixed. "set risk" moves the gold to "at-least-once delivery": make it to open concern 3, as Dana asks what happens the day a charge_card job arrives twice. "set effort" puts the gold back on the 10 weeks. Not on the board, also from the doc: about $900 a month for A, $160 for the queue. -->
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

When the user comes back:
1. Read the newest `sessions/<ts>/transcript.md` in full. Mark where they were lost ("wait, what?", "what are you asking?"), bored (a run of "okay"s, short answers), cut the mind off, corrected it ("I already answered that"), or lit up (a follow-up, an explanation they gave unprompted).
2. Compare `notes-before/` with `notes/`. Did the update keep what matters and record their complaints? If it failed, run `npx apprenticer notes <dir>`. Hand-edit notes only to fix a wrong fact.
3. Ask them one question: what was the worst moment?
4. Propose one change to the brief and one visual change (new, fixed or cut), each tied to a moment you quote from the transcript. Make them once they agree.
5. Promote a good drawing: copy it from `sessions/*/drawings/` into `visuals/NN-name.html`, write its leading note, check its facts and cues.
6. Run `check`, then reread every visual's note against the brief: an edit to a scripted line silently orphans a cue.

## Hard limits

- No slideshow: six visuals at most, each where seeing beats hearing.
- No agenda or syllabus opener. Open on a question they can answer.
- No quizzes nobody asked for. Spaced recall only when the user wants it.
- No persona described only by adjectives. Give the agenda, the concerns, and what settles each.
- Never invent facts, in visuals or the brief. Numbers, names and dates come from sources/ or a check you made.
- No secrets in the space: no keys, passwords, customer data, or material the user may not share.
- No chores: visuals take no input. Never have the mind ask them to type, click, compute or "notice".
- Never write `sessions/`, and never drop a note's leading comment.
