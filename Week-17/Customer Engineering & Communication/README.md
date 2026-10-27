# Customer Engineering & Communication

## The Big Picture First

This is the final piece of the entire course, and it's worth pausing on why it comes last. Everything covered across the previous sixteen weeks — the technical depth, the discovery process, the rapid prototyping, the production deployment — only delivers real value if it can be understood, trusted, and sustained by the real humans on the customer's side. A forward deployed engineer who builds a brilliant technical solution, but who can't explain it clearly, can't document it well, and can't build real trust with the people who'll be relying on it, risks that brilliant work never being properly understood, properly adopted, or properly maintained once they're no longer directly there. This final explanation is about that essential, often underestimated other half of the job.

---

## 1. Technical Communication

Technical communication refers to the distinctive skill of explaining technical concepts clearly to people with very different levels of technical background — connecting back to essentially every explanation in this course, since a huge amount of what makes something well-explained comes down to calibrating the level of detail and the specific vocabulary used to match who's listening.

Here's the skill worth understanding clearly. The exact same technical concept — say, how a RAG system works, connecting back to our earlier RAG explanations — needs to be explained in meaningfully different ways depending on who you're talking to. An engineer on the customer's team might want precise detail about chunking strategies and embedding models. A business stakeholder might instead just need to understand that the system searches through their documents to find relevant answers, and roughly how accurate that process tends to be. A skilled forward deployed engineer learns to read their audience and adjust their explanation accordingly, without ever dumbing down the substance of what's being communicated.

An important, related skill involves using analogies and concrete examples well, rather than relying purely on abstract technical terminology — connecting back to the metaphor-based explanations that have run throughout this course (the phone-and-apps analogy for MCP, the library-and-filing-cabinet analogy for RAG). Good technical communication finds ways to connect a new, unfamiliar technical idea to something the listener already understands well, rather than simply presenting an unfamiliar concept using an equally unfamiliar, equally technical vocabulary.

---

## 2. Explaining AI Systems to Customers

We've already touched on technical communication generally, right above. Explaining AI systems to customers specifically refers to a particular version of this same broader skill — one that carries some additional complexity, precisely because AI systems behave in ways that are meaningfully different from the traditional, deterministic software a customer might already be familiar with.

Here's the particular challenge worth understanding clearly. Connecting back to the AI UX principles we covered in Week 16's product development material, a customer often reasonably comes in expecting software to behave with the same predictable, deterministic reliability that traditional software has trained them to expect. Explaining an AI system well means honestly helping the customer understand that this particular system works differently — that it can sometimes make mistakes, that its behavior can shift somewhat based on subtle differences in wording, and that "accuracy" isn't a simple, binary, always-or-never property the way a traditional software feature's correctness typically is.

A skilled forward deployed engineer learns to explain these AI-specific realities honestly and clearly, without either overselling the system's capabilities (which risks real, later disappointment) or underselling them out of excessive caution (which risks the customer never adopting a genuinely useful solution at all). This connects back to the safety and guardrails material from Week 10 and the alignment material from Week 14 — helping a customer understand concepts like groundedness and confidence, in plain, accessible terms, so they can form realistic, accurate expectations about exactly how the system will behave once it's deployed for their real use.

---

## 3. Architecture Presentations

Architecture presentations refer to the specific, practical skill of presenting a proposed or actual technical solution's structure and design to a customer audience — connecting back to the solution architecture concepts we covered in the first Week 17 explanation.

A good architecture presentation works in layers, moving from the high-level down toward increasing detail, rather than immediately diving into the deepest, most technical details right from the start. It typically opens with the business problem being solved (connecting back to the understanding business problems concepts from the first Week 17 explanation), then moves to a high-level overview of the overall approach, and only then descends into the specific technical components — the RAG pipeline, the agent architecture, the integration points — for whichever portion of the audience actually wants or needs that level of technical detail.

An important, practical skill here involves using clear, simple visual diagrams, rather than relying purely on dense technical text or complicated, overly detailed diagrams that a non-technical stakeholder would struggle to follow. A well-designed architecture diagram, specifically built for a customer presentation, deliberately simplifies and omits certain lower-level technical details that don't matter for the particular audience in the room, while still honestly representing the real, underlying system accurately.

---

## 4. Technical Documentation

We touched on documentation agents as an application category in Week 16's enterprise applications material. Technical documentation, here, specifically refers to writing the real, human-created documentation that describes a deployed solution — how it works, how to use it, and how to maintain it — connecting back to the broader deployment and production support material from the previous explanation.

Good technical documentation, in this customer-facing context, needs to serve several different audiences at once. It needs to help the customer's technical team understand how to maintain and troubleshoot the solution themselves, connecting back to the troubleshooting customer environments concepts from the previous explanation. It needs to help the customer's end users understand how to use the solution effectively, connecting back to the AI UX principles from Week 16. And it needs to serve as a reliable reference for future engineers — whether from your own company or from the customer's own team — who'll need to work with or modify the solution, well after the original forward deployed engineer has moved on to other projects.

