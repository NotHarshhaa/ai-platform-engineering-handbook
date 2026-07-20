---
title: "Model Context Protocol (MCP)"
description: "AI Platform Engineering Handbook - Week 8 - Model Context Protocol (MCP)"
weight: 81
toc: true
---

---

## 1. MCP Fundamentals

At its core, MCP is an open protocol — meaning a publicly available, standardized set of rules — that defines a consistent way for AI applications to receive context and capabilities from external systems. The word "protocol" is doing important work here: much like how HTTP is the standardized protocol that lets any web browser talk to any website regardless of who built either one, MCP aims to be a standardized way for any AI application to talk to any external tool or data source, regardless of who built either side.

The problem MCP is specifically solving is often described using a simple, memorable analogy: before a common standard existed, connecting an AI application to N different external tools, while also wanting to support M different AI applications, meant potentially needing to build N times M different custom integrations — every tool needing its own special, one-off connection code for every different AI application that wanted to use it. This is sometimes compared to the "M×N problem." MCP solves this the same way a universal connector or a standard electrical outlet solves a similar problem in the physical world — once both sides agree to speak the same standard protocol, any MCP-compatible tool can be plugged into any MCP-compatible AI application without needing custom-built, one-off integration work for every single new pairing.

It's worth being clear about what MCP actually governs and what it doesn't. MCP is specifically about the protocol for exchanging context and capabilities between an AI application and external systems — it does not dictate how the AI application internally uses a language model or manages that context once it has it. It's a standard for the connection itself, not a standard for how the AI on the other end of that connection thinks or reasons.

---

## 2. MCP Architecture

MCP is built around a client-server architecture, which is a very common and well-established pattern throughout the software industry, so it's worth understanding the general shape of it before diving into MCP's specific pieces.

At a high level, there are three main roles involved. The **host** is the actual AI application the person is using — something like Claude Desktop, Claude Code, or another AI-powered tool. The host is the outer application that a real person actually interacts with. The **MCP client** lives inside that host application, and its job is to establish and manage a dedicated connection to one specific external system. Importantly, a host application creates a separate, individual MCP client for each different external server it wants to connect to — so if your AI application is connected to a file system tool, a database tool, and a search tool, it's actually running three separate MCP clients under the hood, each maintaining its own dedicated connection to its own corresponding server. The **MCP server** is the external piece — an independent, often fairly lightweight program that exposes a specific set of capabilities (specific tools, specific pieces of data, specific reusable prompt templates) through the standardized MCP interface.

A helpful way to picture the whole arrangement: the host application is like a person's phone, each MCP client is like one specific app installed on that phone (a banking app, a messaging app, a maps app), and each corresponding MCP server is like the actual remote service that app connects to and talks with behind the scenes. The phone (host) can run several apps (clients) at once, each one maintaining its own separate, dedicated connection to its own separate remote service (server), without those different connections needing to know or care about each other at all.

---

## 3. MCP Client

The MCP client is the component that lives inside the host application and handles the actual mechanics of talking to one specific MCP server. Its job is fairly focused and specific: it establishes the connection to its corresponding server, handles the technical back-and-forth of the protocol itself (like properly formatted requests and responses), and essentially acts as the dedicated translator and messenger between the host application's needs and that one specific external server.

Each MCP client maintains what's called a one-to-one relationship with its server — meaning a single client is dedicated to talking with a single specific server, rather than one client trying to juggle connections to several different servers simultaneously. This clean separation is part of what makes the whole architecture modular and easy to reason about: if you want to add a brand new external capability to your AI application, you simply add a new MCP client-server pair, without needing to touch or modify any of the other existing connections your application already has set up.

From a beginner's perspective, it helps to think of the MCP client as something you generally don't interact with directly yourself — it's an internal, behind-the-scenes piece of plumbing inside whatever AI application you're actually using. As a user, you might see the effects of it (like an AI application successfully pulling information from your Google Drive or your GitHub account), but the actual client doing that connecting work is operating quietly under the hood.

---

## 4. MCP Server

An MCP server is the other end of the connection — an independent program that exposes a specific, focused set of capabilities to any MCP client that connects to it, following the standardized MCP protocol. Each server typically encapsulates one particular domain of responsibility — for example, a server specifically dedicated to interacting with a particular database, or a server specifically dedicated to providing access to a company's internal ticketing system, or a server specifically dedicated to GitHub repository access.

