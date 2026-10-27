# Computer Vision & Image Models

## The Big Picture First

Everything covered throughout most of this course has focused on text — language models reading and generating words. But a huge amount of the world's useful information isn't text at all — it's photographs, scanned documents, charts, diagrams, medical scans, product images. Multimodal AI is the broad field specifically concerned with building AI systems that can work with these other kinds of information, not just text alone. This explanation focuses on the visual side of that broader picture — how AI systems learn to see, understand, and even generate images. It's worth understanding this as building on the exact same underlying foundations we've covered throughout this course (neural networks, embeddings, transformers), just applied to a genuinely different, visual kind of data.

---

## 1. Multimodal AI Fundamentals

Multimodal AI refers to AI systems that can work with more than one kind of information at once — "modality" here just means a particular type or format of data, like text, images, audio, or video. A multimodal system is one that can understand, combine, or generate across several of these different modalities together, rather than being limited to just one kind of data alone.

Here's the reasoning behind why this capability matters so much. Recall from throughout this course that a language model fundamentally works by processing tokens — connecting back to our tokenization discussion in Week 6's Foundations of Generative AI material. The genuinely clever insight that makes multimodal AI possible is that images, and other non-text data, can also be converted into a similar kind of numerical representation that a model can work with, using the exact same underlying mathematical machinery originally built for processing text. Rather than needing an entirely separate, completely unrelated kind of AI system just to handle images, modern multimodal systems find clever ways to represent visual information in a form that fits naturally alongside text, within the same underlying model architecture.

An important distinction worth understanding here is between systems that can just *understand* multiple modalities (like looking at an image and answering a question about it) versus systems that can *generate* content in a different modality than what they received as input (like taking a text description and producing a brand new image from it). Both capabilities matter, and we'll cover examples of each throughout the rest of this explanation.

---

## 2. Vision Transformers (ViT)

We've covered the transformer architecture conceptually throughout many parts of this course, particularly in how language models process text. Vision Transformers, often shortened to ViT, apply this exact same underlying transformer architecture directly to images, rather than to text.

Here's the genuinely clever core insight behind how this works. Recall that a transformer processes a sequence of tokens, paying attention to how different tokens relate to each other. An image, though, isn't naturally a sequence at all — it's a two-dimensional grid of pixels. The genuinely clever trick behind Vision Transformers is to cut an image up into a grid of small, fixed-size patches (think of literally chopping a photograph up into a grid of small square tiles), and then treat each patch somewhat like a token — connecting back to the tokenization concepts from Week 6. The model then applies that exact same underlying attention mechanism across these image patches, learning which patches genuinely relate to which others, in order to understand the overall image as a coherent whole.

The remarkable, practical payoff of this approach is that it lets the same fundamental transformer architecture that revolutionized language modeling also achieve genuinely excellent results on vision tasks, and it's become the foundational building block underlying a great many of the modern vision capabilities we'll cover throughout the rest of this explanation. It's worth appreciating this as a beautiful, concrete example of a recurring theme in AI research — a powerful underlying idea, originally developed for one kind of problem, turning out to generalize remarkably well to a different kind of problem entirely.

---

## 3. CLIP

CLIP (which stands for Contrastive Language-Image Pretraining) is a genuinely influential model, originally developed by OpenAI, specifically designed to learn a shared understanding between images and text together — connecting back to the vector embeddings concept from our earlier RAG Foundations explanation.

Here's the genuinely clever core idea behind how CLIP works. Recall from our earlier RAG explanations that an embedding is a way of converting a piece of content into a list of numbers, positioned so that similar content ends up with similar numbers. CLIP extends this same idea across two different modalities at once — it's trained on an enormous number of paired images and their text captions, and it learns to place an image's embedding and its matching caption's embedding close together in that same shared numerical space, while placing mismatched image-text pairs considerably further apart.

The remarkable, practical payoff is that it lets you search for images using plain, natural-language text queries, and vice versa — connecting back to the semantic search concept from RAG Foundations, just extended across two different modalities at once. You could search a large collection of images using the text query "a dog playing in the snow," and CLIP would help you find the images whose content genuinely matches that description well, even if none of those images ever had that exact phrase attached to them as a literal caption. This capability underlies a great many of the multimodal search and multimodal RAG capabilities we touched on in the Advanced RAG explanation.

---

## 4. OCR Fundamentals

OCR (Optical Character Recognition) refers to the foundational technology designed to detect and extract readable text from within an image — connecting forward to the document understanding topic we'll cover shortly below, since OCR is very often the essential first step that makes document understanding possible in the first place.

Here's the underlying problem OCR solves. A scanned document, or a photograph containing text (like a photo of a street sign, or a screenshot of a document), is, from a computer's perspective, just a grid of pixels — it has no inherent understanding that certain groups of those pixels represent the letter "A," or the word "invoice." OCR technology is specifically designed to bridge this gap — detecting where text appears within an image, and converting those visual patterns into genuine, usable machine-readable text that the rest of an AI system can then work with directly, the same way it would work with any other piece of text.

