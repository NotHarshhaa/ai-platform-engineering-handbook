---
title: "Parameter-Efficient Fine-Tuning (PEFT)"
description: "AI Platform Engineering Handbook - Week 14 - Parameter-Efficient Fine-Tuning (PEFT)"
weight: 133
toc: true
---

---

# Parameter-Efficient Fine-Tuning (PEFT)

## The Big Picture First

At the end of the previous explanation, we touched briefly on LoRA and parameter-efficient fine-tuning as a way to make fine-tuning more affordable. This whole section is dedicated to unpacking that idea properly. It turns out to be one of the most practically important developments in making fine-tuning accessible to regular developers and smaller teams, rather than something only the largest, best-resourced companies could afford.

Here is the core problem PEFT solves. A modern large language model can have many billions of internal parameters. Traditional "full fine-tuning" means updating every single one of them. That requires an enormous amount of GPU memory, not just to hold the model itself, but to hold all the additional bookkeeping information needed to calculate how each of those billions of parameters should change. PEFT is a whole family of clever techniques that dramatically reduce this requirement, so that fine-tuning can be done on much more modest, affordable hardware. Let's work through exactly how.

---

## 1. PEFT Fundamentals

PEFT stands for Parameter-Efficient Fine-Tuning. The core idea uniting every technique in this section is simple to state, even though the engineering behind it is fairly sophisticated: instead of updating all of a model's billions of parameters during fine-tuning, you update only a small fraction of them, and leave the vast majority of the original model completely frozen and untouched.

To understand why this works, it helps to think about why full fine-tuning is so expensive in the first place. When you fine-tune a model the traditional, full way, you need enough memory to store the model itself. You also need to store additional information for every single parameter, specifically tracking how that parameter should be adjusted at each training step, plus other bookkeeping information the training process needs along the way. For a model with billions of parameters, all of this additional information adds up to an enormous memory requirement, often several times larger than the base model itself.

PEFT techniques sidestep this problem by being much more selective about what gets updated. Since only a small fraction of parameters is being adjusted, you only need that additional tracking and bookkeeping information for that small fraction, instead of the entire model. The remarkable, somewhat counterintuitive discovery behind PEFT's popularity is that this approach very often works nearly as well as full fine-tuning, despite touching only a small fraction of the model's parameters. You get most of the benefit of full fine-tuning at a small fraction of its cost. This is why PEFT has become the dominant, default approach for most real-world fine-tuning work today.

---

## 2. LoRA

LoRA (Low-Rank Adaptation) is the most popular and widely used PEFT technique. It's worth taking real time to understand how it works, because the same core idea underlies several of the other techniques in this explanation.

Here is the core insight behind LoRA, explained as intuitively as possible. Instead of directly modifying a model's existing, original parameters at all, LoRA adds a small set of brand new, additional parameters alongside the original ones. Only these new parameters get trained and updated. The original model stays completely frozen and unchanged throughout. During actual use, the model's final output is calculated by combining the original, frozen model's own output with a small adjustment contributed by the new, trained parameters. The original model still contributes the vast majority of the behavior, while the new, small addition nudges that behavior in whatever direction the fine-tuning was intended to achieve.

The mathematical trick that makes this practical and memory-efficient involves something called "low-rank" structure. Without getting deep into the mathematics, the basic idea is that the new parameters are deliberately structured so that they require representing dramatically fewer numbers than you might expect, while still capturing a meaningful, useful adjustment to the model's behavior. That is where LoRA gets its name. You add a comparatively small, "low-rank" adjustment on top of the original, much larger model, instead of modifying the entire original model directly.

A few practical benefits follow directly from this design. Because the original model stays frozen and unchanged, you can train several completely different LoRA adjustments for several different purposes, and then swap between them as needed. You don't need several entirely separate, full copies of the model. You just need one copy of the shared base model, plus several small, separate LoRA adjustments, each one considerably smaller than the base model. This makes LoRA a particularly practical, flexible, and now extremely widely used approach across the industry.

---

## 3. QLoRA

