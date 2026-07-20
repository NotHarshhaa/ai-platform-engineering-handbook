---
title: "RAG Foundations"
description: "AI Platform Engineering Handbook - Week 6 - RAG Foundations"
weight: 60
toc: true
---

---

## 1. What is RAG

RAG stands for Retrieval-Augmented Generation. That's a mouthful, so let's break the phrase into its three pieces because each word actually tells you exactly what's happening.

"Retrieval" means fetching relevant information from somewhere — think of it like searching through a filing cabinet or a library to pull out the specific pages that are relevant to a question. "Augmented" means enhanced or added to — the information you retrieved gets added into the mix. "Generation" refers to the AI model actually writing a response, the way it normally would.

Put together, RAG is a technique where, before the AI model answers your question, the system first searches through a knowledge base (like a collection of documents, a database, or a set of web pages) to find the most relevant pieces of information, and then hands those pieces to the AI model along with your original question. The model then generates its answer using both its own general knowledge and the specific information it was just handed.

Think of it like an open-book exam versus a closed-book exam. A language model normally answers questions "closed-book" — purely from what it memorized during training. RAG turns it into an "open-book exam" — right before answering, it gets to quickly flip through the exact right pages of a reference book that are relevant to the question, and then write its answer using what it just read, combined with what it already knew.

---

## 2. Why RAG Exists

To really appreciate why RAG became such a widely used technique, it helps to understand the specific problems it solves, because there are actually several distinct ones.

**Problem one: knowledge cutoffs.** Every AI model has a training cutoff date — a point in time after which it simply has no information, because it hasn't seen any text written after that. If you ask a model about something that happened last week, it has no way of knowing, because that event didn't exist yet when the model was trained. RAG solves this by retrieving current information (like a fresh news article or an updated webpage) at the moment you ask, so the model can incorporate up-to-date facts even though its own training is frozen in the past.

**Problem two: private or specific knowledge.** A company's internal documents, a person's personal notes, a specific product's technical manual — none of this was part of the model's training data, because it's private and was never published on the public internet. RAG lets you feed exactly this kind of private information to the model at the moment of asking, without needing to retrain the entire model (which would be extraordinarily expensive and slow) every time a document changes.

**Problem three: hallucination.** This is a well-known weakness of language models — when they don't actually know something, instead of saying "I don't know," they sometimes confidently generate an answer that sounds correct but is actually made up. This happens because the model is fundamentally a text-prediction system, not a database of verified facts. RAG reduces this problem significantly, because the model is explicitly given real source material to base its answer on, rather than having to rely purely on its fuzzy, compressed memory of its training data.

**Problem four: cost and speed of updating knowledge.** Retraining a large language model from scratch (or even partially) every time new information becomes available is incredibly expensive and time-consuming — it can take weeks and cost millions of dollars for the largest models. RAG sidesteps this entirely. Updating the model's effective "knowledge" is as simple as adding a new document to the knowledge base it searches through — no retraining required at all.

Together, these four problems explain why RAG became one of the most widely adopted patterns in real-world AI applications — it's dramatically cheaper and faster than retraining, and it makes answers more accurate and current.

---

## 3. Vector Embeddings

This is one of the more technical-sounding concepts, but the core idea is actually pretty intuitive once you see it laid out.

Computers are fundamentally good at working with numbers, not with the *meaning* of words. If you give a computer the word "dog" and the word "puppy," it doesn't inherently know these words are closely related in meaning — to a computer, they're just two completely different sequences of letters. Vector embeddings solve this by converting words, sentences, or entire documents into long lists of numbers (called "vectors") in such a way that the numbers actually capture the *meaning* of the text.

Here's the key trick: this conversion process is designed so that pieces of text with similar meanings end up with similar numbers, and pieces of text with very different meanings end up with very different numbers. So the vector (list of numbers) for "dog" and the vector for "puppy" would end up quite close to each other, while the vector for "dog" and the vector for "airplane" would end up quite far apart.

You can think of this as plotting every word or sentence as a point in space — imagine an enormous multi-dimensional map (way more than the three dimensions we can visualize, often hundreds or even thousands of dimensions) where similar concepts naturally cluster near each other, like how all the coffee shops on a real map might cluster together in a particular part of a city. "King" and "Queen" would land near each other on this conceptual map. "Car" and "vehicle" would land near each other too. This numeric representation of meaning is called an embedding, and it's the foundational building block that makes the rest of RAG possible, because it gives computers a way to mathematically compare how similar two pieces of text are in meaning, not just in exact wording.