Modern OCR systems need to handle a great many real, practical challenges — varied fonts, poor image quality, skewed or rotated text, and complex layouts involving multiple columns or embedded tables. Modern, sophisticated OCR increasingly leverages the same vision transformer techniques we covered above, rather than relying purely on older, more traditional pattern-matching approaches, which has considerably improved its accuracy, particularly on messy, real-world documents — connecting back to the data cleaning concepts from Week 2, since OCR is very often one of the very first, essential steps in turning messy, real-world scanned documents into usable, clean data.

---

## 5. Image Captioning

Image captioning refers to the specific capability of generating a natural-language text description of what's depicted within an image — connecting back to the multi-modal RAG concept from the Advanced RAG explanation, since image captioning is very often one of the practical building blocks that makes multi-modal RAG possible.

Here's the underlying process worth understanding clearly. A well-built image captioning system typically combines two distinct capabilities together — connecting back to the Vision Transformer concept above, it first processes an image to understand its visual content, and it then uses a language-generation capability (connecting back to how language models generate text, covered throughout this course) to produce a fluent, natural-language description of what it observed within that image.

This capability has a great many practical applications worth being aware of. It helps make visual content accessible to people who are blind or visually impaired, by providing a spoken or written description of what an image shows. It helps make a large collection of images searchable, connecting back to the CLIP discussion above, by providing text descriptions that a traditional, text-based search system can work with directly. And it serves as a useful building block within larger, more complex multimodal systems — for example, an agent (connecting back to our Week 8 explanations) that's been given a screenshot as part of a larger task might use image captioning internally, as one step, to understand what's shown on that screen, before deciding what action to take next.

---

## 6. Object Detection

Object detection refers to the specific computer vision capability of identifying not just *what* objects are present within an image, but also *where* within that image each object is located — typically represented by drawing a rectangular "bounding box" tightly around each detected object.

Here's the important distinction worth understanding clearly, between object detection and the image classification concept we'll cover just next, right below. Image classification answers the simpler, more general question "what is this image, overall, primarily of" — for example, classifying an entire image as simply "a photo of a cat." Object detection instead answers the more detailed, more specific question "what objects are present within this image, and where exactly is each one located" — for example, identifying that an image contains three separate people, a car, and a dog, each one with its own specific location marked out clearly within the overall image.

Object detection has a great many practical, important applications — it's foundational to self-driving vehicle systems (needing to detect exactly where other vehicles, pedestrians, and road signs are located, in real time), foundational to retail and inventory systems (detecting which products are present on a store shelf, and exactly where), and foundational to security and surveillance systems as well. Connecting back to the ethical considerations we covered in Week 12's governance material, object detection technology carries real, meaningful privacy and ethical considerations worth being thoughtfully aware of, particularly when it's applied to detecting and tracking real, human individuals.

---

## 7. Image Classification

Image classification refers to the foundational computer vision capability of assigning an image to one, or sometimes several, predefined categories — connecting back to the general classification concept we touched on in Week 2's Python for Data & ML material, just now applied to actual image data.

Here's a helpful, concrete way to understand what this capability involves in practice. Imagine you have a large collection of medical scan images, and you want a system to classify each individual scan as either "showing signs of a particular condition" or "not showing signs of that condition." Image classification is precisely this kind of task — taking a whole image as its input, and producing one (or sometimes several) category labels as its output.

