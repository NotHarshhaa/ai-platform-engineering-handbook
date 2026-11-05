# Human Feedback & Alignment

## The Big Picture First

The previous two Week 13 explanations focused on teaching a model new knowledge, new formats, or new domain-specific skills. This final section addresses a different, and arguably even more fundamental, question: how do you teach a model to behave the way humans want it to behave? How do you make it helpful, honest, and safe, rather than simply good at predicting statistically plausible-sounding text?

This is exactly the gap that instruction tuning, which we touched on earlier, only partially closes. A model can be instruction-tuned to follow the general format of instructions, while still producing responses that are subtly unhelpful, misleading, or occasionally harmful. Alignment techniques, including RLHF, DPO, and everything else in this section, are about closing that remaining gap. They use real human judgment about what "good" looks like to further shape a model's behavior in that direction.

---

## 1. RLHF

RLHF stands for Reinforcement Learning from Human Feedback. It is one of the most important, foundational techniques that helped transform earlier, rawer language models into the helpful, well-behaved assistants people use today. It's worth unpacking each piece of the name carefully, because the full name tells you a lot about how the technique works.

Here is the general process, broken into its practical steps:

1. **Generate responses.** An already instruction-tuned model generates several different possible responses to the same prompt.
2. **Rank them.** Human reviewers look at these responses and rank them from best to worst, based on which ones they would prefer.
3. **Train a reward model.** Rather than using this human ranking data directly to adjust the model, a separate model, called a "reward model" (covered as its own topic below), is trained. It learns to predict what rankings a human reviewer would likely give to any new response, based on the patterns in the human ranking data.
4. **Fine-tune with reinforcement learning.** The original language model is then further fine-tuned using a machine learning technique called "reinforcement learning." Through a great many repeated trial-and-error attempts, the model learns to produce responses that the trained reward model scores highly. In effect, it learns to produce the kinds of responses that real human reviewers would likely prefer.

The reason this multi-step, somewhat roundabout approach works so well comes down to a point worth appreciating. It is often much easier for a human to judge and compare two responses (simply picking which one they prefer) than it is for the same human to write one perfect, ideal response from scratch. RLHF takes advantage of this insight. It uses the comparatively easier task of human comparison and preference to teach a model, at scale, to reliably produce better, more preferred responses, well beyond what could ever be achieved through manual human writing alone.

---

## 2. DPO

DPO stands for Direct Preference Optimization. It is a more recent and notably simpler alternative approach to achieving broadly similar goals to those RLHF is trying to achieve.

Here is the core insight behind DPO, and why it is a meaningful practical improvement in several respects. Recall that RLHF requires several separate steps working together: training a separate reward model first, and then using a comparatively complex reinforcement learning process to update the original model. While this overall process is demonstrably effective, it is also quite complex to implement correctly, and it can be somewhat unstable and difficult to get working reliably in practice.

DPO's insight is that you can mathematically skip the separate reward-model step altogether. Instead, you use the same human preference data (which response was preferred over which other response) to directly adjust the original model in one more streamlined step.

The practical appeal of DPO is that it is:

- Considerably simpler to implement correctly.
- More stable throughout the training process.
- Generally less demanding on computational resources than full, traditional RLHF.

It still achieves results that are quite comparable in quality for many practical use cases. Because of these advantages, DPO has become an increasingly popular default choice across the industry, and in many cases it now replaces full, traditional RLHF. However, both approaches are still in active use today, and the right choice between them often comes down to a team's particular circumstances and available resources.

---

## 3. Preference Optimization

Preference optimization is the broader, more general umbrella term that both RLHF and DPO fall underneath. It refers to the entire family of techniques designed to adjust a model's behavior based on human preferences, expressed through comparisons between several possible responses. This is different from the more traditional approach of direct labeled "correct answer" examples, of the kind discussed in the earlier fine-tuning fundamentals explanation.

To understand why this comparative approach matters, it helps to appreciate an important distinction. For a great many practical tasks a language model needs to handle well, there simply isn't a single, uniquely, objectively "correct" answer. Think about a creative writing request, or a request for a thoughtful, nuanced opinion on a complex, contested topic. In situations like these, it's far more practical and meaningful to ask a real human "which of these responses do you prefer?" than to try to force the existence of one supposedly correct labeled answer, which often doesn't exist in any meaningful sense.

Beyond RLHF and DPO, this broader family includes several additional related techniques and variations. Examples include IPO, KTO, and ORPO. Another related idea is RLAIF, where feedback generated by AI supplements the feedback from humans. Each represents a somewhat different approach to using the same underlying kind of comparative preference data. The shared goal running through this whole family of techniques is the same: to use human judgment about which responses are better to steer a model's behavior, at meaningful scale, in the preferred direction.

---

## 4. Reward Models