---

## 4. Embedding Models

If vector embeddings are the numeric representation of meaning, embedding models are the actual AI systems responsible for creating those numbers in the first place. An embedding model is a specialized type of AI model whose entire job is to take a piece of text as input and output a vector (that list of numbers) representing its meaning.

It's worth understanding that embedding models are different from the general chat-style language models like GPT or Claude that you might be more familiar with. A chat model's job is to have a conversation and generate new text. An embedding model's job is much narrower and more specialized — it doesn't generate any new text at all, it simply reads text and converts it into that meaningful numeric vector. Because the job is narrower, embedding models tend to be smaller, faster, and much cheaper to run than full conversational AI models.

There are many embedding models available from different providers — OpenAI has its own embedding models, as does Google, Cohere, and there are also many high-quality open-source options that you can run yourself. Different embedding models vary in a few important ways: the size of the vector they produce (some produce shorter lists of numbers, some produce longer ones — longer generally captures more nuance but costs more to store and search), how well they've been trained to understand the specific type of content you care about (some are better tuned for general text, others are specialized for code, legal documents, or multiple languages), and their cost and speed.

An important practical detail: whichever embedding model you choose to convert your documents into vectors, you must use that exact same model later when converting a user's question into a vector too, because different embedding models produce numbers on different "scales" that aren't directly comparable to each other — it would be like trying to compare a distance measured in miles to a distance measured in kilometers without converting between them first.

---

## 5. Semantic Search

Now that we understand embeddings, we can talk about what they're actually used for — and the biggest use case is something called semantic search.

Traditional search, the kind you might be used to from a basic search box, generally works by matching exact keywords. If you search for "car repair" in a traditional keyword search system, it looks for documents that literally contain the words "car" and "repair." If a highly relevant document instead uses the words "automobile maintenance," a simple keyword search might completely miss it, even though it's talking about exactly the same topic — because it doesn't contain those exact keywords.

Semantic search solves this problem directly, using the embeddings we just discussed. Instead of matching exact words, semantic search converts your query into a vector (using an embedding model) and then finds documents whose vectors are closest to it in that numeric "meaning space" we talked about earlier. Since "car repair" and "automobile maintenance" have very similar meanings, their vectors end up close together, so semantic search successfully finds the relevant document even though not a single word matches exactly.

This is a genuinely big leap forward for search quality, because it means the system is actually searching based on *what you mean*, not just the literal words you happened to type. It handles synonyms naturally, it handles different phrasings of the same underlying question, and it even works reasonably well across different ways of describing the same concept, all without anyone having to manually program in every possible synonym or rephrasing.

---

## 6. Similarity Search

Similarity search is very closely related to semantic search — in fact, it's the underlying mechanical process that makes semantic search actually work. Where "semantic search" describes the overall goal (finding results based on meaning), "similarity search" describes the specific mathematical operation being performed behind the scenes.

Here's what's actually happening. Once you have a big collection of vectors (remember, each one represents the meaning of a chunk of text) stored somewhere, and you have a new vector representing your search query, similarity search is the process of mathematically comparing your query vector against every stored vector to figure out which ones are closest, or most "similar," to it.

There are a few common mathematical methods used to measure this "closeness," but the most common one you'll hear about is called cosine similarity. Without getting too deep into the math, the basic idea is that it measures the angle between two vectors — if two vectors are pointing in almost exactly the same direction in that multi-dimensional space we talked about earlier, they're considered highly similar, and if they're pointing in very different directions, they're considered dissimilar. The output is typically a score, often between 0 and 1 (or -1 and 1 depending on the method), where a higher score means more similar meaning.

In practice, when a RAG system searches through thousands or even millions of stored document chunks, it calculates a similarity score for each one against your question, and then returns the ones with the highest scores — usually the "top K" results, meaning something like the top 3, 5, or 10 most similar chunks, since handing the AI model absolutely everything would be slow, expensive, and unnecessary.

---

## 7. Chunking Strategies

