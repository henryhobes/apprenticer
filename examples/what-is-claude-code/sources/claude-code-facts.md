# Claude Code facts: the only facts to use

Every claim about Claude Code in this session comes from this file. Facts are from Anthropic's own documentation, checked on 5 November 2026 and cited under each section; Claude Code changes often, so say "as of late 2026" if Priya asks whether something is current. The toy project in Beat 2 ("fix the failing test" on 01-loop) is a prop, marked as one: hold it constant, never present it as a recorded session.

## What it is

- Claude Code is an agentic assistant from Anthropic. In its own docs' words, "an agentic assistant that runs in your terminal"; it is also in a desktop app, IDE extensions (VS Code, JetBrains), the browser at claude.ai/code, Slack and CI pipelines. "The interface determines how you see and interact with Claude, but the underlying agentic loop is identical."
- It has two parts. The model (Claude: Sonnet, Opus and others, switchable with `/model`) does the reasoning. Claude Code is "the layer around the model that provides the tools and manages the context the model sees". The docs call that layer an agentic harness.
- "Without tools, Claude can only respond with text. With tools, Claude can act." A model on its own writes text; a tool call is text in a set shape ("read this file", "run this command") that the harness carries out, and the result goes back to the model.
- Where things run, for the usual local setup: the model runs on Anthropic's servers; the tools run on your machine, in the folder you started it in, with the access you have there. Claude Code can see "files in your directory and subdirectories, plus files elsewhere with your permission", "any command you could run" in your terminal, and your git state.
- It is not an inline autocomplete: "This is different from inline code assistants that only see the current file." It searches and reads across the whole project.

## Beat 1: the loop (visual 01-loop)

- "When you give Claude a task, it works through three phases: gather context, take action, and verify results. These phases blend together."
- "Each tool use returns information that feeds back into the loop, informing Claude's next decision." It repeats until the task is done, "chaining dozens of actions together and course-correcting along the way".
- The model decides each step: "Claude decides what each step requires based on what it learned from the previous step."
- You can interrupt at any point: Esc stops it at once; typing a message while it works queues it, and Claude reads it as soon as the running tool calls finish.
- The built-in tools fall into five kinds: file operations (read, edit, create), search (find files, search content), execution (run shell commands, tests, git), web (search, fetch docs) and code intelligence (type errors, definitions; needs plugins). It can also spawn subagents and ask you questions.

## Beat 2: one real-shaped turn (01-loop, "set turn" and "set pass")

- The docs' own example for "fix the failing tests": run the test suite to see what's failing; read the error output; search for the relevant source files; read those files; edit them; run the tests again to verify. "Each tool use gives Claude new information that informs the next step."
- Prop (a toy, not a recorded session): a tiny project with `cart.js` and one failing test, "applies 10% discount". The turn on the board, one tool call and its result per round: npm test → 1 failed; read cart.js → the code; edit cart.js → saved; npm test → 1 failed (the first fix was wrong); then, on "set pass", edit cart.js → saved; npm test → passed. Six tool calls in all. The shape is the docs' example; the file, the test and the counts are invented for the board.
- The point: the model never sees the result of an edit or a command until the harness hands it back. A failing test is just more information, so it goes round again. Verifying is the third phase of the loop, which is why the docs advise "Give verification targets": "When Claude can verify its own work, it catches issues before you need to request fixes."

## Beat 3: the context window (visual 02-context)

- The context window is everything the model can see for this request: "your conversation history, file contents, command outputs, CLAUDE.md, auto memory, loaded skills, and system instructions."
- The model keeps nothing between requests. "Claude Code sends your full conversation with every request, and each time Claude uses tools it sends another request carrying that batch of tool results." Prompt caching makes re-sending the same history cheaper, but it is still sent.
- Before you type anything, it loads: CLAUDE.md, auto memory, MCP tool names, and skill descriptions (only the descriptions: "the full content only loads when a skill is used").
- CLAUDE.md is "a markdown file where you store project-specific instructions, conventions, and context that Claude should know every session", loaded at the start of every session. The docs say to aim under 200 lines: "Longer files consume more context and reduce adherence." It is context, not enforcement: "Claude treats them as context, not enforced configuration." To block an action whatever the model decides, you use a hook (a script Claude Code runs before a tool call).
- Each new session "starts with a fresh context window, without the conversation history from previous sessions." CLAUDE.md and auto memory are how knowledge carries over.
- Size: the current default models (Sonnet 5 and later, Opus 4.7 and later, Fable, Haiku 5.5) run with a 1 million token window by default; older ones default to 200K. A token is roughly a short word or part of one.
- When it fills up: "Claude Code manages context automatically as you approach the limit. It compacts the conversation into a summary. The summary keeps your requests and key code snippets, but detailed instructions from early in the conversation may be lost." After compaction the project CLAUDE.md is re-read from disk, and Claude Code re-reads up to five recently edited files. You can run `/compact` yourself, or `/clear` to start fresh between unrelated tasks.
- Hence the docs' advice: "Put persistent rules in CLAUDE.md rather than relying on conversation history."
- Subagents work in their own separate context window; only a summary comes back, so big reads stay out of yours.
- On the board (a modelling choice, no numbers): the bar's segments show the order things arrive and roughly that file reads and command output dominate. Their widths are illustrative, not measured; say so if asked. Run `/context` in a real session to see real numbers.

