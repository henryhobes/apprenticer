---
name: author-a-teaching-space
description: Writes a catalog teaching space for the Apprenticer repo, a topic turned into a complete examples/<name>/ folder (brief, persona, sources, visuals, notes) for a 15 to 25 minute voice lesson with a board. Use when asked to add a lesson, an example space or a "what is X" tutor to the catalog, or to write a lesson for other learners. Not for a space the person you're talking to will use themselves: use the apprenticer skill, which interviews them first.
---

# Authoring a catalog teaching space

A catalog space is a lesson for a learner you invent, so there is no interview: the brief's learner section and persona.md stand in for one, and `sim` is the only learner it meets before it ships. Inspired by Jane Street's [socratic-tutor](https://github.com/janestreet/agent_skills/tree/master/socratic-tutor) skill (MIT).

**First, who is it for?** If the user wants to learn the topic themselves ("teach me X"), stop and use the apprenticer skill: its interview is what makes a personal space work. Go on only for a lesson meant for others.

The apprenticer skill (`skill/SKILL.md` in the repo) holds the rules for every space: The space, The brief, The board, Notes. This pack says how to apply them without an interview. Read those sections before step 2.

## The folder

Copy the shape of `examples/what-is-nvidias-moat/` and `examples/what-is-a-gpu/`:

```
examples/what-is-<x>/
  brief.md               1,100 to 1,400 words, the headings of the examples' briefs
  persona.md             "# <Name>, for `apprenticer sim`": the simulated learner, with triggers
  sources/<x>-facts.md   "the only facts to use": checked date, a source under each section, props marked
  visuals/01-<id>.html   two to four boards, one idea each
  notes/you.md           one leading comment: the progress log the notes pass keeps
  .gitignore             sessions/
```

## Steps

1. **Scope, in one message to the user.** Propose the learner (a job, what they know, what they don't, what they hate), the one-sentence goal, the minutes (15 to 25), and the three or four predictions the lesson turns on. Read the catalog paragraph in README.md first and leave out what a sibling lesson already teaches: point to it in the brief's If they ask instead. Then wait for their yes or edits; if the user said to go ahead without asking, record your picks in the brief and go on.
2. **Sources and brief.** Read `write-a-teaching-brief` (installed beside this skill; in the repo, `skill/write-a-teaching-brief/SKILL.md`) now and follow it.
3. **Boards.** Read `design-boards` now and follow it.
4. **Persona and rehearsal.** Read `run-sim-and-fix` now and follow it.
5. **Ship.** Add one sentence to README.md's catalog paragraph, in the others' form: "`examples/what-is-<x>/` is ...: an N-minute tutor on ...". Never commit `sessions/`.

## Done when

- `node bin/apprenticer.ts check examples/<name>` exits 0.
- `npm test` and `npm run typecheck` pass.
- The last `sim` scored a mean of at least 4.0, with followed_brief and would_come_back at 4 or more, in at most three runs. If it didn't, ship nothing as passing: report the real scores and the judge's worst moment.
