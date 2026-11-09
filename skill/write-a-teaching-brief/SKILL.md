---
name: write-a-teaching-brief
description: Writes the sources and brief.md of a catalog Apprenticer teaching space, a lesson built on predictions asked before each reveal and an unprompted explain-back at the close. Use at step 2 of author-a-teaching-space, or to rewrite the brief of a space under examples/. Not for a space the user will use themselves: that brief comes from the apprenticer skill's interview.
---

# Writing a teaching brief

Inspired by Jane Street's [socratic-tutor](https://github.com/janestreet/agent_skills/tree/master/socratic-tutor) skill (MIT), cut down for an 18-minute voice lesson: no placement quiz, no skill map read aloud. The rules for every brief are in the apprenticer skill's "The brief" and "Writing for a voice"; this adds what a catalog lesson needs.

## Sources first

Write `sources/<x>-facts.md` before the brief, and take every claim the brief or a board makes from it. Copy `examples/what-is-nvidias-moat/sources/moat-facts.md`:
- It opens "the only facts to use" and gives the date the facts were checked.
- Each section ends with its source: a paper, a filing, a docs page, with its URL.
- Measure what you can instead of quoting it (a real tokenizer's split, a filing's table), and say how it was measured.
- Props and premises (made-up bars, an assumed input size) sit under a line saying they are props.
- Say what never to state (market share, prices that aren't there, what isn't public), so the mind says "I'd have to check" instead of guessing.

## The brief

Use the examples' headings, in order: The goal, <Learner's name>, You are the tutor, Rules, How it opens, The arc, The close, Done when, If they ask, Next time. Then build these moves in:

- **One question a turn, then wait.** Every scripted question ends its turn. The reveal is a `set` move in the next turn, "only in the turn after she answers, even if she guessed before you asked" (moat, beat 3).
- **Ask before telling.** Each beat is a prediction asked before its reveal, answerable from what's on the board ("Which box above it stops working?"). Three or four in the session; the rest is explanation in short turns. The opening question is the placement check: there's no diagnostic quiz.
- **Wrong answers.** Don't correct: make the visual's move and let the board show what happens. Teach directly only what they couldn't work out, in a sentence or two, then back to a question.
- **Plain words.** Every term the learner doesn't know gets a `term` line the first time it's said; list them in the learner section.
- **Rules.** Three to five, one sentence each: turn length ("never more than about 60 words"), tangents ("one short answer, then the same turn ends on the current beat's question"), the lesson's hard line ("never investment advice"), and a hard clock ("past about 16 minutes, start The close at step 1 in that same turn").
- **The arc.** Numbered beats, each with its minutes, its board, its question, the move that reveals it and the line that lands it. End with "skip any beat you haven't reached by the close".
- **The close.** Three numbered steps: the explain-back on the first board with `set labels off` ("In your own words, why...?"); fill in only what was missing, as a statement, never another question; name the one idea they explained best, in their words, then goodbye.

## Done when, earned not asserted

Done when names what the learner explains unprompted, idea by idea: "Priya explains, unprompted, that...". Saying yes to the mind's summary, or answering right just after being told, doesn't count.

## Next time, a quiet progress log

`notes/you.md` is the log. Its leading comment is the instruction: for each idea in the brief, explained back (with their words and the date), half, or open; where the session stopped; questions not answered in full; what annoyed them; a cap of 250 words; never drop an idea's line. Seed it with "No sessions yet." and a line on the learner.

The brief's Next time uses it: open on the first open idea with its board and its prediction, no recap; give one sentence to an idea they explained back unprompted; bring back one half idea as a fresh prediction before new material. That's the spaced review, and the learner never sees the log.

## Check it

Walk one imaginary session through the arc and count each question: none is asked twice. Every number in the brief is in sources/. Every term is in the learner section.
