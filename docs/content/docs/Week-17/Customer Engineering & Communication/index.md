---
title: "Customer Engineering & Communication"
description: "AI Platform Engineering Handbook - Week 17 - Customer Engineering & Communication"
weight: 164
toc: true
---

---

# Customer Engineering & Communication

## The Big Picture First

This is the final piece of the entire course, and it's worth pausing on why it comes last. Everything covered across the previous sixteen weeks, including the technical depth, the discovery process, the rapid prototyping, and the production deployment, only delivers real value if it can be understood, trusted, and sustained by the real humans on the customer's side.

A forward deployed engineer might build a brilliant technical solution, but be unable to explain it clearly, document it well, or build real trust with the people who will rely on it. In that case, the brilliant work risks never being properly understood, adopted, or maintained once the engineer is no longer directly there. This final explanation is about that essential, often underestimated other half of the job.

---

## 1. Technical Communication

Technical communication is the distinctive skill of explaining technical concepts clearly to people with very different levels of technical background. It connects back to essentially every explanation in this course, since much of what makes something well explained comes down to calibrating the level of detail and the vocabulary to match who is listening.

Here is the skill worth understanding clearly. The same technical concept, such as how a RAG system works (connecting back to our earlier RAG explanations), needs to be explained differently depending on who you're talking to:

- An engineer on the customer's team might want precise detail about chunking strategies and embedding models.
- A business stakeholder might only need to understand that the system searches through their documents to find relevant answers, and roughly how accurate that process tends to be.

A skilled forward deployed engineer learns to read their audience and adjust the explanation accordingly, without watering down the substance of what is being communicated.

A related skill is using analogies and concrete examples well, rather than relying on abstract technical terminology. This connects back to the metaphor-based explanations that have run throughout this course, such as the phone-and-apps analogy for MCP and the library-and-filing-cabinet analogy for RAG. Good technical communication connects a new, unfamiliar idea to something the listener already understands well, rather than presenting an unfamiliar concept in equally unfamiliar, technical vocabulary.

---

## 2. Explaining AI Systems to Customers

We touched on technical communication generally above. Explaining AI systems to customers is a particular version of this skill, and it carries added complexity because AI systems behave differently from the traditional, deterministic software a customer may already be familiar with.

Here is the particular challenge. Connecting back to the AI UX principles from the Week 16 product development material, customers often reasonably expect software to behave with the same predictable, deterministic reliability that traditional software has trained them to expect. Explaining an AI system well means honestly helping the customer understand that this system works differently:

- It can sometimes make mistakes.
- Its behavior can shift somewhat based on subtle differences in wording.
- "Accuracy" isn't a simple, binary, always-or-never property, the way a traditional software feature's correctness typically is.

A skilled forward deployed engineer explains these AI-specific realities honestly and clearly. They avoid overselling the system's capabilities, which risks later disappointment. They also avoid underselling it out of excessive caution, which risks the customer never adopting a useful solution at all. This connects back to the safety and guardrails material from Week 10 and the alignment material from Week 14. It involves helping a customer understand concepts like groundedness and confidence in plain, accessible terms, so they can form realistic expectations about how the system will behave once it is deployed for real use.

---

## 3. Architecture Presentations

Architecture presentations are the practical skill of presenting a proposed or actual technical solution's structure and design to a customer audience. They connect back to the solution architecture concepts from the first Week 17 explanation.

A good architecture presentation works in layers, moving from high-level to increasing detail, rather than diving straight into the deepest technical details. It typically:

1. Opens with the business problem being solved (connecting back to the understanding business problems concepts from the first Week 17 explanation).
2. Moves to a high-level overview of the overall approach.
3. Only then descends into the specific technical components, such as the RAG pipeline, the agent architecture, and the integration points, for whichever part of the audience wants or needs that level of detail.

An important practical skill is using clear, simple visual diagrams, instead of dense technical text or complicated, overly detailed diagrams that a non-technical stakeholder would struggle to follow. A well-designed architecture diagram for a customer presentation deliberately simplifies and leaves out lower-level technical details that don't matter for the audience in the room, while still representing the real system accurately and honestly.

---

## 4. Technical Documentation

We touched on documentation agents as an application category in the Week 16 enterprise applications material. Technical documentation, here, means writing the human-created documentation that describes a deployed solution: how it works, how to use it, and how to maintain it. It connects back to the deployment and production support material from the previous explanation.

