---
title: "Production AI Serving"
description: "AI Platform Engineering Handbook - Week 13 - Production AI Serving"
weight: 123
toc: true
---

---

# Production AI Serving

## The Big Picture First

In the last explanation, we covered the raw hardware: GPUs, CUDA, and memory. But powerful hardware alone doesn't mean you can serve an AI model efficiently to lots of real users at once.

Here is the specific problem this section addresses. Running a language model just for yourself, one question at a time, is relatively straightforward. Running that same model in production is much harder. You may be handling thousands of simultaneous users, each sending requests of wildly different lengths, while trying to keep the GPU's expensive hardware busy rather than idle. Production AI serving is the discipline built around solving this problem. It is a collection of specialized software tools and clever techniques designed to squeeze the maximum useful work out of expensive GPU hardware while serving real, live traffic. Let's work through it.

---

## 1. vLLM

We introduced vLLM briefly in the very first LLM APIs explanation, as a specialized tool for serving models efficiently. It's worth revisiting in more depth here, because it is one of the most influential and widely used tools in this space.

vLLM's biggest, defining innovation is called PagedAttention. To understand why it matters, you need to understand the problem it was built to solve. When a model processes a request, it needs to keep track of a growing amount of intermediate data (covered shortly as the "KV cache"). Older, more naive serving approaches typically reserved one large, continuous, unbroken chunk of GPU memory for this per request. That is like reserving an entire city block of parking for one car, even though the car only needs a few individual spaces. This wastes an enormous amount of valuable, expensive GPU memory.

PagedAttention instead borrows an idea from how regular operating systems manage memory. It breaks this data into smaller, more flexible chunks (or "pages") that can be allocated and freed much more efficiently. It's like assigning individual parking spaces to a car as it needs them, instead of reserving a whole giant block up front regardless of need.

The practical payoff is substantial. vLLM has been shown to achieve meaningfully higher throughput and better GPU memory efficiency than older, more naive approaches, which lets a given GPU serve considerably more simultaneous users from the same hardware. It is also open-source, free, and reasonably straightforward to get started with (you can often begin serving a model pulled directly from Hugging Face with comparatively little setup). Because of this, vLLM has become a widely adopted default, general-purpose choice across the industry for serving open-source language models in production.

---

## 2. TensorRT

TensorRT is NVIDIA's general-purpose toolkit for optimizing and running trained AI models as fast as technically possible on NVIDIA's own GPU hardware. It's worth understanding as a broader, more general foundation. It is distinct from TensorRT-LLM (covered next), which is built on top of it and is specific to language models.

The core idea behind TensorRT is that once a model is fully trained, it can be optimized considerably further for the exact hardware it will run on. Examples of these techniques include:

- Combining several separate mathematical operations into one more efficient operation.
- Reducing the numerical precision used for certain calculations, where that doesn't meaningfully hurt the quality of the final result (connecting to the model quantization topic covered later).

TensorRT takes an already-trained model and effectively rebuilds it into an optimized, hardware-specific format designed to run considerably faster on NVIDIA's chips.

The tradeoff to understand clearly is that this deep, hardware-specific optimization comes at a cost in flexibility and setup effort. Building one of these optimized "engines," as they're called, requires careful upfront configuration. The resulting engine is tied closely to the exact hardware and model configuration it was built for. This makes TensorRT less of a quick, flexible "point it at a model and go" tool compared to something like vLLM. It is better suited to squeezing out the last bit of performance once a team has settled on its exact model and hardware setup, and is willing to invest the additional setup time.

---

## 3. TensorRT-LLM

TensorRT-LLM is NVIDIA's more specialized version of TensorRT, built and tailored specifically for serving large language models. The base TensorRT toolkit, by contrast, covers a much broader range of AI model types.

Building directly on everything TensorRT provides, TensorRT-LLM adds optimizations specific to how language models work. Examples include further-optimized handling of the KV cache (discussed shortly) and support for more advanced serving techniques covered later in this explanation, like speculative decoding. The overall goal is the same as with base TensorRT: squeeze the maximum possible performance out of NVIDIA's hardware, now focused on language models.

In practice, TensorRT-LLM is generally considered the choice for teams that are fully committed to NVIDIA hardware, and that have both the technical expertise and the time to invest in its more involved setup. Reports suggest the initial setup can take days to weeks of dedicated work, compared to the much faster path to getting started with a tool like vLLM. The payoff for that investment is typically the best raw performance achievable on NVIDIA hardware. The cost is greater setup complexity and tighter lock-in to NVIDIA's hardware and software ecosystem.

---

## 4. Ollama

We covered Ollama in detail in the very first LLM APIs explanation, as a tool for running AI models locally on your own personal computer. It's worth briefly revisiting here to clarify how it fits into the broader serving landscape, alongside the more production-oriented tools in this explanation.

