---
title: "Agent Frameworks"
description: "AI Platform Engineering Handbook - Week 7 - Agent Frameworks"
weight: 70
toc: true
---

---

## 1. LangChain

LangChain is one of the earliest and most widely known frameworks in this whole space, and it's often the first name beginners encounter when they start learning about building with language models. At its core, LangChain provides a large collection of standardized building blocks — a consistent way to connect to many different language models, a consistent way to define and use tools, a consistent way to work with document loading and retrieval (which connects back to the RAG concepts we covered earlier), and pre-built patterns for common agent loops.

The real value LangChain offers is this standardization and breadth — instead of learning a completely different way to connect to OpenAI's models versus Anthropic's models versus Google's models, LangChain gives you one consistent interface that works across all of them, along with hundreds of ready-made integrations to different tools, databases, and services that other developers have already built and shared. This makes it a genuinely fast way to get an initial working prototype up and running, especially for beginners, because so much of the "glue code" connecting different pieces together has already been written for you.

The tradeoff, and something you'll hear experienced developers mention, is that LangChain's abstractions can feel like a lot of extra layers between you and what's actually happening underneath, which can make it harder to debug or customize once you need very precise control over your agent's exact behavior. Because of this, LangChain is often described today as the good starting point for connecting models and tools together, while more precise control over the actual agent's decision-making loop is increasingly handled by its sister framework, LangGraph, discussed next.

---

## 2. LangGraph

LangGraph is built by the same company as LangChain, and it exists specifically to solve a problem that LangChain's original, simpler approach struggled with: real-world agent behavior is often not a simple, straight line from start to finish — it involves loops, branches, and decisions that depend on what happened earlier.

LangGraph's core idea is to represent an agent's entire workflow as a graph — picture a flowchart made up of "nodes" (individual steps, like calling the language model, using a tool, or making a decision) connected by "edges" (the paths that connect one step to the next). Crucially, unlike a simple flowchart that only goes in one direction, LangGraph's graphs can loop back on themselves and branch conditionally based on what happened at an earlier step — meaning an agent can genuinely revisit a decision, try something again, or take a completely different path depending on the results it's seeing, which mirrors how real, complex agent behavior actually needs to work.

LangGraph is considered a "low-level" framework, meaning it gives you fine, precise control over exactly how your agent's loop behaves, rather than hiding a lot of that logic behind convenient but less flexible shortcuts. It's particularly well regarded for building agents that need to run for a long time, maintain their state reliably even if something restarts partway through, pause and wait for a human to review or approve a step before continuing (called "human-in-the-loop"), and coordinate multiple different agents working together. Because of this focus on precise control and production reliability, LangGraph is widely used by companies building serious, production-grade agent systems, though it does come with a steeper learning curve for beginners compared to some of the simpler frameworks we'll cover.

---

## 3. AutoGen

AutoGen is a framework developed by Microsoft, and its defining focus, right from the start, has been multi-agent conversations — the idea of multiple separate AI agents actually talking to each other, back and forth, to solve a problem together, rather than a single agent working alone.

The central concept in AutoGen is representing each agent as a kind of "conversational" participant, similar to how you might picture participants in a group chat. You might set up one agent to act as an "assistant" that writes code, another agent to act as a "critic" that reviews and challenges that code, and another that acts as a "user proxy" representing the human's interests. These agents then have an actual back-and-forth conversation with each other — proposing solutions, critiquing them, revising them — before arriving at a final result, mimicking how a team of human collaborators might hash out a problem together through discussion rather than each person just working in total isolation.

This design makes AutoGen particularly well-suited to tasks that genuinely benefit from this kind of debate-and-refine dynamic — for example, code generation and review, where having a separate "critic" agent catch mistakes before finalizing an answer tends to produce more reliable results than a single agent just generating code once and stopping. AutoGen has become a popular choice specifically for research and production systems that are built fundamentally around this idea of multiple specialized agents collaborating through structured conversation, rather than being designed primarily around a single agent's own internal loop.

---

## 4. CrewAI

