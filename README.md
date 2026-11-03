# Apprenticer

Talk to an AI about anything, by voice, in your browser, with a board beside it that shows what is easier to see than to hear: learn a topic, run a mock technical interview, rehearse a design review with your boss, think a problem through.

You don't configure it. Your coding agent writes a **space**, a plain folder; Apprenticer serves it on localhost and you talk. The space's brief decides how the AI behaves: nothing about teaching or interviewing is built in.

```
you ⇄ browser (WebRTC) ⇄ OpenAI GPT-Live: the voice and ears only
                              │ each of your turns is handed to this server
                         the mind (GPT-6.1 Sol) writes every word, from your space
                              │ when you stop
                         the mind rewrites its notes, so next time it remembers
```

## Quick start

Needs Node 24+ and an `OPENAI_API_KEY`.

```bash
git clone <this repo> && cd apprenticer && npm install && npm link   # puts `apprenticer` on your PATH
apprenticer init ./my-space
```

Open `./my-space` in your coding agent (Claude Code, Codex, ...). `init` put an `AGENTS.md` there (and a `CLAUDE.md` that points at it) that tells it how to build a space with you: it interviews you, writes the brief, and builds the visuals. Then:

```bash
apprenticer ./my-space
```

It prints `Apprenticer: ./my-space ("<title>") → http://localhost:8787` and opens the page. Tap **On**, allow the microphone, and listen: the mind speaks first. Tap **Off** when you're done; it writes its notes and shows a short recap.

The first run asks for your API key once and saves it to `~/.config/apprenticer/.env`, never into the space.

## A space

```
my-space/
  brief.md        required: who the AI is and what this is for. Plain markdown, given to the mind word for word.
  notes/*.md      the mind's memory. Each opens with <!-- what this note holds -->; rewritten after every session.
  visuals/*.html  prepared board visuals, shown by filename. Each opens with <!-- Title sentence. Note to the mind -->.
  sources/*       text the mind may draw on (up to about 100k characters).
  sessions/       the runtime's: transcript, events, session.json, drawings, the notes as they were.
```

A leading HTML comment in any file is a note to the mind. `template/AGENTS.md` is the full guide to writing one (`init` copies it into your space for your coding agent); `examples/design-review/` is a worked space.

## Commands

| | |
|---|---|
| `apprenticer <dir>` | serve the space on localhost and open it (`--no-open` to skip the browser). `/preview` shows every visual on its own board, with a button per `set` move and a box to type what's said |
| `apprenticer init <dir>` | start a space: a stub brief, `notes/memory.md`, `visuals/`, `sources/`, a `.gitignore`, and `AGENTS.md` for your coding agent |
| `apprenticer check <dir>` | static checks, no key needed: a brief, a title sentence on every visual and note, a `data-cue` on every step after the first, sources under the cap. Exit code 1 on a problem |
| `apprenticer notes <dir> [session]` | save the notes for a session whose notes update failed |
| `apprenticer sim <dir> --user persona.md` | rehearse the space in text, no voice: the mind (same turn function and instructions as a real session; the pauses and going-on after silence aren't rehearsed) against a simulated user described in `persona.md`, then a judge scores the mind 1-5 on following the brief, adapting to the user, turns for a voice, board use, pushback and leaving, honesty and (in a later run) memory. `--turns 10`, `--out file.json`, `--draw` (really draw `draw` lines), `--tier ultrafast` for real-session latencies. The notes pass writes its result only into the run's own `sessions/<ts>/notes-after/`, so a rehearsal never touches your real memory; `--notes` applies it to `notes/` (so a second run tests memory), `--no-notes` skips the pass |

## Environment

`OPENAI_API_KEY` is the only one you need. It can come from the shell, a `.env` in the folder you run from, or `~/.config/apprenticer/.env`.

| | default | |
|---|---|---|
| `MIND_MODEL` | `gpt-6.1-sol` | writes every turn, the notes, the drawings |
| `LIVE_MODEL` | `gpt-live-1` | the voice |
| `VOICE` | `vesper` | a GPT-Live voice |
| `MIND_TIER` | `ultrafast` | the mind's answers: about 2 s each instead of 5, at 6x the price; `default` switches it off |
| `DAILY_CAP_USD` | `10` | a new session is refused once today's sessions of this space cost this much |
| `PORT` | `8787` | the next free port is used if it's taken |

The cost on the page and the cap count voice minutes and web searches. The mind's own tokens bill separately and aren't counted.

## Notes on how it runs

- Localhost only, no login: the server binds to 127.0.0.1 and refuses any other `Host`. Everything in a space is sent to OpenAI.
- One session at a time. The next can't start until the last one's notes are saved (a minute or so), so it never begins from stale notes.
- Voice only, no typing. The mind speaks first. After a point that isn't a question, it carries on if you stay quiet (up to four turns in a row, so walking away doesn't run up a bill); after a question it waits. Sessions end at GPT-Live's two-hour limit (a warning at 105 minutes).
- Node runs the TypeScript directly, no build. Node won't run TypeScript from inside `node_modules`, so install from a clone (`npm link`); publishing to the npm registry needs a compile step first.

```bash
npm test
npm run typecheck
```