QLoRA (Quantized LoRA) is an additional enhancement built directly on top of the core LoRA technique. It combines LoRA with the model quantization concept covered at length in the earlier Week 12 material, to push memory efficiency even further.

Here is the reasoning behind combining these two techniques. LoRA already dramatically reduces the memory required for the training and updating process, since you're only updating a small number of new parameters. But you still need to hold the entire original, frozen base model in memory throughout the process, simply to run it and calculate its outputs, even though you're not directly updating it. QLoRA addresses this remaining, sizable memory cost by quantizing the frozen base model down to a much lower level of numerical precision. Recall from the Week 12 explanation that quantization means representing a model's numbers using meaningfully fewer bits, which reduces the physical memory needed to store the model.

The practical real-world result of combining these two techniques is remarkable. QLoRA has made it realistically possible to fine-tune very large language models on hardware that would otherwise have been completely insufficient. In the original QLoRA research, for example, a model with roughly 65 billion parameters was fine-tuned on a single GPU, rather than a whole expensive cluster of high-end enterprise GPUs. This combination is one of the most significant practical developments in democratizing access to fine-tuning. It has brought fine-tuning within realistic reach of individual researchers, smaller startups, and hobbyists, instead of leaving it to the largest, best-funded companies.

---

## 4. Adapters

Adapters are a somewhat earlier, but closely related, general approach to parameter-efficient fine-tuning. Understanding them helps round out the picture of how PEFT techniques have evolved over time, leading up to LoRA's current widespread popularity.

The core idea behind adapters is to insert small, new, additional neural network components in between the existing layers of an already-trained model, instead of modifying the model's own original layers. During fine-tuning, only these newly inserted adapter components get trained and updated, while the original model's layers remain completely frozen. This is the same broader philosophy that LoRA later built on and refined, just implemented through a somewhat different mechanical approach.

The practical distinction between the original adapter approach and LoRA mostly comes down to how and where the new components are inserted, and how much they affect the model's response speed. Adapters are generally inserted as separate, additional layers that data must pass through sequentially, one after another. This can introduce a small amount of additional processing delay compared to the original, unmodified base model. LoRA's design often avoids this downside more effectively, because its additional adjustment can typically be combined directly with the model's existing weights in certain circumstances. This helps explain part of why LoRA has generally become the more popular default choice across the industry, even though the adapter concept remains a well-understood, foundational, and historically important approach in this space.

---

## 5. Prefix Tuning

Prefix tuning takes a different, distinctive approach compared to LoRA and adapters. Instead of adding new components inside the model's architecture, prefix tuning adds a small number of new, specially trained "virtual tokens" as a prefix. These work like a built-in preamble that steers the model's behavior.

Here is a helpful way to think about what is happening. Recall from the early explanations in this series that a language model processes its input as a sequence of tokens. Prefix tuning prepends a small, fixed number of additional, specially trained vectors to this sequence. Critically, unlike regular tokens, these prefix vectors don't correspond to any real, human-readable words. They are pure, abstract, learned numerical representations, trained and optimized to steer the model's subsequent behavior in a particular, intended direction. In prefix tuning, these learned vectors are added at every layer of the model, not just at the input.

During fine-tuning, only these new prefix values are trained and adjusted, while the entire rest of the model remains completely frozen, following the same PEFT philosophy discussed throughout this explanation. Since only this small, fixed number of prefix vectors ever needs to be trained and stored, prefix tuning achieves a memory efficiency benefit similar to LoRA, through a different underlying mechanism. In practice, LoRA has become somewhat more popular and widely used than prefix tuning, but prefix tuning remains a well-understood, useful, and foundational technique worth knowing about within the PEFT family.

---

## 6. Prompt Tuning

Prompt tuning is closely related to prefix tuning, and the two techniques are often discussed together because they share a similar underlying philosophy. It's worth understanding the specific distinction between them clearly.

Prefix tuning adds its new, specially trained vectors at every layer throughout the model's internal architecture. Prompt tuning takes a simpler approach. It adds its new, specially trained tokens only once, at the very beginning of the input sequence, instead of at every internal layer. This makes prompt tuning a lighter-weight, simpler technique overall, requiring even fewer new parameters to be trained than prefix tuning's somewhat more involved approach.