CrewAI takes the general idea of multi-agent collaboration and wraps it in a particularly approachable, role-based metaphor: instead of thinking about "nodes and edges" or abstract conversational participants, CrewAI has you think about building an actual "crew" of AI agents, each with a defined role, a specific goal, and a backstory, working together like a team of human employees with clearly assigned job responsibilities.

In CrewAI, you typically define each agent with a specific role (like "researcher" or "writer"), give it a clear goal (like "find the most accurate and current statistics on this topic"), and even a brief backstory that helps shape how it approaches its work (like "you are a meticulous, detail-oriented analyst who double-checks every fact"). You then define specific tasks that need to get done, and assign them to the appropriate agents in your crew, with the framework handling the coordination of getting each agent's output passed along to the next step in the process.

CrewAI has become popular particularly among developers who find this role-based, team-oriented way of thinking more intuitive and quicker to reason about than some of the lower-level graph-based or conversation-based approaches — it maps naturally onto how people already think about organizing a team to accomplish a project. It's often reached for by developers who want to get a working multi-agent system up and running relatively quickly, with less of the low-level configuration that a framework like LangGraph requires, in exchange for somewhat less fine-grained control over the exact underlying mechanics.

---

## 5. OpenAI Agents SDK

The OpenAI Agents SDK is OpenAI's own official framework, built specifically to work smoothly with their own models and their own approach to tool-calling and agent behavior. Since it comes directly from the same company that built the underlying language models, it tends to have particularly tight, well-supported integration with OpenAI-specific features, like their built-in tools for web search, code execution, and file handling.

The design philosophy behind this SDK tends to lean toward being relatively lightweight and straightforward compared to some of the larger, more sprawling frameworks like LangChain — it focuses on providing clean, well-documented core building blocks (like defining agents, tools, and the handoffs between multiple agents) without piling on a huge number of extra abstractions or third-party integrations. It also includes built-in support for tracing and debugging an agent's behavior, which is valuable for actually understanding what your agent did and why during a run, rather than treating that as an afterthought.

Because it's built and maintained by OpenAI directly, this SDK is a particularly natural choice for developers who are already committed primarily to building on OpenAI's models and want the most direct, well-supported path to using OpenAI's specific agent-related features, though (like most modern frameworks) it can generally be adapted to work with other model providers too if needed.

---

## 6. Google ADK

Google ADK (Agent Development Kit) is Google's own official, open-source framework for building agents, and it's designed with a particular emphasis on making agent development feel more like traditional, structured software engineering, rather than a looser, more experimental process. It's notably the same underlying framework that powers some of Google's own production agent products, which speaks to it being built for genuinely serious, enterprise-scale use.

A distinctive feature of ADK is its clear support for different types of agents working together in defined structures — it explicitly distinguishes between "LLM agents" (the reasoning "brains" that make decisions), "workflow agents" (which follow more fixed, predictable sequences of steps), and custom agents you define yourself, and it gives you structured ways to combine these into hierarchies, where a top-level agent can coordinate and delegate to more specialized sub-agents beneath it. It also comes with a genuinely built-in evaluation framework, letting you systematically test how well your agent is performing (connecting back to the RAG evaluation ideas we discussed earlier, but applied to agent behavior specifically), and strong support for artifact handling (letting agents manage files, images, and other documents as part of their work).

While ADK is optimized for and works especially smoothly with Google's own Gemini models and Google Cloud infrastructure, it's designed to be model-agnostic and can work with other model providers too. It's a strong choice for teams already building within the Google Cloud ecosystem, or teams that specifically want a more structured, enterprise-oriented approach to organizing multi-agent hierarchies with built-in evaluation tooling.

---

## 7. Semantic Kernel

Semantic Kernel is Microsoft's other major entry in this space (distinct from AutoGen, which we covered above, and which is increasingly being positioned to work alongside Semantic Kernel rather than as a completely separate competing option). Its most distinctive characteristic is that it's built to work well across multiple programming languages — notably C#, Python, and Java — which sets it apart from many other frameworks in this list that are built primarily around a single language, usually Python.

