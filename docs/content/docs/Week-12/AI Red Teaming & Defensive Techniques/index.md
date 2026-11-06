---
title: "AI Red Teaming & Defensive Techniques"
description: "AI Platform Engineering Handbook - Week 12 - AI Red Teaming & Defensive Techniques"
weight: 112
toc: true
---

---

# AI Red Teaming & Defensive Techniques

## The Big Picture First

The previous section walked through the various ways an AI system can be attacked. This section flips that picture around. It covers how to deliberately find those weaknesses yourself, before a real attacker does, and how to build concrete defenses against the specific threats we already covered.

Here's a useful mental model to hold onto throughout this explanation: red teaming is about *finding* the problems, while the defensive techniques covered afterward are about *fixing* or *preventing* them. Together, these two halves form a continuous, ongoing cycle. You test, you find weaknesses, you fix them, and then you test again, because new weaknesses can keep emerging over time. They can appear through model updates, new features being added, or new attack techniques being discovered elsewhere in the world. Let's work through it all.

---

## 1. AI Red Teaming Fundamentals

Red teaming is a term borrowed from an older military and cybersecurity tradition. A "red team" is a group specifically tasked with attacking their own organization's systems, deliberately playing the role of a realistic adversary, so that real weaknesses are found before a hostile outsider finds and exploits them first. AI red teaming applies this same idea to AI systems: deliberately and systematically trying to break, manipulate, or misuse your own AI application, to discover its weaknesses ahead of time under safe, controlled conditions.

The core mindset shift here matters, so it's worth sitting with for a moment. Most of the work of building an AI application, throughout this series, has been focused on the question "does this work well for a normal, well-intentioned user asking normal, reasonable questions?" Red teaming asks a different question: "what happens if someone deliberately tries to make this system misbehave?" This requires thinking somewhat like an attacker would. That means creatively trying the attack techniques we covered in the previous explanation (prompt injection, jailbreaking, and so on), and more generally probing for unexpected, unintended edge-case behavior that a normal user would likely never stumble onto on their own.

AI red teaming can be carried out in several ways:

- By dedicated internal security specialists.
- By external firms that specialize in this kind of work.
- Increasingly, by automated tools designed to systematically generate and test a large number of potential attacks (which connects to the security testing automation topic later in this explanation).

Whichever approach an organization chooses, the core goal is the same: proactively discovering weaknesses under safe, controlled conditions, rather than discovering them reactively after real harm has already occurred.

---

## 2. Adversarial Prompt Testing

Adversarial prompt testing is the concrete, hands-on practice of crafting and trying out prompts that are deliberately designed to make an AI system misbehave. This is the actual day-to-day activity that red teaming, as a broader concept, involves.

It goes well beyond trying a handful of obviously malicious-sounding requests. A thorough adversarial testing process tries a wide range of approaches:

- **Direct requests.** Bluntly asking for clearly problematic content outright.
- **Jailbreak techniques.** Using the role-play and hypothetical framings we discussed in the previous explanation.
- **Indirect, gradual approaches.** Working a conversation forward step by step toward a problematic outcome, rather than asking for it all at once in one obvious step.
- **Disguised or obfuscated language.** Using tricks meant to slip past simple keyword-based filtering, such as deliberately misspelling sensitive words or using coded, indirect language instead of direct terminology.

A well-organized adversarial testing effort maintains an ongoing, evolving library of known test prompts, organized by the category of vulnerability each one tests for. It then runs the system against this whole library regularly, not just once before the initial launch. As we touched on in the previous explanation, both the underlying models and the wider set of known attack techniques keep changing over time.

---

## 3. Prompt Injection Testing

Prompt injection testing is a specific, focused subset of the adversarial prompt testing we just discussed. It targets the prompt injection vulnerability we covered in detail in the previous explanation: trying to get an AI system to follow an injected instruction instead of sticking to its own legitimate, originally intended instructions.

Good prompt injection testing needs to cover both major variants we discussed earlier:

- **Direct injection testing** means trying different ways of typing in instructions designed to override the system's original instructions. These range from variations on "ignore your previous instructions" to subtler attempts that quietly, gradually redirect the system's behavior.
- **Indirect injection testing** means testing what happens when a malicious instruction is planted inside some external content the system might later read or retrieve. For example, you might plant a hidden instruction in a test document that will be fed into a RAG pipeline, and then check whether the system follows it or correctly treats it as inert content to read but never obey.

Testing for this vulnerability matters so much because, as we discussed in the previous explanation, prompt injection is currently ranked as the top overall risk facing LLM applications. It is also deeply rooted in how language models process natural language instructions in the first place, so it can't be considered fully and permanently solved. That means ongoing testing is an essential, recurring practice, not a one-time checkbox to tick off and never revisit.

---

## 4. Jailbreak Detection

Jailbreak detection means identifying when a user is actively attempting one of the known jailbreak techniques we discussed in the previous explanation. The aim is to catch the attempt itself, ideally before it can succeed.

