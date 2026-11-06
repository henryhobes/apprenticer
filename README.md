# Apprenticer

Talk to an AI about anything, by voice, in your browser, with a board beside it that shows what is easier to see than to hear: learn a topic, run a mock technical interview, rehearse a design review with your boss, think a problem through.

You don't configure it. Your coding agent writes a **space**, a plain folder; Apprenticer serves it on localhost and you talk. The space's brief decides how the AI behaves: nothing about teaching or interviewing is built in.

**How a turn works.** You talk; OpenAI's voice model (GPT-Live) hears you and hands your words to the Apprenticer server on your computer. The server asks the mind (GPT-6.1 Sol, a text model that has read your space) what to say. The mind writes the reply and anything for the board; the voice speaks it and the board updates. The voice only listens and talks: every word comes from the mind. When you end the session, the mind rewrites its notes, so next time it remembers you.

## Quick start

Needs Node 24+ and an `OPENAI_API_KEY`.

```bash
npm install -g apprenticer   # or prefix every command with npx
apprenticer skill            # installs the skill that builds spaces, for your coding agent
```

Then, in your coding agent, say what you want to rehearse or learn out loud: "I want to rehearse my interview with a CTO on Thursday", "teach me out loud how data centres get their power", or call the skill by name (`/apprenticer`). The skill makes the space, interviews you (what it's for, what will really happen, who the AI should be), reads the brief back for your yes, builds the visuals, and rehearses it against a simulated you.

`apprenticer skill` installs to `~/.claude/skills/apprenticer/` (Claude Code's folder); for another agent that reads skills, give its skills folder: `apprenticer skill <folder>/apprenticer`. If your agent doesn't use skills, run `apprenticer init ./my-space` and open that folder in it: `init` puts the same guide there as `AGENTS.md` (and a `CLAUDE.md` that points at it), and prints the interview for the agent to start with. Then:

```bash
apprenticer ./my-space
```

It prints `Apprenticer: ./my-space ("<title>") → http://localhost:8787` and opens the page. Tap **On**, allow the microphone, and listen: the mind speaks first. Tap **Off** when you're done; it writes its notes and shows a short recap.

The first run asks for your API key once and saves it to `~/.config/apprenticer/.env`, never into the space.

**What it costs.** About $2 to $3 for a 25-minute session, on your OpenAI key: the voice is about $0.05 a minute, and the mind runs on OpenAI's Ultrafast tier by default, 6x the standard price, for answers in about 2 s instead of 5 (`MIND_TIER=default` for the cheaper, slower one). The page shows what this session and today have cost, and a new session is refused once a space has spent $20 in a day (`DAILY_CAP_USD`).

## A space

```
my-space/
  brief.md        required: who the AI is and what this is for. Plain markdown, given to the mind word for word.
  notes/*.md      the mind's memory. Each opens with <!-- what this note holds -->; rewritten after every session.
  visuals/*.html  prepared board visuals, shown by filename. Each opens with <!-- Title sentence. Note to the mind -->.
  sources/*       text the mind may draw on (up to about 100k characters).
  sessions/       the runtime's: transcript, events, session.json, drawings, the notes as they were.
```

A leading HTML comment in any file is a note to the mind. `skill/SKILL.md` is the full guide to writing one (`apprenticer skill` installs it; `init` copies it into your space as `AGENTS.md`); `examples/design-review/` is a worked space. `examples/what-is-a-gpu/` is a teaching one: a 20-minute tutor on why AI runs on GPUs. `examples/what-is-claude-code/` is another: a 20-minute tutor on what a coding agent like Claude Code actually does. `examples/what-is-vllm/` is its sequel to the GPU one: a 20-minute tutor on how vLLM fits more chats on the same GPU. `examples/what-is-an-ai-agent/` is the step back from it: a 20-minute tutor on what makes an AI agent different from a chatbot, and why long tasks fail.

## Commands

| | |
|---|---|
| `apprenticer <dir>` | serve the space on localhost and open it (`--no-open` to skip the browser). `/preview` shows every visual on its own board, with a button per `set` move and a box to type what's said |
| `apprenticer preview <dir>` | serve and open only `/preview`, no API key needed: for writing visuals before there is a key. Serving a session still needs the key |
| `apprenticer init <dir>` | start a space: a stub brief, `notes/memory.md`, `visuals/`, `sources/`, a `.gitignore`, and `AGENTS.md` for your coding agent; prints the interview it starts with |
| `apprenticer skill [dir]` | install the guide as a skill (`SKILL.md`) for your coding agent: in `~/.claude/skills/apprenticer/` unless you give another folder |
| `apprenticer check <dir>` | static checks, no key needed: a brief, a title sentence on every visual and note, a `data-cue` on every step after the first, sources under the cap. Exit code 1 on a problem |
| `apprenticer notes <dir> [session]` | save the notes for a session whose notes update failed |
| `apprenticer sim <dir> --user persona.md` | rehearse the space in text, no voice: the mind (same turn function and instructions as a real session; the pauses and going-on after silence aren't rehearsed) against a simulated user described in `persona.md` (the mind is told the session time and turn on a clock that runs at 150 words a minute and 3 s a turn; the user sees only what would be on their screen), then a judge scores the mind 1-5 on following the brief, adapting to the user, turns for a voice, board use, pushback and leaving, honesty, (in a later run) memory, and whether this user would come back, quoting the moment that would make them quit. `--turns 10`, `--out file.json`, `--draw` (really draw `draw` lines), `--tier ultrafast` for real-session latencies. The notes pass writes its result only into the run's own `sessions/<ts>/notes-after/`, so a rehearsal never touches your real memory; `--notes` applies it to `notes/` (so a second run tests memory), `--no-notes` skips the pass |

## Environment

`OPENAI_API_KEY` is the only one you need. It can come from the shell, a `.env` in the folder you run from, or `~/.config/apprenticer/.env`.

| | default | |
|---|---|---|
| `MIND_MODEL` | `gpt-6.1-sol` | writes every turn, the notes, the drawings |
| `LIVE_MODEL` | `gpt-live-1` | the voice |
| `VOICE` | `vesper` | a GPT-Live voice |
| `MIND_TIER` | `ultrafast` | the mind's answers: about 2 s each instead of 5, at 6x the price; `default` switches it off |
| `MIND_PRICE` | `2,0.1,10` | what the mind costs, USD per million input, cached input and output tokens at the default tier (GPT-6.1 Sol's; set it if you change `MIND_MODEL`). Fast counts 2x, Ultrafast 6x; a web search $0.01 |
| `DAILY_CAP_USD` | `20` | a new session is refused once today's sessions of this space cost this much |
| `PORT` | `8787` | the next free port is used if it's taken |
| `ALLOW_HOST` | | other host names to serve, comma-separated, for reaching it from another device (below) |

The cost on the page and the cap count voice minutes, web searches and the mind's tokens (its turns, drawings and notes pass, from each response's usage). A turn dropped because you kept talking costs tokens that aren't counted.

## Notes on how it runs

- Localhost only, no login: the server binds to 127.0.0.1 and refuses any other `Host`. Everything in a space is sent to OpenAI.
- From your phone or another computer: the microphone needs HTTPS, so put it behind `tailscale serve` on your tailnet and allow that name: `tailscale serve --bg 8787`, then `ALLOW_HOST=my-mac.tail1234.ts.net apprenticer ./my-space`, and open `https://my-mac.tail1234.ts.net`. Anyone on your tailnet can then use it, and your key.
- One session at a time. The next can't start until the last one's notes are saved (a minute or so, two at most; if that fails, `apprenticer notes <dir>` runs it again), so it never begins from stale notes.
- Voice only, no typing. The mind speaks first. After a point that isn't a question, it carries on if you stay quiet (up to four turns in a row, so walking away doesn't run up a bill); after a question it waits. Sessions end at GPT-Live's two-hour limit (a warning at 105 minutes).
- Node runs the TypeScript directly, so developing needs no build: `npm test`, `npm run typecheck`, `npm start -- ./my-space` (or `node bin/apprenticer.ts ./my-space`). Node won't run TypeScript from inside `node_modules`, so what is published is compiled: `npm run build` writes `dist/` (the `apprenticer` command runs it; `npm install`, `npm pack` and `npm publish` build it first).

```bash
npm test
npm run typecheck
```

## Developing

```bash
git clone https://github.com/henryhobes/apprenticer && cd apprenticer && npm install && npm link
npm test && npm run typecheck
```

The showcase page in `docs/` (served by GitHub Pages) is built from `examples/what-is-a-gpu/` by `npm run site`; a test fails if it is out of date with the space.

MIT licensed.