The underlying idea is conceptually similar to prefix tuning. You are learning a small, specially optimized "soft prompt," meaning a specially trained sequence of tokens that don't correspond to any real, human-readable words. When placed at the beginning of a real input, it helps steer the frozen model's behavior in the direction the fine-tuning was intended to achieve.

An interesting practical observation about prompt tuning is that its effectiveness tends to improve considerably as the base model gets larger and more capable. It tends to work particularly well when applied to today's largest, most capable models, and somewhat less reliably when applied to smaller, less capable ones.

---

## 7. IA3

IA3 (short for "Infused Adapter by Inhibiting and Amplifying Inner Activations") is a more recent PEFT technique. It's worth understanding because it represents an even more aggressive push toward minimizing the number of additional parameters that need to be trained, compared to several of the other techniques in this explanation.

Instead of adding new components or new tokens, IA3 works by learning a small set of scaling factors. These are simple numbers that either amplify (increase) or inhibit (decrease) certain existing internal signals already flowing through the model's architecture as it processes an input. Think of it like adjusting a small handful of carefully placed volume dials on an already fully built, working sound system. Instead of adding entirely new components or speakers, you simply turn certain existing signals up or down, in ways designed to improve the overall resulting sound.

Because IA3 only needs to learn this small handful of simple scaling factors, it typically requires even fewer additional trainable parameters than LoRA. This makes it a particularly memory-efficient, lightweight option, especially well suited to situations with tight resource constraints. The practical tradeoff, which is common across the PEFT family, is that this reduced flexibility can sometimes mean somewhat lower performance than LoRA for more complex fine-tuning tasks. The right choice among these techniques often comes down to practical experimentation, balanced against a team's own resource constraints.

---

## 8. Quantization

We covered quantization at length in the earlier Week 12 material, in the context of efficiently serving already-trained models in production. It's worth revisiting briefly here to make its connection to PEFT, and especially to QLoRA, fully clear.

Recall that quantization means representing a model's internal numerical parameters using fewer bits of data than its original full precision would require. It trades a small, typically minor amount of numerical precision for significantly reduced memory usage. In the specific context of fine-tuning, quantization plays an important, complementary role alongside PEFT. PEFT techniques like LoRA reduce how many parameters need to be trained and updated. Quantization separately reduces how much memory is needed simply to hold and run the frozen base model itself throughout the process.

These two techniques work together naturally, because each addresses a different part of the overall memory challenge:

- **PEFT** addresses the memory required for the training and updating process itself.
- **Quantization** addresses the memory required simply to hold the base model in memory in the first place.

This is exactly why QLoRA, which combines both techniques, achieves such dramatic combined memory savings. It tackles both major sources of the total memory requirement at once.

---

## 9. 4-bit Training

We touched on numerical precision in the Week 12 quantization discussion. It's worth understanding 4-bit training as its own concrete example, since it represents an aggressive, extreme degree of precision reduction, and it is what QLoRA commonly uses in practice.

To understand what "4-bit" means, it helps to know that a model's internal numbers are normally stored using a larger number of bits, commonly around 16 or 32 bits per number in a model's original full-precision form. 4-bit training means representing each number using only 4 bits. This is a dramatic reduction in numerical precision, and it brings a correspondingly dramatic reduction in the memory required.

The remarkable practical finding specific to QLoRA's approach is that this aggressive precision reduction, when carefully combined with some additional technical refinements, can achieve results remarkably close in quality to higher-precision approaches, while delivering major memory savings. Two of those refinements are:

- Using a 4-bit number format (called NF4) that is particularly well suited to how a typical model's parameters are statistically distributed.
- Applying a further technique (called double quantization) that reduces a small amount of additional overhead.

This combination is a real part of why QLoRA has become such a widely used, practical approach across the industry.

---

## 10. 8-bit Training

8-bit training is a more moderate, less extreme degree of precision reduction than the 4-bit approach. It uses 8 bits to represent each number rather than 4, while still being considerably more memory-efficient than a model's original full-precision form.

