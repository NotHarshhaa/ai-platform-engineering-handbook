---
title: "Customer Problem Discovery & Technical Scoping"
description: "AI Platform Engineering Handbook - Week 17 - Customer Problem Discovery & Technical Scoping"
weight: 161
toc: true
---

---

# Customer Problem Discovery & Technical Scoping

## The Big Picture First

This course has spent sixteen weeks building up deep technical skill: how models work, how to build RAG systems and agents, and how to secure, scale, and fine-tune AI systems. This final week shifts to something different, and something many technically skilled engineers underestimate. It is the work of figuring out what to build in the first place, for a real customer, with real constraints, real existing systems, and real business needs that don't always look like a clean, well-defined technical spec.

Forward deployed engineering is a distinctive role that has emerged around AI products. It exists because AI systems are so deeply shaped by the specific data, workflows, and constraints of whoever is going to use them. That means a huge amount of the real work happens before any code gets written at all. Let's build up an understanding of what this involves.

---

## 1. Forward Deployed Engineering Fundamentals

Forward deployed engineering is a distinctive engineering role. Instead of sitting inside your own company building a general-purpose product for a broad, anonymous market, you are embedded directly with individual customers. You help them successfully deploy and adapt a technology to their own particular, real situation.

The name is worth unpacking, since it comes from a military term. Being "forward deployed" originally meant being stationed at the front lines, rather than back at a distant, central headquarters. Applied to engineering, it captures the core idea well. A traditional engineer builds a product in relative isolation and hands it off to a separate sales or support team. A forward deployed engineer is out there directly with the customer, understanding their problems firsthand, and helping build the specific solution that fits their situation.

This role has become especially important in AI engineering, for a specific reason. Recall from throughout this course how much a good AI system depends on its specific context: its RAG knowledge base, its tool integrations, and its fine-tuning data are all deeply specific to whoever will use it. A generic, one-size-fits-all AI product often can't deliver real value without careful adaptation to the customer's actual situation. Forward deployed engineering exists to do that adaptation work well, directly and hands-on, with the real customer.

---

## 2. Customer Discovery

Customer discovery is the process of understanding a customer well before you start building anything. That means understanding not just what they say they want, but what they actually need, and why.

Here is why this distinction matters. A customer will often come to you with a specific request already formed, such as "we want a chatbot," or "we want an AI that can summarize documents." But a skilled forward deployed engineer knows that this stated request is often the customer's best attempt at describing a deeper, underlying problem, using whatever vocabulary and mental model they have available. The real problem might be "our support team is overwhelmed and can't keep up with ticket volume." "A chatbot" is simply the solution shape the customer thought of first, and it isn't necessarily the best possible solution.

Good customer discovery involves asking a lot of open-ended questions and listening carefully to the answers. It reflects the same dig-deeper-before-you-build instinct that has run through this whole course. A skilled discovery process doesn't jump straight to proposing a technical solution the moment a customer describes their problem. Instead, it digs deeper before committing to any technical approach:

- Why does the problem matter?
- What has already been tried?
- What would success concretely look like from the customer's perspective?

---

## 3. Understanding Business Problems

We touched on the general idea of an underlying problem in the customer discovery section above. Understanding business problems means digging into the broader business context around a customer's stated technical request. It means understanding why the problem matters to that business, and what real consequences it has.

A skilled forward deployed engineer learns to ask business-oriented questions, not only narrowly technical ones:

- What is this problem costing the business right now, in concrete terms? That might be lost revenue, wasted employee time, or unhappy customers.
- Who experiences this problem most directly, and what does their day-to-day work look like?
- What would change for the business if this problem were properly solved?

These questions matter enormously, because the answers shape what an appropriate technical solution should look like. A problem costing a business a small amount of money warrants a more modest investment than a business-critical problem that threatens the company's survival.

