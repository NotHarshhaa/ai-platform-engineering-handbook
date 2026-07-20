---
title: "LLM APIs"
description: "AI Platform Engineering Handbook - Week 5 - LLM APIs"
weight: 50
toc: true
---

---

## 1. OpenAI APIs

OpenAI is the company behind ChatGPT, and they were among the first to make a powerful language model available to developers through a simple API. When people talk about "GPT-4" or newer model names, they're referring to the actual AI models that power both ChatGPT (the consumer app) and the API (the developer tool) — the API is essentially the same intelligence, but in raw form so developers can build it into their own products.

Why has OpenAI become the default choice for so many developers? A few real reasons. First-mover advantage matters a lot here — because they were early, an enormous ecosystem grew up around them: tutorials, open-source libraries, Stack Overflow answers, and companies whose entire business is built on top of OpenAI's API. Second, they've expanded far beyond plain text — their API can now generate and understand images, browse the web, execute code, and even call other tools/functions on a developer's behalf, which makes it useful for building fairly sophisticated AI assistants, not just chatbots. Third, their documentation and developer tools (called SDKs) are mature and well-polished after years of iteration.

The tradeoffs are worth knowing too. Because so many businesses depend on it, pricing and usage policies changes can ripple across the industry. And like all of these providers, OpenAI doesn't disclose full details about how their models are trained internally — you're using it as a "black box" that you send input to and get output from, without visibility into what's happening in between.

---

## 2. Anthropic APIs

Anthropic is the company that created Claude — the AI you're talking to right now — and they offer their own API so developers can build Claude into their apps, exactly the way OpenAI does with GPT. Anthropic was actually founded by a group of researchers who used to work at OpenAI, and they left specifically to focus more heavily on AI safety, reliability, and careful reasoning as core design principles rather than an afterthought.

In practical terms, this philosophy tends to show up as strengths in a few areas: handling very long documents well (like analyzing an entire book, legal contract, or large codebase in one go), careful step-by-step reasoning on complex problems, high-quality writing, and being less likely to confidently state incorrect information compared to some competitors. Many companies building tools for coding, research, legal analysis, or anything requiring careful accuracy on long inputs tend to gravitate toward Claude for these reasons.

Anthropic is a younger and smaller company than OpenAI, so the surrounding ecosystem of third-party tools is a bit less sprawling, but it's grown enormously and Claude's API is now considered one of the top choices for serious production use, especially anywhere reasoning quality and reliability matter more than raw brand recognition.

---

## 3. Gemini APIs

Gemini is Google's family of AI models, and their API is how developers tap into that intelligence for their own applications. Google's biggest natural advantage here is the sheer scale of infrastructure and data they already have — Search, Android, YouTube, Gmail, Google Cloud — so Gemini is designed to fit naturally alongside all of that.

The standout technical strength of Gemini is what's called "multimodality," meaning the model was built from the start to handle not just text, but images, audio, and video together in a single conversation. So tasks like "analyze this video and tell me what happens at the 2-minute mark" or "look at this photo and describe the defect in this product" tend to be a natural fit for Gemini in a way that feels more native compared to models that added this ability on later.

Because Google runs some of the largest data centers in the world, Gemini models also tend to support processing very large amounts of text in a single request (referred to as a large "context window"), and pricing is often competitive. For developers already building on Google Cloud, choosing Gemini also means one less vendor relationship to manage.

---

## 4. Azure OpenAI

This one trips up a lot of beginners, so here's the plain explanation: Azure OpenAI is literally OpenAI's models — the same GPT models — but instead of accessing them directly through OpenAI's own systems, you access them through Microsoft's Azure cloud platform. Microsoft made a large investment in OpenAI, and as part of that partnership, they became an official channel for delivering OpenAI's models to enterprise customers.

Why would a company choose this route instead of going straight to OpenAI? Mostly because many large organizations — banks, hospitals, government agencies, big traditional enterprises — already run their entire technology stack on Microsoft Azure. For them, using Azure OpenAI means everything stays under one roof: the same billing account, the same security and compliance certifications they've already been audited for, the same support contracts, and the same data residency guarantees (meaning they can specify which country their data is processed in, which matters a lot for regulated industries).

So think of it like this: OpenAI built the engine, and Microsoft is an authorized distributor of that same engine, wrapped in extra enterprise-grade packaging around security, compliance, and support that larger, more risk-averse organizations often require.

---

## 5. Ollama

Ollama represents a completely different category from everything above. Instead of sending your request over the internet to someone else's server, Ollama lets you download an AI model and run it directly on your own computer.

