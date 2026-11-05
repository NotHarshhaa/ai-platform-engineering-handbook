# Fine-Tuning Fundamentals

## The Big Picture First

Throughout almost this entire series, we've treated the underlying language model as a fixed, unchanging thing. You connect to it through an API, prompt it cleverly, and build tools and RAG systems around it, but you never modify it directly. Fine-tuning is something different: actually changing the model itself, by adjusting its internal learned parameters, so that it behaves differently going forward in every future conversation, without needing to be re-instructed through a prompt each time.

Here is a useful way to think about the relationship between prompting and fine-tuning:

- **Prompting** is like giving someone very detailed, careful instructions right before they start a specific task. It's helpful, but it has to be repeated every single time.
- **Fine-tuning** is more like training and coaching that same person over time, so the new behavior becomes a natural, built-in part of how they approach things, without being told again each time.

Let's build up an understanding of how this works.

---

## 1. Transfer Learning

Transfer learning is the foundational concept that makes fine-tuning possible, so it's worth understanding clearly before anything else. The core idea is this: rather than training a brand new AI model from scratch every time you want it to do something new, you start with a model that has already been trained on something else, and you adapt that existing knowledge toward your own new purpose.

The reasoning is intuitive once you see it laid out. When a large language model is originally trained, it doesn't just learn to answer specific questions. It learns a huge range of broader, more transferable things along the way: how grammar and language structure work, general facts about the world, how to reason through problems logically, and how to follow instructions. A large portion of this general knowledge turns out to be useful for all sorts of more specific downstream tasks, even ones the model was never directly trained on. Transfer learning is the principle of taking advantage of this existing general knowledge, instead of wastefully throwing it away and starting from zero every time.

This matters enormously in practice because training a large language model completely from scratch is extraordinarily expensive. It requires massive amounts of training data and computing power, connecting directly back to the GPU infrastructure material from the previous Week 12 explanations. Fine-tuning, which we'll get into next, is transfer learning applied specifically to large language models. It takes an already fully trained model and further adapts it, which requires dramatically less additional data and computing power than training an entirely new model from scratch.

---

## 2. Fine-Tuning Fundamentals

Now that we understand transfer learning as the underlying principle, let's get specific about what fine-tuning involves. Fine-tuning means taking an already-trained language model and continuing its training, but now using a smaller, more focused dataset designed to adjust the model's behavior in a particular, deliberate direction.

Here is a helpful way to think about what is physically happening at a technical level. A language model's entire "knowledge" and "behavior" is encoded in an enormous number of internal numerical values, generally called parameters or weights. These are the specific numbers that determine exactly how the model processes and responds to any input. During the model's original training, these numbers are carefully adjusted, over and over, based on an enormous amount of training data, until the model becomes good at predicting text accurately. Fine-tuning takes those already-adjusted numbers as a starting point, and then adjusts them a bit more, based on your own new, more focused dataset. This nudges the model's existing behavior in a specific, deliberate new direction, without throwing away the vast general knowledge and capability it already has.

Why would you want to do this, rather than rely purely on clever prompting, which we've spent so much of this series discussing? There are a few good reasons:

- **Consistent style and tone.** Fine-tuning can teach a model a particular style or tone more reliably than prompting alone, especially across long, extended usage.
- **Consistent output format.** It can teach a model to reliably follow a specific output format, without repeating the same formatting instruction in every prompt.
- **Better performance on a narrow task.** It can make a model meaningfully better at a particular task than the original general-purpose base model, especially for tasks quite different from what the model was typically trained on.

---

## 3. Instruction Tuning

Instruction tuning is a specific type of fine-tuning, and it's worth understanding well because it's the kind of fine-tuning that turned earlier, rawer language models into the helpful, conversational assistants we all use today.

Here is the distinction to understand. A model's original, initial training (often called "pretraining") mostly involves learning to predict the next likely word across an enormous amount of general text from the internet and other large sources. A model trained only this way is quite good at generating fluent, statistically plausible text. But it isn't specifically trained to be helpful, to follow explicit instructions, or to behave the way a useful conversational assistant should.

