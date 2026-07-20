---
title: "Foundations of Generative AI"
description: "AI Platform Engineering Handbook - Week 5 - Foundations of Generative AI"
weight: 50
toc: true
---

---

## 1. Evolution of AI → ML → Deep Learning → Generative AI

To understand where we are today with generative AI, you need to understand the path that got us here, because each stage built directly on the limitations of the previous one.

**Artificial Intelligence** as a field started in the 1950s with a simple but ambitious idea: can we make machines that think? The early approach was rule-based — programmers hand-coded explicit rules for the machine to follow. If the input contains the word "hello," respond with a greeting. If a chess piece is in this position, move it here. These systems were called expert systems and they worked reasonably well in narrow, well-defined domains. The fundamental problem was that the rules had to be written by humans, which meant the system could only be as smart as the humans writing the rules, and the rules couldn't cover every possible situation. Writing rules for everything a person might say in a conversation would take forever and would still miss edge cases. The world is too complex and too varied for hand-coded rules to handle.

**Machine Learning** emerged as the solution to the rule-writing problem. Instead of programmers writing rules explicitly, what if the machine could learn the rules itself from examples? You show the machine thousands of examples of spam emails and legitimate emails, labeled with which is which, and the machine learns to identify patterns that distinguish them. The programmer doesn't write the spam-detection rules — they write a learning algorithm that figures out the rules from data. This was transformative. Problems that were impossible with hand-coded rules became solvable with enough examples. The key innovation was moving from programming rules directly to programming a process that discovers rules. The limitation was that the machine only learned what the programmer told it to look for — you still had to engineer the features, meaning you had to decide which aspects of the data to present to the learning algorithm.

**Deep Learning** solved the feature engineering problem. Instead of humans deciding which features matter, deep neural networks learn to discover their own features automatically from raw data. A deep learning model trained on images doesn't need a programmer to define "edges," "textures," and "shapes" as features — it learns these and more complex representations automatically through many layers of processing. The word "deep" refers to these many layers stacked on top of each other, each learning increasingly abstract representations. Deep learning required three things that came together in the 2010s: massive datasets (the internet provided these), powerful GPU hardware (which made training on those datasets feasible), and algorithmic advances. With these in place, deep learning demolished performance records in image recognition, speech recognition, and language understanding. The limitation was that these systems were still mostly discriminative — they learned to classify or predict, but not to create.

**Generative AI** is the current stage where models don't just analyze or classify existing content — they create new content. A generative model trained on millions of images doesn't just recognize cats; it can generate photorealistic cat images that never existed. A generative model trained on vast amounts of text doesn't just answer questions from a menu of pre-written answers; it composes entirely new sentences, paragraphs, and conversations. The key development enabling this was the Transformer architecture (which we'll cover next) and training at a scale previously unimagined — models trained on effectively the entire internet's worth of text, which gave them broad, general capabilities. Generative AI represents a fundamental shift from AI that processes and classifies the world to AI that can produce new additions to it.

---

## 2. Transformer Architecture

The Transformer is the architecture behind virtually every large language model — GPT, Claude, Gemini, Llama, and all the others. Understanding it conceptually is essential because it's not just an implementation detail; it's the reason modern AI is capable of things that seemed impossible five years ago.

Before Transformers, the dominant architecture for processing sequences of text was the Recurrent Neural Network (RNN). RNNs processed text one word at a time, in order, passing a "memory" from one word to the next. This worked but had a critical flaw: the memory had a limited capacity, and information from early in a long sequence got diluted and often lost by the time the model reached the end. Asking an RNN to remember that the subject mentioned at the beginning of a very long document was relevant to a conclusion at the end was extremely difficult.

Transformers, introduced in the landmark 2017 paper "Attention Is All You Need," solved this completely differently. Instead of processing words one at a time and passing memories forward, a Transformer processes all words in a sequence simultaneously and allows every word to directly attend to every other word in the sequence regardless of distance. The word at position 1,000 can directly influence the processing of the word at position 1 without having to pass through all 999 words in between.