The other tools covered here (vLLM, TensorRT-LLM, and the others coming up) are built and optimized for serving many simultaneous users efficiently in live production. Ollama's design focus is different. It is optimized for ease of use and simplicity on a single personal machine, not for maximizing throughput across many users at production scale. That makes Ollama an excellent choice for local development, experimentation, and personal use. It is generally not the right tool for serving a production application with many concurrent users.

This distinction matters because it's a common point of confusion for beginners. A tool being excellent for one use case (like Ollama for local development) doesn't automatically make it the right tool for a different one (like serving production traffic at scale). Both loosely involve "running an AI model," but they are very different jobs.

---

## 5. Hugging Face TGI

TGI (Text Generation Inference) is Hugging Face's dedicated production serving framework. It's worth understanding both its historical importance and its current status.

Historically, TGI was one of the first widely adopted serving engines built for language models. It played an important role in powering some of Hugging Face's own major products, and it helped push the industry toward much better-optimized ways of serving models than simply calling a model directly in raw Python code. It integrates closely with the broad Hugging Face ecosystem of models, making it a natural fit for teams already working extensively in that ecosystem.

However, it's important to be upfront about a significant current development. Hugging Face has put TGI into "maintenance mode," announced in December 2025. This means it now receives only minor bug fixes, not significant new features or improvements. Hugging Face itself recommends that teams use vLLM or SGLang (covered next) going forward. The project's repository was also reportedly archived as read-only in March 2026. One practical consequence is that TGI doesn't get support for newer model architectures, while vLLM and SGLang tend to add support quickly after new models are released. Hugging Face's own Inference Endpoints product was also reported to have switched to defaulting to vLLM.

An existing, tested TGI deployment can keep running, but a team starting a new project should generally choose vLLM or SGLang instead. This illustrates something worth keeping in mind throughout this fast-moving space: specific tools rise and fall in prominence quickly. Always check current, up-to-date sources before committing your team to any one tool for serious production use.

---

## 6. SGLang

SGLang is a newer serving framework that has risen to prominence fairly quickly. It is built around a core technique called RadixAttention, which is particularly well suited to a category of workload that has become increasingly common: multi-turn conversations, RAG-based applications, and AI agents. In all of these, a considerable amount of the prompt content gets reused, in whole or in large part, across multiple successive requests.

Here is the core insight behind RadixAttention. In a typical multi-turn chat, or in an agent that repeatedly calls tools while building on the same growing context, much of each new request's prompt is identical to what the system already processed moments earlier. RadixAttention caches this already-processed shared computation, so the system doesn't have to redo the same work from scratch every time.

Reported benchmark results suggest SGLang can outperform vLLM, in some cases by a meaningful margin, on these kinds of shared-context, conversational workloads. Results vary by workload and hardware, though, and for general multi-user chat serving the two engines are often comparable.

The practical takeaway is that SGLang is an especially strong choice for the conversational, RAG-based, and agent-based applications covered throughout this series. These are exactly the applications where a lot of prompt content repeats across successive requests, and where a more general-purpose engine might needlessly redo the same work every time.

---

## 7. LMDeploy

LMDeploy is a specialized model-serving and model-compression toolkit from the InternLM ecosystem. Its core engine is called TurboMind. Its design focus is on achieving the maximum raw throughput per GPU, especially when used together with quantized models (connecting to the model quantization topic covered later in this explanation).

LMDeploy combines several techniques, including its own persistent batching approach and its own blocked approach to KV cache management (connecting to the KV cache topic covered below). It has reportedly achieved meaningfully higher request throughput than vLLM in certain benchmark comparisons, especially for 4-bit quantized versions of certain popular model families.

LMDeploy tends to be a strong choice for teams prioritizing the maximum possible efficiency from quantized models. These are models that have been deliberately compressed to use considerably less memory and computation than their original full-precision versions, at the cost of a small, typically minor, and often well worth it reduction in output quality. Like several other specialized tools in this explanation, it represents an optimization tradeoff. A team accepts some additional setup complexity and a narrower focus, in exchange for superior performance in that specific use case.

---

## 8. Continuous Batching

Continuous batching (which you may also see called "inflight batching") is one of the most important techniques that makes efficient modern LLM serving possible. Understanding it helps explain why several of the tools we've covered are so much faster than a naive, unoptimized serving approach.

To see why it matters, first understand the problem it solves. As we discussed in the previous explanation, GPUs are at their best when doing the same kind of calculation on many pieces of data at once, in parallel. When applied to serving many user requests together, this idea is called "batching."

The practical complication is that different requests arrive at different times, and they take different amounts of time to finish, since some want much longer responses than others. A naive, older batching approach (often called static batching) waits to collect a full batch of requests first. It then has to wait for every single request in that batch to finish completely before it can start a new batch.

Continuous batching works differently:

