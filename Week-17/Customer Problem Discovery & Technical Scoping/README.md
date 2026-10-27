# Customer Problem Discovery & Technical Scoping

## The Big Picture First

This whole course has spent sixteen weeks building up deep technical skill — how models work, how to build RAG systems and agents, how to secure, scale, and fine-tune AI systems. This final week shifts to something genuinely different, and honestly, something a lot of technically skilled engineers underestimate: the actual work of figuring out what to build in the first place, for a real customer, with real constraints, real existing systems, and real business needs that don't always look anything like a clean, well-defined technical spec. Forward deployed engineering is a distinctive role that's emerged specifically around AI products, precisely because AI systems are so deeply shaped by the specific data, workflows, and constraints of whoever's actually going to use them — meaning a huge amount of the real work happens before any code gets written at all. Let's build up an understanding of what this actually involves.

---

## 1. Forward Deployed Engineering Fundamentals

Forward deployed engineering refers to a distinctive engineering role — one where, rather than sitting purely inside your own company building a general-purpose product for a broad, anonymous market, you're embedded directly with individual customers, helping them successfully deploy and adapt a given technology to their own particular, real situation.

The name itself is worth unpacking, since it comes from a military term — being "forward deployed" originally meant being physically stationed out at the front lines, rather than back at a distant, central headquarters. Applied to engineering, it captures the core idea well: rather than a traditional engineer who builds a product in relative isolation and then hands it off to a separate sales or support team, a forward deployed engineer is out there directly with the customer, understanding their real problems firsthand, and helping build the specific solution that actually fits their situation.

This role has become especially important within AI engineering, for a specific reason worth understanding clearly. Recall from throughout this course just how much a good AI system depends on its specific context — its RAG knowledge base, its tool integrations, its fine-tuning data, all deeply specific to whoever's going to use it. A generic, one-size-fits-all AI product often can't fully deliver real value without careful adaptation to a customer's actual situation — and forward deployed engineering exists specifically to do that adaptation work well, directly, hands-on, with the real customer.

---

## 2. Customer Discovery

Customer discovery refers to the process of genuinely understanding a customer well — not merely what they say they want, but what they actually need, and why, before you ever start building anything at all.

Here's the reason this distinction matters so much. A customer will very often come to you with a specific request already formed — "we want a chatbot," or "we want an AI that can summarize documents." But a skilled forward deployed engineer knows that this stated request is often just the customer's best attempt at describing a deeper, underlying problem, using whatever vocabulary and mental model they happen to have available. The real underlying problem might be something like "our support team is overwhelmed and can't keep up with ticket volume," and "a chatbot" is simply the solution shape the customer happened to think of first, rather than necessarily being the best possible solution.

Good customer discovery involves asking a lot of open-ended questions, and listening carefully to the answers — the same dig-deeper-before-you-build instinct that's run through this whole course. Rather than immediately jumping straight to proposing a technical solution the moment a customer describes their problem, a skilled discovery process involves digging deeper — asking why a problem actually matters, asking what's already been tried before, and asking what success would concretely look like, from the customer's perspective, before committing to any particular technical approach at all.

---

## 3. Understanding Business Problems

We touched on the general idea of an underlying problem back in the customer discovery section right above. Understanding business problems specifically refers to digging into the broader business context surrounding a customer's stated technical request — understanding why a problem genuinely matters to that business, and what real consequences it has for them.

A skilled forward deployed engineer learns to ask business-oriented questions, rather than only ever asking narrowly technical ones. What's this problem actually costing the business right now, in concrete terms — lost revenue, wasted employee time, unhappy customers? Who experiences this problem most directly, and what does their day-to-day work actually look like? What would genuinely change for the business if this problem were properly solved? These questions matter enormously, because the answers genuinely shape what an appropriate technical solution should look like — a problem costing a business a small amount of money warrants a different, more modest kind of investment and solution than a business-critical problem threatening the company's survival.

This understanding also connects directly back to the product requirements concepts we covered in Week 16's AI product development material — a well-understood business problem naturally translates into much clearer, much more concrete quality thresholds and acceptable failure modes, since you genuinely know what real consequences a system's mistakes would have, out in the actual business context it's going to operate within.