Here's a practical problem that comes up quickly once you start actually building a RAG system: documents are often really long — think of a 100-page company handbook, or a lengthy technical manual. You generally can't (and shouldn't) convert an entire massive document into a single embedding vector, because a single vector trying to represent an enormous amount of varied content ends up being a vague, blurry average that doesn't represent any single part of it well, and it also isn't practical to hand a model an entire document when only one paragraph is actually relevant to the question asked.

The solution is chunking — breaking documents down into smaller, more manageable pieces before converting each piece into its own embedding vector. This way, when someone asks a question, the system can find the one specific chunk that's actually relevant, rather than the whole giant document.

But how exactly should you break a document into pieces? This is trickier than it sounds, and there are several common strategies, each with tradeoffs.

**Fixed-size chunking** is the simplest approach — you just split the text every certain number of words or characters, like every 500 words, regardless of where sentences or paragraphs naturally end. It's easy to implement, but it can awkwardly cut a sentence or an idea right in half between two chunks, losing important context.

**Sentence-based or paragraph-based chunking** splits text along natural boundaries instead — at the end of sentences or paragraphs — so you don't end up slicing an idea in half mid-thought. This tends to preserve meaning better than purely fixed-size chunking.

**Overlapping chunks** is a technique often combined with the above, where each chunk shares a little bit of text with the chunk before and after it (for example, the last 50 words of one chunk are repeated as the first 50 words of the next). This helps make sure that an idea spanning the boundary between two chunks isn't lost or split awkwardly in a way that neither chunk fully captures it.

**Semantic chunking** is a more sophisticated approach where, instead of splitting by a fixed rule, the system actually tries to detect where the topic or subject naturally shifts in the text, and splits there — keeping each chunk focused on one coherent idea, even if that means chunks end up being different sizes.

Choosing the right chunk size is itself a balancing act. Chunks that are too small might lose important surrounding context (a sentence pulled completely out of context can be confusing or misleading). Chunks that are too large start running back into the original problem — diluting the specific relevant information among a lot of less relevant surrounding text, and making retrieval less precise.

---

## 8. Metadata Filtering

So far we've talked entirely about searching based on meaning. But in a lot of real-world situations, you also want to narrow your search using more concrete, structured facts — and that's what metadata filtering is for.

Metadata simply means "data about the data" — extra structured information attached to each chunk of text, beyond just its content. For example, alongside a chunk of text, you might also store metadata like: which document it came from, the date it was written or last updated, the author, the department it belongs to, its language, or its category or tag.

Metadata filtering means narrowing your search results using this structured information, in combination with the semantic/similarity search we talked about earlier. For example, imagine you're building a RAG system for a company's internal knowledge base, and someone asks a question. You might want to search only within documents from the HR department, only within documents updated in the last year, or only within documents marked as "publicly shareable" (excluding anything confidential from certain users). Metadata filtering lets you apply these kinds of precise, rule-based restrictions before or alongside the fuzzy, meaning-based similarity search.

This combination is powerful because pure semantic search alone doesn't understand strict rules well — it can't reliably guarantee "only show me things from after January 2024," because that's not really a matter of meaning, it's a matter of a specific fact. Metadata filtering handles the parts of a query that are about hard facts and structured constraints, while semantic search handles the parts that are about fuzzy, conceptual relevance — and using both together tends to produce far more precise, useful results than either one alone.

---

## 9. Hybrid Search

Hybrid search is exactly what it sounds like — combining two different search approaches together to get the benefits of both, rather than relying on just one. Specifically, it usually refers to combining semantic search (the meaning-based approach we discussed above) with traditional keyword search (the exact-word-matching approach).

Why would you want both? Because each one has situations where it clearly outperforms the other, and combining them covers each other's weaknesses. Semantic search is great at understanding intent, synonyms, and rephrasing — but it can sometimes struggle with very specific, exact terms, like a product ID number, an error code, a person's name, or a rare technical acronym, because these specific terms don't necessarily have a rich, well-defined "meaning" in the numeric embedding space the way a common concept like "car repair" does. Traditional keyword search, on the other hand, is extremely reliable at finding exact matches for specific terms like that, but it completely misses relevant results that don't use the exact same wording.

Hybrid search runs both types of search at the same time, and then combines and re-ranks the results from each, so you get the best of both worlds — the conceptual flexibility of semantic search, plus the precision of exact keyword matching. In practice, many production RAG systems today use hybrid search as their default approach, rather than relying purely on semantic search alone, precisely because real-world questions often contain a mix of general concepts and specific, exact terms that both need to be handled well.

---

## 10. Sparse vs Dense Retrieval

This topic is closely related to hybrid search, and it's really just a more technical way of describing the same two underlying approaches we just discussed — but it's worth understanding the specific terminology, since you'll see it used a lot in RAG discussions.

**Dense retrieval** refers to the semantic, embedding-based search approach we've been describing throughout this whole explanation. It's called "dense" because the vectors involved are dense — meaning nearly every number (every dimension) in that long list of numbers holds some meaningful value, contributing in some small way to representing the overall meaning of the text. Dense retrieval is what powers semantic search, and it's excellent at understanding conceptual similarity and intent.

**Sparse retrieval** refers to more traditional keyword-based methods (like the classic search technique called TF-IDF, or the more modern and refined version called BM25, which is still very widely used today). It's called "sparse" because in this approach, text is represented as a vector where most of the values are literally zero, and only the specific words that actually appear in the document have a non-zero value. Think of it like a checklist of every possible word in the entire language, where a document gets a mark next to only the words it actually contains, and every other word on that enormous checklist is left blank (zero). This is naturally very good at exact matching, but it has no real understanding of meaning or synonyms — to a sparse method, "car" and "automobile" are just two completely unrelated entries on the checklist.

Understanding this distinction helps clarify exactly what hybrid search is doing under the hood — it's literally combining a dense (meaning-based) retrieval method with a sparse (exact keyword-based) retrieval method, and merging their results together, so that the final results benefit from both the conceptual understanding of dense retrieval and the precision of sparse retrieval.

---

## 11. Context Assembly

Once your system has actually found the most relevant chunks of information — whether through semantic search, hybrid search, or metadata filtering, or some combination — there's still an important step left before you can hand things off to the AI model to generate its answer, and that's context assembly.

Context assembly is the process of taking all those separately retrieved chunks and organizing them into a single, well-structured package that gets sent to the language model along with the user's original question. This might sound simple, but doing it well actually matters a lot for getting good quality answers.

A few important considerations come into play here. **Ordering matters** — the sequence in which you present the retrieved chunks to the model can influence how well it uses them; some approaches deliberately put the most relevant chunks either at the very beginning or the very end of the context, since models sometimes pay less attention to information buried in the middle of a long input. **Avoiding redundancy matters** — if several of your retrieved chunks say largely the same thing, including all of them wastes valuable space (remember, longer inputs cost more and there's a limit to how much text you can include at all) without adding much new value, so some systems deliberately filter out near-duplicate chunks. **Fitting within limits matters** — every language model has a maximum amount of text it can process in one go, so context assembly needs to make sure the total combined size of the retrieved chunks, plus the user's question, plus any additional instructions, all fit within that limit. **Clear formatting matters** — well-built systems often explicitly label each piece of retrieved information (for example, marking clearly where one document chunk ends and another begins, and citing which source each one came from) so the model can distinguish between different pieces of retrieved context and, importantly, so it can accurately cite its sources back to the user afterward.

Essentially, context assembly is the "packaging" step — taking a pile of individually useful puzzle pieces and arranging them into a clear, organized, well-labeled bundle, in a way that sets the AI model up to actually use them effectively rather than getting confused by a messy jumble of disconnected text.

---

## 12. Grounding AI Responses

Finally, let's talk about grounding, which is really the whole point that everything we've covered so far is building toward.

"Grounding" refers to making sure an AI model's response is actually based on, or tied to, real, verifiable information — rather than the model just generating something that sounds plausible purely from its own internal, sometimes fuzzy memory. It's essentially the antidote to hallucination, which we touched on earlier — the tendency of language models to confidently state things that simply aren't true.

Everything discussed in this whole document — retrieving relevant chunks, filtering by metadata, combining sparse and dense search, and carefully assembling the retrieved context — exists to serve this one ultimate purpose: giving the model real, specific, verified source material to "ground" its answer in, instead of letting it rely purely on guesswork from its training. When a RAG system works well, the AI model's final answer should be traceable directly back to specific pieces of the retrieved content, rather than being an ungrounded, made-up response.

In well-designed RAG systems, grounding is often reinforced through explicit instructions given to the model — for example, telling it directly to only answer based on the provided context, and to clearly say "I don't know" or "this isn't covered in the available information" if the retrieved chunks genuinely don't contain an answer to the question, rather than falling back on making something up to avoid seeming unhelpful. Many systems also implement citations, where the model is asked to reference exactly which source document or chunk it pulled each specific piece of information from — which not only improves user trust (since people can verify the answer themselves by checking the original source), but also makes it much easier to catch and correct cases where the grounding didn't work as intended.

Ultimately, grounding is the reason RAG matters so much in real-world, production AI applications — especially for use cases like legal research, medical information, financial data, or internal company knowledge, where a confidently wrong, ungrounded answer isn't just unhelpful, it can be genuinely harmful. RAG, done well, transforms a language model from a system that's "impressively good at sounding right" into one that's "reliably and verifiably right," anchored in real source material rather than a fuzzy, unverifiable memory.