Good technical documentation in this customer-facing context needs to serve several audiences at once:

- **The customer's technical team,** helping them maintain and troubleshoot the solution themselves (connecting back to the troubleshooting customer environments concepts from the previous explanation).
- **The customer's end users,** helping them use the solution effectively (connecting back to the AI UX principles from Week 16).
- **Future engineers,** from your own company or the customer's team, who will need to work with or modify the solution well after the original forward deployed engineer has moved on to other projects.

An important habit is keeping documentation up to date as a solution evolves, connecting back to the purpose behind the documentation agents discussed in Week 16. Documentation that drifts out of sync with a system's actual behavior can become actively harmful, not merely unhelpful, because readers trust it to reflect the system's current behavior and act on that potentially outdated trust.

---

## 5. Architecture Decision Records

An Architecture Decision Record, often shortened to ADR, is a specific kind of technical document. It is a brief, focused written record that captures one significant technical decision, why it was made, and which alternatives were considered and rejected along the way.

Here is why this practice matters so much in a customer-facing forward deployed engineering context. Connecting back to the technical scoping and system constraints and tradeoffs concepts from the first Week 17 explanation, a real project involves a great many significant technical decisions. Examples include choosing a particular vector database, choosing a chunking strategy, and choosing whether to use an agent-based approach or a simpler, more direct one. Without a written record of why these decisions were made, that valuable context tends to fade over time. An engineer working on the system much later might waste considerable effort reconsidering a decision that was already carefully thought through. They might also accidentally undo a deliberate choice, simply because they never knew why it was made.

A good ADR is kept short and focused. It typically describes:

- The problem being addressed.
- The options that were considered.
- The decision that was made.
- The reasoning behind it.

Building a habit of writing these records consistently throughout a project creates valuable, lasting institutional memory. This connects back to the model cards concept from the Week 12 governance material. ADRs serve a similar underlying purpose, applied to architectural decisions rather than to a trained model's properties.

---

## 6. Writing Implementation Guides

Implementation guides are the practical documentation that walks a reader through setting up, configuring, or extending a deployed solution, step by step. They connect back to the step-by-step walkthrough format used in many parts of this course.

A good implementation guide in this customer-facing context needs to be more careful and more explicit than internal documentation intended for your own company's team. Connecting back to the data and integration discovery concepts from the first Week 17 explanation, the customer's team often has much less context about a solution's design than the forward deployed engineer who built it. A good guide explains not just what steps to take, but why each step matters, so the reader can troubleshoot sensibly if something doesn't go exactly as the guide describes.

An important habit is testing your own implementation guide, ideally by having someone unfamiliar with the solution try to follow it. This connects back to the prompt testing philosophy from the Week 6 prompt engineering material. A guide that only makes sense to someone who already understands the underlying system isn't serving its purpose, since the point of an implementation guide is to help someone who doesn't yet have that understanding.

---

## 7. Managing Technical Trade-offs

We covered system constraints and tradeoffs in the first Week 17 explanation. Managing technical tradeoffs, here, means the ongoing, practical communication work of helping a customer make good, informed decisions about those tradeoffs throughout the entire life of a project, not only at the start.

Here is why this ongoing work matters. Technical tradeoffs keep coming up well beyond the initial scoping phase. A new requirement might emerge partway through a project that requires trading off speed against accuracy. A cost constraint might shift, requiring a reconsideration of an earlier technical decision. A skilled forward deployed engineer keeps surfacing these tradeoffs clearly to the customer as they arise. They don't quietly make the decisions unilaterally on the customer's behalf, without the customer's informed awareness or input.

This connects back to a principle that has run through this whole course: present the real options and their real consequences clearly and honestly, and let the person who owns the decision make it with full information.

---

## 8. Stakeholder Communication

Stakeholder communication is the broader, practical skill of managing communication across the whole range of people who have a stake in a project's outcome. It connects back to essentially every customer-facing skill discussed throughout this final week of material.

A real customer project typically involves several kinds of stakeholders, each needing a different kind of communication:

- **Executive sponsors** typically need high-level, business-outcome-focused communication, connecting back to the understanding business problems and measuring solution impact concepts from this final week. They care primarily about whether the project is delivering business value, not deep technical detail.
- **Technical stakeholders** on the customer's team typically need considerably more technical detail, connecting back to the technical documentation and architecture presentation concepts in this explanation.
- **End users** typically need practical, usage-focused communication, connecting back to the AI UX principles from Week 16.