A really important design principle behind MCP servers is that they're meant to be modular and independently maintainable — the people who understand a particular external system best (say, the team who runs a particular company's internal database) can build and maintain the MCP server for that specific system, without needing to know or care about how any particular AI application chooses to actually make use of it. On the flip side, developers building an AI application don't need to understand the internal details of every different external system they want to connect to — they simply need their application to speak the standard MCP protocol, and it can then connect to any properly built MCP server, regardless of what's actually happening behind the scenes on that server's side.

MCP servers can run in a couple of different practical setups, which becomes important later when we talk about the transport layer — some run as local processes directly on the same computer as the host application (useful for things like accessing local files), while others run as remote services accessed over the internet (useful for things like connecting to a cloud-based company service).

---

## 5. MCP Resources

Resources are one of the core, standardized types of things an MCP server can expose to a connected client, and they specifically represent pieces of contextual data — things like documents, individual database records, file contents, or other pieces of information that the AI model might genuinely benefit from having access to as background context for the conversation.

Think of resources as answering the question "what information can this server make available for the AI to read and consider?" For example, a file-system-oriented MCP server might expose the contents of specific files as resources; a database-oriented MCP server might expose specific database records or query results as resources. This connects directly back to the RAG and knowledge-memory concepts we covered earlier in this whole series — resources are essentially a standardized way for an MCP server to say "here's some relevant data you might want to pull into your context," playing a very similar underlying role to the documents and chunks we discussed extensively in the RAG explanations, just now exposed through this consistent, standardized MCP interface rather than through a custom, one-off integration.

It's worth distinguishing resources conceptually from tools, which we'll cover next — resources are fundamentally about providing data and information for the AI to read and consider, whereas tools (discussed below) are about providing actions the AI can actually take and execute. Roughly speaking: resources are things to know, tools are things to do.

---

## 6. MCP Prompts

Prompts, as a specific MCP concept, refer to reusable, pre-defined prompt templates that an MCP server can expose to a connected client. Rather than a developer or user having to write out a well-crafted prompt from scratch every single time they want an AI to perform some particular common task well, a server can provide a ready-made, well-designed template for that specific task, which the host application can then surface and offer to the user.

Think of this as a kind of shared library of good, proven ways to ask an AI to do something specific and well-understood within a particular server's domain. For example, a server built around code review might expose a specific, carefully-crafted prompt template designed to guide an AI through performing a genuinely thorough, well-structured code review, rather than leaving it up to each individual user to figure out and write a good code-review prompt entirely on their own, from scratch, every single time they want one.

This particular MCP primitive is somewhat less central to everyday usage compared to tools and resources, but it serves a genuinely valuable purpose: it lets the people who deeply understand a particular domain (like the maintainers of a specific service or system) also share their accumulated expertise about how to actually prompt an AI effectively within that domain, packaged up and made conveniently available and reusable through the same standardized protocol, rather than that expertise living only informally in someone's head or in a scattered set of tips and tricks.

---

## 7. MCP Tools

Tools are very likely the most commonly used and most immediately impactful of MCP's core primitives, and they connect directly back to everything we discussed in the earlier Tool Calling explanation. An MCP server can expose specific, executable tools — like specific commands or specific actions — that the connected AI application can actually invoke, following exactly the same fundamental function-calling mechanism we described earlier, just now delivered through this standardized MCP interface rather than through a custom, one-off integration.

This is genuinely the piece that turns MCP from being purely about providing background information into something that lets an AI application actually take real, concrete actions in the world. A GitHub-oriented MCP server, for example, might expose tools like "create a new issue," "search for a specific pull request," or "add a comment to an existing issue" — real, executable actions with clearly defined inputs, exposed in a standardized way that any properly connected MCP client can discover and correctly make use of.

A genuinely powerful aspect of this design is dynamic discovery — an MCP client doesn't need to have hardcoded, advance knowledge of exactly which specific tools a particular server offers. Instead, it can ask the server, at connection time, "what tools do you actually offer?" and the server responds with a clear, structured description of each available tool. This means a server's available tools can evolve and expand over time, and any properly connected client automatically becomes aware of new capabilities without needing to be specifically reprogrammed or updated to know about them in advance.

