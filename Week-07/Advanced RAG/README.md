# Advanced RAG

## 1. Multi-Document RAG

Basic RAG, in its simplest form, is often explained as if you're searching through one big pile of text and pulling out a few relevant chunks. But in reality, most useful RAG systems need to work across many separate documents — sometimes hundreds, thousands, or more — and the answer to a question might require pulling together pieces from several completely different documents at once.

Multi-document RAG refers to this more realistic, more complex scenario, and the techniques built to handle it well. Imagine you're asking a question like "compare our Q1 and Q3 sales performance" — the answer isn't sitting in a single document; it requires retrieving the Q1 sales report and the Q3 sales report separately, and then combining information from both. A naive RAG system that just grabs the "most similar" handful of chunks overall might end up biased toward one document over the other, or might miss one of the needed documents entirely if its chunks don't score quite as highly in the similarity search.

Handling this well often involves being more deliberate about the retrieval process — for example, explicitly making sure the system retrieves a good spread of results across multiple relevant documents rather than just the top handful of chunks overall, or breaking a complex question down into smaller sub-questions (which connects to query transformation, discussed further below) so that each sub-question can be used to search for and retrieve the specific document it actually needs. It also often involves being thoughtful about which document each retrieved chunk came from, and clearly labeling that in the final context handed to the model, so the model can reason accurately about "the Q1 report says X, while the Q3 report says Y," rather than blending information from different sources together in a confusing, unattributed way.

---

## 2. Parent-Child Retrieval

This technique addresses a genuine tension we touched on earlier in the chunking discussion: small chunks are great for precise search (a short, focused chunk produces a more accurate embedding), but small chunks often lack enough surrounding context to be genuinely useful once you actually hand them to the AI model to generate an answer.

Parent-child retrieval solves this by essentially separating the "chunk used for searching" from the "chunk used for the final answer." Here's how it works: you break each document into small chunks (called "child" chunks) specifically for the purpose of generating embeddings and running similarity search, since smaller, more focused chunks tend to produce more precise search matches. But alongside each small child chunk, the system also keeps track of a larger surrounding chunk (the "parent") — perhaps the full paragraph, section, or even the whole page that the small child chunk came from.

When a search happens, the system searches using the small, precise child chunks (getting the benefit of accurate matching), but then, instead of handing just that tiny child chunk to the AI model, it retrieves and hands over the larger parent chunk that contains it — giving the model much richer surrounding context to actually work with when generating its answer. This gives you the best of both worlds: the precision of small-chunk search, combined with the richer context of larger passages, without having to compromise on either one.

---

## 3. Recursive Retrieval

Recursive retrieval refers to a search process that doesn't stop after just one round of searching, but instead performs multiple rounds, where each round is informed by what was learned in the previous one — searching, then searching again based on what was found, potentially several times over, digging progressively deeper.

Think about how a human researcher actually works when investigating a complicated question. They rarely find the complete answer from their very first search. More often, they do an initial search, read what comes back, notice it references something else important, then do a follow-up search specifically about that new thing, and this process might repeat several times before they've gathered everything needed to properly answer the original question.

Recursive retrieval tries to mimic this same behavior programmatically. A first search might retrieve a broad, general document or a high-level chunk. The system (or the AI model itself) then examines what was retrieved, and if needed, decides to run a follow-up, more specific search — perhaps searching for more detail on a specific term or reference that showed up in the first result, or drilling down from a high-level document into one of its more detailed sub-sections. This is particularly useful for hierarchical content, like a document that has a table of contents, chapters, and sub-sections — a recursive approach might first retrieve the most relevant chapter, and then perform a second, more focused search specifically within that chapter to find the most relevant sub-section, rather than trying to search the entire document at one single level of granularity all at once.

---

## 4. Query Transformation

This technique is based on a simple but important observation: the way a user actually types their question is often not the best possible version of that question to use for searching a vector database. Query transformation refers to a family of techniques where, before running the actual retrieval, the system first modifies, rewrites, or expands the user's original question to make the subsequent search more effective.

There are several common approaches. **Query rewriting** involves taking a vague, poorly worded, or overly casual question and rephrasing it into something clearer and more specific before searching — for example, turning "what about the refund thing" into a more complete, specific question like "what is the company's refund policy," which is likely to produce a much better embedding and better search results.

