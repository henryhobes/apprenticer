# Context window facts: the only facts to use

Every claim in this session comes from this file. Each fact was checked against the page cited under its section on 5 November 2026. Model sizes and app behaviour change often, so when Rosa asks whether something is current, say "as of late 2026". Some OpenAI help pages could not be opened when this was checked, so this file says nothing about how ChatGPT itself handles a long chat: if Rosa asks, say you'd check rather than guess.

## Props, not facts

- Rosa's chat on the boards is a prop: a campaign chat that opens with her pasted brand brief, which holds her rule "British spelling", followed by short back-and-forth messages. The number of blocks, the block widths and where the window's edge falls are drawn to show the idea, not measured from any real app. Hold them constant; never present them as a recorded session.
- "128K" is used as the example because it is the kind of figure Rosa hears. It is not a claim about any one model today.

## What a context window is

- The context window is everything the model can look at while it writes one reply, the reply included. Anthropic calls it the model's "working memory": "all the text a language model can reference when generating a response, including the response itself."
- Everything in the request counts: the instructions the app adds, every message so far, any pasted documents or images, and the reply being written.
- Source: Anthropic, Context windows, https://platform.claude.com/docs/en/build-with-claude/context-windows

## The model keeps nothing between messages

- The model itself remembers nothing from one message to the next. The app sends the whole conversation again every time. Anthropic: "The Messages API is stateless, which means that you always send the full conversational history to the API." OpenAI: "each text generation request is independent and stateless", and a multi-turn chat works by sending the earlier messages along with the new one.
- So in a chat, the window fills turn by turn: "each user message and assistant response accumulates within the context window, and previous turns are preserved completely." Each reply becomes part of what is sent next time.
- Some APIs now offer to hold a conversation on the server for a few minutes (Anthropic's message threads, in beta, expire 5 minutes after the last request), but the model still reads the whole conversation each time.
- Sources: Anthropic, Working with messages, https://platform.claude.com/docs/en/build-with-claude/working-with-messages ; OpenAI, Conversation state, https://developers.openai.com/api/docs/guides/conversation-state ; Anthropic, Context windows (above).

## Tokens, not words

- Windows are measured in tokens: pieces of text the model reads, often a whole short word, sometimes part of a longer one. Punctuation and spaces count too.
- Rule of thumb, from Anthropic in 2023: 100,000 tokens is "around 75,000 words", so a token is about three quarters of an English word. By that ratio, 128K tokens is about 96,000 words (arithmetic, not a quoted figure). Other languages and code split differently.
- A pasted document costs as many tokens as its text, so one long paste can take more of the window than dozens of short messages.
- Source: Anthropic, Introducing 100K Context Windows, 11 May 2023, https://www.anthropic.com/news/100k-context-windows

## How big windows are, with dates

- May 2023: Anthropic raised Claude's window "from 9K to 100K tokens".
- February 2024: Google's Gemini 1.5 Pro came with "a standard 128,000 token context window", and up to 1 million tokens in a limited private preview.
- As of November 2026: Anthropic's current Claude models (Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1 and others) have a 1 million token window; some older ones have 200K. OpenAI's model list shows its current GPT-6 family at "1.05M".
- In the Claude app, Anthropic's help centre lists 200K for most models and 500K to 1M for some.
- Sources: the Anthropic 2023 post (above); Google, Our next-generation model: Gemini 1.5, 15 Feb 2024, https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/ ; Anthropic, Context windows (above); OpenAI, Models, https://developers.openai.com/api/docs/models ; Claude Help Center, https://support.claude.com/en/articles/8606394

## When the chat outgrows the window

Something has to give, and apps do different things:
- Drop the oldest. Anthropic: "Chat interfaces such as claude.ai can also manage the context window on a rolling 'first in, first out' basis." The newest messages stay; the start of the chat, often where the instructions were, goes first.
- Summarize the old part. In the Claude app, on paid plans with code execution on: "Claude summarizes earlier messages to make room for new content", and "Your full chat history is preserved so Claude can reference it, even after earlier portions have been summarized."
- Stop. Through the API, a prompt that is too long for the window is refused with an error ("prompt is too long"), and a reply that runs into the limit is cut off. Nothing is silently dropped there; dropping or summarizing is something an app chooses to do.
- Sources: Anthropic, Context windows (above); Claude Help Center, https://support.claude.com/en/articles/8606394

## Forgetting inside the window

Fitting in the window is not the same as being used well.
- Anthropic: "As token count grows, accuracy and recall degrade, a phenomenon known as context rot."
- Chroma's "Context Rot" study (14 July 2025) tested 18 models and found "model performance degrades as input length increases", "even on simple tasks".
- "Lost in the Middle" (Liu and others, Stanford and partners, arXiv July 2023, accepted to TACL): "performance is often highest when relevant information occurs at the beginning or end of the input context", and models "do not robustly make use of information in long input contexts". In plain words, a fact in the middle of a long input is the likeliest to be missed.
- Anthropic's engineering team: context "must be treated as a finite resource with diminishing marginal returns."
- Hence the practical advice: a fresh chat with a short, clean start often does better than a very long one.
- Sources: Anthropic, Context windows (above); Chroma, Context Rot, https://www.trychroma.com/research/context-rot ; Liu et al., Lost in the Middle, https://arxiv.org/abs/2307.03172 ; Anthropic, Effective context engineering for AI agents, 29 Sep 2025, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

## Compaction: a summary in place of the old turns

- Compaction replaces the older part of a conversation with a summary the model writes. Anthropic's API: "Compaction replaces the older turns of a conversation with a summary that Claude writes on the server." (In beta, as of late 2026.)
- It is lossy, and the model, not the user, decides what the summary keeps. Claude Code's docs: "The summary keeps your requests and key code snippets, but detailed instructions from early in the conversation may be lost. Put persistent rules in CLAUDE.md." You can steer it by asking, for example `/compact focus on the API changes`.
- Context editing is a related trick for agents: clearing old tool results out of the conversation as it grows.
- Sources: Anthropic, Compaction, https://platform.claude.com/docs/en/build-with-claude/compaction ; Anthropic, Context editing, https://platform.claude.com/docs/en/build-with-claude/context-editing ; Claude Code, How Claude Code works, https://code.claude.com/docs/en/how-claude-code-works

## Sticky instructions: what gets sent fresh every time

- The fix for rules that must not be lost is to keep them out of the chat and in a place the app adds to every request, fresh, at the start. A summary can't eat them, because they were never part of the old turns.
- In the Claude app: account-wide instructions "will be applied to all of your conversations with Claude"; project instructions "only apply to chats within that project". Source: Claude Help Center, Understanding Claude's personalization features, https://support.claude.com/en/articles/10185728
- For apps built on the API, this is the system prompt, which travels with every request and counts toward the window.
- Coding tools use a file. Claude Code's CLAUDE.md is "loaded at the start of every conversation" and, after compaction, "Claude re-reads it from disk and re-injects it". AGENTS.md is "a simple, open format for guiding coding agents", now stewarded by the Agentic AI Foundation under the Linux Foundation. Sources: https://code.claude.com/docs/en/memory ; https://agents.md
- Memory features work the same way: saved notes loaded into the window. Claude Code's auto memory is notes Claude writes itself, and the first 200 lines or 25KB of its MEMORY.md load at the start of each session. Source: https://code.claude.com/docs/en/memory
- Two limits. Sticky instructions still use up window on every message, so long ones crowd out the chat: Claude Code's docs advise under 200 lines, because "longer files consume more context and reduce adherence". And they are guidance, not a lock: "Claude treats them as context, not enforced configuration."