---

## 4. Requirements Gathering

Requirements gathering refers to the systematic, careful process of taking everything learned through customer discovery and through understanding the business problem, and turning it into a clear, concrete, and actionable set of requirements — connecting directly back to the product requirements concepts we covered in Week 16, but now specifically conducted together with a real, external customer, rather than purely internally within your own company.

An important skill here involves genuinely distinguishing between what a customer says they want, and what they actually need — connecting back to the customer discovery discussion above. A customer might ask for "real-time responses," when what they actually need is simply "responses fast enough that our support agents don't feel like they're waiting" — a meaningfully different, and often considerably easier and cheaper, technical requirement to satisfy. Good requirements gathering involves carefully separating a customer's underlying needs from the specific solution they happened to have in mind when they first described that need.

Good requirements gathering also involves prioritizing — connecting back to the prioritization concepts we covered in Week 16's product development material. Real customer requirements almost always exceed what can realistically be delivered within a reasonable timeframe and budget, and a skilled forward deployed engineer helps a customer thoughtfully distinguish between what's truly essential versus what's merely nice to have, rather than simply trying to promise everything the customer asks for, all at once.

---

## 5. Technical Scoping

Technical scoping refers to defining the concrete boundaries of a project — exactly what will be built, and, importantly, exactly what won't be, given the real constraints of time, budget, and technical feasibility that any real project operates within.

Here's why scoping matters so much, and why it's such an important, distinct skill worth developing deliberately. Without clear, deliberate scoping, a project risks something informally called "scope creep" — where a project's boundaries gradually expand, bit by bit, as a customer keeps reasonably asking for "just one more thing," until the project has become considerably larger, more expensive, and more complicated than what was ever originally agreed upon. A well-scoped project has clear, explicit boundaries, agreed upon by both the customer and the engineering team together, defining exactly what success looks like, and exactly what falls outside the project's defined boundaries.

Good technical scoping also involves carefully sequencing work — connecting back to the AI product lifecycle concept we covered in Week 16. Rather than attempting to build an entire, complete, fully-featured solution all at once, a skilled forward deployed engineer often proposes a staged approach — delivering a smaller, genuinely useful initial version first, learning from real usage, and then expanding from that solid, working foundation, rather than risking a considerable amount of time and resources on a large, unproven, and much riskier all-at-once approach.

---

## 6. Translating Business Requirements into Technical Solutions

This topic represents one of the single most distinctively important skills in the entire forward deployed engineering role — taking the business-level understanding built up through customer discovery, and converting it into the concrete technical decisions and architecture we've discussed at such length throughout the rest of this course.

Here's a helpful, concrete way to understand what this translation process looks like in practice. A business requirement like "we need our support team to be able to answer customer questions faster, using our internal documentation" translates into a whole series of specific, concrete technical decisions — connecting back to the RAG material we covered in Weeks 6 and 7: what chunking strategy makes sense for this particular documentation; what metadata fields need to be captured and properly indexed; whether hybrid search is needed, given the nature of the content; and what evaluation approach will be used to verify the resulting system works well enough before it's deployed to real users.

A skilled forward deployed engineer needs real fluency in both directions of this translation — able to understand a business problem in the customer's own terms, and able to translate that understanding into the specific technical decisions covered throughout this course, while also being able to translate technical constraints and tradeoffs back into business terms a non-technical customer stakeholder can properly understand and make an informed decision about.

---

## 7. System Constraints & Trade-offs

System constraints and tradeoffs refers to understanding and navigating the real, practical limitations that any real-world technical solution has to work within — connecting back to the infrastructure, cost, and latency material we've covered throughout this course.