This can be approached from two different, complementary angles:

- **Looking for known jailbreak patterns in the input.** Many known jailbreak attempts share characteristic phrasings and structures, such as common role-play framings or recurring hypothetical-scenario setups. Input that closely matches these patterns can be flagged or blocked.
- **Monitoring the model's output.** Here you look for telltale signs that a jailbreak may have succeeded, such as the model suddenly producing noticeably different content than it normally would for similar past requests.

It's worth being honest about one point: jailbreak detection is an ongoing arms race, not a problem that gets solved once and for all. As defenders get better at catching known jailbreak techniques, attackers develop new techniques designed to get around those same defenses. That's why jailbreak detection needs to be treated as an ongoing, evolving practice, not a fixed piece of work that a team can consider finished.

---

## 5. Output Validation

Output validation means carefully checking a model's generated response before it is allowed to reach the end user. It connects directly back to the "output guardrails" concept introduced in the earlier AI Guardrails explanation from Week 9.

The reasoning is straightforward. Even with excellent input validation in place, a model can still produce a problematic response. The cause might be a plain model mistake, a successful jailbreak that slipped past the system's defenses, or an unexpected edge case that nobody anticipated. Output validation is the important second line of defense: it checks the actual output itself, rather than relying only on controlling and validating the input.

Good output validation usually checks several different things together:

- **Content-related issues.** These are the ones discussed in the earlier Week 9 material: toxicity, sensitive PII, and other content moderation concerns.
- **Format and structure.** It checks that the response conforms to the structure it was supposed to have, connecting back to the structured outputs concept from the earlier tool calling explanation.
- **Consistency with the system's intended purpose and scope.** For example, it can flag a response from a narrowly scoped customer support bot that has suddenly started freely discussing unrelated topics. That could indicate a successful prompt injection or jailbreak somewhere along the way.

---

## 6. Input Validation

Input validation is the mirror image and natural complement of output validation. It focuses on checking what comes *into* the system, before it reaches the underlying model at all. It connects back to the "input guardrails" concept from the same earlier AI Guardrails explanation.

Good input validation usually checks for several kinds of problems together:

- **Known attack patterns,** such as the prompt injection and jailbreak signatures discussed throughout this explanation.
- **Expected format and length.** An unusually long input, for example, might be an attempt to overwhelm or manipulate the system.
- **Known malicious content in general,** connecting back to the content moderation concepts from the earlier Week 9 material.

One important nuance: input validation on its own can never be considered fully sufficient. As we discussed in the previous explanation, indirect prompt injection means malicious content can enter a system through channels other than the user's direct input, such as a retrieved document or a tool's returned result. That's why input validation needs to work in tandem with output validation and the other defensive techniques in this explanation, rather than being relied on as a single, standalone defense.

---

## 7. AI Firewall Concepts

An AI firewall applies a familiar concept from traditional network security. A traditional firewall sits between a network and the outside world, inspects the traffic passing through, and blocks anything that looks suspicious or dangerous. An AI firewall does the same for AI traffic. It sits between a user (or an external system) and the language model itself, inspects both incoming requests and outgoing responses, and blocks or modifies anything that appears problematic.

This idea naturally pulls several of the concepts we've covered into one unified system. Instead of each check (input validation, output validation, jailbreak detection, and so on) being implemented as a separate piece scattered through an application's codebase, an AI firewall centralizes them into one consistently applied layer. This connects back to the AI gateway concept from the earlier Week 10 enterprise architecture material, with the emphasis here on the security and protection side of that shared infrastructure rather than routing or cost.

The core advantage of centralizing this way is consistency. Instead of every application across an organization separately implementing its own version of each security check, a single shared AI firewall can apply the same carefully considered protections across all of the organization's traffic. It's also much easier to keep up to date as new threats emerge.

---

## 8. Prompt Shielding

Prompt shielding is a more specific, targeted technique for protecting a system's own system prompt. This is the private, foundational set of instructions a developer writes to define how their AI application should behave. The shielding protects it from being overridden through prompt injection, and, separately, from being leaked or revealed to an end user.

This connects to two distinct risks we've touched on throughout this explanation:

- **Overriding.** A user might manage to override the carefully written original instructions through prompt injection, as we discussed earlier.
- **System prompt leakage.** This is the risk we mentioned when we covered the OWASP Top 10 list in the previous explanation. It occurs when a user tricks the model into revealing its private system prompt word for word. This matters more than it might first seem to, because a system prompt often contains real proprietary business logic. Knowing its exact contents can also help an attacker craft more effective, more targeted prompt injection attempts.

Practical prompt shielding techniques generally include:

- Explicitly instructing the model, within its system prompt, never to reveal its instructions no matter how directly it is asked.
- Structuring the prompt so that later user input is harder to mistake for a legitimate new instruction. For example, you can use clear, consistent formatting that separates real instructions from user content.
- Regularly testing the system against known, common leakage attempts, connecting back to the adversarial testing practices covered earlier in this explanation.