A skilled forward deployed engineer tailors communication appropriately for each audience, while keeping the underlying substance of what is being communicated consistent. This connects back to the fairness and evenhandedness principles from the Week 12 governance material.

---

## 9. Customer Feedback

We covered customer feedback loops in the previous explanation, in the context of iterative, hands-on prototyping work. Customer feedback, here, means the broader, ongoing discipline of collecting and thoughtfully acting on feedback throughout a project's lifetime. It connects back to the AI analytics and user feedback loops concepts from Week 16, now viewed through a more relationship-oriented, customer-facing lens.

An important practical skill is creating safe space for a customer to share honest, even critical, feedback. A customer who feels their concerns will be dismissed or defensively rejected will naturally stop sharing them. A skilled forward deployed engineer welcomes critical feedback openly, and demonstrates through concrete, subsequent action that this feedback leads to real improvement.

---

## 10. Iterative Solution Improvement

We covered iterative development in the previous explanation, in the context of early, hands-on prototyping. Iterative solution improvement applies that same philosophy to a solution that is already deployed and live in a customer's production environment. It connects back to the iterative improvement themes from the Week 16 product development material.

A well-managed, ongoing customer relationship treats a deployed solution as something still evolving, not a fixed, finished thing that was "done" the moment it went live. Connecting back to the AI analytics concepts from Week 16, a skilled forward deployed engineer keeps watching how the solution performs once it's live. They keep bringing concrete improvement proposals back to the customer over time. This connects back to the RAG evaluation and failure analysis concepts from the Week 7 advanced RAG material.

This ongoing practice directly strengthens the customer relationship, connecting to the building long-term customer trust topic covered last. A customer who sees a forward deployed engineer continuing to care about and improve their solution well beyond the initial launch develops deeper trust and confidence in the relationship. That is very different from a situation where the engineer quietly disappears the moment the initial project is considered technically complete.

---

## 11. Measuring Solution Impact

We covered AI analytics in Week 16, in the context of a general product. Measuring solution impact, here, means quantifying whether a deployed solution is delivering real value for a specific customer. It connects directly back to the understanding business problems concepts from the first Week 17 explanation.

Here is why this practice matters so much in this customer-facing context. Connecting back to the discovery process from the first Week 17 explanation, a project began with a specific business problem, and a specific definition of what success would look like. Measuring solution impact means honestly going back and checking whether that original goal was achieved. It quantifies concrete outcomes like reduced support response times, reduced manual processing effort, or increased customer satisfaction. This connects back to the business impact metrics concepts from Week 16.

This practice serves a few important purposes at once:

- **Accountability.** Connecting back to the AI governance concepts from Week 12, it confirms honestly whether a considerable investment of time and resources paid off as intended.
- **Evidence for further investment.** A customer who can see clear, measured evidence that a first AI project delivered real value is much more likely to trust and fund further AI initiatives, compared with a customer who is simply asked to take it on faith that a deployed solution was worthwhile.

---

## 12. Building Long-Term Customer Trust

To close out this final explanation, and this entire seventeen-week course: building long-term customer trust is the cumulative, ongoing outcome of doing every other thing covered in this final Week 17 material well and consistently, over an extended period of time.

Here is the closing reasoning worth sitting with. Trust in a real customer relationship isn't built through any single, impressive action. It is built cumulatively, through a consistent pattern of:

- **Honest communication** (connecting back to technical communication, discussed at the start of this explanation).
- **Reliable execution** (connecting back to production readiness and reliability, discussed in the previous explanation).
- **Honest handling of problems when they occur** (connecting back to incident resolution, discussed in the previous explanation).
- **Ongoing care for the customer's success,** well beyond the initial sale or project delivery (connecting back to iterative solution improvement, discussed above).

One final point is worth being honest about. Trust takes a long time to build, but it can be lost quickly, through even a single instance of dishonest communication or unreliable execution. This is why every practice covered in this final week matters so much: honest technical communication, careful documentation, transparent tradeoff discussions, and genuine responsiveness to feedback. They are not merely "soft skills" that exist separately from the real technical work in the rest of this course. They are the essential connecting tissue that determines whether all of that technical work across these seventeen weeks translates into a real, lasting, trusted relationship. That relationship is, fittingly, the most valuable and durable thing a skilled forward deployed engineer can build over the course of a career.