The Transformer architecture consists of two main components that can be used separately or together. The Encoder processes input text and creates a rich internal representation of its meaning. The Decoder generates output text, one token at a time, using both the encoder's representation and what it has generated so far. Some models use only the encoder (useful for understanding tasks like classification), some use only the decoder (useful for text generation, like GPT models), and some use both (useful for translation, where you're converting one sequence to another).

The core innovation inside the Transformer is the attention mechanism, which we'll cover in the next section. But surrounding that core are other components: layer normalization that stabilizes training, feed-forward networks that process each position's representation independently, and residual connections that allow gradients to flow directly through the network during training. These engineering details are what make Transformers trainable at the enormous scale that gives modern language models their capabilities.

The most important practical implication of the Transformer architecture is that it scales remarkably well. More parameters, more data, and more compute consistently produce better models. This scaling property is what enabled the jump from models with millions of parameters to models with hundreds of billions, and correspondingly from narrow task-specific capabilities to broad general intelligence.

---

## 3. Attention Mechanism

Attention is the most important innovation in modern AI, and the concept is actually intuitive once you understand what problem it's solving.

When you read a sentence, you don't give equal weight to every word when interpreting each other word. When you read "The trophy didn't fit in the suitcase because it was too big," the word "it" needs to be connected to "trophy" to be understood correctly. Your brain automatically figures out that "it" refers to "trophy" based on the context and meaning. This ability to connect relevant pieces of information regardless of their distance from each other is what attention in neural networks tries to replicate.

The attention mechanism works by having each word in a sequence ask a question of every other word: "how relevant are you to my meaning right now?" The answers to this question, expressed as weights between 0 and 1, determine how much each word influences every other word's representation. Words that are highly relevant to each other get high attention weights and strongly influence each other's representations. Words that aren't relevant get low weights and barely influence each other.

Concretely, attention involves three things for each word: a Query (what am I looking for?), a Key (what do I represent?), and a Value (what information do I contain?). Each word computes its query, and then compares that query against the keys of all other words. The similarity between a query and a key determines the attention weight. High similarity means high attention. The values of highly attended words then flow into the current word's representation.

The transformative insight is that these Query, Key, and Value vectors are learned during training. The model learns what kinds of relationships to pay attention to — not just syntactic relationships like subject-verb agreement, but semantic relationships, coreference (which pronoun refers to which noun), and even long-distance dependencies across thousands of tokens.

**Multi-head attention** runs this attention process multiple times in parallel with different learned projections. Each "head" learns to attend to different types of relationships simultaneously. One head might specialize in tracking syntactic structure. Another might track semantic similarity. Another might track positional relationships. The outputs from all heads are combined, giving the model a rich, multi-dimensional understanding of how words relate to each other. Modern large models use dozens or hundreds of attention heads, each capturing different aspects of relationship and meaning.

The reason attention was revolutionary is that it solved the long-range dependency problem completely. Any word can directly attend to any other word. Distance is irrelevant. A reference in paragraph 10 to something mentioned in paragraph 1 can be tracked perfectly, as long as both are within the context window.

---

## 4. Tokens & Tokenization

When you type a sentence into an LLM, the model doesn't process it as characters or as complete words. It processes it as tokens, and understanding what tokens are and how tokenization works is fundamental to understanding how language models work and why they sometimes behave in unexpected ways.

A token is a unit of text that the model has learned to treat as a single meaningful piece. Tokens can be whole words, parts of words, punctuation marks, spaces, or even individual characters. The specific mapping from text to tokens is determined by the tokenizer, which is a fixed component trained before the main model training begins.

The tokenization process works by analyzing a large corpus of text and finding subword units that efficiently cover the vocabulary. Common words like "the," "and," "is" typically become single tokens because they appear so frequently that treating them as whole units is efficient. Less common words get broken into smaller pieces. The word "tokenization" might become "token" + "ization." A rare technical term might be broken into individual characters or very small pieces. The goal is to represent the full range of possible text using a fixed vocabulary of around 50,000 to 100,000 tokens in most modern systems.

Several important implications flow from how tokenization works. First, the number of tokens in a text is not the same as the number of words. On average, English text is roughly 1.3 tokens per word, but this varies enormously. A simple sentence might have fewer tokens than words (if many are common), while technical text with many rare terms might have significantly more. This matters because LLM context windows and API costs are measured in tokens, not words.