Image classification represents one of the earliest, and most well-established, computer vision capabilities, and it remains foundational to a great many practical applications — sorting a large collection of photos automatically, flagging potentially inappropriate content for content moderation purposes (connecting back to the content moderation concepts from Week 10's safety and guardrails material), and assisting medical professionals by flagging scans that warrant a closer, more careful human review. Connecting back to the bias and fairness concepts we covered in Week 12's governance material, image classification systems need real, careful evaluation to ensure they're performing fairly and reliably across diverse populations and conditions, rather than performing well only for whatever narrow subset of images happened to be well-represented in their original training data.

---

## 8. Image Embeddings

We covered vector embeddings in enormous depth in our RAG Foundations explanation, specifically in the context of text. Image embeddings apply that exact same underlying concept directly to images — connecting back to the CLIP discussion above, converting an image into a list of numbers, positioned so that similar images end up with similar numbers.

Here's why this capability matters so much, connecting back to the vector database material we covered in real depth in our earlier explanations. Just as text embeddings let you perform semantic search across a large collection of text documents, image embeddings let you perform that same kind of semantic search across a large collection of images instead — finding visually similar images, detecting duplicate or near-duplicate images within a large collection, or powering "find similar products" features in an e-commerce application.

Image embeddings get stored and searched using the exact same vector database technology we covered in our dedicated vector databases explanation — connecting back to the vector storage optimization and ANN search concepts from that same explanation. This technical overlap is precisely why multi-modal RAG (which we covered in the Advanced RAG explanation) works so naturally well in practice — the same underlying vector database infrastructure that already handles a system's text embeddings can handle its image embeddings too, all within that same shared, unified system.

---

## 9. Document Understanding

Document understanding refers to the broader, more comprehensive capability of extracting meaningful, structured information from complex documents — connecting back to the OCR discussion above, but going considerably further than plain text extraction alone, to understand a document's structure and layout as well.

Here's the important distinction worth understanding clearly. Simple OCR just extracts text — but a real-world document, like an invoice, a contract, or a medical form, has meaningful structure that plain text extraction alone loses entirely. An invoice has a specific total amount, a specific date, a specific vendor name, and a specific itemized list of purchased items, all arranged in a particular, meaningful layout. Document understanding goes beyond simple text extraction to understand this structure — recognizing that a particular number appearing in a particular location represents the "total amount," rather than merely being some arbitrary, isolated piece of extracted text.

This capability connects back to the structured outputs concept we covered in Week 9's tool calling material — a well-built document understanding system converts a messy, real-world document (like a scanned invoice) into a clean, properly structured format (like a Pydantic model, connecting back to our Week 2 material) that the rest of an AI application can then reliably work with directly. Document understanding powers a great many practical enterprise AI applications, connecting to the RAG applications and workflow automation categories we'll cover in Week 16's enterprise applications material — automating the tedious, manual data-entry work that would otherwise require a human employee to manually read and re-type information from a large volume of scanned paper documents.

---

## 10. Image Generation

Image generation refers to the distinctive capability of creating brand new images from scratch, typically based on a text description — connecting back to the earliest distinction we drew in the Multimodal AI Fundamentals section at the start of this explanation, between systems that just *understand* images versus systems that can genuinely *generate* new ones.

Here's a helpful, concrete way to understand what makes this capability so remarkably different from everything else we've covered in this explanation. Every other topic so far has involved taking an already-existing image and extracting some kind of information from it. Image generation instead works in the opposite direction — starting with nothing but a text description (like "a photorealistic image of a red bicycle leaning against a brick wall"), and producing an entirely new, genuinely original image that never existed before, specifically designed to match that description as closely and as faithfully as reasonably possible.

Modern image generation is predominantly powered by a particular technical approach called diffusion models, which we'll cover as their own dedicated topic just next, right below. Image generation also raises real, important considerations we've touched on elsewhere in this course — connecting back to the AI ethics concepts we covered in Week 12's governance material, image generation technology raises genuine, still actively-debated questions around artistic ownership, consent, training-data copyright, and potential misuse (like creating convincing but entirely fake images of real people or real events).

---

## 11. Diffusion Models

Diffusion models refer to the specific technical approach that powers most of today's leading image generation systems, and understanding the core underlying idea behind how they work is worth taking real time over, since it's a genuinely clever, if honestly somewhat counterintuitive, approach.

Here's the genuinely clever core idea behind how diffusion models work, explained as intuitively as possible. During their training process, these models learn by being shown real images that have had random visual "noise" gradually added to them, step by step, until the original image has become nothing but pure random static — think of this somewhat like gradually turning up the "grain" on a photograph, step by step, until the original, underlying image has become completely unrecognizable. The model learns to reverse this exact process — learning how to gradually remove that noise, step by step, recovering a clean, recognizable image back out of what started as pure, random static.

Once a model has learned this "denoising" capability well, generating a brand new image works by starting with pure random noise, and then applying that same learned denoising process repeatedly, step by step, gradually "sculpting" the random noise into a coherent, recognizable image — and, critically, guiding that step-by-step denoising process using a provided text description (connecting back to the CLIP-style shared text-image understanding we covered above), so the final image ends up matching that description well. This process happens across a great many small, gradual denoising steps, which is precisely why generating an image can take some real, meaningful amount of computational time and effort, connecting back to the GPU computing material we covered in Week 13.

---

## 12. Vision APIs

We've covered the general concept of LLM APIs in enormous depth in our dedicated Week 6 explanation. Vision APIs apply that exact same underlying pattern — sending a request over the internet to an AI provider's servers, and getting back a result — but now applied to image-related capabilities, rather than plain text alone.

In practical terms, most modern AI providers (connecting back to the ones we covered together in Week 6's LLM APIs material) offer vision capabilities directly as part of their existing API — meaning you can send both a piece of text and an image together, within the same single request, and the underlying model will process both together, as one combined, unified input. This capability connects back to essentially every technique we've discussed throughout this explanation — the underlying model uses vision transformer techniques (connecting back to our earlier discussion) to process the provided image, and it can then answer questions about it, extract text from it (connecting back to the OCR discussion), or describe it in detail (connecting back to the image captioning discussion), all through the same single, familiar API pattern we've covered throughout this course.

Using a vision API well in practice connects back to essentially everything we've discussed throughout this course regarding proper API usage — carefully managing cost (since image processing very often costs meaningfully more than plain text processing alone, connecting back to the token usage concepts from Week 6), carefully handling errors and retries (connecting back to the error handling patterns from Week 2's GenAI application material), and carefully considering latency (since image processing can take meaningfully longer than plain text processing alone, connecting back to the latency optimization concepts from Week 10's LLMOps material). This final integration is precisely what brings the entire multimodal AI capability we've covered throughout this explanation directly into the same practical, everyday application-building toolkit we've been building throughout this course, letting a skilled AI engineer combine text and visual understanding together, seamlessly, within one unified AI application.
