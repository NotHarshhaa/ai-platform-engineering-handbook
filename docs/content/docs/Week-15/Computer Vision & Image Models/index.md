---
title: "Computer Vision & Image Models"
description: "AI Platform Engineering Handbook - Week 15 - Computer Vision & Image Models"
weight: 141
toc: true
---

---

# Computer Vision & Image Models

## The Big Picture First

Most of this course has focused on text: language models reading and generating words. But a huge amount of the world's useful information isn't text at all. It is photographs, scanned documents, charts, diagrams, medical scans, and product images. Multimodal AI is the broad field concerned with building AI systems that can work with these other kinds of information, not just text.

This explanation focuses on the visual side of that picture: how AI systems learn to see, understand, and even generate images. It's worth understanding this as building on the same underlying foundations covered throughout this course (neural networks, embeddings, transformers), applied to a different, visual kind of data.

---

## 1. Multimodal AI Fundamentals

Multimodal AI refers to AI systems that can work with more than one kind of information at once. "Modality" here just means a type or format of data, like text, images, audio, or video. A multimodal system can understand, combine, or generate across several of these modalities together, rather than being limited to one kind of data.

Here is why this capability matters so much. Recall that a language model works by processing tokens, connecting back to the tokenization discussion in the Week 6 Foundations of Generative AI material. The clever insight that makes multimodal AI possible is that images, and other non-text data, can also be converted into a similar kind of numerical representation that a model can work with, using the same mathematical machinery originally built for processing text. Instead of needing an entirely separate, unrelated kind of AI system just to handle images, modern multimodal systems find ways to represent visual information in a form that fits naturally alongside text, within the same underlying model architecture.

An important distinction is between two kinds of capability:

- Systems that **understand** multiple modalities, like looking at an image and answering a question about it.
- Systems that **generate** content in a different modality than their input, like taking a text description and producing a brand new image from it.

Both matter, and we'll cover examples of each throughout this explanation.

---

## 2. Vision Transformers (ViT)

We've covered the transformer architecture throughout many parts of this course, particularly in how language models process text. Vision Transformers, often shortened to ViT, apply the same transformer architecture directly to images, rather than to text.

Here is the core insight behind how this works. A transformer processes a sequence of tokens, paying attention to how different tokens relate to each other. But an image isn't naturally a sequence at all. It is a two-dimensional grid of pixels. The clever trick behind Vision Transformers is to cut an image into a grid of small, fixed-size patches. Think of literally chopping a photograph into small square tiles. Each patch is then treated somewhat like a token, connecting back to the tokenization concepts from Week 6. The model applies the same attention mechanism across these image patches, learning which patches relate to which others, in order to understand the overall image as a coherent whole.

The practical payoff is that the same fundamental architecture that revolutionized language modeling also achieves excellent results on vision tasks. It has become the foundational building block underlying many of the modern vision capabilities covered in the rest of this explanation. It's also a good, concrete example of a recurring theme in AI research: a powerful idea, originally developed for one kind of problem, turns out to generalize remarkably well to a different kind of problem.

---

## 3. CLIP

CLIP (short for Contrastive Language-Image Pretraining) is an influential model, originally developed by OpenAI. It is designed to learn a shared understanding between images and text together, connecting back to the vector embeddings concept from our earlier RAG Foundations explanation.

Here is the core idea behind how CLIP works. Recall from the RAG explanations that an embedding converts a piece of content into a list of numbers, positioned so that similar content ends up with similar numbers. CLIP extends this idea across two modalities at once. It is trained on an enormous number of paired images and their text captions. It learns to place an image's embedding and its matching caption's embedding close together in the same shared numerical space, while placing mismatched image-text pairs much further apart.

The practical payoff is that it lets you search for images using plain, natural-language text queries, and vice versa. This connects back to the semantic search concept from RAG Foundations, extended across two modalities. You could search a large collection of images with the text query "a dog playing in the snow." CLIP would help find the images whose content matches that description well, even if none of them ever had that exact phrase attached as a caption. This capability underlies many of the multimodal search and multimodal RAG capabilities touched on in the Advanced RAG explanation.

---

## 4. OCR Fundamentals

OCR (Optical Character Recognition) is the foundational technology designed to detect and extract readable text from within an image. It connects forward to the document understanding topic covered below, since OCR is very often the essential first step that makes document understanding possible.

Here is the problem OCR solves. A scanned document, or a photograph containing text (like a street sign, or a screenshot of a document), is just a grid of pixels from a computer's perspective. It has no inherent understanding that certain groups of pixels represent the letter "A," or the word "invoice." OCR bridges this gap. It detects where text appears within an image, and converts those visual patterns into usable, machine-readable text that the rest of an AI system can work with directly, like any other text.