---

## 8. Transport Layer

The transport layer is the part of MCP's overall design responsible for actually physically moving messages back and forth between a client and a server — handling the real, practical mechanics of "how do these bytes of data actually get from one place to the other," separate and distinct from the "data layer," which defines what those messages actually mean and how they're structured.

This separation is a genuinely useful design choice, and it mirrors a similar separation you find in how the regular web works too — the meaning and structure of a web request is defined somewhat independently from the specific underlying network mechanism that actually carries it. By keeping these two concerns cleanly separated in MCP's design, the same core protocol (the same tools, resources, and prompts, structured in the same standardized way) can be delivered over a couple of genuinely different underlying transport mechanisms, depending on what actually makes the most practical sense for a given specific situation — whether the client and server are running on the very same computer, or are talking to each other across the internet.

Underneath both of the transport options we'll discuss next, MCP messages are structured using a well-established, standard messaging format called JSON-RPC 2.0 — a simple, widely used, easy-to-inspect and easy-to-debug way of formatting requests and responses as structured data. Understanding that this consistent, shared message format sits underneath both transport options helps make clear that switching between transports is really more about "how the message physically travels" rather than "what the message itself actually contains or means."

---

## 9. stdio Transport

stdio transport (short for "standard input/output") is the transport option specifically designed for situations where the MCP client and the MCP server are both running locally, directly on the very same computer. Rather than communicating over an actual network connection, they communicate directly through a computer's most basic input and output data streams — essentially, the client and server processes talk to each other extremely directly and locally, without any network involved at all.

This matters practically for a couple of genuine reasons. It's fast and simple, precisely because there's no actual network communication involved at all — everything is happening directly between two programs running on the same machine. And it's a particularly natural, well-suited fit for MCP servers that specifically need access to genuinely local resources — like a server that reads and writes to your local file system, or one that needs to interact with other software already installed directly on your own computer — since the server, in this setup, is quite literally running right there on your machine alongside the host application itself.

The tradeoff, of course, is that stdio transport is inherently a local-only mechanism — it fundamentally isn't designed for situations where the client and server need to communicate across the wider internet, connecting to some genuinely separate, remote computer or service running somewhere else entirely. For that broader kind of situation, a different transport option is needed, which brings us to the next topic.

---

## 10. SSE Transport

SSE stands for Server-Sent Events, and it refers to a transport option historically used by MCP specifically for situations where the client and server need to communicate over an actual network — meaning the server might be running remotely, on a completely different, separate machine somewhere else, rather than directly alongside the client on the very same computer.

The core idea behind SSE is that it allows a server to continuously push a stream of individual messages to a connected client over a standard, ordinary web connection, which is particularly well suited to the kind of ongoing, streaming communication that MCP interactions can often involve — for example, streaming back the individual, incremental pieces of a longer-running tool call's progress or output, rather than the client having to wait in total silence for one single, final, complete response to eventually arrive all at once.

It's genuinely worth understanding, as a beginner learning this space today, that MCP's transport story has continued to evolve since SSE was first introduced — a newer, generally more capable and more flexible transport approach called "Streamable HTTP" has increasingly become the standard, recommended way of doing remote, network-based MCP communication, effectively taking over much of the role that the original SSE-based approach used to serve. Since standards and specifications like this genuinely do keep evolving over time, if you're actually building something involving MCP transports today, it's worth double-checking the current official MCP documentation directly, rather than relying purely on what may become an increasingly outdated general understanding of exactly which specific transport mechanism is currently considered the standard, recommended approach for remote connections.

---

## 11. Authentication

Authentication refers to the process of an MCP client and server reliably verifying each other's identity, and specifically verifying that a particular client is actually genuinely authorized to access a particular server's capabilities and data, before any real communication or data exchange between them is actually allowed to proceed.

This matters enormously in practice, because MCP servers are very often gateways to genuinely sensitive systems and data — a company's private internal database, someone's personal email account, a company's confidential internal file storage. Without a genuine, properly implemented authentication mechanism in place, absolutely anyone who managed to connect to a server could potentially gain access to information or capabilities they were never supposed to have, which would obviously be a serious, genuinely unacceptable security problem.

