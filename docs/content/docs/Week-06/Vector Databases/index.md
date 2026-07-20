---
title: "Vector Databases"
description: "AI Platform Engineering Handbook - Week 6 - Vector Databases"
weight: 62
toc: true
---

---

## 1. Vector Database Architecture

Let's start by understanding, at a high level, what's actually happening inside a vector database, because this foundation will make everything else in this guide much easier to follow.

At its core, a vector database needs to do three main jobs. First, it needs to **store** vectors — meaning it needs to hold onto potentially millions of these long lists of numbers, along with the original text they represent and any extra metadata (like the document title, date, or category we discussed in the RAG explanation). Second, it needs to **index** those vectors — this is a crucial step we'll dig into more later, but the short version is that it organizes the vectors in a clever internal structure so that searching through them later is fast, rather than having to compare your query against every single vector one by one, which would be painfully slow at large scale. Third, it needs to **search** — when a new query vector comes in, it needs to rapidly find the vectors already stored that are most similar to it, and return them.

Beyond these three core jobs, a well-built vector database architecture typically includes a few other important pieces. There's usually a **metadata store** sitting alongside the vectors, so that when you filter by things like date or category (as we discussed with metadata filtering), the system can quickly narrow down candidates using these structured fields before or during the similarity search, rather than having to check every single stored vector. There's typically an **API layer** — a set of instructions the database understands, like "insert this vector," "search for the closest matches to this vector," or "delete this vector" — which is how your actual application talks to the database. Many production vector databases also have a **distributed architecture**, meaning that instead of running on a single computer, the data and workload are spread across many machines working together. This matters because when you have hundreds of millions of vectors, no single computer has enough memory or processing power to handle it all efficiently, so the database needs to intelligently split ("shard") the data across multiple machines, and combine ("merge") results from each machine when a search is performed.

Finally, most vector databases also handle **persistence** (making sure your data survives even if the computer it's running on restarts or crashes, usually by regularly saving data to disk rather than keeping everything only in fast-but-temporary memory) and **updates** (handling situations where documents in your knowledge base change over time, meaning old vectors need to be updated or deleted, and new ones added, without having to rebuild the entire search index from scratch every time).

---

## 2. Pinecone

Pinecone is one of the most well-known vector databases, and it's what's called a "fully managed" service — meaning Pinecone runs and maintains all the actual servers and infrastructure for you, and you simply connect to it over the internet, similar to how you'd use an LLM API. You never have to worry about installing anything, managing servers, or handling scaling yourself — you just send your vectors to Pinecone and query them, and Pinecone handles everything happening behind the scenes.

This makes Pinecone a very popular choice for teams that want to get a RAG system up and running quickly, without needing to hire specialized infrastructure engineers to manage a database themselves. It's built specifically and exclusively for vector search (unlike some of the other options we'll cover, which started as general-purpose databases and added vector search later), so it tends to be highly optimized and reliable specifically for this use case. Pinecone also handles scaling automatically — as your data grows from thousands to millions of vectors, Pinecone manages the underlying complexity of spreading that data across more infrastructure, without you needing to manually intervene.

The tradeoff with Pinecone is that, being a fully managed commercial service, you pay for convenience — since you're not running the infrastructure yourself, you don't have as much low-level control over exactly how things are configured, and costs can add up as your data grows, compared to some self-hosted alternatives. It's a strong choice for teams that value speed of development and reliability over maximum control or minimizing infrastructure costs.

---

## 3. Qdrant

Qdrant (pronounced "quadrant") is a vector database that, like Pinecone, is built specifically and exclusively for vector search — but with an important difference: Qdrant is open-source, meaning its underlying code is publicly available for anyone to inspect, use, and even run themselves for free. Qdrant offers both a self-hosted option (you download it and run it on your own servers or computer) and a managed cloud option (where Qdrant runs it for you, similar to Pinecone, for those who want the convenience without the setup).

Qdrant is well known in the developer community for being fast and efficient, particularly because it's built in a programming language called Rust, which is known for producing very high-performance, memory-efficient software. It also has a reputation for offering rich, flexible filtering capabilities — meaning it's particularly good at combining metadata filtering (like we discussed earlier) together with vector similarity search in a fast and flexible way.