This multi-language support makes Semantic Kernel a particularly natural fit for organizations, especially larger enterprises, that already have significant existing software built in C# or Java and want to add AI agent capabilities into that existing codebase without having to introduce an entirely separate Python-based system alongside it. The core concepts in Semantic Kernel revolve around "plugins" (reusable pieces of functionality an agent can call, similar to tools in other frameworks), "planners" (components that help figure out the sequence of steps needed to accomplish a goal), and "connectors" (standardized ways to link up to different AI models and external services).

Semantic Kernel is generally positioned as an enterprise-friendly framework, with a strong emphasis on things like security, compliance, and integration with existing enterprise software systems, making it a natural choice for larger, more traditionally structured organizations building AI agents into established business software, particularly in Microsoft-centric technology environments.

---

## 8. PydanticAI

PydanticAI comes from the team behind Pydantic, a hugely popular Python library that's widely used for validating and structuring data (making sure that the data flowing through your program is actually in the shape and format you expect it to be, and catching errors early if it's not). PydanticAI brings that same philosophy directly into the world of building AI agents.

The core appeal of PydanticAI is type safety and structure — when you're building an agent, you often want to be very sure about exactly what shape of data is coming out of the language model (for example, making sure a response is genuinely a valid, well-structured piece of data with the specific fields you expect, rather than just loose, unstructured text that you have to hope is formatted correctly). PydanticAI leans heavily on Pydantic's existing, well-established data validation approach to make this reliable and predictable, catching structural problems clearly and early rather than allowing malformed data to silently cause confusing bugs deeper in your application.

Because it's built by the same team behind such a widely trusted and widely used existing Python library, PydanticAI tends to appeal particularly to developers who already value strong typing and predictable, well-validated data structures in their code, and who want that same level of rigor and reliability extended naturally into their agent-building work, rather than feeling like a bolted-on afterthought.

---

## 9. SmolAgents

SmolAgents comes from Hugging Face, a company well known and widely respected in the open-source AI community, and its whole design philosophy is captured well by its name — it deliberately aims to be small, simple, and minimal, in fairly direct contrast to some of the larger, more feature-heavy frameworks we've discussed.

One particularly distinctive idea in SmolAgents is its emphasis on what's sometimes called "code agents" — rather than having an agent work by selecting from a fixed, predefined list of specific tools one at a time, a code agent instead has the language model write and execute actual code (usually Python) to accomplish its goal. The reasoning behind this approach is that writing genuine code tends to be a more flexible and naturally powerful way for an agent to solve problems, compared to being constrained to only ever calling from a fixed menu of specifically predefined tool functions — code can combine logic, loops, and calculations far more freely than a rigid, predefined tool-calling structure typically allows.

SmolAgents tends to appeal to developers who want to deeply understand what their agent framework is actually doing under the hood, without wading through a large, complex codebase full of many layers of abstraction, and who are drawn to the more flexible, code-first approach to giving an agent real capability, rather than agents restricted to a narrower, more rigidly predefined set of specific tool calls.

---

## 10. Agno

Agno (previously known as Phidata, before it was rebranded) is a Python framework whose central selling point is a strong focus on being lightweight, fast, and genuinely simple to work with — its own documentation and community discussions repeatedly emphasize that it deliberately avoids some of the more complex abstractions (like the graph-based structures used in LangGraph) in favor of writing agents using plain, straightforward Python.

Agno provides a broad set of built-in capabilities out of the box — support for a very large number of different model providers so you're not locked into just one company's models, built-in memory and knowledge management (connecting back to the RAG concepts we discussed earlier), native support for multiple types of content beyond just text (like images, audio, and video), and the ability to combine individual agents into coordinated "teams" that work together, as well as more deterministic, rule-based "workflows" for situations where you want more predictable, structured control rather than letting an agent decide everything dynamically on its own.

A big part of Agno's appeal, especially as it's grown in popularity, is its emphasis on genuine production-readiness — it includes tooling for actually deploying, monitoring, and scaling agents once you've moved past the prototyping phase, rather than being purely a toolkit for quick experiments. This combination of a simple, minimal core developer experience alongside serious production infrastructure has made it an increasingly popular choice among developers who found some of the older, more established frameworks to feel unnecessarily heavy or complicated for what they were actually trying to build.