An important, practical habit here involves keeping documentation up to date as a solution evolves — connecting back to the purpose behind the documentation agents we discussed in Week 16. Documentation that's allowed to drift out of sync with a system's actual behavior can become actively harmful, rather than merely unhelpful, since a reader trusts it to accurately reflect the system's real, current behavior, and acts on that potentially outdated trust.

---

## 5. Architecture Decision Records

An Architecture Decision Record, often shortened to ADR, is a specific kind of technical document — a brief, focused written record capturing one significant technical decision, exactly why it was made, and what alternatives were considered and ultimately rejected along the way.

Here's the reasoning behind why this practice matters so much, specifically in a customer-facing forward deployed engineering context. Connecting back to the technical scoping and system constraints and tradeoffs concepts from the first Week 17 explanation, a real project involves making a great many significant technical decisions along the way — choosing a particular vector database, choosing a particular chunking strategy, choosing whether to use an agent-based approach or a simpler, more direct approach instead. Without a clear, written record of exactly why these decisions were made, that valuable context tends to fade and get lost over time — meaning an engineer working on the system much later might waste considerable effort reconsidering a decision that was already carefully thought through and deliberately settled much earlier, or might accidentally undo a deliberate choice, simply because they never knew why it had been made in the first place.

A good ADR is kept fairly short and focused — typically describing the particular problem being addressed, the options that were considered, the decision that was made, and the reasoning behind it. Building a habit of writing these records consistently throughout a project's lifetime creates genuinely valuable, lasting institutional memory — connecting back to the model cards concept we covered in Week 12's governance material; ADRs serve a fairly similar underlying purpose, just applied to architectural decisions rather than to a trained model's specific properties.

---

## 6. Writing Implementation Guides

Implementation guides refer to the specific, practical documentation that walks a reader through setting up, configuring, or extending a deployed solution, step by step — connecting back to the step-by-step walkthrough format used throughout many parts of this course.

A good implementation guide, in this customer-facing context, needs to be considerably more careful and considerably more explicit than internal documentation intended purely for your own company's team. Connecting back to the data and integration discovery concepts from the first Week 17 explanation, the customer's team often has meaningfully less context about a solution's underlying design than the forward deployed engineer who built it — meaning a good implementation guide needs to explain not just what steps to take, but why each step matters, so the reader can troubleshoot sensibly if something doesn't go exactly as the guide describes.

An important, practical habit here involves testing your own implementation guide yourself, ideally by having someone unfamiliar with the solution try to follow it — connecting back to the prompt testing philosophy from Week 6's prompt engineering material. A well-written guide that only makes sense to the person who already understands the underlying system well isn't serving its intended purpose at all, since the entire point of an implementation guide is specifically to help someone who doesn't yet have that same deep, underlying understanding.

---

## 7. Managing Technical Trade-offs

We covered system constraints and tradeoffs in the first Week 17 explanation. Managing technical tradeoffs, here, specifically refers to the ongoing, practical communication work of helping a customer make good, informed decisions about those tradeoffs throughout the entire lifetime of a project, rather than only once, right at the start.

Here's the reasoning behind why this ongoing work matters so much. Real technical tradeoffs continue to come up throughout a project's entire lifetime, well beyond the initial scoping phase — a new requirement might emerge partway through a project that requires trading off speed against accuracy; a cost constraint might shift, requiring a reconsideration of some earlier, already-made technical decision. A skilled forward deployed engineer keeps surfacing these tradeoffs clearly to the customer as they arise, rather than quietly making those decisions entirely unilaterally on the customer's behalf, without their informed awareness or input.

This ongoing work connects back to a principle that's run through this whole course: present the real options and their real consequences clearly and honestly, and let the person who owns the decision make it with full information — rather than simply making the decision unilaterally on someone else's behalf, without their informed understanding of exactly what's being traded off, and why.

---

## 8. Stakeholder Communication

Stakeholder communication refers to the broader, practical skill of managing communication across the whole range of different people who have a real stake in a project's outcome — connecting back to essentially every customer-facing skill we've discussed throughout this final week of material.

A real customer project typically involves several different kinds of stakeholders, each needing a meaningfully different kind of communication. **Executive sponsors** typically need high-level, business-outcome-focused communication — connecting back to the understanding business problems and measuring solution impact concepts we've discussed throughout this final week — caring primarily about whether a project is delivering real business value, rather than needing deep technical detail. **Technical stakeholders** on the customer's team typically need considerably more technical detail, connecting back to the technical documentation and architecture presentation concepts we've discussed throughout this same explanation. **End users** typically need practical, usage-focused communication, connecting back to the AI UX principles from Week 16.