**Query expansion** involves generating several different phrasings or related versions of the same underlying question, and searching using all of them, then combining the results. This helps catch relevant documents that might use different terminology than the user's exact original wording, addressing some of the same synonym-related weaknesses we discussed with semantic search.

**Query decomposition** (breaking a complex question into simpler sub-questions) is especially important for complicated, multi-part questions. If someone asks "how did our marketing spend in Europe compare to Asia last quarter, and which region had better ROI," this is really several distinct questions bundled into one. Decomposing it into separate, simpler questions — the European marketing spend, the Asian marketing spend, and the ROI comparison — and running a separate, focused search for each one, tends to produce far more complete and accurate results than trying to search using the single, complex, bundled-up original question.

**Hypothetical Document Embeddings (HyDE)** is a clever and slightly different technique, worth knowing about — instead of directly embedding the user's question and searching with it, the system first asks the AI model to generate a hypothetical, made-up example of what a good answer might look like, and then embeds and searches using that hypothetical answer instead of the original question. This works because a hypothetical answer often has more overlap in phrasing and vocabulary with the actual real documents you're searching through than the original, often more casually-worded question does.

---

## 5. Re-ranking

Re-ranking is a technique that adds an extra quality-control step after the initial retrieval, but before handing the final results off to the AI model to generate its answer.

Here's the problem it solves: the fast similarity search techniques we discussed earlier (the ANN search, HNSW indexes, and so on) are optimized heavily for speed, since they need to search through potentially millions of vectors in milliseconds. To achieve that speed, they generally make some sacrifices in the precision of exactly how they judge similarity. This means the top results that come back from an initial fast search are usually good and relevant, but not necessarily perfectly, precisely ordered from most to least relevant.

Re-ranking addresses this by taking a two-step approach. First, the fast initial search retrieves a somewhat larger batch of candidate results than you'll actually need — say, the top 50 chunks, instead of just the top 5. Then, a second, separate, and more computationally thorough model (called a re-ranker, or sometimes a "cross-encoder") carefully examines each of those 50 candidates one at a time, directly comparing each one against the original question in a much more detailed way than the fast initial search could afford to do, and re-scores them for relevance far more accurately. Finally, only the truly best few results, according to this more careful re-scoring, actually get passed along to the AI model.

Why not just always use this more careful, more accurate method for the entire search from the start? Because it's simply too slow and computationally expensive to run against millions of documents — it's only practical to run against a much smaller shortlist of candidates. Re-ranking gives you the best of both worlds: the speed of fast initial search to narrow down from millions to dozens of candidates, combined with the higher accuracy of a slower, more careful method applied only to that much smaller, manageable shortlist.

---

## 6. Context Compression

Context compression addresses a very practical constraint we touched on earlier: every AI model has a limited context window (a maximum amount of text it can process in one request), and even within that limit, sending unnecessarily long, bloated context tends to increase cost and can sometimes actually reduce answer quality, since important details can get buried among a lot of less relevant surrounding text.

Context compression refers to techniques for shrinking down the retrieved chunks before handing them to the AI model, keeping only the parts that are actually relevant to the specific question being asked, and discarding the rest.

One common approach is **extractive compression**, where, out of a larger retrieved chunk, the system identifies and keeps only the specific sentences or passages that are directly relevant to the question, and trims away the surrounding parts that aren't. For example, if a retrieved chunk is a full paragraph but only one sentence in the middle actually answers the question, extractive compression would keep just that sentence (perhaps with a little surrounding context) rather than the entire paragraph.

Another approach is **using a smaller, faster AI model specifically to summarize** each retrieved chunk down to its most essential points before handing it off to the main, more expensive model that will generate the final answer. This trades a small amount of extra processing time and cost (running this extra summarization step) for a meaningfully smaller, more focused final context, which can reduce the cost of the main, more expensive generation step, and can sometimes improve answer quality by removing distracting, irrelevant material.

The overall goal of context compression is captured well by the phrase "signal-to-noise ratio" — you want to maximize the amount of genuinely useful, relevant information the model sees, relative to the total amount of text it has to process, rather than just handing over everything you retrieved regardless of how directly relevant each part actually is.