This understanding also connects directly back to the product requirements concepts from the Week 16 AI product development material. A well-understood business problem translates naturally into clearer, more concrete quality thresholds and acceptable failure modes, because you know what real consequences a system's mistakes would have in the business context it will operate within.

---

## 4. Requirements Gathering

Requirements gathering is the systematic, careful process of taking everything learned through customer discovery and through understanding the business problem, and turning it into a clear, concrete, actionable set of requirements. It connects directly back to the product requirements concepts from Week 16, but here it is done together with a real, external customer, rather than purely internally within your own company.

An important skill is distinguishing between what a customer says they want and what they actually need, connecting back to the customer discovery discussion above. A customer might ask for "real-time responses," when what they actually need is "responses fast enough that our support agents don't feel like they're waiting." That is a meaningfully different requirement, and often a considerably easier and cheaper one to satisfy. Good requirements gathering carefully separates a customer's underlying needs from the specific solution they happened to have in mind when they first described the need.

Good requirements gathering also involves prioritizing. Real customer requirements almost always exceed what can realistically be delivered within a reasonable timeframe and budget. A skilled forward deployed engineer helps the customer distinguish between what is truly essential and what is merely nice to have. They do this instead of trying to promise everything the customer asks for, all at once.

---

## 5. Technical Scoping

Technical scoping is defining the concrete boundaries of a project: exactly what will be built, and, importantly, exactly what won't be. It has to account for the real constraints of time, budget, and technical feasibility that any real project operates within.

Here is why scoping matters so much, and why it is a distinct skill worth developing deliberately. Without clear, deliberate scoping, a project risks "scope creep." This is where a project's boundaries gradually expand, bit by bit, as a customer reasonably keeps asking for "just one more thing." Eventually the project becomes larger, more expensive, and more complicated than anything originally agreed upon. A well-scoped project has clear, explicit boundaries, agreed upon by both the customer and the engineering team. They define what success looks like, and what falls outside the project's boundaries.

Good technical scoping also involves carefully sequencing work, connecting back to the AI product lifecycle concept from Week 16. Instead of attempting to build an entire, fully featured solution all at once, a skilled forward deployed engineer often proposes a staged approach:

1. Deliver a smaller, genuinely useful initial version first.
2. Learn from real usage.
3. Expand from that solid, working foundation.

This avoids risking a considerable amount of time and resources on a large, unproven, all-at-once approach.

---

## 6. Translating Business Requirements into Technical Solutions

This topic is one of the most important skills in the entire forward deployed engineering role. It means taking the business-level understanding built up through customer discovery and converting it into the concrete technical decisions and architecture discussed throughout the rest of this course.

Here is a concrete way to understand what this translation looks like. Suppose the business requirement is "we need our support team to be able to answer customer questions faster, using our internal documentation." This translates into a series of specific technical decisions, connecting back to the RAG material from Weeks 6 and 7:

- What chunking strategy makes sense for this particular documentation?
- What metadata fields need to be captured and indexed?
- Is hybrid search needed, given the nature of the content?
- What evaluation approach will verify the resulting system works well enough before it is deployed to real users?

A skilled forward deployed engineer needs fluency in both directions of this translation. They must be able to understand a business problem in the customer's own terms, and translate that understanding into the technical decisions covered throughout this course. They must also be able to translate technical constraints and tradeoffs back into business terms that a non-technical customer stakeholder can understand and make an informed decision about.

---

## 7. System Constraints & Trade-offs

System constraints and tradeoffs means understanding and navigating the practical limitations that any real-world technical solution has to work within. It connects back to the infrastructure, cost, and latency material covered throughout this course.

Real customer projects almost always involve balancing several competing concerns:

- **Cost constraints.** A customer typically has a real budget they are willing and able to spend, connecting back to the cost optimization material from this course.
- **Timeline constraints.** A customer often has a real deadline, which shapes how ambitious a proposed solution can realistically be.
- **Existing infrastructure constraints.** A customer's existing systems (connecting back to the data and integration discovery topic covered next) shape and limit which technical approaches are viable at all.