Instruction tuning addresses this gap. It involves further training a model on a large collection of examples that show what a good, helpful response looks like, given an explicit instruction or question.

The real-world effect is dramatic. A model that has only been pretrained might respond to "explain photosynthesis" by generating more similar-sounding questions, since that's statistically what often follows that kind of text on the internet. An instruction-tuned model understands that this input is a request for a helpful explanation, and responds accordingly. This transformation, from a model that predicts likely-sounding text into one that tries to be helpful and follow what is being asked, is largely the result of instruction tuning, combined with further alignment techniques that typically come after it.

---

## 4. Domain Adaptation

Domain adaptation is a specific use of fine-tuning where the goal is to make a model meaningfully better at working within a particular specialized field or industry, such as law, medicine, or finance, or a particular company's own internal terminology and way of doing things.

Here is the problem it addresses. A general-purpose language model is trained on a broad range of text from across the internet. It knows at least a little about almost everything, but may lack real depth in any one specialized area. A model asked to help draft a legal contract, for example, may lack familiarity with the specific conventions, terminology, and stylistic norms that real legal documents require. Domain adaptation addresses this by further fine-tuning the model on text representative of the target domain. For example, you might fine-tune on a large collection of real legal documents, to improve the model's understanding of, and fluency with, legal language and conventions.

It's worth understanding how domain adaptation relates to, and differs from, the RAG concepts covered earlier in this series:

- **RAG** gives a model access to specific external information at the moment of a query. It's great for injecting particular facts and current information.
- **Domain adaptation** changes how the model itself fundamentally behaves and "thinks." It improves the model's inherent style, tone, and general familiarity with a specialized area, in a way that persists across every future interaction, instead of only when a relevant document happens to be retrieved.

In practice, the two approaches are often sensibly combined. Domain adaptation improves a model's general fluency and tone within a specialized field, while RAG separately supplies the specific, up-to-date facts that the field's work requires.

---

## 5. Dataset Preparation

Dataset preparation is the practical work of assembling the collection of examples that will be used to fine-tune a model. It's worth knowing upfront that this part often ends up being the most time-consuming part of a fine-tuning project, and arguably the most important.

A fine-tuning dataset typically consists of a large number of individual examples. Each one generally shows a particular input (such as a question or an instruction) paired with the desired output, meaning the kind of response you want the model to learn to produce for that input. The quality of these examples matters enormously. A model fine-tuned on well-written, consistent, accurate examples will learn to produce well-written, consistent, accurate outputs. A model fine-tuned on sloppy, inconsistent, or error-filled examples will learn to reproduce exactly those same problems.

Good dataset preparation involves several considerations working together:

- **Representativeness.** The dataset needs to cover the full range of situations the model will actually encounter once deployed, not just a narrow, limited subset of them.
- **Diversity.** Including a wide, varied range of phrasings and scenarios helps the model learn to generalize well, rather than rigidly memorizing a few specific patterns.
- **Appropriate volume.** Fine-tuning generally requires dramatically less data than a model's original training. But you still need enough representative examples for the model to reliably learn the intended pattern, rather than picking up on a few quirks that happen to appear in a collection that is too small.

---

## 6. Dataset Cleaning

Dataset cleaning is closely related to dataset preparation, but it's worth understanding as its own distinct step. It focuses on identifying and removing or fixing problems within a dataset, rather than the broader task of assembling the dataset in the first place.

This step matters enormously because of a well-known principle in data work: "garbage in, garbage out." If a fine-tuning dataset contains factual errors, inconsistent formatting, duplicate entries, or irrelevant, off-topic examples, the resulting fine-tuned model will tend to pick up and reproduce exactly those problems in its outputs.

Good dataset cleaning involves several practical tasks:

- **Removing duplicates.** The same, or very similar, example repeated many times can cause a model to over-emphasize that pattern, relative to other equally important but less frequently repeated examples.
- **Fixing formatting inconsistencies.** All examples should follow the same general structure, so the model learns a consistent pattern, rather than getting confused by varying formatting that has nothing to do with the substance of what is being taught.
- **Removing low-quality or incorrect examples.** Connecting back to "garbage in, garbage out," a careful manual or automated review to catch and remove wrong or misleading examples before they influence the model's final learned behavior is critical.
- **Checking for bias.** This connects back to the bias detection concepts from the earlier Week 9 material. A dataset that systematically favors certain perspectives, or underrepresents certain groups, will tend to produce a similarly biased fine-tuned model.