---

## 7. Citation Generation

We touched on citations briefly in the earlier discussion of grounding, but it's worth exploring this idea more fully here, since it's such an important part of building trustworthy, production-quality RAG systems.

Citation generation refers to the practice of having the AI model explicitly reference exactly which source document (and often which specific chunk or passage within that document) it used to support each specific piece of information in its answer — similar to how an academic paper includes footnotes or citations pointing back to its sources.

This matters for a few important reasons. It builds **user trust** — when a user can see exactly where a claim came from, and click through to verify it themselves against the original source, they're much more likely to trust and rely on the answer, compared to an answer that just states things confidently with no way to check them. It **improves accountability and error-catching** — if an AI model does make a mistake or misinterprets a source, having clear citations makes it much easier for anyone reviewing the answer to spot exactly where things went wrong, compared to an unsourced answer where a subtle error might slip by unnoticed. And it directly supports the grounding goal we discussed earlier — a model that's specifically instructed to cite its sources is naturally nudged toward actually using the retrieved material, rather than drifting off into ungrounded, made-up territory, since it has to be able to point to where each specific claim came from.

Implementing good citation generation typically involves clearly labeling each retrieved chunk with an identifiable source reference during the context assembly step (which we discussed in the earlier RAG explanation), and then explicitly instructing the AI model, as part of its prompt, to include these specific source labels alongside each claim it makes in its final answer, rather than leaving citation as an optional afterthought that the model might or might not naturally choose to include.

---

## 8. Multi-Modal RAG

Everything we've discussed so far has implicitly assumed we're working with plain text documents. But a huge amount of real-world, useful information isn't just text — it's images, charts, diagrams, tables, audio, and video. Multi-modal RAG extends the whole RAG approach to work across these different types of content, not just text.

The core challenge here is that the embedding process (converting content into that numeric vector representing its meaning) needs a way to handle non-text content too. This is where multi-modal embedding models come in — specialized models trained specifically to convert images (or other types of content) into vectors that live in the same kind of "meaning space" we discussed earlier, sometimes even in a way that lets you compare an image's vector directly against a text vector, so a text search query can successfully find a relevant image, or vice versa.

A practical example: imagine a RAG system built over a company's technical manuals, which include a mix of written instructions and diagrams. Multi-modal RAG would let a user ask a question like "show me the wiring diagram for this part," and the system could search across both the text and the embedded images to find the specific diagram that's actually relevant, rather than being limited to only searching the written text and missing the visual content entirely.

Multi-modal RAG is a genuinely more complex and technically demanding area than plain text RAG, partly because good multi-modal embedding models are less mature and more specialized than text embedding models, and partly because assembling a final, coherent context that mixes text and images together for the AI model to reason over adds real additional complexity. But it's an increasingly important area, since so much of the world's genuinely useful information is locked up in non-text formats like diagrams, screenshots, charts, and scanned documents.

---

## 9. Graph RAG

Graph RAG represents a meaningfully different approach to organizing and retrieving knowledge, compared to everything else we've discussed so far. Instead of representing your knowledge base purely as a big collection of independent text chunks with embeddings, Graph RAG represents knowledge as a "graph" — a network of specific entities (like people, places, companies, or concepts) connected to each other by specific, labeled relationships (like "works for," "located in," or "is a subsidiary of").

Why would this be useful, given everything vector search already offers? Because standard vector-based RAG is genuinely great at answering questions about a single, self-contained piece of information ("what is our refund policy"), but it can struggle with questions that require understanding how multiple, separate pieces of information relate and connect to each other across a broader body of knowledge — for example, "which of our suppliers are also connected to the vendor that was involved in that recent regulatory issue." Answering a question like this well requires actually understanding and traversing relationships between specific entities, not just finding chunks of text that happen to be similar in meaning to the question.