A skilled forward deployed engineer learns to tailor their communication appropriately for each different audience, while still maintaining consistency in the underlying substance of what's being communicated — connecting back to the fairness and evenhandedness principles we covered in Week 12's governance material.

---

## 9. Customer Feedback

We covered customer feedback loops in the previous explanation, specifically in the context of iterative, hands-on prototyping work. Customer feedback, here, refers to the broader, ongoing discipline of collecting and thoughtfully acting on feedback throughout a project's lifetime — connecting back to the AI analytics and user feedback loops concepts from Week 16, but now viewed through this distinctly relationship-oriented, customer-facing lens.

An important, practical skill here involves creating real, safe space for a customer to share honest, even critical feedback. A customer who feels that their honest concerns will be dismissed or defensively rejected will, quite naturally and quite reasonably, stop sharing them at all — meaning a skilled forward deployed engineer needs to welcome critical feedback openly, and demonstrate, through real, concrete, subsequent action, that this feedback genuinely leads to real, meaningful improvement.

---

## 10. Iterative Solution Improvement

We covered iterative development in the previous explanation, specifically in the context of early, hands-on prototyping work. Iterative solution improvement, here, refers to applying that same philosophy to a solution that's already deployed and already live in a customer's real production environment — connecting back to the iterative improvement themes from Week 16's product development material.

A well-managed, ongoing customer relationship treats a deployed solution as something still evolving, rather than as some fixed, finished thing that was completely "done" the moment it first went live. Connecting back to the AI analytics concepts from Week 16, a skilled forward deployed engineer continues watching how a solution performs once it's live, and continues bringing concrete improvement proposals back to the customer over time — connecting back to the RAG evaluation and failure analysis concepts we covered in Week 7's advanced RAG material.

This ongoing practice directly strengthens the customer relationship, connecting back to the building long-term customer trust topic we'll cover last, right below — a customer who sees a forward deployed engineer continuing to actively care about and improve their solution, well beyond the initial launch, naturally develops considerably deeper trust and confidence in the ongoing relationship, compared to one where an engineer quietly disappears the moment the initial project was first considered technically complete.

---

## 11. Measuring Solution Impact

We covered AI analytics in Week 16, specifically in the context of a general product. Measuring solution impact, here, refers to quantifying whether a deployed solution is actually delivering real value for a specific customer — connecting quite directly back to the understanding business problems concepts from the first Week 17 explanation.

Here's the reasoning behind why this practice matters so much in this customer-facing context. Connecting back to the entire discovery process from the first Week 17 explanation, a project originally began with some specific, concrete business problem, and some specific, concrete definition of what success would look like. Measuring solution impact means honestly going back and checking whether that original goal was achieved — quantifying concrete outcomes like reduced support response times, reduced manual processing effort, or increased customer satisfaction, connecting back to the business impact metrics concepts from Week 16.

This practice serves a few distinct, important purposes at once. It provides real, honest accountability — connecting back to the AI governance concepts we covered in Week 12 — genuinely confirming whether a considerable investment of time and resources actually paid off as originally intended. And it provides the concrete evidence needed to build a case for further investment — a customer who can see clear, concrete, measured evidence that a first AI project delivered real value is considerably more likely to trust and fund further AI initiatives, compared to a customer who's simply being asked to take it on faith alone that a deployed solution was worthwhile.

---

## 12. Building Long-Term Customer Trust

To close out this final explanation, and really this entire seventeen-week course as a complete whole: building long-term customer trust refers to the cumulative, ongoing outcome of doing every other thing covered throughout this final Week 17 material well and consistently, over a considerable, extended period of time.

Here's the important, closing reasoning worth sitting with clearly, here at the end of this course. Trust, in a real customer relationship, isn't something that gets built through any single, individual, impressive action — it's built cumulatively, through a consistent pattern of honest communication (connecting back to technical communication, discussed at the very start of this explanation), reliable execution (connecting back to production readiness and reliability, discussed in the previous explanation), honest handling of problems when they occur (connecting back to incident resolution, discussed in the previous explanation), and genuine, ongoing care for the customer's real success, well beyond the initial sale or the initial project delivery (connecting back to iterative solution improvement, discussed right above).

An important, final point worth being honest about here: trust takes a considerable amount of time to build, but it can be lost quite quickly, through even a single instance of dishonest communication or unreliable execution. This is precisely why every practice covered throughout this final Week 17 material — honest technical communication, careful documentation, transparent tradeoff discussions, genuine responsiveness to feedback — matters so much. They're not merely "soft skills" existing somehow separately from the real technical work covered throughout the rest of this course; they're the essential connecting tissue that determines whether all of that impressive technical work across these seventeen weeks actually translates into a real, lasting, trusted relationship — which is, quite fittingly, the single most valuable, durable thing a skilled forward deployed engineer can build over the entire course of their career.