Because it offers a genuinely solid free, self-hosted option, Qdrant tends to appeal to developers and companies that want more control over their infrastructure, want to avoid ongoing subscription costs as their data scales, or have specific requirements (like keeping all data entirely within their own servers for privacy or compliance reasons) that a fully managed third-party service can't easily satisfy.

---

## 4. ChromaDB

ChromaDB (often just called "Chroma") is another open-source vector database, and it's particularly well known and loved for being extremely easy and lightweight to get started with. While Pinecone and Qdrant are often used for larger, more production-scale systems, Chroma has built a strong reputation as the go-to choice for developers who are learning RAG for the first time, prototyping quickly, or building smaller-scale applications.

A big part of Chroma's appeal is its simplicity — you can literally get a vector database running with just a few lines of code, directly inside a Python script, without needing to set up any separate server or sign up for any account at all. It can run entirely in memory or save data locally to a file on your own computer, which makes it perfect for experimentation, learning, small projects, or the early prototyping phase of a larger project before you're ready to invest in more heavyweight infrastructure.

The tradeoff is that Chroma, especially in its simplest form, isn't typically designed to handle the same massive scale or the same level of high-traffic, distributed, production-grade workloads that something like Pinecone or a well-configured Qdrant cluster can handle. Because of this, a common and very sensible pattern is: build and test your RAG application using Chroma because it's fast and simple to iterate with, and then, once you're ready to actually launch a large-scale production application, migrate to a more heavyweight system if your scale genuinely requires it.

---

## 5. Weaviate

Weaviate is another open-source vector database, and one of the things that sets it apart is that it was built with AI and machine learning deeply integrated into its core design from the start, rather than added on as an afterthought. It offers both self-hosted and managed cloud options, similar to Qdrant.

One standout feature of Weaviate is its built-in support for automatically generating embeddings for you. With some other vector databases, you're expected to generate the vector embeddings yourself (using a separate embedding model, like we discussed earlier) and then hand those already-made vectors to the database to store. Weaviate can optionally handle that embedding-generation step internally too, connecting directly to various embedding model providers, which can simplify the overall setup of a RAG pipeline since you have fewer separate pieces to wire together yourself.

Weaviate also has strong support for hybrid search (combining semantic and keyword search, which we covered in the RAG explanation) built directly into the product, and it supports a rich data model where you can define structured "classes" or types of objects with defined properties, similar in spirit to how you might define tables and columns in a traditional database — which can make it a good fit for applications with more complex, structured data alongside the unstructured text.

---

## 6. Milvus

Milvus is an open-source vector database that was specifically built from the ground up with a strong focus on massive scale — handling billions of vectors reliably in demanding, high-traffic, production environments. It's part of a broader open-source foundation and has one of the more mature, battle-tested track records among open-source vector databases, particularly among larger companies with very large-scale AI infrastructure needs.

Milvus has a distributed architecture designed to spread enormous datasets across many machines efficiently, and it supports a wide range of the different index types we'll discuss shortly, giving engineering teams fine-grained control over the tradeoffs between search speed, accuracy, and memory usage. Because of this focus on scale and configurability, Milvus tends to have a steeper learning curve and requires more infrastructure expertise to set up and manage well, compared to something like Chroma's beginner-friendly simplicity.

Milvus is generally the kind of choice a larger engineering team reaches for once they have a clear, demanding, large-scale production requirement, and they have the technical expertise on hand to properly configure and maintain a more complex distributed system in exchange for the performance and scale it can deliver.

---

## 7. FAISS

FAISS stands for Facebook AI Similarity Search (it was originally developed by Meta, formerly known as Facebook), and it's a bit different in category from everything else we've discussed so far. FAISS is not really a full "database" in the same sense as Pinecone, Qdrant, Weaviate, or Milvus — it doesn't have things like a network API you connect to, built-in persistence, or metadata filtering out of the box. Instead, FAISS is a software library — a toolkit of highly optimized algorithms for doing fast similarity search on vectors, which developers can use as a building block inside their own applications or even inside other vector databases.

In fact, several of the more full-featured vector databases mentioned above actually use FAISS's algorithms internally as part of their own systems, because FAISS is so well-optimized and widely trusted for the core mathematical problem of searching through huge numbers of vectors quickly.