## Beat 4: permissions (01-loop again, "set ask")

From the permissions table (for Manual mode):

| Kind of action | Asks first? | "Yes, and don't ask again" lasts |
|---|---|---|
| Read-only (file reads, search) | No, inside the working directory | n/a |
| Shell commands | Yes, except a built-in set of read-only commands | Permanently, per repository and command |
| File edits | Yes | Until the session ends |
| Web fetch / web search | Yes (some documentation sites preapproved) | Permanently, per repository |

- Permission modes, cycled with Shift+Tab: Manual ("Claude asks before file edits and shell commands"); Accept edits (edits files without asking, still asks for other commands); Plan ("explores and proposes a plan without editing your source files"); and Auto, where "a classifier reviews most actions in the background and blocks the risky ones instead of asking you". From version 2.1.283, Auto is the mode interactive terminal and VS Code sessions start in.
- Rules: deny, then ask, then allow; the first match wins, and an allow rule can't carve an exception out of a deny rule. Trusted commands like `npm test` can be allowed in `.claude/settings.json`.
- Checkpoints: "Before Claude edits a file, it snapshots the current contents." Press Esc twice to rewind. They cover only file changes: "Actions that affect remote systems (databases, APIs, deployments) can't be checkpointed." That is why commands ask and edits are cheap to undo.

## Local and cloud

- Three environments: Local (your machine, the default); Cloud ("Anthropic-managed VMs", virtual machines on Anthropic's servers); Remote Control (your machine, steered from a browser or phone).
- A cloud session "runs on cloud infrastructure instead of on your machine" and "keeps running after you close your laptop". It clones your repository from GitHub into an isolated VM and pushes a branch you can turn into a pull request. Available on Pro, Max, Ultra and Team plans (and some Enterprise seats); it counts toward the plan's usage limits, with no separate charge for the VM.
- Same loop either way: only where the tools run changes.

## Paying for it: subscription against the API

- Two ways in. A Claude subscription (Pro, Max, Ultra, Team, Enterprise): Claude Code usage is included, up to usage limits that reset on a rolling five-hour window and a weekly window. Or an API key on the Claude Console (or a cloud provider such as Amazon Bedrock): billed per token.
- Plan prices: don't quote them; they change. Point to claude.com/pricing.
- Cost scales with context: "Token costs scale with context size." A one-line question in a long session still re-sends the whole conversation, which is why `/clear` between tasks saves money.
- Real-world figure, from Anthropic's enterprise deployments: "around $13 per developer per active day and $150-250 per developer per month, with costs remaining below $30 per active day for 90% of users."
- `/usage` shows a session's token use; on a subscription the dollar figure isn't what you pay.

## Sessions and memory

- "Claude Code saves your conversation locally as you work", as a plain-text file under `~/.claude/projects/`, so sessions can be resumed (`claude --continue`) or rewound.
- Auto memory: notes Claude writes itself from your corrections; the first 200 lines or 25KB of its MEMORY.md load at the start of each session.
- Skills: folders of instructions for a workflow; at session start only their descriptions load, the body when the skill is used. MCP connects external services (a ticket tracker, a database). Hooks run your own scripts at set moments, and can block an action outright.

Sources:
- How Claude Code works (loop, tools, environments, context, checkpoints, permission modes): https://code.claude.com/docs/en/how-claude-code-works
- Configure permissions (the table, rule order): https://code.claude.com/docs/en/permissions
- How Claude remembers your project (CLAUDE.md, auto memory, under 200 lines, context not enforcement): https://code.claude.com/docs/en/memory
- Explore the context window (what loads at start, what survives compaction): https://code.claude.com/docs/en/context-window
- Model configuration, Extended context (1M windows by default): https://code.claude.com/docs/en/model-config
- Use Claude Code in the cloud (cloud sessions, VMs, plans): https://code.claude.com/docs/en/claude-code-on-the-web
- Manage costs effectively ($13 per active day, full conversation sent with every request, limits windows): https://code.claude.com/docs/en/costs