Second, tokenization is language-dependent and can be inefficient for languages other than English. Most tokenizers were trained predominantly on English text, so they have large vocabularies of common English words but represent other languages much less efficiently — sometimes requiring many times more tokens to represent the same amount of content in Japanese or Arabic compared to English.

Third, tokenization creates non-obvious boundaries that explain some puzzling LLM behaviors. When a model struggles with simple character-counting tasks ("how many r's are in the word 'strawberry'?"), it's partly because the model doesn't see individual characters — it sees tokens. The model has to reason about character-level properties of text from token-level representations, which is genuinely harder than it sounds.

---

## 5. Embeddings

Embeddings are the way language models convert tokens — discrete symbols — into the continuous numerical space where all the actual computation happens. Understanding embeddings is key to understanding how meaning is represented inside a neural network.

A token by itself is just an ID number — token number 5,847 doesn't inherently carry any information about what it means or how it relates to other tokens. An embedding converts that ID number into a vector — a list of hundreds or thousands of decimal numbers. The magic is that these vectors are learned during training to encode meaning. Tokens with similar meanings end up with similar vectors. Tokens that frequently appear in similar contexts end up near each other in the embedding space.

The geometric properties of embeddings are what make them so powerful. You can do arithmetic on meanings. The famous example: the vector for "king" minus the vector for "man" plus the vector for "woman" produces a vector very close to "queen." This isn't hand-coded — it emerges from training on vast amounts of text where these conceptual relationships appear. The model has learned a geometry of meaning where relationships are encoded as directions and distances in the embedding space.

Different types of embeddings serve different purposes. Token embeddings represent the meaning of individual tokens. Contextual embeddings (what Transformer layers produce) represent the meaning of tokens in context — the embedding for the word "bank" is different in "river bank" versus "blood bank" because the surrounding context changes the embedding. Sentence embeddings represent the meaning of entire sentences as a single vector, which is useful for tasks like semantic similarity (are these two sentences saying the same thing?) and information retrieval (which documents are most relevant to this query?).

For retrieval-augmented generation (RAG) systems, embeddings are the key technology. You convert all your documents into embedding vectors and store them in a vector database. When a user asks a question, you convert the question into an embedding and find the document embeddings that are closest to it in the embedding space — these are the semantically most relevant documents, even if they don't share exact keywords with the question. This semantic search is far more powerful than keyword search because it captures meaning rather than just matching words.

The dimensionality of embeddings — how many numbers in the vector — is a design choice that trades expressiveness against computational cost. GPT-3's token embeddings have 12,288 dimensions. Smaller models might use 768. More dimensions allow more nuanced distinctions between concepts at higher computational cost.

---

## 6. Positional Encoding

Attention, as we described it, has no sense of order. When every token attends to every other token simultaneously, the model has no built-in way to know that token 3 comes before token 47, or that the word at the beginning of a sentence plays a different role than the word at the end. This is a problem because order is fundamental to meaning in language. "Dog bites man" and "Man bites dog" contain the same words but mean completely different things.

Positional encoding solves this by adding position information to each token's embedding before it enters the Transformer. The position of each token gets encoded as a vector and added to (or combined with) the token's meaning vector. Now the model has access to both "what this token means" and "where this token is" in a unified representation.

The original Transformer paper used a fixed mathematical formula based on sine and cosine functions to generate positional encodings. The idea was elegant: each position gets a unique signature computed from sinusoidal functions at different frequencies. Low frequencies encode coarse position information (early vs late in the sequence). High frequencies encode fine-grained position information. The mathematical choice of sine and cosine was deliberate — it allows the model to represent relative positions through linear combinations, making it easier to generalize to relationships between positions.

Modern models use learned positional embeddings instead of fixed formulas. Rather than computing positions mathematically, the model learns what position information to add during training. This has proven more flexible and effective.

More recent developments include Rotary Position Embeddings (RoPE) used in Llama and many other modern models, and ALiBi (Attention with Linear Biases). These approaches encode position information directly into the attention computation rather than adding it to the input embeddings, which has advantages for generalizing to sequences longer than those seen during training.