- New incoming requests can dynamically join a batch that is already in progress.
- Requests that have finished can leave the batch immediately and free up their space.
- The system never has to wait for the whole batch to finish together, in lockstep.

This keeps the GPU much more consistently busy, because it never sits idle waiting on one slow, long request before picking up new work. It is one of the biggest reasons dedicated serving engines like vLLM are so much more efficient in practice than simply calling a model directly, one request at a time, in sequence.

---

## 9. KV Cache

The KV cache (short for "key-value cache") is intermediate data that a language model needs to keep track of and store while generating a response. Understanding it helps explain why GPU memory (discussed in the previous explanation) becomes such a critical limiting factor when serving language models in production.

Without getting too deep into the mathematics, the core idea is this. As a model generates a response, one token (a small, word-like piece of text) at a time, it needs to keep referring back to everything it has already seen and generated, in order to decide on the next token. Instead of wastefully recalculating the same information from scratch for every new token, the model caches certain intermediate values, meaning it stores them, so they can be quickly reused.

This caching speeds things up considerably, but it also consumes real GPU memory. Critically, the total size of the cache grows the longer a conversation or an individual response becomes. This is exactly the problem vLLM's PagedAttention technique, discussed above, was built to help solve. It manages this growing cache much more efficiently, so a given GPU can serve more simultaneous users without running out of memory.

Understanding the KV cache also helps explain why longer conversations and longer responses cost more money and take more memory to serve than shorter, briefer exchanges.

---

## 10. Speculative Decoding

Speculative decoding is a clever technique designed to speed up how fast a model generates its response. The core idea is worth understanding well, because it's a fairly non-obvious approach.

Normally, a large, powerful, and fairly slow language model has to generate its response one token at a time, with each new token depending on all the ones before it. Speculative decoding instead uses a much smaller, faster "draft" model to quickly propose several candidate next tokens at once. The larger, more capable "real" model then verifies all of those candidates together, in a single pass, instead of generating each token on its own, one at a time.

The payoff comes from the fact that verifying a whole set of proposed tokens at once is considerably faster than having the large model generate the same number of tokens individually. When the draft model's guesses turn out to be correct, which happens frequently for common, predictable pieces of text, the system gets a real speed boost, essentially for free. When the draft model's guesses are wrong, the larger model simply generates that token itself, exactly as it normally would have. In the worst case, you gain little speed. When it is implemented with proper verification, the technique doesn't reduce the quality of the final response. It can only help speed things up.

---

## 11. Model Quantization

We've touched on model quantization several times in this explanation, so it's worth covering as its own topic. Quantization is the technique of reducing the numerical precision used to store a model's internal learned parameters. In other words, each number is represented using fewer bits of data than the model's original full precision would require.

To understand this intuitively, think of it this way. A model's parameters are typically stored using a fairly high degree of numerical precision, meaning many decimal places of accuracy. Quantization deliberately reduces that, for example by converting from a higher-precision format down to a lower-precision format that uses far fewer bits per number. It's somewhat like rounding a long, precise number like 3.14159265 down to 3.14. You lose a small amount of precision, but the number remains very close to, and practically representative of, the original value.

The payoff is significant:

- A quantized model takes up considerably less GPU memory.
- It can often run faster too, since there is less data to move around and process.

The tradeoff is a small potential reduction in output quality. However, well-designed quantization approaches can often achieve large memory and speed savings with only a small, often barely noticeable drop in practical quality. This is why quantization is so widely used. It lets teams run larger, more capable models on more modest, more affordable hardware, or serve more simultaneous users from the same hardware, in exchange for a small tradeoff in the model's raw output precision.

---

## 12. AI Serving Optimization

To close out this explanation, it's worth pulling together the individual techniques we've covered into one unified picture of what effective AI serving optimization looks like in practice.

Good AI serving optimization means thoughtfully combining several techniques, rather than relying on any one of them alone:

- **Choose the right serving engine for your workload.** As we've seen, vLLM is a strong, well-rounded general-purpose default. SGLang particularly excels at conversational and agent-based workloads. TensorRT-LLM offers the best raw performance for teams fully committed to NVIDIA hardware and willing to invest the setup effort.
- **Apply quantization where it makes sense.** It can meaningfully reduce cost and improve speed, in exchange for only a small tradeoff in output precision.
- **Use continuous batching and efficient KV cache management.** These keep the GPU as busy and productively used as possible, rather than idle.
- **Consider speculative decoding where it applies well.** It can speed up response generation without sacrificing output quality.

The broader takeaway to end on, and across this whole Week 12 material, is that serving an AI model efficiently at production scale is a distinct engineering discipline in its own right. It is every bit as important, and as worth taking the time to learn well, as the prompting, RAG, and agent-building work covered throughout this course. A brilliant, well-designed AI application can still feel frustratingly slow, and can cost far more than it needs to, if the serving infrastructure underneath it hasn't been carefully optimized alongside it.
