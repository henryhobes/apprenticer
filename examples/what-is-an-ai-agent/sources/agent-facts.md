# AI agent facts: the only facts to use

Every claim about agents in this session comes from this file. Facts were checked on 5 November 2026 against the sources cited under each section. Products change fast: say "as of late 2026" if Marcus asks whether something is current, and never name a vendor's product as better than another's.

## What an agent is

- Anthropic's working definition (from "Building effective agents", December 2024): "Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage". Workflows, by contrast, "are systems where LLMs and tools are orchestrated through predefined code paths."
- Underneath: "They are typically just LLMs using tools based on environmental feedback in a loop."
- So the line between a chatbot and an agent is who takes the next turn. In a chat, every turn starts with the person: the model answers and stops. In an agent, after the first message, the model takes the next turn itself, through a tool, again and again, until it decides it's done.
- Agent or workflow: the word "agent" is used loosely. Anthropic: "At Anthropic, we categorize all these variations as agentic systems", from fully autonomous ones to ones that follow predefined steps. The test is who chose the steps: the programmer (a workflow) or the model, step by step (an agent). "Workflows offer predictability and consistency for well-defined tasks", while "agents are the better option when flexibility and model-driven decision-making are needed at scale." Their advice to builders: "we recommend finding the simplest solution possible, and only increasing complexity when needed. This might mean not building agentic systems at all."
- Prop for beat 4 (invented, not a real product): a vendor's "agent" that always runs the same three steps in the same order for every support email: read the email, look up the customer, send a reply. The programmer fixed the order; the model only writes the reply. By Anthropic's definitions that's a workflow.
- "LLM" means a large language model: the text-writing model behind a chatbot (GPT, Claude, Gemini and others).

## Tools: the model writes, a program runs it (visual 02-trail)

- Anthropic's docs: "The model never runs anything on its own. It emits a structured request, your code (or Anthropic's servers) runs the operation, and the result flows back into the conversation."
- How a call looks: the model's reply carries a `tool_use` block naming the tool and its arguments; the application runs it and sends the output back in a `tool_result` block on the next request.
- OpenAI's docs describe the same five steps: "Make a request to the model with tools it could call"; "Receive a tool call from the model"; "Execute code on the application side with input from the tool call"; "Make a second request to the model with the tool output"; "Receive a final response from the model (or more tool calls)".
- The loop, in Anthropic's words: "every tool call is a round trip: the model asks, you execute, you report back, the model continues." It repeats while the model keeps asking for tools, and ends when the model replies without one: "Claude has either produced a final answer or stopped for another reason."
- So the model is called afresh for every step: once per tool call, plus once for the final answer. Each request carries the conversation so far, including every earlier result.
- Why tools at all: "Actions with side effects. Sending an email, writing a file, updating a record. The model can describe these actions, but only a tool can perform them." Also fresh data the model wasn't trained on: today's prices, the contents of a database.

## The harness

- "Harness" is the usual word for the program around the model that offers it tools, runs its tool calls, hands back the results, and keeps the loop going. Anthropic's Claude Code docs call Claude Code "the layer around the model that provides the tools and manages the context the model sees", an "agentic harness". Other names you may hear: runtime, scaffold, orchestrator.
- The builder of the harness decides which tools exist. The model can only ask for tools it has been given.
- Stopping: "The task often terminates upon completion, but it's also common to include stopping conditions (such as a maximum number of iterations) to maintain control." The builder can also have it "pause for human feedback at checkpoints or when encountering blockers."

## The toy task on 02-trail: a prop

Prop, invented for the board, not a recorded session; hold it constant and say so if asked. Marcus types one message: "Which of our three suppliers raised their price this quarter?" The trail, one model step per row, with what the harness hands back:
1. model: search email → harness: 3 invoices
2. model: read invoice A → harness: same price
3. model: read invoice B → harness: up 8%
4. model: read invoice C → harness: same price
5. model: write sheet → harness: saved
6. model: done (its answer: supplier B), no tool call

Five tool calls, six calls to the model. Marcus typed once.

## Why it fails at the 100th step (visual 03-hundredth)

- Anthropic: "The autonomous nature of agents means higher costs, and the potential for compounding errors." And: "it's crucial for the agents to gain 'ground truth' from the environment at each step (such as tool call results or code execution) to assess its progress."
- Modelling assumption (simple arithmetic, not a measurement): if every step is independently right 99 times in 100, all 100 steps come out right about 37% of the time (0.99 to the power 100 is 0.366). At 99.9% per step, it's about 90% (0.9048). Real steps aren't independent: an early wrong turn gets built on, and a good check can catch a slip. Say it's a simplification if Marcus leans on it.
- Measured: METR, an AI evaluation nonprofit, measures an agent's "time horizon": "the task duration (measured by human expert completion time) at which an AI agent is predicted to succeed" at a given reliability. In March 2025 they found models had "almost 100% success rate on tasks taking humans less than 4 minutes" but "succeed <10% of the time on tasks taking more than around 4 hours", and that the 50% time horizon "has been doubling approximately every 7 months for the last 6 years" (METR now marks that post's doubling figure as out of date; don't quote a current rate). Their time-horizons page, updated September 2026, warns: "Measurements above 16 hrs are unreliable with our current task suite." Don't quote a current top model's number: the sources conflict.
- Reliability, not just ability: τ-bench (Sierra, 2024), a test of customer-service agents, found "even state-of-the-art function calling agents (like gpt-4o) succeed on <50% of the tasks" and "are quite inconsistent (pass^8 <25% in retail)": run the same task eight times, and fewer than a quarter of tasks succeed all eight.
- What builders do about it, from the sources above: give the agent ground truth at each step (a test that passes or fails, a result it can check); human checkpoints before anything that can't be undone; a step cap; and keeping tasks short.

## Chat apps and coding agents

- Chat apps can include an agent mode. OpenAI launched "ChatGPT agent" on 17 July 2025. Its launch post describes it using its own virtual computer, with tools such as a web browser, asking permission before consequential actions, and letting the user interrupt or take over. That post is now marked outdated by OpenAI, so don't quote plan details. Plain chat in the same app is still you-take-every-turn.
- Coding agents are the same loop with coding tools. Claude Code, for example, is a harness that runs on your laptop and gives the model tools to read and edit files and run commands; its docs describe the loop as "gather context, take action, and verify results", where "each tool use returns information that feeds back into the loop". Code suits agents because tests give ground truth: a test passes or fails.

Sources:
- Anthropic, Building effective agents (definition, loop, ground truth, stopping conditions, checkpoints, compounding errors): https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, How tool use works (the contract, the round trip, when the loop ends, side effects): https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- Anthropic, Tool use overview (tool_use and tool_result): https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- OpenAI, Function calling (the five steps): https://developers.openai.com/api/docs/guides/function-calling
- Claude Code docs, How Claude Code works (agentic harness, the loop): https://code.claude.com/docs/en/how-claude-code-works
- METR, Measuring AI Ability to Complete Long Tasks (March 2025): https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
- METR, Time horizons (definition, TH 1.1, the 16-hour caveat): https://metr.org/time-horizons/
- Yao et al., τ-bench (2024): https://arxiv.org/abs/2406.12045
- OpenAI, Introducing ChatGPT agent (17 July 2025): https://openai.com/index/introducing-chatgpt-agent/