Real customer projects almost always involve carefully balancing several competing concerns against one another. **Cost constraints** mean a customer typically has a real budget they're willing and able to spend, connecting back to the cost optimization material we've covered throughout this course. **Timeline constraints** mean a customer often has a real deadline they're working toward, which shapes exactly how ambitious a proposed solution can realistically be. **Existing infrastructure constraints** mean a customer's existing systems (connecting back to the data and integration discovery topic we'll cover just next) shape and limit what technical approaches are realistically viable at all.

A skilled forward deployed engineer needs to help a customer honestly understand these tradeoffs clearly. Rather than simply promising a customer everything they might initially want, a skilled forward deployed engineer presents the real tradeoffs involved — "we can build this faster, but it will cost more" or "we can make this considerably cheaper, but response quality will be somewhat lower" — and lets the customer make an informed decision, armed with accurate information, rather than discovering these tradeoffs only much later, well after the project is already well underway.

---

## 8. Data & Integration Discovery

Data and integration discovery refers to the critical, practical process of understanding exactly what data a customer already has available, and exactly what existing systems a new AI solution will need to connect with — connecting back to the API integration material from Week 2 and the MCP material from Week 9.

This kind of discovery work matters enormously, because a large portion of real AI project risk lives right here. A customer might describe their documentation as "well organized," only for careful, hands-on investigation to reveal that it's scattered across several disconnected systems, in several inconsistent formats, with significant gaps and outdated sections throughout. A customer might describe their existing systems as "easy to integrate with," only for careful technical investigation to reveal significant authentication complexity, rate limits, or data-quality problems that weren't at all apparent from the customer's initial, high-level description alone.

Good data and integration discovery involves hands-on, directly examining a customer's actual data and actual systems yourself, rather than simply relying entirely on the customer's verbal description of them — connecting back to the data preparation and cleaning skills from Week 2. This hands-on verification work often reveals real surprises that meaningfully reshape a project's scope and technical approach, which is precisely why it's such a critical, and often underappreciated, early step in the overall forward deployed engineering process.

---

## 9. Solution Architecture

Solution architecture refers to designing the overall, complete technical approach that will address a customer's business problem — connecting back to essentially every major technical topic we've discussed throughout this course, now being deliberately, thoughtfully combined into one single, coherent, working solution, tailored to this particular customer's real situation.

A well-designed solution architecture draws on the entire toolbox we've built up throughout this course — deciding whether the solution needs RAG, agentic tool use, fine-tuning, or some combination of these; deciding what infrastructure approach (connecting back to Week 13's infrastructure material) makes sense given the customer's actual scale and budget; and deciding what security and governance measures (connecting back to Week 12's security material) are appropriate, given the sensitivity of the customer's data and use case.

An important, distinguishing quality of good solution architecture, specifically in this customer-facing context, is genuine appropriateness to the customer's actual situation, rather than simply reaching for whatever approach happens to be the most impressive or the most technically sophisticated. A skilled forward deployed engineer resists the temptation to over-engineer a solution purely because a more sophisticated approach happens to be more technically interesting — connecting back to the multi-agent caution we discussed in Week 11's enterprise agents material — and instead designs the simplest, most reliable solution that genuinely solves the customer's actual problem well.

---

## 10. Technical Feasibility Analysis

Technical feasibility analysis refers to the careful, honest process of assessing whether a proposed solution can realistically be built at all, given the real constraints and the current state of available technology.

This kind of analysis matters enormously, because AI capabilities have real limits, and a skilled forward deployed engineer needs to honestly assess whether a customer's desired outcome is achievable with today's technology, rather than simply promising something that sounds appealing but turns out to be technically unrealistic once real, hands-on work begins. This honest, upfront assessment connects back to the hallucination detection and groundedness evaluation concepts we covered in Week 10's safety and guardrails material — a skilled forward deployed engineer needs to honestly understand and clearly communicate the real limits of what an AI system can reliably deliver, particularly for high-stakes use cases where a customer's business depends on the resulting system working correctly and reliably.

Good technical feasibility analysis often involves building a small, quick proof-of-concept or prototype (connecting back to the AI product lifecycle concept we covered in Week 16), specifically to test whether a proposed approach works well enough on the customer's real data, before committing to a full, considerably larger build. This early, honest validation protects both the customer and the engineering team from investing considerable time and resources into a project that turns out, only much later, to have been technically unrealistic from the very start — which is precisely why technical feasibility analysis is such a critical, foundational final piece of the customer problem discovery and technical scoping process this whole explanation has been building toward.