---

## 7. Tokenization for Training

We touched on tokenization early on, in the very first LLM APIs explanation, in the context of token usage and API costs. It's worth revisiting here in the training context, where it plays a somewhat different but equally important role during fine-tuning.

Recall that tokenization is the process of breaking text down into smaller pieces (tokens) that a language model can work with directly. Models fundamentally operate on these numerical token representations, not on raw human-readable text. During fine-tuning, every one of your carefully prepared, carefully cleaned dataset examples needs to be converted into this tokenized format. It has to be converted using the exact same tokenizer the underlying base model was originally trained with.

A few practical considerations become especially important in this training context:

- **Consistency.** Using a different tokenizer, or even a slightly mismatched version of the same tokenizer, than the one the base model was originally trained with can cause significant problems. The model's existing learned knowledge is built around that exact tokenization scheme.
- **Sequence length limits.** Connecting back to the context window concept from the earlier LLM APIs explanation, each training example needs to fit within the model's maximum sequence length. Deciding how to handle examples that are too short or too long (through padding or truncation, respectively) affects the quality of the final fine-tuned model.
- **Marking input versus output.** The training process needs to know which parts of an example represent the input and which represent the desired output. It needs to understand which parts it should learn to generate, and which parts simply provide surrounding context.

---

## 8. Hyperparameter Tuning

Hyperparameters are the configuration settings that control how the training process itself proceeds. They are distinct from the model's learned parameters (the internal numerical weights discussed in the Fine-Tuning Fundamentals section above). Hyperparameters are the knobs and dials that a human developer sets before training even begins.

A few particularly important hyperparameters are worth understanding:

- **Learning rate** controls how large a step the training process takes each time it adjusts the model's internal parameters. Think of it like the size of a stride when walking toward a destination. If the stride is too large, you risk overshooting your destination repeatedly. If it is too small, it takes an impractically long time to get there at all.
- **Training epochs** is the number of times the training process goes back through the entire dataset. With too few epochs, the model may not learn the intended pattern well enough. With too many, the model risks a problem called "overfitting," where it starts to rigidly memorize the specific training examples instead of learning the broader, more useful pattern they were meant to teach.
- **Batch size** is the number of individual training examples processed together, at once, before the model's internal parameters are updated again.

Finding the right combination of these settings is often as much an art as a precise science. There isn't a single universally correct set of values that works for every situation. Finding a good combination typically requires running several separate training attempts with slightly different settings, and then carefully comparing the results. This connects back to the evaluation concepts covered as their own topic later in this explanation.

---

## 9. Training Pipelines

A training pipeline is the complete, end-to-end sequence of steps involved in taking a prepared dataset all the way through to producing a finished, fine-tuned model. It connects together essentially all the individual pieces we've discussed in this explanation into one unified, working system.

A typical, well-organized training pipeline includes several stages in sequence:

1. **Data loading and preprocessing.** Take the cleaned, prepared dataset discussed above and convert it into the tokenized format the training process requires.
2. **The core training loop.** This is the repeated process of feeding batches of training examples through the model and measuring how far off its current outputs are from the desired outputs. The measurement uses something called a "loss function," which is the technical way of precisely measuring that difference. The training process then adjusts the model's internal parameters in the direction that should reduce that difference.
3. **Periodic evaluation checkpoints.** Along the way, the pipeline regularly checks how well the model is progressing, connecting to the evaluation metrics topic covered later.
4. **Saving the final model.** Finally, the pipeline carefully saves the resulting fine-tuned model, ready to be deployed and used.

Well-built training pipelines also typically include automation and reliability safeguards. These include automatically saving intermediate progress along the way (connecting to the model checkpoints topic covered next), and handling unexpected failures gracefully, without having to restart the entire training process from scratch. This connects back to some of the same reliability concerns discussed in the Ray Train section of the previous Week 12 explanation.

