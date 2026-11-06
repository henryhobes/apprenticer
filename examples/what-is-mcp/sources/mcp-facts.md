# MCP facts: the only facts to use

Every claim about MCP in this session comes from this file. Facts are from the protocol's own documentation (protocol version 2026-07-28), Anthropic's announcements, and the Claude Code and Cursor docs, checked on 5 November 2026 and cited at the end. MCP changes often, so say "as of late 2026" if Leila asks whether something is current. Props are marked as props.

## What it is

- MCP, the Model Context Protocol, is "an open-source standard for connecting AI applications to external systems." AI applications like Claude or ChatGPT can use it to connect to data sources (local files, databases), tools (search engines, calculators) and workflows (specialised prompts).
- The docs' own analogy: "Think of MCP like a USB-C port for AI applications." One standard plug, instead of a different cable for every pair of devices.
- A protocol is an agreed shape for messages: which requests exist, what they are called, what comes back. MCP's messages are JSON-RPC 2.0, a common format for "call this, here is the answer". Leila never needs that name; "an agreed shape for messages" is enough.
- MCP is only the plumbing between the app and the tools. In the docs' words, it "focuses solely on the protocol for context exchange" and "does not dictate how AI applications use LLMs or manage the provided context."
- Examples from the docs of what it enables: an agent using your Google Calendar and Notion; Claude Code building a web app from a Figma design; a company chatbot querying several databases.

## The model has no hands (visual 01-hands)

- A language model on its own only writes text. Anthropic's Claude Code docs: "Without tools, Claude can only respond with text. With tools, Claude can act."
- A tool call is text in a set shape ("call create_calendar_event with these details") that the application, not the model, carries out. The MCP docs: "When the language model decides to use a tool during a conversation, the AI application intercepts the tool call, routes it to the appropriate MCP server, executes it, and returns the results back to the LLM as part of the conversation flow."
- So for "what's on my calendar tomorrow?", the model cannot look. Without a calendar tool it can only say it doesn't know, or guess. With one, it writes a tool call, the app sends it to the calendar server, and the result (the events) goes back to the model, which then answers.
- This is the same loop an agent runs. MCP doesn't change the loop; it standardises how the app plugs tools into it.

## The three roles

- Host: the AI application the user works in, such as Claude Desktop, Claude Code, Cursor or VS Code. "The AI application that coordinates and manages one or multiple MCP clients."
- Client: a part inside the host that holds one connection to one server. "The MCP host accomplishes this by creating one MCP client for each MCP server." Connect three servers and the host runs three clients.
- Server: "a program that provides context to MCP clients." Examples from the docs: a filesystem server, a database server, GitHub, Slack, a calendar, Sentry.
- "Server" means the program, wherever it runs. A local server runs on your own machine as a program the host starts, talking over standard input and output (stdio). A remote server runs on the provider's side and is reached over the web (Streamable HTTP), usually signed in with OAuth. The official Sentry server is remote; the filesystem server is local.
- On the board the client is not drawn as its own box: the host and its client are one box, "app". If Leila asks what a "client" is, it's the piece of the app that holds one connection to one server.

## Why one shared plug (visual 02-wiring)

- Anthropic announced and open-sourced MCP on 25 November 2024. Its reason: "Every new data source requires its own custom implementation, making truly connected systems difficult to scale." AI models were cut off from data "trapped behind information silos and legacy systems."
- What it released then: the specification and SDKs (code libraries for building clients and servers), local MCP server support in the Claude Desktop apps, and an open-source repository of servers. The first pre-built servers: Google Drive, Slack, GitHub, Git, Postgres and Puppeteer. Early adopters named: Block and Apollo; development tool companies Zed, Replit, Codeium and Sourcegraph were working with it.
- The docs' promise: support across many clients and servers makes it "easy to build once and integrate everywhere."
- Modelling choice, not a quote: the board draws the before as every app wiring its own connector to every service (three apps, three services, nine connectors) and the after as each side plugging into MCP once (three plus three). Anthropic's post does not use the "N times M" framing; the counts on the board are a toy to make the shape visible, not a measurement. The app and service names on it are real products, but "Claude's own GitHub connector" and so on in the before picture is illustrative.
- So when a new app arrives: before, it builds a connector for each service; with MCP, it speaks MCP once and can use every MCP server that exists, and the service teams build nothing new for it. Likewise one new server works in every app that speaks MCP.

## Who supports it