The practical importance of positional encoding is that without it, language models would be bag-of-words models at heart — able to understand which words are present but not their order. Positional encoding is what gives models their understanding of syntax, sentence structure, and sequential reasoning.

---

## 7. Context Windows

The context window is the maximum amount of text a language model can process at once — the entire conversation, the document being summarized, the code being analyzed, all of it combined cannot exceed this limit. It's the model's working memory: everything it can "see" when generating a response.

The context window is measured in tokens. GPT-3 originally had a 4,096-token context window. Claude 3 supports up to 200,000 tokens. This progression from thousands to hundreds of thousands of tokens has been one of the most important capability improvements in large language models, because many valuable use cases (analyzing long documents, maintaining coherent long conversations, processing entire codebases) simply aren't possible with small context windows.

When a user's conversation or document exceeds the context window, the model can't process all of it simultaneously. Different systems handle this differently. Some truncate — they take only the most recent portion of the conversation, dropping earlier messages. Some use summarization — they periodically summarize earlier conversation and include the summary rather than the full text. Some use retrieval — they select the most relevant portions of a long document to include in the context window for each query.

The relationship between context window size and model performance is nuanced. Having a large context window doesn't guarantee the model uses everything in it equally well. Research has found that models tend to pay more attention to information at the beginning and end of the context window than to information in the middle — a phenomenon called the "lost in the middle" problem. For tasks that require synthesizing information from throughout a very long document, even models with large context windows sometimes miss relevant information buried in the middle.

Context windows are expensive. The computational cost of attention scales with the square of the sequence length — doubling the context window roughly quadruples the computation for the attention mechanism. This is why extending context windows has historically been technically challenging and why models with very large context windows are more expensive to run.

The context window also determines what the model can and can't learn from in-context learning. Providing examples, reference documents, and detailed instructions all consume context window space. Larger context windows enable richer prompting — more examples, longer reference documents, more detailed instructions — which translates directly to better performance on complex tasks.

---

## 8. Prompt Completion

Prompt completion is the fundamental operation that underlies everything a language model does. It's a deceptively simple concept that becomes surprisingly powerful at scale.

At the most basic level, a language model is a next-token predictor. Given some text (the prompt), the model predicts what token should come next. Then it predicts the next token after that, and the next, and the next, until it decides to stop. The sequence of tokens it generates is the completion. Everything — answering questions, writing code, summarizing documents, having conversations — is implemented through this single mechanism of prompt completion.

This is why prompting is so important. The prompt is the entire context the model uses to generate its response. A poorly constructed prompt provides insufficient context, and the model fills in the gaps with assumptions that may not match what you want. A well-constructed prompt provides the model with everything it needs to understand the task and produce the right output.

The prompt typically contains several types of information. The system prompt (in instruction-tuned models) sets the model's role, behavior, and constraints — "you are a helpful assistant that only answers questions about cooking." The conversation history provides context about what's already been said. User instructions describe what you want the model to do. Reference materials (in RAG systems) provide information the model should use. Few-shot examples demonstrate the format and style of the desired output.

Prompt completion reveals something important about how language models work: they don't have goals or intentions in the human sense. They're completing the text in the most statistically consistent way given their training. This is why the framing of a prompt matters so much. A prompt that starts with "Let me think step by step through this complex math problem..." biases the model to produce careful, structured reasoning. A prompt that starts with "Sure, here's a quick answer..." biases the model toward a brief, direct response. The model is completing what seems most likely to come next given the beginning, so the beginning powerfully shapes the completion.

For production applications, understanding prompt completion means thinking carefully about how to construct the prompt to reliably elicit the behavior you want. This is the fundamental skill of prompt engineering.

---

## 9. Text Generation Process

When you submit a prompt to an LLM and it generates a response, there's a specific process happening that's worth understanding both conceptually and practically. The generation process explains why models generate text one piece at a time, why generation can feel slow, and why the same prompt can produce different results on different runs.