Modern OCR systems have to handle many practical challenges:

- Varied fonts.
- Poor image quality.
- Skewed or rotated text.
- Complex layouts with multiple columns or embedded tables.

Modern, sophisticated OCR increasingly uses the same vision transformer techniques covered above, rather than relying only on older, more traditional pattern-matching approaches. This has considerably improved its accuracy, particularly on messy, real-world documents. It connects back to the data cleaning concepts from Week 2, since OCR is very often one of the first, essential steps in turning messy, scanned documents into clean, usable data.

---

## 5. Image Captioning

Image captioning is the capability of generating a natural-language text description of what an image depicts. It connects back to the multi-modal RAG concept from the Advanced RAG explanation, since image captioning is often one of the practical building blocks that makes multi-modal RAG possible.

Here is the underlying process. A well-built image captioning system typically combines two capabilities:

1. **Visual understanding.** Connecting back to the Vision Transformer concept above, it first processes the image to understand its visual content.
2. **Language generation.** Connecting back to how language models generate text, it then produces a fluent, natural-language description of what it observed.

This capability has many practical applications:

- It helps make visual content accessible to people who are blind or visually impaired, by providing a spoken or written description of what an image shows.
- It helps make a large collection of images searchable, connecting back to the CLIP discussion above, by providing text descriptions that a traditional, text-based search system can work with directly.
- It serves as a building block within larger multimodal systems. For example, an agent (connecting back to our Week 8 explanations) that has been given a screenshot as part of a larger task might use image captioning internally to understand what is on the screen, before deciding what action to take next.

---

## 6. Object Detection

Object detection is the computer vision capability of identifying not just *what* objects are present in an image, but also *where* each object is located. The location is typically shown by drawing a rectangular "bounding box" tightly around each detected object.

Here is the important distinction between object detection and the image classification concept covered next:

- **Image classification** answers the simpler, more general question "what is this image, overall, primarily of?" For example, it might classify an entire image as "a photo of a cat."
- **Object detection** answers the more detailed question "what objects are present in this image, and where exactly is each one?" For example, it might identify that an image contains three separate people, a car, and a dog, each with its own specific location marked in the image.

Object detection has many important practical applications. It is foundational to self-driving vehicle systems, which need to detect where other vehicles, pedestrians, and road signs are, in real time. It is foundational to retail and inventory systems, which need to detect which products are on a store shelf, and where. It is also foundational to security and surveillance systems. Connecting back to the ethical considerations from the Week 12 governance material, object detection carries real privacy and ethical considerations worth being thoughtfully aware of, particularly when it is applied to detecting and tracking real people.

---

## 7. Image Classification

Image classification is the foundational computer vision capability of assigning an image to one, or sometimes several, predefined categories. It connects back to the general classification concept from the Week 2 Python for Data & ML material, applied here to image data.

Here is a concrete way to understand what this involves. Imagine a large collection of medical scan images, where you want a system to classify each scan as either "showing signs of a particular condition" or "not showing signs of that condition." Image classification is exactly this kind of task. It takes a whole image as input, and produces one (or sometimes several) category labels as output.

Image classification is one of the earliest and most well-established computer vision capabilities, and it remains foundational to many practical applications:

- Automatically sorting a large collection of photos.
- Flagging potentially inappropriate content for content moderation (connecting back to the content moderation concepts from the Week 10 safety and guardrails material).
- Assisting medical professionals by flagging scans that warrant closer human review.

Connecting back to the bias and fairness concepts from the Week 12 governance material, image classification systems need careful evaluation to make sure they perform fairly and reliably across diverse populations and conditions. Otherwise, they may perform well only for the narrow subset of images that happened to be well represented in their training data.

---

## 8. Image Embeddings

We covered vector embeddings in depth in our RAG Foundations explanation, in the context of text. Image embeddings apply the same underlying concept to images. Connecting back to the CLIP discussion above, an image is converted into a list of numbers, positioned so that similar images end up with similar numbers.

Here is why this capability matters, connecting back to the vector database material covered earlier. Just as text embeddings let you do semantic search across a large collection of text documents, image embeddings let you do the same kind of semantic search across a large collection of images. Examples include:

- Finding visually similar images.
- Detecting duplicate or near-duplicate images within a large collection.
- Powering "find similar products" features in an e-commerce application.

Image embeddings are stored and searched using the same vector database technology covered in our dedicated vector databases explanation, connecting back to the vector storage optimization and ANN search concepts from that explanation. This technical overlap is exactly why multi-modal RAG (covered in the Advanced RAG explanation) works so naturally in practice. The same vector database infrastructure that already handles a system's text embeddings can handle its image embeddings too, all within one shared, unified system.

---

## 9. Document Understanding