For local, stdio-based connections, authentication is often less of a central practical concern, since the whole communication is already inherently confined and contained to a single local computer, and simply being able to run a program on your own machine in the first place already implies a meaningful degree of trust. For remote, network-based connections, though, proper authentication becomes considerably more critical and important, and MCP's design in this area draws on well-established, existing web authentication standards rather than inventing something completely new from scratch — a genuinely sensible design choice, since these existing standards have already been carefully tested, refined, and validated over many years of real-world, widespread use across the broader software industry.

---

## 12. Security

Security, considered more broadly than authentication alone, covers the full range of considerations involved in making sure that MCP connections and interactions can't be exploited or misused in genuinely harmful ways, extending well beyond the specific narrower question of simply confirming who's on each end of a given connection.

A few important, genuinely real security considerations are especially worth understanding in the MCP context specifically. **Scope and permissions** matter a great deal — a well-designed MCP server should generally only expose the genuinely specific, narrow set of tools and pieces of data that a given client actually, legitimately needs, rather than exposing overly broad, unnecessarily powerful access purely as a matter of convenience. **Validating inputs carefully** matters too — since a connected AI model is ultimately the one deciding what specific inputs get sent to a given tool call, a properly well-designed server needs to carefully validate those inputs itself, on its own end, rather than simply, blindly trusting that whatever the model happens to send along will always necessarily be safe, well-formed, and appropriate. This connects directly back to the malicious-prompt-injection risk we've touched on before in earlier discussions — if an AI model can be tricked or manipulated, whether through cleverly crafted user input or through poisoned, adversarial external content it happens to read, into requesting some genuinely harmful action through a tool call, a properly secure server needs real, robust safeguards in place that don't rely purely and solely on the AI model itself always behaving correctly and never making a mistake.

There's also a genuinely important, broader trust question specifically worth understanding: because MCP servers can, in principle, be built and published by literally anyone, connecting your own AI application to some random, completely unfamiliar, unvetted third-party MCP server inherently and necessarily carries some real, non-trivial risk — you're effectively granting that specific server's code some meaningful degree of access and trust. Just like installing an unfamiliar, unvetted app on your own personal phone carries some real, inherent risk, connecting to an unfamiliar, unvetted MCP server carries a genuinely similar and comparable kind of risk, which is exactly why using MCP servers specifically from trusted, well-established, reputable sources matters quite a lot in practice, rather than casually and indiscriminately connecting to just any random, unfamiliar server one happens to come across.

---

## 13. Enterprise MCP Design

Enterprise MCP design refers to the additional set of considerations that genuinely come into play specifically when a large organization wants to deploy and actually use MCP at real, meaningful scale, across many different internal teams, systems, and users, rather than just one individual developer casually experimenting and connecting to a small handful of tools purely for their own personal, individual use.

A few particular considerations become genuinely more important at this larger, more organizational scale. **Centralized governance** matters a great deal — a large organization generally wants some genuine, deliberate control and clear, meaningful visibility over exactly which specific MCP servers its employees are actually allowed to connect to in the first place, rather than each individual employee independently and informally connecting to whatever random, unvetted servers they personally happen to come across on their own. **Access control that's properly scoped to each specific individual user** matters too — a genuinely well-designed enterprise MCP setup ensures that a given specific employee, when connecting through the organization's systems, can only actually access the specific particular data and specific particular tools they're genuinely authorized to use for their own particular role, rather than every single connected user automatically getting identical, blanket access to absolutely everything a given server might happen to expose. **Auditability** matters quite a lot as well — being able to reliably track and clearly review exactly which tools were actually called, by which specific user, and when, becomes genuinely important for both meaningful security oversight and broader regulatory compliance purposes, especially in larger, more heavily regulated organizations and industries. And **reliability and genuine scalability** matter too — an MCP server that's meant to reliably serve an entire large organization, rather than just one individual person working alone, needs to be properly built to reliably handle a meaningfully higher, more sustained volume of simultaneous connections and simultaneous requests without breaking down or becoming unreliable under that increased real-world load.

Taken together, these enterprise-specific considerations reflect a now-familiar, recurring theme we've seen echoed throughout this whole series — the same fundamental core technology or protocol that works perfectly well for a small, simple, individual prototype or experiment often needs real, genuine additional engineering discipline and care layered carefully on top of it before it's actually genuinely ready and robust enough for reliable, safe, large-scale production use within a real, serious organization.