A caution worth remembering: these techniques make leakage harder, but they can't guarantee that a system prompt stays secret. For this reason, never put real secrets such as passwords or API keys in a system prompt, and design your system so that exposing the prompt wouldn't cause serious harm.

---

## 9. Response Filtering

Response filtering is closely related to the output validation discussed above, but it's worth understanding as its own distinct piece. It focuses on *modifying* a response rather than simply blocking it. The key distinction is between *rejecting* an entire problematic response and *cleaning it up* before it is delivered.

Think about the practical difference. Suppose a generated response contains one small, isolated piece of sensitive PII buried in the middle of an otherwise perfectly acceptable answer. Blocking the entire response would be heavy-handed. Response filtering instead redacts or masks just that one piece, and still delivers the rest of the response to the user as normal. Similarly, if a response has a minor formatting issue, response filtering can correct it directly, instead of regenerating the whole response from scratch.

This technique is a sensible middle ground between two extremes:

- **Never checking a response's content at all.** This is far too permissive and risky.
- **Blocking any response that trips even one guardrail check, no matter how minor.** This risks becoming too restrictive, and can hurt a system's usefulness unnecessarily.

Well-designed response filtering tries to preserve as much of a response's usefulness as reasonably possible, while still reliably resolving whatever specific problem was identified in it.

---

## 10. Human-in-the-Loop Validation

We covered the general human-in-the-loop concept in detail in the earlier Agent Patterns explanation. It's worth revisiting here because it plays a distinct role as a defensive security technique, not just as a general reliability or quality mechanism.

In this security context, human-in-the-loop validation means routing certain requests or responses to a real human reviewer for explicit approval before they are allowed to proceed. The routing is based on security-related risk criteria, not only general functional or business considerations. For example, a system might be configured to flag any request that trips a jailbreak detector, or that involves an unusually high-risk tool call, for human review, instead of proceeding fully autonomously with no human oversight.

The core value of human review here is a kind of judgment and contextual understanding that automated systems, even good ones, often lack. A human reviewer can typically pick up on subtle, unusual context, or on a novel-looking combination of factors that a rules-based detection system might miss entirely. This makes human-in-the-loop validation a particularly valuable safeguard for a system's highest-stakes, most consequential decisions. At the same time, it is too slow, and depends too much on limited human attention and availability, to be applied to every single request a system processes.

---

## 11. Security Testing Automation

Security testing automation means building tooling that systematically runs the kinds of adversarial tests discussed above automatically and at scale. The alternative is relying entirely on human testers to manually craft and try each test prompt by hand, one at a time.

This matters because thorough red teaming involves a very large number of individual test cases, potentially hundreds or thousands of variations across all the attack categories we've covered. Testing all of that by hand would be extremely slow, labor-intensive, and impractical to do consistently on a regular, ongoing basis. Automated security testing tools can:

- Systematically generate large numbers of variations of known attack patterns.
- Run the target system against all of them in one efficient batch.
- Flag any cases where the system's response suggests that a vulnerability was successfully exploited.

A particularly powerful and increasingly common approach is using one dedicated AI model to generate creative, novel adversarial test cases against a separate target AI system. In effect, AI is used to red-team other AI systems. This connects back to the debate pattern from the earlier Agent Patterns explanation, applied here in an explicitly adversarial setting. One system tries its best to attack another, while the target system tries its best to defend itself.

In a mature, well-run organization, security testing automation becomes an integrated part of the AI CI/CD pipeline discussed in the earlier Week 9 material. Any new prompt or model change is automatically tested against this growing security test suite, alongside the other regular quality checks, before it is allowed to go live in production.

---

## 12. AI Incident Response

AI incident response is what an organization does after something has already gone wrong: a real security incident has occurred, despite whatever defenses were in place. No matter how good an organization's defenses are, it is always wise to have a clear plan for what to do once something goes wrong, since no set of defenses can be expected to be perfect and sufficient forever.

A well-prepared AI incident response plan typically covers several stages:

- **Detection** means having the means to notice that an incident has occurred in the first place. It connects back to the production monitoring and observability material from the earlier Week 9 explanation.
- **Containment** means taking swift action to limit further damage. This might mean temporarily disabling a specific tool or capability that is being exploited, or taking an affected feature fully offline while the problem is investigated.
- **Investigation** means carefully understanding exactly what happened. It connects back to the failure analysis concepts from Week 9, here applied through a security-focused lens.
- **Remediation** means fixing the underlying root cause, and making sure similar incidents can't easily happen again in the same way.

A final point to close on: incident response, red teaming, and every one of the defensive techniques covered in this explanation are meant to work together as one continuous, cohesive cycle. None of them is sufficient on its own. Red teaming helps proactively find weaknesses before a real attacker exploits them. The defensive techniques help reduce the likelihood of a successful attack in the first place. And a well-prepared incident response plan makes sure that when something inevitably still slips through, the damage stays contained and the underlying problem gets fixed as quickly, reliably, and thoroughly as possible.