A skilled forward deployed engineer needs to help a customer understand these tradeoffs honestly. They don't simply promise the customer everything they might initially want. They present the real tradeoffs involved, such as "we can build this faster, but it will cost more," or "we can make this considerably cheaper, but response quality will be somewhat lower." Then they let the customer make an informed decision with accurate information, rather than discovering these tradeoffs much later, after the project is well underway.

---

## 8. Data & Integration Discovery

Data and integration discovery is the practical process of understanding exactly what data a customer already has available, and exactly what existing systems a new AI solution will need to connect with. It connects back to the API integration material from Week 2 and the MCP material from Week 9.

This discovery work matters enormously, because a large portion of real AI project risk lives here:

- A customer might describe their documentation as "well organized." Careful, hands-on investigation might reveal that it is scattered across several disconnected systems, in inconsistent formats, with significant gaps and outdated sections.
- A customer might describe their existing systems as "easy to integrate with." Careful technical investigation might reveal significant authentication complexity, rate limits, or data-quality problems that weren't apparent from the customer's high-level description.

Good data and integration discovery involves directly examining a customer's actual data and actual systems yourself, rather than relying entirely on the customer's verbal description. This connects back to the data preparation and cleaning skills from Week 2. This hands-on verification often reveals surprises that meaningfully reshape a project's scope and technical approach. That is why it is such a critical, and often underappreciated, early step in the forward deployed engineering process.

---

## 9. Solution Architecture

Solution architecture is designing the overall, complete technical approach that will address a customer's business problem. It connects back to essentially every major technical topic in this course, now deliberately combined into one coherent, working solution tailored to this particular customer's situation.

A well-designed solution architecture draws on the whole toolbox built up in this course:

- Deciding whether the solution needs RAG, agentic tool use, fine-tuning, or some combination of these.
- Deciding what infrastructure approach makes sense given the customer's scale and budget (connecting back to the Week 13 infrastructure material).
- Deciding what security and governance measures are appropriate given the sensitivity of the customer's data and use case (connecting back to the Week 12 security material).

An important quality of good solution architecture in this customer-facing context is that it genuinely suits the customer's actual situation. It shouldn't simply reach for whatever approach is most impressive or most technically sophisticated. A skilled forward deployed engineer resists the temptation to over-engineer a solution just because a more sophisticated approach is more technically interesting. This connects back to the multi-agent caution from the Week 11 enterprise agents material. They design the simplest, most reliable solution that genuinely solves the customer's actual problem well.

---

## 10. Technical Feasibility Analysis

Technical feasibility analysis is the careful, honest process of assessing whether a proposed solution can realistically be built at all, given the real constraints and the current state of available technology.

This analysis matters enormously, because AI capabilities have real limits. A skilled forward deployed engineer needs to honestly assess whether a customer's desired outcome is achievable with today's technology. They shouldn't promise something that sounds appealing but turns out to be technically unrealistic once hands-on work begins. This honest, upfront assessment connects back to the hallucination detection and groundedness evaluation concepts from the Week 10 safety and guardrails material. A skilled forward deployed engineer needs to understand and clearly communicate the real limits of what an AI system can reliably deliver. This is especially important for high-stakes use cases, where a customer's business depends on the system working correctly and reliably.

Good technical feasibility analysis often involves building a small, quick proof-of-concept or prototype (connecting back to the AI product lifecycle concept from Week 16). The purpose is to test whether a proposed approach works well enough on the customer's real data, before committing to a full, much larger build. This early, honest validation protects both the customer and the engineering team from investing considerable time and resources into a project that turns out, much later, to have been technically unrealistic from the start. That is why technical feasibility analysis is such a critical, foundational final piece of the customer problem discovery and technical scoping process this whole explanation has been building toward.