---

## 10. Model Checkpoints

A model checkpoint is a saved snapshot of a model's internal state, captured at a particular point during training. It allows a team to go back and resume from that saved point later, rather than always restarting the entire training process from the very beginning.

Why does this matter so much in practice? There are two good reasons:

- **Protection against failures.** Large training runs can take a considerable amount of time to complete, and things can go wrong partway through. A machine might crash, or an unexpected error might occur. With regular checkpoints saved along the way, a team can resume from the most recent one instead of losing all the prior training progress and starting over from the beginning.
- **Comparing different points along the way.** As discussed in the hyperparameter tuning section, too much training can sometimes make a model worse (through overfitting). Having several checkpoints captured at different points during training lets a team compare how the model was performing at each point, and then pick whichever checkpoint performed best, rather than automatically using whichever one happened to be last.

In practice, teams typically save checkpoints at regular intervals throughout training. For example, they might save one after every completed epoch, or after a fixed number of training steps. This does require additional storage space, since each checkpoint contains a complete copy of the model's current state. So teams need to balance how often to save checkpoints against the storage cost of doing so.

---

## 11. Evaluation Metrics

We covered AI evaluation thoroughly in the earlier Week 9 material, in the broader context of evaluating already-deployed AI systems. Evaluation metrics, in this fine-tuning context, are the more specific measurements used to assess how well a model is performing during and right after the fine-tuning process.

A few considerations become especially relevant in this training context:

- **Held-out validation data.** A standard, important practice is to deliberately set aside a portion of the prepared dataset, keeping it entirely separate and never using it directly during training. It is then used afterward to evaluate how well the resulting model performs on new, previously unseen examples. This helps reveal whether the model has learned the intended broader pattern well, or has simply memorized its own training examples (connecting back to the overfitting concern above).
- **Task-specific metrics.** Depending on what task the model is being fine-tuned for, different measurements are appropriate. A model fine-tuned for classification might be measured using accuracy. A model fine-tuned for text generation might need the more subjective, nuanced quality evaluation discussed in the earlier RAG evaluation and AI evaluation explanations.

The core goal running through all of this evaluation work is the same one emphasized throughout this series: you can't reliably know whether a fine-tuning effort succeeded without a solid, reliable way of measuring it. A team that skips evaluation, and simply assumes their fine-tuned model turned out well based on a vague gut feeling, risks deploying a model that either didn't learn what it was supposed to, or that picked up an unintended problem along the way, such as overfitting or bias, that nobody checked for.

---

## 12. Training Optimization

Training optimization is the broad collection of techniques used to make the fine-tuning process faster, cheaper, and more efficient overall. It connects back to many of the same infrastructure concepts covered throughout the previous Week 12 material.

A few particularly important techniques are worth understanding:

- **Mixed precision training** means deliberately using lower numerical precision for certain parts of the training calculation. It is related to the idea behind quantization from the earlier Week 12 material, though the two are not the same thing. Quantization usually compresses a model's stored values, while mixed precision changes the number format used during training calculations. It can considerably reduce memory use and training time, at the cost of only a small, often barely noticeable reduction in the final model's quality.
- **Gradient accumulation** is a clever technique that lets a team effectively simulate using a larger batch size than would physically fit in a GPU's memory. It does this by accumulating several smaller partial updates first, and then applying them all together at once.
- **Parameter-efficient fine-tuning** techniques are an especially important broader approach. A particularly well-known example is LoRA (short for "Low-Rank Adaptation"). Instead of updating every one of a model's enormous number of internal parameters during fine-tuning, which requires considerable memory and computation, these techniques update only a small, carefully chosen set of additional parameters, and keep the vast majority of the original model's parameters frozen and unchanged. This can dramatically reduce the memory and computation needed for fine-tuning, often by a large margin, while achieving results that remain comparable in quality to updating the entire model.

Given how expensive the underlying GPU infrastructure from the previous Week 12 material is, these optimization techniques matter enormously in practice. They often make the difference between fine-tuning being practically affordable and accessible for a smaller team, and being prohibitively expensive and out of reach entirely.