Document understanding is the broader, more comprehensive capability of extracting meaningful, structured information from complex documents. It connects back to the OCR discussion above, but goes considerably further than plain text extraction, to understand a document's structure and layout as well.

Here is the important distinction. Simple OCR just extracts text. But a real-world document, like an invoice, a contract, or a medical form, has meaningful structure that plain text extraction loses entirely. An invoice has a specific total amount, a specific date, a specific vendor name, and an itemized list of purchased items, all arranged in a particular, meaningful layout. Document understanding goes beyond text extraction to understand this structure. It recognizes that a particular number in a particular location represents the "total amount," rather than being some arbitrary, isolated piece of extracted text.

This capability connects back to the structured outputs concept from the Week 9 tool calling material. A well-built document understanding system converts a messy, real-world document (like a scanned invoice) into a clean, structured format that the rest of an AI application can reliably work with. An example is a Pydantic model, connecting back to our Week 2 material. Document understanding powers many practical enterprise AI applications, connecting to the RAG applications and workflow automation categories from the Week 16 enterprise applications material. It automates the tedious, manual data-entry work that would otherwise require an employee to read and re-type information from a large volume of scanned paper documents.

---

## 10. Image Generation

Image generation is the distinctive capability of creating brand new images from scratch, typically based on a text description. It connects back to the earliest distinction drawn in the Multimodal AI Fundamentals section at the start of this explanation, between systems that only *understand* images and systems that can *generate* new ones.

Here is a concrete way to understand what makes this capability so different from everything else in this explanation. Every other topic so far has involved taking an existing image and extracting information from it. Image generation works in the opposite direction. It starts with nothing but a text description (like "a photorealistic image of a red bicycle leaning against a brick wall") and produces an entirely new, original image that never existed before, designed to match that description as faithfully as possible.

Modern image generation is predominantly powered by an approach called diffusion models, which are covered as their own topic next. Image generation also raises important considerations touched on elsewhere in this course. Connecting back to the AI ethics concepts from the Week 12 governance material, it raises real, still actively debated questions around:

- Artistic ownership.
- Consent.
- Training-data copyright.
- Potential misuse, such as creating convincing but entirely fake images of real people or real events.

---

## 11. Diffusion Models

Diffusion models are the technical approach that powers most of today's leading image generation systems. The core idea behind how they work is worth taking real time over, since it is a clever, if somewhat counterintuitive, approach.

Here is the core idea, explained as intuitively as possible. During training, these models learn by being shown real images that have had random visual "noise" gradually added, step by step, until the original image has become nothing but pure random static. Think of it as gradually turning up the "grain" on a photograph, step by step, until the original image is completely unrecognizable. The model learns to reverse this process. It learns how to gradually remove the noise, step by step, recovering a clean, recognizable image from what started as pure static.

Once a model has learned this "denoising" capability well, generating a brand new image works like this. It starts with pure random noise, and applies the learned denoising process repeatedly, step by step, gradually "sculpting" the noise into a coherent, recognizable image. Critically, this step-by-step denoising is guided by a provided text description (connecting back to the CLIP-style shared text-image understanding covered above), so the final image ends up matching that description well. This happens across a great many small, gradual denoising steps. That is why generating an image can take a meaningful amount of computational time and effort, connecting back to the GPU computing material from Week 13.

---

## 12. Vision APIs

We covered the general concept of LLM APIs in depth in our dedicated Week 6 explanation. Vision APIs apply the same pattern, sending a request over the internet to an AI provider's servers and getting back a result, but now applied to image-related capabilities, rather than plain text alone.

In practical terms, most modern AI providers (connecting back to the ones covered in the Week 6 LLM APIs material) offer vision capabilities directly as part of their existing API. You can send both a piece of text and an image together, in the same request, and the underlying model processes both as one combined, unified input. This connects back to essentially every technique discussed in this explanation. The underlying model uses vision transformer techniques to process the image. It can then answer questions about it, extract text from it (connecting back to the OCR discussion), or describe it in detail (connecting back to the image captioning discussion), all through the same familiar API pattern covered throughout this course.

Using a vision API well in practice draws on what we've covered about proper API usage:

- **Managing cost.** Image processing often costs meaningfully more than plain text processing, connecting back to the token usage concepts from Week 6.
- **Handling errors and retries.** This connects back to the error handling patterns from the Week 2 GenAI application material.
- **Considering latency.** Image processing can take meaningfully longer than plain text processing, connecting back to the latency optimization concepts from the Week 10 LLMOps material.

This final integration brings the multimodal capabilities covered in this explanation into the same practical, everyday application-building toolkit built throughout this course. It lets a skilled AI engineer combine text and visual understanding seamlessly within one unified AI application.