- As of late 2026, the MCP docs list Claude, ChatGPT, Visual Studio Code and Cursor among the AI apps that support MCP. Anthropic's December 2025 post names ChatGPT, Cursor, Gemini, Microsoft Copilot and Visual Studio Code as having adopted it.
- It is not only Anthropic's any more. On 9 December 2025 Anthropic donated MCP to the Agentic AI Foundation, "a directed fund under the Linux Foundation", co-founded by Anthropic, Block and OpenAI, with support from Google, Microsoft, AWS, Cloudflare and Bloomberg. "The Model Context Protocol's governance model will remain unchanged."
- Scale, from that same post (Anthropic's own figures, December 2025): "more than 10,000 active public MCP servers" and "97M+ monthly SDK downloads across Python and TypeScript". Anthropic's Claude directory had over 75 connectors powered by MCP.

## Asking the server what it can do (visual 01-hands, "set list")

- The app does not have to know a server in advance. It asks. A client can send `server/discover` to learn the server's name, versions and which kinds of things it offers; then `tools/list` to get its tools.
- Each tool in the list comes with a `name`, a human-readable `title`, a `description` ("Detailed explanation of what the tool does and when to use it") and an `inputSchema`, the shape of the inputs it takes.
- "The AI application fetches available tools from all connected MCP servers and combines them into a unified tool registry that the language model can access." So the descriptions end up in what the model reads; that is how the model knows a tool exists and when to use it. (Claude Code loads MCP tool names into the context before you type; this is in the Claude Code space's sources too.)
- Then `tools/call`: the app sends the tool's exact name and the arguments; the server runs it and sends back content, usually text. The docs' example: `weather_current` with location "San Francisco" returns "Current weather in San Francisco: 68°F, partly cloudy".
- Lists can change: a server can tell the client its tools changed, and the client asks for the list again.
- Prop, not a recorded session: the board's calendar server offers three tools, `list events`, `create event` and `send invite` (send invite emails the guests), and for "what's on my calendar tomorrow?" the model asks for list events. Hold these constant. Calendar servers are among the docs' common examples, but this tool list is invented for the board; if Leila asks, say so.
- A real server the Claude Code docs connect: GitHub's, at https://api.githubcopilot.com/mcp/. Its exact tool list is not in these sources.

## Tools, resources, prompts: who decides

A server can offer three kinds of things. The docs' table names who controls each:
- Tools: "Functions that your LLM can actively call, and decides when to use them based on user requests." Examples: search flights, send messages, create calendar events. Controlled by: the model.
- Resources: "Passive data sources that provide read-only access to information for context," such as file contents, database schemas or API documentation. Controlled by: the application, which decides what to read and pass along.
- Prompts: "Pre-built instruction templates," such as "Plan a vacation" or "Summarize my meetings". Controlled by: the user; apps often show them as slash commands ("/plan-vacation").
- Teach tools first and mostly. Resources and prompts get one sentence each, in beat 4 or if she asks.

## Approval and trust

- The model decides it wants a tool. Whether it runs is up to the app and, through the app, the user. The docs: "Tools may require user consent prior to execution, helping to ensure users maintain control over actions taken by a model." Apps can offer approval dialogs for individual calls, settings that pre-approve safe operations, and logs of every call.
- Cursor: "Cursor asks for approval before using MCP tools by default."
- Claude Code: "Verify you trust each server before connecting it. Servers that fetch external content can expose you to prompt injection risk." Prompt injection means text inside a tool's result (a web page, an issue, an email) that tries to give the model instructions. Claude Code also asks for approval before using servers that a project's shared `.mcp.json` file lists.
- A local server is a program on your machine. The MCP security guide: local servers "may have direct access to the user's system", and an untrusted one risks "Arbitrary code execution" and "Data exfiltration". Apps offering one-click setup "MUST" show the exact command and get explicit approval first.
- The plain version for Leila: installing an MCP server is installing software and handing it a key. The protocol carries the messages; it doesn't make a server trustworthy.

## How Claude Code and Cursor use it

- Claude Code: "Claude Code can connect to hundreds of external tools and data sources through the Model Context Protocol." The docs' advice: connect a server "when you find yourself copying data into chat from another tool, like an issue tracker or a monitoring dashboard." Example tasks: "Add the feature described in JIRA issue ENG-4521 and create a PR on GitHub"; updating an email template from Figma designs posted in Slack.
- Adding one in Claude Code is a single command, for example `claude mcp add --transport http notion https://mcp.notion.com/mcp`. A server can be just for you, or shared with the team through a `.mcp.json` file in the project.
- Cursor: MCP "enables Cursor to connect to external tools and data sources." Servers go in `.cursor/mcp.json` in a project, or `~/.cursor/mcp.json` for all projects. It supports local (stdio) and remote servers.
- The same GitHub or Notion server works in both, because both are MCP hosts. That is the whole point of the plug.

## Is it just an API?

- An API is the door a single service offers programs: GitHub's API, Slack's API, each with its own shape. MCP is one shape of door for AI apps. An MCP server often sits in front of a service's own API and translates: it lists the tools in MCP's shape, and when one is called, it calls the service's API. (A plain-language description, consistent with the docs; the docs' own example is a server that "connects MCP clients to third-party APIs".)
- What MCP adds over a plain API, for an AI app: the app can ask any server what it offers, with descriptions written for the model, in one standard shape.

Sources:
- What is MCP: https://modelcontextprotocol.io/docs/getting-started/intro
- Architecture overview (host, client, server, transports, discover, tools/list, tools/call, notifications): https://modelcontextprotocol.io/docs/learn/architecture
- Understanding MCP servers (tools, resources, prompts, who controls each, consent): https://modelcontextprotocol.io/docs/learn/server-concepts
- Security best practices (local server compromise): https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- Anthropic, Introducing the Model Context Protocol, 25 November 2024: https://www.anthropic.com/news/model-context-protocol
- Anthropic, Donating the Model Context Protocol and establishing the Agentic AI Foundation, 9 December 2025: https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation
- Claude Code, Connect Claude Code to tools via MCP: https://code.claude.com/docs/en/mcp
- Claude Code, How Claude Code works ("Without tools, Claude can only respond with text"): https://code.claude.com/docs/en/how-claude-code-works
- Cursor, Model Context Protocol: https://cursor.com/docs/context/mcp