We touched briefly on reward models in the RLHF section above. They are worth understanding as their own, dedicated topic, since they play such a central role in the traditional RLHF process.

A reward model is a separate AI model, trained to take a prompt together with a response as its input, and to output a single numerical score representing roughly how good that response is. In effect, it learns to automatically predict what rating or ranking a human reviewer would likely give that response. It bases this on everything it has learned from studying a great many prior human preference comparisons.

Why does this separate model need to exist at all, rather than always using real human judgment directly? The practical answer comes down to scale. Real RLHF training requires evaluating an enormous number of model responses across many training steps. Having a human personally evaluate every one of them would be completely impractical and unaffordable. The reward model serves as an automated, scalable stand-in for human judgment. It is trained once, using a more modest, manageable amount of human-provided preference data. It can then automatically and efficiently evaluate a vast number of later model responses, at much greater scale and speed than any human reviewer alone could achieve.

The quality of the reward model matters enormously, because the entire rest of the RLHF process depends on it. Suppose a reward model has learned a subtly incorrect or biased notion of what counts as a "good" response. For example, it might have mistakenly learned to systematically favor longer responses, simply because they look more thorough on the surface, rather than because they are actually better in substance. Then the final fine-tuned model will learn and reproduce that same flaw, at scale.

---

## 5. Human Feedback Collection

Human feedback collection is the practical, hands-on process of gathering the human judgments and preferences that both RLHF and DPO, and the broader preference optimization family, depend on in the first place.

This process involves several important practical considerations:

- **Selecting appropriate reviewers.** The people providing feedback need appropriate expertise and judgment, relevant to the task the model is being trained for. Feedback about correct medical guidance, for example, requires reviewers with relevant medical expertise.
- **Designing clear evaluation criteria.** Reviewers need to understand exactly which qualities to look for and evaluate (such as helpfulness, accuracy, safety, and appropriate tone). Otherwise they are left to their own potentially inconsistent personal judgment, with no shared standard to work from.
- **Ensuring consistency across many reviewers.** A great many different reviewers typically need to provide this feedback collectively, at scale. Making sure they are all applying broadly similar standards becomes a real and often significant practical challenge.

There is also an important ethical dimension worth being upfront about. This connects back to the AI ethics concepts from the earlier Week 11 material. The human reviewers doing this work are real people. Any team undertaking this kind of work has a serious responsibility to make sure these reviewers are fairly compensated. They also need to be protected from excessive exposure to disturbing or harmful content, which can unfortunately come up during safety-related evaluation work, covered next.

---

## 6. Safety Alignment

Safety alignment is a specific and especially important application of the alignment techniques discussed in this explanation. It focuses on deliberately teaching a model to reliably avoid generating harmful, dangerous, or inappropriate content. It connects directly back to the broader Week 11 security and safety material.

Here is how safety alignment fits into the broader picture. The same RLHF and DPO techniques discussed above can be applied with safety as the specific training objective. Human reviewers evaluate model responses not just for general helpfulness, but specifically for questions like:

- Does the model appropriately decline harmful requests?
- Does it avoid producing dangerous technical information?
- Does it handle sensitive topics with appropriate care?

An important tension is worth being upfront about, and understanding clearly. Safety alignment involves real tradeoffs that don't always have a simple, clean answer:

- A model that is excessively cautious risks becoming unreasonably restrictive. It might refuse entirely legitimate requests out of an overabundance of caution.
- A model that is insufficiently cautious risks producing real harm.

Finding the right balance between these competing concerns is an ongoing and difficult challenge. The AI industry continues to work through it and refine its approach. It has never been fully and permanently solved once and for all.

---

## 7. Model Alignment

Model alignment is the broadest, most encompassing term in this explanation. It is the overall umbrella concept that RLHF, DPO, preference optimization, and safety alignment all fall underneath, together, as one unified whole.

At its core, alignment refers to the broader challenge of making sure an AI system's goals and behaviors match up with what real humans want and value. The risk is that a model instead optimizes for some different, narrower, potentially misaligned objective that only superficially looks similar on the surface. In that case, it isn't actually aligned with authentic human intent and values underneath.

A helpful way to see why this matters: a model's original pretraining objective is simply "predict the statistically likely next word." That objective, on its own, has nothing inherently to do with being helpful, honest, or safe. A model trained exclusively on this objective might become extremely good at producing plausible-sounding text, while having no built-in tendency to be helpful, truthful, or safe in any meaningful sense.

The whole alignment process, with instruction tuning, RLHF, DPO, and safety alignment working together, is the effort to close this gap. It takes a model that is already extremely capable at the underlying task of predicting plausible text, and deliberately shapes that raw capability toward being helpful, honest, and safe, in ways that reflect real human values and intent.

---

## 8. Evaluation Pipelines