Because it's a lower-level library rather than a ready-to-use database, FAISS tends to be the choice for developers and researchers who want maximum control and top-tier raw performance, and who are comfortable building the surrounding infrastructure (like storage, metadata handling, and network access) themselves, rather than getting all of that provided out of the box. It's a fantastic option for research projects, highly custom systems, or as the internal engine that powers a bigger, custom-built application — but less commonly the direct choice for someone who just wants to quickly stand up a working RAG system without a lot of extra engineering.

---

## 8. Index Types

We've mentioned "indexing" a few times now, so let's dig into what this actually means, because it's one of the most important concepts for understanding how vector databases achieve fast search.

Imagine you have ten million stored vectors, and someone sends in a new query vector. The most straightforward way to find the closest matches would be to compare the query against every single one of those ten million vectors, one at a time, and see which ones are closest. This approach, often called a "flat" or "brute-force" search, is guaranteed to find the truly correct, exact closest matches every time — but it's extremely slow at large scale, because you're doing millions of comparisons for every single search.

An index is a cleverly organized internal data structure that gets built ahead of time, specifically to make searches much faster, by avoiding the need to compare against every single stored vector. There are several common types of indexes used in vector databases, each with different tradeoffs.

**Flat index** is exactly the brute-force approach described above — simple, and perfectly accurate, but slow once you have a lot of vectors. It's mainly practical for smaller datasets where speed isn't a major concern, or as a baseline for comparing accuracy against faster methods.

**IVF (Inverted File Index)** works by first grouping similar vectors together into clusters (imagine sorting all your vectors into a set of buckets, where each bucket roughly represents a "neighborhood" of similar meaning). When a new search comes in, instead of checking every single vector, the system first figures out which few buckets are most likely to contain the closest matches, and only searches carefully within those buckets — dramatically cutting down the number of comparisons needed.

**HNSW (Hierarchical Navigable Small World)** is one of the most popular and widely used index types in modern vector databases. Without getting too deep into the technical details, the basic idea is that it builds a multi-layered network of connections between vectors, a bit like a web of shortcuts, where a search can quickly "hop" through a small number of well-chosen connections to rapidly zero in on the closest neighborhood, rather than wandering through the whole dataset. HNSW is generally known for offering an excellent balance of speed and accuracy, which is why it's become such a common default choice across many vector databases.

**PQ (Product Quantization)** is a different kind of technique, focused specifically on compressing vectors to use much less memory, by approximating the numbers in each vector using a smaller set of representative values, rather than storing the full precision of every number. This is often combined with other index types (like IVF) when you have such an enormous number of vectors that just storing them all in full precision in memory would be prohibitively expensive.

In practice, most vector databases let you choose which index type to use, and the right choice depends on your specific priorities around speed, accuracy, and memory usage, which brings us to the next topic.

---

## 9. ANN Search

ANN stands for Approximate Nearest Neighbor, and understanding this concept is key to understanding why vector search can be so fast even at a massive scale.

Let's unpack the term. "Nearest Neighbor" search means finding the vectors that are truly the closest match, mathematically, to your query — this is what the brute-force flat index we just discussed gives you, with perfect, guaranteed accuracy. But "Approximate" means the system is willing to accept results that are very likely correct, or extremely close to correct, but not mathematically guaranteed to be the absolute perfect, exact closest matches every single time.

Why would anyone deliberately accept slightly less-than-perfect accuracy? Because it turns out that, in exchange for giving up a tiny, often barely noticeable amount of accuracy, you can gain an enormous improvement in speed — often searching through millions or billions of vectors in a matter of milliseconds, rather than the seconds or even minutes a perfectly exact brute-force search might take at that scale. All those index types we just discussed (like HNSW and IVF) are examples of ANN techniques — they're specifically designed to very quickly find results that are almost certainly among the true closest matches, without doing the exhaustive, expensive work of checking absolutely everything.

In the vast majority of real-world applications — like RAG systems answering questions, product recommendation systems, or image search — this small tradeoff in perfect accuracy is completely unnoticeable in practice and very much worth it for the massive gain in speed. If your search returns the 4th and 5th closest matches instead of the mathematically perfect 3rd and 4th closest matches, the practical difference in the quality of the final AI-generated answer is usually negligible, while the speed difference between approximate and exact search at large scale can be the difference between an application that feels instant and one that feels painfully slow.