---

## 11. DSPy

DSPy takes a genuinely different, more academically-rooted approach compared to everything else on this list, and it's worth understanding because the underlying idea is quite clever. Most agent frameworks assume you'll write out your prompts (the actual instructions and wording given to the language model) mostly by hand, through trial and error, gradually tweaking the wording until you get good results. DSPy instead treats prompt-writing more like a machine learning problem that can be automatically optimized, rather than something a human should have to painstakingly hand-tune through guesswork.

With DSPy, you define what you want your agent or pipeline to accomplish in a more structured, declarative way — specifying the inputs, the desired outputs, and some examples of good performance — and DSPy's underlying system then automatically experiments with and refines the actual prompt wording and structure being sent to the language model, searching for the version that produces the best measured results according to your specified criteria, rather than you manually guessing and rewriting prompts by hand over and over.

This makes DSPy a particularly interesting choice for situations where getting the best possible, most reliable performance out of a specific, well-defined task genuinely matters, and where you're willing to invest some extra upfront effort in defining clear examples and evaluation criteria in exchange for a more rigorous, systematic, and often more effective process than manual prompt tweaking. It tends to appeal more to developers and researchers with a background or interest in machine learning practices, since its whole approach is fundamentally about treating prompt design as something to be measured and optimized, rather than an appeal to a purely conversational, hand-crafted framework style.

---

## 12. Mastra

Mastra fills a distinctive niche in this list because of a fairly simple but important reason: it's built specifically for TypeScript and the broader JavaScript ecosystem, whereas most of the other frameworks we've covered (LangChain, CrewAI, Agno, DSPy, SmolAgents) are primarily Python-based. This matters a lot in practice, because a huge amount of real-world web application development happens in JavaScript and TypeScript, and teams building agents that need to plug directly into an existing web app, with real-time streaming responses and modern web deployment, often find a Python-based framework to be an awkward fit alongside their existing codebase.

Mastra provides the now-familiar set of core agent-building pieces — agents that can use tools and decide their own sequence of actions, workflows for more structured, multi-step processes, built-in memory for maintaining context across conversations, and support for retrieval-augmented generation. It also puts a genuine emphasis on things especially relevant to web developers specifically, like straightforward integration with popular frontend frameworks, real-time streaming of an agent's responses directly into a user interface, and deployment options tailored to common modern web hosting platforms.

Mastra has grown a meaningful, dedicated following particularly among web development teams who want to build AI agents using the same language and tooling ecosystem they already use for the rest of their application, rather than needing to introduce and maintain an entirely separate Python-based service just to add agent capabilities into an otherwise all-JavaScript product.

---

## 13. Atomic Agents

Atomic Agents is a framework built around a particular design philosophy captured well by its name: breaking agent systems down into small, clearly defined, independent "atomic" pieces, rather than relying on large, more monolithic or heavily abstracted structures. The core idea is that each individual piece of an agent's functionality should be small, focused, well-defined, and easy to understand and test entirely on its own, similar in spirit to good general software engineering practice around writing small, focused, single-purpose functions rather than large, tangled, do-everything ones.

This approach tends to emphasize clear, explicit, strongly-typed interfaces between different components of an agent system, so that data flowing between one piece and the next is well-defined and predictable, reducing the kind of confusing, hard-to-debug behavior that can creep into agent systems where the flow of information between different steps is loosely defined or unclear. Rather than encouraging you to reach for large, pre-built, catch-all abstractions, Atomic Agents encourages composing your agent's behavior out of these smaller, individually well-understood, interchangeable building blocks.

This kind of framework tends to appeal particularly to developers who've had frustrating experiences with larger, more heavily-abstracted frameworks becoming difficult to debug or customize once a project grows more complex, and who specifically value a smaller, more transparent, more explicitly structured foundation to build on top of, even if it means writing somewhat more of the surrounding logic themselves compared to a larger framework that tries to handle more of it automatically on your behalf.