Understanding when to choose 8-bit versus 4-bit involves a familiar, recurring tradeoff from this series:

- **8-bit** preserves somewhat more numerical precision than 4-bit. This can sometimes translate into slightly better final model quality, or improved training stability for especially demanding or sensitive tasks. But it requires meaningfully more memory than 4-bit.
- **4-bit** achieves even more dramatic memory savings, but carries a somewhat greater risk of a small reduction in final model quality for especially demanding tasks.

In practice, the right choice generally comes down to a team's available hardware, weighed against how much importance they place on achieving the highest possible final quality for their use case. Many teams start by trying the more aggressive, more memory-efficient 4-bit approach first, since it is more accessible and affordable. They then move up to the higher-precision 8-bit approach only if the 4-bit attempt doesn't achieve the quality they hoped for.

---

## 11. Efficient GPU Utilization

We've covered several important individual techniques in this explanation, including LoRA, quantization, and the various precision-reduction approaches. Efficient GPU utilization is the broader practice of combining these techniques thoughtfully, to make the most out of a team's limited GPU resources.

A few additional practical techniques are worth knowing about:

- **Gradient checkpointing** is a clever technique that trades a small amount of extra computation time for meaningfully lower memory usage. Instead of storing every piece of intermediate information generated throughout training, which consumes a lot of memory, it stores only certain key points along the way. It recalculates whatever else it needs later, on demand. (Don't confuse this with the model checkpoints from the previous explanation, which are saved snapshots of the model itself.)
- **Choosing an appropriate batch size** matters enormously too, connecting back to the hyperparameter tuning concepts from the previous explanation. A larger batch size generally trains somewhat faster, but requires more memory. Finding the largest batch size that still fits comfortably within the available GPU memory is a common, practical, everyday optimization goal.

The broader theme running through this whole explanation, and through this whole Week 13 material, is that fine-tuning doesn't have to require the enormous infrastructure that full-scale model pretraining requires (connecting back to the Week 12 GPU infrastructure material). By thoughtfully combining several of these techniques, including PEFT approaches like LoRA, quantization, and careful memory management, meaningful fine-tuning work has become dramatically more accessible to regular developers and smaller, more modestly resourced teams than it was even a few short years ago.

---

## 12. Fine-Tuning Best Practices

To close out this Week 13 material, it's worth pulling together the recurring threads from both explanations into one final, practical summary of good, sound fine-tuning practice.

- **Start by asking seriously whether fine-tuning is necessary at all,** before committing real effort to it. Connecting back to the earliest explanations in this series, a well-crafted prompt or a well-designed RAG system can very often accomplish much of what a team might otherwise assume requires fine-tuning, at dramatically lower cost and complexity.
- **Invest serious effort in dataset quality,** connecting back to the dataset preparation and dataset cleaning concepts from the previous explanation. A smaller but carefully curated, high-quality dataset will quite reliably outperform a much larger but sloppier one.
- **Start with parameter-efficient techniques like LoRA or QLoRA by default,** rather than automatically reaching for full fine-tuning. Given how closely PEFT approaches now typically match full fine-tuning in final quality, the dramatic savings in cost and complexity make PEFT the sensible default starting point for the overwhelming majority of practical use cases.
- **Evaluate rigorously,** connecting back to the evaluation metrics concepts from the previous explanation. Always hold out a proper, separate validation set, and resist the temptation to eyeball a handful of example outputs and assume everything turned out fine.
- **Watch carefully for overfitting,** connecting back to the hyperparameter tuning discussion from the previous explanation. A model that performs well on its own training data but much worse on new, unseen data hasn't learned the intended broader pattern. It has simply memorized its training examples.
- **Treat fine-tuning as one tool within a broader toolkit,** not as a magic, universal solution. As this series has shown, the best real-world AI systems typically combine several approaches thoughtfully: well-crafted prompting, well-designed RAG, carefully targeted fine-tuning where it adds real value, and robust surrounding infrastructure. They don't rely on any single approach alone.