We've covered AI evaluation thoroughly in several parts of this series, most notably in the earlier Week 9 material, and again recently in the previous fine-tuning fundamentals explanation. In this alignment context, an evaluation pipeline means building a systematic, repeatable process to assess whether an alignment effort (RLHF, DPO, or whichever technique was used) actually achieved its intended goal.

A well-built evaluation pipeline in this context needs to assess several distinct dimensions together:

- **Helpfulness.** Did the model become more helpful? This uses held-out test questions and human or automated quality assessments, connecting back to the AI evaluation concepts from Week 9.
- **Safety.** Did the model's safety properties actually improve? This uses dedicated adversarial safety test sets, connecting back to the red teaming and adversarial testing concepts from Week 11.
- **No unintended damage.** Critically, did the alignment process inadvertently make the model worse at other things it was previously good at? This real phenomenon is sometimes called the "alignment tax," where safety or helpfulness improvements come at some cost to the model's raw capability elsewhere.

Running these evaluations systematically, and running them repeatedly throughout the alignment process rather than only once at the very end, lets a team catch problems early. This connects back to the AI CI/CD and regression testing concepts from Week 9, applying the same philosophy here in an alignment-specific context.

---

## 9. Benchmarking

Benchmarking means evaluating a model's performance using standardized, widely recognized tests, so its results can be meaningfully compared against other models using a shared, consistent standard. The alternative is each team evaluating its own model using its own separate, inconsistent criteria.

A few widely recognized types of benchmarks are worth being aware of:

- Some test raw general knowledge and reasoning across a broad range of academic subjects.
- Others test coding ability, or mathematical reasoning specifically.
- Some test safety and alignment properties directly, such as how reliably a model refuses harmful requests, or how well it avoids known common forms of bias.

The practical value of standardized benchmarking comes down to comparability. A shared, standardized way of measuring things lets the whole industry meaningfully compare different models, and lets an individual team track its own model's progress consistently over time. It is similar in spirit to how a shared standard like the OWASP Top 10 list, covered in Week 11, gives security teams a common vocabulary.

It's worth being aware, though, that benchmarks have real limitations. A model can be deliberately optimized to perform well on a specific benchmark, without that improvement translating into better real-world performance more broadly. This is sometimes called "benchmark gaming" or "benchmark overfitting." That is why careful evaluation generally combines standardized benchmarking with the more holistic, real-world evaluation pipelines discussed above, rather than relying only on standardized benchmark scores.

---

## 10. Fine-Tuned Model Deployment

Once a model has been fine-tuned and aligned, and has passed through the evaluation and benchmarking process discussed in this explanation, it still needs to be deployed. That means making it available for real use, which connects back to the AI serving material from Week 12.

A few considerations are especially relevant for deploying a fine-tuned model, beyond what the earlier Week 12 serving material covered more generally:

- **Serving LoRA adjustments.** If a team used a parameter-efficient technique like LoRA (covered in the previous explanation), they need to decide how to serve the result. One option is to merge the trained LoRA adjustment permanently back into the original base model, which creates one complete, combined model. The other option is to keep them separate and combine them dynamically at inference time. This lets one shared base model serve several different LoRA adjustments at the same time, which is the flexibility benefit discussed in the earlier LoRA section.
- **Ongoing monitoring.** Teams also generally need to set up ongoing monitoring specifically for the newly fine-tuned model, connecting back to the Week 9 observability material. This helps catch unexpected behavior that may only appear once the model starts handling real, live production traffic, rather than only the controlled, artificial test scenarios it was evaluated against beforehand.

---

## 11. Continuous Improvement

To close out this Week 13 material, and in a real sense this entire thirteen-week course, it's worth understanding continuous improvement as the final piece that ties this explanation, and the whole series, together.

Alignment is never a one-time, finished task. This connects back to a recurring theme emphasized throughout this series. Once a fine-tuned, aligned model is deployed in real, live production, real users will inevitably encounter situations that the original training and evaluation never quite anticipated. Collecting ongoing feedback from these real-world interactions (connecting back to the production monitoring and failure analysis concepts from Week 9), and then using it to inform the next round of alignment work, creates an ongoing, continuous cycle. It is never a single, one-time project.

This ongoing cycle connects together essentially every major theme covered throughout this course:

- Building a system well (the earlier weeks).
- Operating it reliably (the LLMOps material).
- Securing it properly (the security and red teaming material).
- Scaling its underlying infrastructure efficiently (the infrastructure material).
- Continuously refining its behavior over time (this final alignment material).

The single most important takeaway to close this course on is this: building a good, responsible AI system was never about any single, one-time achievement. It is about the full, ongoing discipline of continuously learning, continuously improving, and continuously realigning a system's behavior toward authentic human values and human needs, reliably, over an extended period of time.