The process is called autoregressive generation and it works token by token. The model takes the entire prompt, processes it through all its layers, and produces a probability distribution over its vocabulary — essentially answering the question "what's the next token, and how likely is each possibility?" A token is then selected from this distribution (we'll cover selection strategies in the temperature and sampling sections). That token is appended to the context, and the entire process runs again to predict the following token. This continues until the model generates a special end-of-sequence token or reaches a length limit.

The reason this process runs one token at a time rather than generating the entire response at once is rooted in the model's training objective. It's trained to predict the next token given everything before it, so generation naturally follows this sequential structure. The model doesn't generate the whole response and then output it — it genuinely constructs the response token by token, with each new token potentially influencing the most likely tokens that follow.

This sequential nature has important implications. Each token generation requires a full forward pass through the model — all its billions of parameters computing in sequence. For large models, this takes real time, which is why large language models generate text at a rate you can actually watch rather than instantaneously. Streaming — the way chatbot interfaces show text appearing word by word — reflects this actual token-by-token generation process rather than being a UI trick.

A crucial insight about this process is that the model has no way to go back and revise. It commits to each token as it generates it. If early in a response the model produces a premise that turns out to be wrong, it then continues generating text consistent with that wrong premise. This is why chain-of-thought prompting (encouraging the model to reason step by step before reaching a conclusion) helps — it gives the model's intermediate reasoning steps as context for later generation, rather than jumping to a conclusion with less context.

Prefill and decode are the two phases of generation. During prefill, the model processes the entire prompt and computes the initial state. During decode, the model generates tokens one at a time. Prefill can be highly parallelized (you process all prompt tokens simultaneously), while decode is inherently sequential. This is why response latency has two components: the initial processing delay (prefill) and the generation speed (decode rate).

---

## 10. Temperature

Temperature is a parameter that controls how random or deterministic a language model's text generation is. It's one of the most important parameters for getting models to behave the way you want, and its name comes from a physics analogy that's actually quite apt.

In physics, temperature controls how much thermal energy particles have. At low temperature, particles settle into their lowest-energy configurations — ordered, predictable. At high temperature, particles have lots of energy and move unpredictably — disordered, random. Temperature in language models works analogously: it controls how much "energy" (randomness) the model adds to its sampling process.

Technically, temperature modifies the probability distribution over the vocabulary before a token is sampled. At temperature 1.0, the raw probabilities from the model are used directly. At temperature below 1.0, the distribution is made more "peaky" — probabilities for the most likely tokens increase, probabilities for less likely tokens decrease further. At temperature 0, the distribution becomes deterministic: the single most probable token is always selected, and the model produces the same output every time given the same input. At temperature above 1.0, the distribution is flattened — less likely tokens get relatively higher probability, introducing more randomness and unpredictability.

The practical implications are exactly what you'd expect from this mental model. Low temperatures (0 to 0.3) produce consistent, conservative, focused outputs. The model picks the most statistically likely completions. This is ideal for tasks where there's a correct answer that you want reliably extracted — factual questions, code generation, structured data extraction. The same question asked multiple times produces the same or very similar answers.

High temperatures (0.7 to 1.2) produce more varied, creative, surprising outputs. The model explores more of the probability space, sometimes picking tokens that are less likely but interesting. This is ideal for creative writing, brainstorming, generating diverse options, or any task where variety and creativity are valuable. The same prompt asked multiple times produces meaningfully different results.

The key insight is that temperature doesn't change what the model knows or how capable it is — it only changes how conservatively or adventurously it samples from its knowledge. A model at temperature 0 isn't "smarter" — it's just more predictably selecting the statistically safest choice. A model at high temperature isn't "dumber" — it's exploring more of the possibility space, which sometimes produces brilliant responses and sometimes produces strange ones.

---

## 11. Top-k Sampling

Top-k sampling is one of the most important techniques for making LLM text generation both sensible and varied. It's a simple concept with a significant impact on output quality.

The naive way to generate text would be pure sampling from the full vocabulary distribution: at each step, you sample from all possible next tokens according to their probabilities. The problem is that even with reasonable probability distributions, occasionally extremely unlikely tokens get sampled — words that are grammatically possible but semantically absurd. Pure sampling can produce non-sequiturs and strange outputs because it never completely excludes any token from being chosen.

The other extreme is greedy decoding — always picking the single most likely token. This is deterministic and coherent but produces boring, repetitive text because the model always makes the safest choice. Greedy decoding tends to fall into loops and produces noticeably robotic-feeling text.

Top-k sampling threads the needle between these extremes. At each generation step, you identify the k most likely next tokens and restrict sampling to only those tokens. Everything outside the top-k is excluded from consideration. This gives you variety (you're not always picking the single most likely token) while excluding wildly improbable tokens (anything outside top-k is simply not considered).

The key question is what value of k to choose. Small values of k (say, k=5) produce focused, coherent text by restricting choices to only the most probable options. Large values of k (say, k=500) produce more varied text by allowing many options, including less likely but potentially creative ones. The right value depends on the task: code generation benefits from small k (there are fewer correct next tokens in code than in natural language), creative writing benefits from larger k.

The limitation of top-k sampling is that k is a fixed number regardless of the distribution shape. Sometimes the distribution is very peaked — there are clearly one or two best next tokens and everything else is far less probable. Using k=50 in this case includes tokens that are implausible given how good the top options are. Other times the distribution is very flat — many tokens are roughly equally likely. Using k=50 might exclude tokens that are genuinely plausible. Top-p sampling, described next, addresses this limitation.

---

## 12. Top-p Sampling

Top-p sampling, also called nucleus sampling, is an improvement on top-k sampling that adapts the number of tokens considered based on the shape of the probability distribution, rather than fixing it at k regardless of context.

The mechanism is elegant: instead of selecting the top k tokens, you select the smallest set of tokens whose combined probability exceeds threshold p. You're sampling from the "nucleus" of probability mass. If p is set to 0.9, you find the smallest set of tokens that together have a 90% probability of being the next token, and you sample from that set.

This adaptivity is what makes top-p superior to top-k in many situations. When the model is very confident about what comes next — the distribution is peaked with one or two clearly best tokens — the nucleus is small (just those few tokens), and sampling is focused. When the model is uncertain — the distribution is flat, with many tokens being roughly equally likely — the nucleus expands to include more tokens, allowing more variety.

Consider a concrete example: the model is generating the sentence "The quick brown ___". The most likely word is probably "fox" with a very high probability. The nucleus of 90% probability might contain only a handful of words (fox, dog, cat, bear). Top-k with k=50 would include 50 words, many of which are implausible for this particular context. Top-p gives you a naturally sized set of plausible options.

In another context: "Tell me something interesting about ___". Many completions are plausible, and the distribution is flat. The 90% nucleus might contain hundreds of tokens. Top-k with k=50 might be too restrictive, excluding many plausible and interesting directions.

Most production LLM deployments use a combination of temperature and top-p sampling. Temperature controls the overall shape of the probability distribution (how peaked vs flat). Top-p then samples from the nucleus of that shaped distribution. Together they provide fine-grained control over the balance between consistency and creativity. Typical production values might be temperature 0.7 with top-p 0.9 for general conversation — enough temperature to produce natural variety while nucleus sampling prevents truly improbable outputs.

---

## 13. Hallucinations

Hallucinations in language models are one of the most important concepts to understand because they represent the primary failure mode that makes LLMs unreliable for high-stakes applications. A hallucination is when the model generates something that is confident, fluent, and plausible-sounding but factually wrong or entirely fabricated.

The word "hallucination" is well-chosen. Just as a person experiencing a hallucination genuinely perceives something that isn't there — with no awareness that their perception is wrong — a language model generating a hallucination produces the wrong information with the same linguistic confidence it would apply to correct information. There's no verbal flag that says "I'm less sure about this part." The model generates false information the same way it generates true information.

Understanding why hallucinations happen requires understanding what language models actually learn. They're trained to produce statistically likely, contextually appropriate text. They learn the patterns, style, and typical content of the text they were trained on. They don't have a separate "truth verification" mechanism that checks whether what they're about to generate is actually true. When generating a response about a historical figure, the model isn't retrieving facts from a database — it's producing text that is statistically consistent with the patterns of text about historical figures it saw during training. If those patterns are incomplete or if the question pushes the model beyond its reliable knowledge, it fills the gap with plausible-sounding content rather than acknowledging uncertainty.

The scale at which LLMs are trained means they've absorbed enormous amounts of factual information, and most of the time that information is reliable. But the training data is finite, has a cutoff date, and isn't uniformly accurate. For well-covered topics in the training data, the model is usually reliable. For obscure topics, recent events, very specific facts (exact statistics, specific citations), or questions that require precise numerical reasoning, hallucinations become much more common.

Hallucinations are not random. They tend to follow patterns: fabricated citations that sound plausible (a real-sounding paper title, a real author's name, a credible journal — but the specific paper doesn't exist), plausible but wrong statistics (a study showing "roughly 70%" when the real number is very different), confident answers about very specific details that the model can't reliably know. The model produces text that looks like the kind of thing an authoritative source would say, because it's learned the patterns of authoritative text.

The primary mitigation strategies are: retrieval augmentation (grounding the model in verified documents), acknowledgment of uncertainty (training the model to say "I'm not sure" when appropriate), verification pipelines (checking LLM outputs against authoritative sources), and maintaining human review for high-stakes decisions.

---

## 14. Inference vs Training

Training and inference are the two distinct phases of a machine learning model's life, and they're completely different in terms of what's happening computationally, what resources are required, and how long they take.

**Training** is the process of teaching the model. During training, the model processes enormous amounts of data and adjusts its internal parameters — the billions of numerical weights that determine how it responds to any given input — to get better at predicting the next token. Training is enormously expensive: it requires thousands of specialized GPU or TPU chips running for weeks or months, consuming megawatts of power. Training GPT-4 reportedly cost tens of millions of dollars in compute alone. Training is a one-time (or infrequent) event: you train the model once (or periodically update it), and then the resulting model weights are fixed.

During training, the model computes gradients — mathematical measures of how much each parameter contributed to each error — and uses those gradients to update the parameters in the direction that reduces error. This process of computing gradients requires storing intermediate activations from the forward pass (the pass through the network to make a prediction) so they can be used during the backward pass (the pass to compute how to update parameters). This storage requirement roughly doubles the memory needed during training compared to inference.

**Inference** is using the trained model to make predictions — running the model on new inputs to get outputs. Inference is what happens when you send a message to Claude or ChatGPT and get a response. Inference uses the fixed, trained parameters to process your input and generate output. Inference is much cheaper than training because you're doing one forward pass (no backward pass needed, no gradient computation, no parameter updates), but at scale it still represents significant computational cost because you're running it billions of times per day across millions of users.

The hardware requirements differ between training and inference. Training requires massive compute for the backward pass and gradient computation. Inference requires fast response times and throughput. Training is typically done on clusters of high-end GPUs like A100s or H100s. Inference can be done on a wider range of hardware, including consumer GPUs, specialized inference chips, and even CPUs for smaller models (though slowly).

Quantization is a technique specifically for making inference more efficient. During training, models use 32-bit or 16-bit floating-point numbers for precision. For inference, the weights can often be compressed to 8-bit or even 4-bit integers with relatively small accuracy loss, dramatically reducing memory requirements and speeding up inference. A model that requires 80GB of GPU memory in its original form might run in 20GB after 4-bit quantization.

---

## 15. Foundation Models

A foundation model is a large, general-purpose model trained on vast amounts of broad data that can be adapted to a wide range of downstream tasks. The term was coined in 2021 by researchers at Stanford to describe a specific phenomenon: models that are so capable and general that they serve as the foundation for many other specialized applications.

Before foundation models, the standard approach to machine learning was task-specific. If you wanted a model to classify spam emails, you collected spam email data, trained a model specifically for that task, and used it only for that task. If you then wanted a model to summarize news articles, that was a completely separate project: collect summarization training data, train a new model, deploy separately. Every new task required starting over.

Foundation models change this completely. A foundation model is trained on an extremely broad dataset — typically a substantial fraction of all text available on the internet, plus books, code, scientific papers, and more — developing general language understanding that transfers to specific tasks. You can then take this foundation and adapt it to your specific use case with far less task-specific data and compute than would be required to build a specialized model from scratch. This adaptation process is called fine-tuning.

The reason foundation models work so well is that general language understanding provides enormous leverage for specific tasks. A foundation model that truly understands language — can parse complex sentences, understands logical relationships, knows about the world — needs relatively little additional training to understand specific domains or formats. A medical AI doesn't need to learn what language is from scratch; it just needs to learn the specific terminology, formats, and reasoning patterns of medicine on top of the language understanding it already has.

Foundation models also exhibit emergent capabilities — abilities that appear when models reach a certain scale that weren't present in smaller models and weren't explicitly trained for. Reasoning step-by-step, solving novel math problems, writing code in languages not explicitly represented in training, translating between languages never explicitly paired in training — these capabilities emerged at scale without being specifically designed.

The "foundation" metaphor is apt: foundation models are the base layer on which applications are built. GPT-4, Claude, Gemini, and Llama 3 are all foundation models. Applications like GitHub Copilot, customer service chatbots, and document analysis systems are built on top of them, either by fine-tuning or by carefully designing prompts that direct the foundation model's general capabilities toward specific tasks.

---

## 16. Open-source vs Closed-source Models

The distinction between open-source and closed-source large language models is one of the most consequential choices when building AI systems, with significant implications for cost, capability, privacy, control, and risk.

**Closed-source models** (also called proprietary models) are developed and maintained by companies that don't release the model weights or training code publicly. GPT-4 from OpenAI, Claude from Anthropic, and Gemini from Google are all closed-source. You can access their capabilities only through APIs or approved interfaces. The companies control who can use them, under what terms, at what prices, and can change or discontinue access at any time.

The advantages of closed-source models are significant. These companies have invested billions of dollars and assembled teams of hundreds of researchers, enabling them to train models at scales that produce capabilities that still exceed what open-source alternatives can match at the frontier. The infrastructure for training, safety evaluation, and deployment is mature. Usage is simple — you call an API and get responses without managing any infrastructure. Updates and improvements happen automatically. Safety research and alignment work is deeply integrated into the model development process.

The disadvantages are also significant. You're dependent on a third party. Pricing is set by the provider and can change. Your data (prompts and responses) passes through the provider's infrastructure, which creates privacy concerns for sensitive applications. You can't modify the model's behavior beyond what the API allows. Service can be discontinued or terms of service can change. And there are limits on how much you can customize or fine-tune the model.

**Open-source models** (more accurately called open-weight models, since training code and data aren't always included) are models where the trained weights are publicly released, allowing anyone to download and run them. Llama 3 from Meta, Mistral from Mistral AI, Falcon from TII, and Phi from Microsoft are prominent examples. You can run these models on your own hardware, modify them, fine-tune them on your own data, and integrate them however you want without ongoing per-token costs.

The advantages of open-source models are substantial for the right use cases. Complete privacy — your data never leaves your infrastructure. No ongoing API costs — once you have the hardware, running the model is essentially free. Full customization — you can fine-tune the model on your own data to specialize it for your use case. No dependency on a third party for availability. The ability to run air-gapped (completely offline), which is essential for sensitive industries like defense and healthcare.

The disadvantages are real. Running large open-source models requires significant infrastructure — high-end GPUs with large amounts of GPU memory. The operational burden of managing model serving, scaling, and reliability falls on you. Current frontier open-source models still lag behind the very best closed-source models on many capability benchmarks, though the gap has been narrowing. Safety evaluation is your responsibility — open-source models don't have the same guardrails built in by default.

The right choice depends entirely on your situation. For rapid prototyping and applications where capability is paramount and privacy isn't a concern, closed-source APIs are fast and powerful. For production applications with sensitive data, cost sensitivity at scale, deep customization requirements, or regulatory constraints on data leaving your infrastructure, open-source models are often the better path. Many mature AI teams use both — closed-source for tasks where frontier capability matters, open-source for tasks where privacy, cost, or customization are more important than maximum capability.

---

The connecting thread through all of them is this: generative AI represents not just a new type of software but a genuinely new paradigm for how machines interact with human knowledge and language. The Transformer architecture and attention mechanism gave machines a new way to process sequential information at scale. Tokenization and embeddings gave machines a way to represent language as mathematics. Training and inference separate the learning phase from the application phase. Temperature and sampling give us control over the balance between reliability and creativity. And understanding the limitations — hallucinations, context window constraints, the open vs closed tradeoffs — is what separates engineers who build reliable AI systems from engineers who build impressive demos that break in production.