Most vector databases let you tune exactly how "approximate" you're willing to be, giving you a dial to adjust between faster-but-slightly-less-accurate and slower-but-more-accurate, depending on what your specific application needs.

---

## 10. Collection Design

A "collection" (sometimes also called an "index" or a "namespace," depending on the specific database, though this can get confusing since we just used "index" to mean something else above) generally refers to a distinct, organized group of vectors within your vector database — conceptually similar to how a "table" works in a traditional database. Collection design refers to the thoughtful planning of how you organize and structure your data across one or more of these collections.

Getting collection design right matters more than beginners often expect, and there are a few important decisions involved. One key decision is **how many collections to use, and how to divide your data among them.** For example, should all your company's documents from every department live in a single big collection, or should you create separate collections for HR documents, engineering documents, and sales documents? There's no single universal right answer — it depends on your use case. Separate collections can improve search speed and relevance (since you're searching a smaller, more focused set of vectors), and can make access control simpler (giving different users permission to search only certain collections). But splitting things up too aggressively can also add complexity, especially if a single user question sometimes needs to draw from multiple collections at once.

Another important decision involves **choosing what metadata fields to include** alongside each vector in a collection, since (as we discussed in the RAG section) well-chosen metadata enables precise filtering later on. Good collection design means thinking ahead about what filtering capabilities you'll actually need in your application (filtering by date? by author? by department? by document type?) and making sure that information is captured as structured metadata from the start, rather than realizing later that you need it and having to go back and reprocess everything.

A third consideration is **planning for how the collection will grow and change over time** — will new documents be added continuously? Will old documents need to be updated or removed? Good collection design anticipates this from the start, rather than being built only around a fixed, unchanging snapshot of data that becomes awkward to maintain once things inevitably need to change.

---

## 11. Vector Storage Optimization

As your collection of vectors grows into the millions, simply storing all that data efficiently — separate from the question of searching it quickly — becomes its own important challenge, and there are several established techniques used to keep storage costs and memory usage manageable.

**Quantization** is one of the most important techniques here, and it directly connects to the Product Quantization index type we mentioned earlier. The core idea is to reduce the precision of the numbers stored in each vector — instead of storing every number with maximum, full precision (which takes up more memory), you store a slightly less precise, compressed approximation of each number. This can dramatically shrink the amount of memory needed to store your vectors — sometimes by a factor of four, eight, or even more — while causing only a very small, often barely noticeable, reduction in search accuracy.

**Choosing the right vector dimensionality** is another lever. Remember, the embedding model you choose (from our earlier discussion) determines how long each vector is — how many numbers make up the list. Longer vectors generally capture more nuanced meaning, but they also take up more storage space and are slower to search through. Some embedding models offer smaller vector sizes as an option specifically to help control this tradeoff, and choosing an appropriately-sized embedding model for your actual needs, rather than always defaulting to the largest available option, is an important optimization decision.

**Tiered storage** is a technique where not all your data needs to sit in the fastest, most expensive type of memory at all times. Frequently accessed or recently added vectors might be kept in fast memory (RAM) for instant access, while older or less frequently accessed vectors get moved to slower, cheaper storage (like a hard drive), and only loaded into fast memory when they're actually needed for a search. This mirrors a very common pattern used broadly across computer systems, applied specifically here to vector data.

**Regular cleanup and deduplication** also matters more than people often expect — over time, especially in systems where documents get updated frequently, it's easy to accumulate outdated, duplicate, or orphaned vectors (for example, old versions of a document that was since updated, where the old vector never got properly deleted). Periodically cleaning these up keeps both storage costs and search accuracy in good shape, since outdated or duplicate content floating around in your collection can also occasionally get retrieved and confuse the final AI-generated answer, undermining the grounding we talked about in the previous RAG explanation.

Taken together, all of these storage optimization techniques exist to solve the same underlying tension that runs through almost every part of vector database design: balancing speed, accuracy, and cost against each other, and making deliberate, informed tradeoffs among the three based on what actually matters most for your specific application.