This matters for a few concrete reasons. Privacy is the biggest one — since the model runs locally, your data never leaves your machine, which is important if you're working with sensitive information you don't want sent to a third-party company. Cost is another — there's no per-request fee, because you're using your own computer's processing power instead of renting someone else's. And it works offline — once the model is downloaded, you don't need an internet connection at all to use it.

The tradeoff is capability. The AI models you can realistically run on a personal laptop or desktop are much smaller and less powerful than the massive models running in a company's specialized data center, simply because your computer doesn't have anywhere close to that amount of processing power. So Ollama tends to be popular with hobbyists, developers who want full data privacy, people building offline tools, and anyone experimenting or learning — but less common for large-scale commercial products serving many users at once.

---

## 6. vLLM

vLLM is more of a behind-the-scenes, technical tool compared to the others — it's not something a regular person or even most app developers would use directly. Its purpose is to help companies efficiently *serve* an AI model to lots of users at the same time.

Here's the situation it solves: if a company decides to run their own open-source AI model instead of paying OpenAI or Anthropic for every request, they need specialized software that can handle many people using the model simultaneously without slowing to a crawl or wasting huge amounts of expensive computer memory. vLLM is one of the most widely used tools for exactly this — it makes self-hosted AI models run dramatically faster and serve far more people at once than naive approaches would allow.

A helpful analogy: anyone can cook a meal in their home kitchen for themselves or a couple of friends — that's like Ollama. But if you want to run a restaurant serving hundreds of customers efficiently without massive wait times, you need professional commercial kitchen equipment designed for that scale — that's the role vLLM plays for AI models. It's a tool built for companies and engineering teams, not end users.

---

## 7. OpenRouter

OpenRouter solves a very practical annoyance: if you want to experiment with or use models from multiple different companies (OpenAI, Anthropic, Google, Meta, and many smaller providers), you'd normally need to sign up separately with each one, get separate API keys, and manage separate billing accounts.

OpenRouter acts as a single "one-stop shop" — you sign up once, add funds to one account, and get access to a huge catalog of different AI models through one unified system. Instead of rewriting your application every time you want to try a different model, you can often just change a single setting to switch between, say, an OpenAI model and an Anthropic model.

This makes OpenRouter especially popular with developers who want flexibility — people building tools that compare model outputs, want a fallback option if one provider is down, or simply want to shop around for the best price-to-performance ratio without dealing with multiple separate accounts and bills. The tradeoff is that you're adding a middleman between you and the AI company, which can occasionally introduce a small amount of extra latency (delay) and means you're trusting OpenRouter's infrastructure in addition to the underlying model provider's.

---

## 8. Token Usage

To understand token usage, you first need to understand that AI models don't read text the way humans do, letter by letter or word by word. Instead, they break text into chunks called "tokens." A token might be a whole word, part of a word, a punctuation mark, or even a single character, depending on how common that piece of text is. As a rough rule of thumb, a common estimate is that one token is roughly three-quarters of an English word, so 100 words is roughly 130-150 tokens.

Why does this matter so much? Because virtually every LLM API charges you based on tokens, not on requests or characters. Specifically, you're billed for both the tokens you send in (called "input tokens" — your prompt, any documents or context you include) and the tokens the model generates back to you (called "output tokens"). Output tokens are almost always priced higher than input tokens because generating text requires more computation than reading it.

This has real practical implications. If you paste a huge document into your prompt every single time you ask a question about it, you're paying for those same input tokens over and over again with every request. Long conversations also accumulate cost, because most APIs require you to resend the entire conversation history with each new message (since the model has no memory between separate requests) — so a conversation that's gone on for fifty messages costs much more per new message than a conversation that just started. Understanding token usage is the foundation for understanding both API costs and the limits on how much text you can process at once (called the "context window," which is the maximum number of tokens a model can handle in a single request, input plus output combined).

---

## 9. Streaming Responses

Normally, when you send a request to an LLM API, there are two possible ways the response can come back to you. The first is called a "standard" or "blocking" response — you send your request, then wait, and wait, and wait, and only once the model has completely finished generating its entire answer, the whole thing arrives at once. For a short answer this is fine, but for a long response (say, a full essay or a large chunk of generated code), this could mean staring at a loading spinner for ten, twenty, or more seconds with zero feedback.

Streaming responses solve this by sending the answer back in small pieces, as they're generated, instead of waiting for the whole thing to finish. This is exactly the experience you see when you chat with ChatGPT or Claude in a web browser and watch the words appear one by one, almost like someone typing in real time — that's streaming in action. Behind the scenes, the model is generating tokens one at a time, and instead of holding them until the very end, the API sends each token to your application the moment it's ready.