Graph RAG builds this network of entities and relationships (often extracted automatically from a document collection using an AI model that reads through the documents and identifies the key entities and how they're related), and then, when answering a question, it can search and "traverse" this graph structure — following relevant connections between entities — rather than relying purely on similarity search over isolated chunks. This makes Graph RAG particularly well suited to complex, relationship-heavy domains, like understanding organizational structures, tracing connections in a large investigative research project, or answering questions in a heavily interconnected knowledge domain, where genuinely understanding "how things connect" matters as much as understanding "what a specific piece of text says."

---

## 10. Agentic RAG

Agentic RAG refers to combining RAG with the broader idea of an "AI agent" — meaning an AI system that doesn't just passively receive a question and immediately generate a response, but instead can make its own decisions about what steps to take, including deciding when and how to search for information, in a more dynamic, multi-step way.

In basic RAG, the process is a fixed, predetermined pipeline: search once, retrieve chunks, hand them to the model, generate an answer, done. Agentic RAG makes this process much more flexible and dynamic. Instead of following one fixed sequence every single time, the AI model itself gets to decide, at each step, what to do next — it might decide the initial search results weren't good enough and choose to search again with a different, refined query, it might decide the question actually requires checking two completely different knowledge bases and search both, it might decide it doesn't even need to search at all because it already knows the answer confidently, or it might decide to use an entirely different tool altogether, like doing a calculation or checking a live database, alongside or instead of a document search.

This connects closely to several of the earlier advanced techniques — an agentic system might use query transformation to decide how to rephrase its search, recursive retrieval to decide whether a follow-up search is needed, and re-ranking to evaluate whether its current results are actually good enough before deciding to proceed to generating a final answer. The key distinguishing idea of "agentic" RAG is that these decisions aren't fixed in advance by the system's programmer — they're made dynamically, in real time, by the AI model itself, based on the specific situation it encounters, giving the whole system much more flexibility to handle complex, unpredictable, multi-step questions well, at the cost of being somewhat less predictable and typically slower and more expensive than a simple, fixed, single-pass RAG pipeline.

---

## 11. RAG Evaluation

With all these different techniques and moving pieces, an important practical question naturally arises: how do you actually know if your RAG system is working well? RAG evaluation refers to the methods and metrics used to systematically measure the quality of a RAG system, rather than just informally trying a few questions and eyeballing whether the answers seem reasonable.

Good RAG evaluation generally looks at quality from a few distinct angles, because a RAG system has several different components that can each fail in their own particular way. **Retrieval quality** asks: did the system actually find the right, relevant chunks of information in the first place? If the retrieval step fails to find the genuinely relevant document, it doesn't matter how good the AI model is at generating text — it simply won't have the right information to work with. This is often measured using metrics that check whether the correct, known-relevant documents show up in the retrieved results, and how highly they're ranked.

**Faithfulness** (also sometimes called groundedness) asks: does the final generated answer actually, accurately reflect what the retrieved source material said, without adding in unsupported claims or distorting the source content? This directly measures how well the system is avoiding hallucination — an unfaithful answer might sound fluent and confident, but it may not actually align with the source material it was supposed to be grounded in.

**Answer relevance** asks a related but distinct question: does the generated answer actually address what the user asked, even if it's perfectly faithful to the retrieved sources? It's possible for an answer to be completely accurate relative to its sources, and yet still fail to actually address the specific question the user asked, perhaps because the retrieval step brought back subtly wrong information, or because the model wandered off-topic while generating its response.

In practice, teams evaluate these dimensions in a few common ways. **Human evaluation** involves people manually reviewing a sample of the system's answers and rating them, which tends to be the most reliable and trustworthy method, but is slow and expensive to do at scale. **Using another, separate AI model as a judge** has become an increasingly popular approach, where a capable language model is given the question, the retrieved context, and the generated answer, and asked to score things like faithfulness and relevance according to a clear set of criteria — this scales much better than pure human evaluation, though it's generally considered somewhat less reliable than careful human judgment. And **automated benchmark datasets**, made up of predefined questions with known correct answers and known relevant source documents, allow for consistent, repeatable testing as you make changes to your system over time, helping you clearly see whether a specific change (like switching to a different embedding model, or adding re-ranking) actually improved things or made them worse, rather than relying on a vague, subjective sense of "it feels better now."

Ultimately, RAG evaluation matters because a RAG system has many moving, interacting parts — chunking strategy, embedding model choice, retrieval method, re-ranking, prompt design — and without systematic evaluation, it's genuinely difficult to know which specific piece is working well, which piece is causing problems, and whether a change you're considering will actually make the overall system better or worse.
