---
name: run-sim-and-fix
description: Writes persona.md for an Apprenticer teaching space, rehearses the space with `apprenticer sim`, and fixes the judge's worst moment, at most three runs. Use at step 4 of author-a-teaching-space, or when a space under examples/ scores low in sim. Not for a live session with a real user.
---

# Rehearse and fix

`sim` runs the space's real mind against a simulated learner from persona.md, then a judge scores it 1 to 5 on followed_brief, adapted_to_user, voice_turns, board_use, pushback_tangents_leaving, honesty, used_memory and would_come_back, and names the worst moment. It needs an OpenAI key.

## The persona

Copy `examples/what-is-nvidias-moat/persona.md`. A persona without triggers passes anything, so:
- "# <Name>, for `apprenticer sim`", then who they are in the brief's words, how they talk (one to three sentences, plainly), and "behave like the real <Name>, not an ideal student".
- A wrong first guess for each prediction in the arc, the one a smart beginner would make.
- Triggers, written as what they'll do: an unexplained word gets "sorry, what is that?" and a lost turn; a few sentences without a question gets "okay" and silence; a question already answered gets "I just said that"; hype gets skepticism.
- One of each move, taken from the brief's If they ask: two or three tangents, a push on the lesson's hard line, and leaving ("I have to go in a few minutes"). Put the leaving where the run reaches it: the sim's clock counts 150 words a minute and 3 s a turn, so 16 turns is about ten minutes, and the persona can't see the clock. "After the third prediction" works where "at fifteen minutes" doesn't.
- "You don't ask two tangents in a row."

## The loop

1. `node bin/apprenticer.ts sim examples/<name> --user examples/<name>/persona.md --turns 16 --draw`. Each run is saved under the space's `sessions/` (gitignored).
2. Read the transcript, the scores, the worst moment and the would_come_back evidence.
3. Fix the one thing behind the worst moment, where it was caused: a rule buried in the arc moves into Rules; a question the board couldn't answer gets a board or a move; a turn that ran long gets a shorter scripted line. Don't add a fifth rule if cutting one would do.
4. Change persona.md only when it acted out of the brief's learner, never to make the run easier.
5. Run again. Stop at three runs.

The bar is a mean of at least 4.0 with followed_brief and would_come_back at 4 or more. Report the last run's real scores and worst moment, whether or not they reach it.