This matters enormously for user experience. Even if the total time to generate a full answer is exactly the same, an application that streams feels dramatically faster and more responsive because the user sees progress immediately instead of staring at a blank screen. It's also useful for very long responses, where you might want to let a user start reading or even interrupt/cancel a response partway through, rather than being locked into waiting for the entire thing.

---

## 10. Rate Limits

Rate limits are restrictions that API providers place on how many requests (or how many tokens) you're allowed to send within a certain window of time — for example, a limit of 500 requests per minute, or 200,000 tokens per minute. Every major LLM API has these limits, and understanding why they exist and how to work around them is important for building anything beyond a small hobby project.

Why do rate limits exist at all? Partly it's about fairness — without limits, one customer sending an enormous volume of requests could overwhelm the provider's servers and degrade service for everyone else. Partly it's about the provider's own capacity — even massive data centers have a finite amount of computing power, and limits help providers manage that capacity predictably. And partly it's a safeguard for you as the customer too — without limits, a bug in your own code (like an accidental infinite loop) could rack up an enormous, unexpected bill in minutes.

Rate limits typically scale with how much you've spent with a provider historically, or which pricing tier you're on — new accounts usually start with fairly low limits, and limits increase automatically (or on request) as you demonstrate consistent, legitimate usage. When you hit a rate limit, the API sends back an error response (very commonly using the numeric code 429, which specifically means "too many requests"), and well-built applications are expected to handle this gracefully — typically by waiting a bit and automatically retrying, rather than just failing outright or bombarding the server with immediate repeat attempts. For applications serving many users, understanding and planning around rate limits — sometimes by spreading requests across multiple accounts, providers, or by joining a request queue — becomes an important piece of engineering.

---

## 11. API Cost Optimization

Since LLM APIs are billed based on token usage, and heavy usage can add up to a genuinely large bill, developers use several practical strategies to keep costs under control without sacrificing too much quality.

One major lever is **prompt efficiency** — being deliberate and concise in what you send to the model. Rather than pasting an entire lengthy document into every request when only a portion of it is relevant, extracting just the relevant section reduces input tokens substantially. Since output tokens are typically the most expensive, explicitly instructing the model to be concise (rather than letting it ramble) can meaningfully cut costs on the response side too.

Another major lever is **caching** — many providers now offer "prompt caching," where if you send the same large block of context repeatedly (like a long system instruction or reference document that doesn't change between requests), the provider charges you a much lower rate for the repeated portion instead of full price every single time. For applications that reuse the same lengthy context across many requests, this can cut costs dramatically.

A third lever is **choosing the right model size for the task** (which connects closely to the next topic below) — using an expensive, extremely powerful model for a simple task like classifying whether an email is spam is often wasteful when a smaller, cheaper model would do the job just as well at a fraction of the cost.

Finally, **batching** is a strategy some providers offer, where you submit a large volume of non-urgent requests together (for example, processing thousands of documents overnight) in exchange for a meaningfully discounted price, since the provider can schedule that work more efficiently on their end rather than needing to respond instantly.

---

## 12. Model Selection Strategies

Not every task needs the most powerful, most expensive AI model available — and one of the most important skills in building with LLM APIs is matching the right model to the right task, rather than defaulting to the biggest one for everything.

Providers typically offer a range of models at different points on the tradeoff between capability, speed, and cost — often described informally as "small," "medium," and "large," or given tiered names. The largest, most capable models are best reserved for tasks that genuinely require deep reasoning, nuanced judgment, or handling very complex or ambiguous instructions — things like complex coding tasks, detailed analysis of long documents, or open-ended creative writing. Smaller, faster, cheaper models are often perfectly capable of simpler, well-defined tasks — things like classifying text into categories, extracting specific pieces of information from a document, summarizing short pieces of text, or answering straightforward factual questions.

A common and effective strategy is to build applications that use a mix of models rather than a single one throughout — sometimes called "model routing." A simple, fast, cheap model can handle the bulk of routine requests, while more complex or ambiguous requests get automatically routed to a larger, more capable (and more expensive) model only when actually needed. This keeps overall costs down while still delivering high-quality results on the requests that truly require it.

Beyond just size, developers also weigh other factors when selecting a model: how fast it responds (important for real-time chat applications), how large a context window it supports (important for tasks involving long documents), whether it needs to handle images or other file types in addition to text, and how each provider's model performs specifically on the type of task at hand — since different models genuinely do have different relative strengths, and testing on your own real use case is usually more reliable than going by general reputation alone.
